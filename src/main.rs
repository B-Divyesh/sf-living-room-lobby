mod rooms;

use std::{
    env,
    net::SocketAddr,
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use axum::{
    body::Body,
    extract::Request,
    http::{header, HeaderName, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{Html, Response},
    routing::{get, get_service},
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Row,
};
use tower_http::{
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use tracing::{info, warn};

use rooms::AppState;

fn app(state: AppState, static_dir: &str) -> Router {
    let root = Path::new(static_dir);
    let index = root.join("index.html");
    Router::new()
        .route("/", get_service(ServeFile::new(index.clone())))
        .route("/demo", get_service(ServeFile::new(index.clone())))
        .route("/privacy", get_service(ServeFile::new(index.clone())))
        .route("/terms", get_service(ServeFile::new(index)))
        .route("/404", get(not_found_page))
        .route("/404.html", get(not_found_page))
        .route("/health", get(health))
        // Keep the static surface deliberately explicit.  ServeDir used as a
        // router fallback returns its own empty 404 for a missing page, which
        // bypasses the accessible recovery page below.
        .nest_service("/assets", ServeDir::new(root.join("assets")))
        .route("/sw.js", get_service(ServeFile::new(root.join("sw.js"))))
        .route(
            "/manifest.webmanifest",
            get_service(ServeFile::new(root.join("manifest.webmanifest"))),
        )
        .route(
            "/robots.txt",
            get_service(ServeFile::new(root.join("robots.txt"))),
        )
        .route(
            "/sitemap.xml",
            get_service(ServeFile::new(root.join("sitemap.xml"))),
        )
        .route(
            "/favicon.svg",
            get_service(ServeFile::new(root.join("favicon.svg"))),
        )
        .route(
            "/apple-touch-icon.png",
            get_service(ServeFile::new(root.join("apple-touch-icon.png"))),
        )
        .nest("/api/demo", rooms::demo_router(state.clone()))
        .nest("/api/rooms", rooms::router(state.clone()))
        .fallback(not_found_page)
        .with_state(state)
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(middleware::from_fn(response_policy))
        .layer(TraceLayer::new_for_http())
}

/// Apply the same response policy to the API and the TV shell.  The shell is
/// deliberately revalidated so a room never remains on an older release,
/// while Vite's content-addressed bundles can be kept indefinitely.
async fn response_policy(request: Request, next: Next) -> Response<Body> {
    let path = request.uri().path().to_owned();
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(
            "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://api.sociobot.in https://pilot-api.sociobot.in; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.sociobot.in https://pilot-api.sociobot.in; worker-src 'self'; manifest-src 'self'",
        ),
    );
    headers.insert(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=31536000; includeSubDomains"),
    );
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static(
            "accelerometer=(self), camera=(), geolocation=(), gyroscope=(self), microphone=(), payment=(), usb=()",
        ),
    );
    headers.insert(header::CACHE_CONTROL, cache_control_for_path(&path));
    response
}

fn cache_control_for_path(path: &str) -> HeaderValue {
    let value = if path.starts_with("/api/") || path == "/health" {
        "no-store"
    } else if path == "/sw.js" || path == "/manifest.webmanifest" || !path.starts_with("/assets/") {
        "no-cache, must-revalidate"
    } else if is_hashed_asset(path) {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=3600, must-revalidate"
    };
    HeaderValue::from_static(value)
}

fn is_hashed_asset(path: &str) -> bool {
    let Some(name) = path.rsplit('/').next() else {
        return false;
    };
    let Some((stem, _extension)) = name.rsplit_once('.') else {
        return false;
    };
    // Vite's URL-safe content hashes may themselves contain `-`, so the
    // fingerprint starts at the first separator rather than the last one.
    let Some((_, fingerprint)) = stem.split_once('-') else {
        return false;
    };
    fingerprint.len() >= 8
        && fingerprint.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '-' || character == '_'
        })
}

async fn health() -> (StatusCode, Json<Value>) {
    (
        StatusCode::OK,
        Json(json!({
            "status": "ok",
            "build": option_env!("BUILD_SHA").unwrap_or("development")
        })),
    )
}

async fn not_found_page() -> (StatusCode, Html<&'static str>) {
    (
        StatusCode::NOT_FOUND,
        Html(include_str!("../frontend/public/404.html")),
    )
}

/// The factory mounts durable product storage at `/data`.  A standalone binary
/// still runs without that mount by keeping its database next to its working
/// directory, which makes the no-environment-variable runtime contract useful
/// for local smoke tests as well.
fn default_database_path(data_mount: &Path, fallback_dir: &Path) -> (PathBuf, &'static str) {
    if data_mount.is_dir() {
        (data_mount.join("lobby.db"), "durable-data-mount")
    } else {
        (fallback_dir.join("lobby.db"), "local-fallback")
    }
}

fn sqlite_url(path: &Path) -> String {
    format!("sqlite://{}?mode=rwc", path.display())
}

/// A cancelled first migration on a network-mounted volume can leave an empty
/// database plus a journal sidecar. It contains no valid SQLite header or room
/// state, but makes every later schema write return `database is locked`.
/// Preserve those forensic files under `/data` and start a fresh database;
/// never replace a non-empty database.
fn recover_empty_database(path: &Path) -> std::io::Result<bool> {
    let metadata = match std::fs::metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error),
    };
    if metadata.len() != 0 {
        return Ok(false);
    }

    let parent = path.parent().expect("database path has a parent");
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .expect("database path has a file name");
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let recovery = parent.join("recovery");
    std::fs::create_dir_all(&recovery)?;
    for sidecar in ["", "-journal", "-wal", "-shm"] {
        let source = parent.join(format!("{name}{sidecar}"));
        if source.exists() {
            std::fs::rename(
                &source,
                recovery.join(format!("{name}{sidecar}.empty-{stamp}")),
            )?;
        }
    }
    Ok(true)
}

fn sqlite_pool_options() -> SqlitePoolOptions {
    // This is intentionally one connection: the product has one replica and
    // serializes writes, while Azure Files can retain a SQLite read lock across
    // otherwise-idle connections during first-time schema creation. Reusing
    // the same connection for the schema check and migration avoids that
    // self-contention and preserves the durable `/data` boundary.
    SqlitePoolOptions::new().max_connections(1)
}

fn sqlite_connect_options(
    database_url: &str,
    uses_durable_network_volume: bool,
) -> Result<SqliteConnectOptions, sqlx::Error> {
    let options = database_url.parse::<SqliteConnectOptions>()?;
    // Azure Files accepts normal file reads and writes but rejects SQLite's
    // advisory byte-range locks. The deployment script keeps all other product
    // revisions stopped before this single-replica process starts, so the
    // lock-free VFS is safe here and lets SQLite persist under `/data`.
    Ok(if uses_durable_network_volume {
        options.vfs("unix-none")
    } else {
        options
    })
}

fn is_database_locked(error: &impl std::fmt::Display) -> bool {
    error
        .to_string()
        .to_ascii_lowercase()
        .contains("database is locked")
}

/// SQLx always writes to its migration bookkeeping table before it decides
/// whether there is new work.  During a revision handover that harmless write
/// can conflict with the still-serving process on the durable SQLite file.
/// Read the applied versions first, so a candidate whose schema is already
/// current can start without taking that write lock.
async fn migrations_are_current(pool: &sqlx::SqlitePool) -> Result<bool, sqlx::Error> {
    let applied = match sqlx::query(
        "SELECT version, checksum FROM _sqlx_migrations WHERE success = TRUE ORDER BY version",
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows,
        Err(sqlx::Error::Database(error))
            if error
                .message()
                .to_ascii_lowercase()
                .contains("no such table: _sqlx_migrations") =>
        {
            return Ok(false);
        }
        Err(error) => return Err(error),
    };
    let applied = applied
        .into_iter()
        .map(|row| {
            Ok::<_, sqlx::Error>((
                row.try_get::<i64, _>("version")?,
                row.try_get::<Vec<u8>, _>("checksum")?,
            ))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let expected = sqlx::migrate!()
        .iter()
        .map(|migration| (migration.version, migration.checksum.to_vec()))
        .collect::<Vec<_>>();
    Ok(applied == expected)
}

/// A new Container Apps revision can briefly overlap the previous revision
/// while both point at the single durable SQLite file. Keep the candidate
/// alive until the previous file handle is released instead of entering a
/// crash loop and leaving ingress on the old build.  When the schema already
/// exists, `migrations_are_current` avoids the no-op bookkeeping write
/// altogether.
async fn migrate_with_lock_retry(
    pool: &sqlx::SqlitePool,
    attempts: u32,
    delay: Duration,
) -> Result<u32, sqlx::migrate::MigrateError> {
    for attempt in 1..=attempts {
        let result = match migrations_are_current(pool).await {
            Ok(true) => return Ok(attempt),
            Ok(false) => sqlx::migrate!().run(pool).await,
            Err(error) => Err(error.into()),
        };
        match result {
            Ok(()) => return Ok(attempt),
            Err(error) if attempt < attempts && is_database_locked(&error) => {
                warn!(attempt, "durable database is locked; retrying migration");
                tokio::time::sleep(delay).await;
            }
            Err(error) => return Err(error),
        }
    }
    unreachable!("the migration retry loop always returns")
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let log_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(log_filter)
        .init();

    let (database_url, database_url_source, data_dir_source, recovered_empty_database) =
        match env::var("DATABASE_URL") {
            Ok(value) => (value, "supplied", "database-url", false),
            Err(_) => {
                let (database_path, data_dir_source) =
                    default_database_path(Path::new("/data"), Path::new("data"));
                let parent = database_path.parent().expect("database path has a parent");
                std::fs::create_dir_all(parent)?;
                let recovered_empty_database = recover_empty_database(&database_path)?;
                (
                    sqlite_url(&database_path),
                    "generated",
                    data_dir_source,
                    recovered_empty_database,
                )
            }
        };
    let options = sqlite_connect_options(&database_url, data_dir_source == "durable-data-mount")?
        .busy_timeout(Duration::from_secs(10));
    let pool = sqlite_pool_options().connect_with(options).await?;
    migrate_with_lock_retry(&pool, 30, Duration::from_secs(2)).await?;

    let state = AppState::new(pool);
    let (port, port_source) = match env::var("PORT").ok().and_then(|value| value.parse().ok()) {
        Some(value) => (value, "supplied"),
        None => (8080, "default"),
    };
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    info!(
        database_url_source,
        data_dir_source, port_source, recovered_empty_database, "runtime configuration"
    );
    let listener = tokio::net::TcpListener::bind(address).await?;
    info!(%address, "living room lobby listening");

    axum::serve(listener, app(state, "dist"))
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install Ctrl+C handler")
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install signal handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    async fn test_app() -> Router {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        app(AppState::new(pool), "dist")
    }

    #[tokio::test]
    async fn health_reports_build() {
        let response = test_app()
            .await
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let health: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(health["status"], "ok");
        assert!(health["build"].as_str().is_some());
    }

    #[tokio::test]
    async fn health_has_release_security_and_cache_policy() {
        let response = test_app()
            .await
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let headers = response.headers();
        assert_eq!(headers[header::CACHE_CONTROL], "no-store");
        assert!(headers[header::CONTENT_SECURITY_POLICY]
            .to_str()
            .unwrap()
            .contains("frame-ancestors 'none'"));
        assert_eq!(
            headers[header::STRICT_TRANSPORT_SECURITY],
            "max-age=31536000; includeSubDomains"
        );
        assert!(headers.contains_key("permissions-policy"));
    }

    #[tokio::test]
    async fn unknown_routes_use_the_styled_404_recovery_page() {
        let response = test_app()
            .await
            .oneshot(Request::builder().uri("/404").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        assert_eq!(
            response.headers()[header::CACHE_CONTROL],
            "no-cache, must-revalidate"
        );
        let body = response.into_body().collect().await.unwrap().to_bytes();
        assert!(std::str::from_utf8(&body)
            .unwrap()
            .contains("That page is not here."));

        let unknown = test_app()
            .await
            .oneshot(
                Request::builder()
                    .uri("/this-does-not-exist")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
        assert_eq!(
            unknown.headers()[header::CACHE_CONTROL],
            "no-cache, must-revalidate"
        );
        let unknown_body = unknown.into_body().collect().await.unwrap().to_bytes();
        let page = std::str::from_utf8(&unknown_body).unwrap();
        assert!(page.contains("That page is not here."));
        assert!(page.contains("Go to Living Room Lobby"));
    }

    #[tokio::test]
    async fn demo_route_seeds_an_isolated_twenty_four_hour_workspace() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        let response = app(AppState::new(pool.clone()), "dist")
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/demo")
                    .header("x-forwarded-for", "203.0.113.71")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let workspace: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(workspace["expiresInSeconds"], 86_400);
        assert_eq!(workspace["room"]["code"], "DEMO");
        assert_eq!(workspace["room"]["players"].as_array().unwrap().len(), 3);
        assert_eq!(workspace["workspace"].as_str().unwrap().len(), 24);
        let real_room_count: i64 = sqlx::query_scalar("SELECT count(*) FROM rooms")
            .fetch_one(&pool)
            .await
            .unwrap();
        let demo_workspace_count: i64 = sqlx::query_scalar("SELECT count(*) FROM demo_workspaces")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(
            real_room_count, 0,
            "demo provisioning must not create a real room"
        );
        assert_eq!(demo_workspace_count, 1);
    }

    #[test]
    fn cache_policy_keeps_hashed_assets_immutable_and_shell_revalidated() {
        assert_eq!(
            cache_control_for_path("/assets/index-D9xQORDg.js"),
            "public, max-age=31536000, immutable"
        );
        assert_eq!(
            cache_control_for_path("/assets/index-CD-qVe3I.js"),
            "public, max-age=31536000, immutable"
        );
        assert_eq!(
            cache_control_for_path("/sw.js"),
            "no-cache, must-revalidate"
        );
        assert_eq!(
            cache_control_for_path("/privacy"),
            "no-cache, must-revalidate"
        );
    }

    #[test]
    fn default_database_uses_data_mount_before_local_fallback() {
        let root =
            std::env::temp_dir().join(format!("living-room-lobby-storage-{}", std::process::id()));
        let mounted_data = root.join("mounted-data");
        let fallback = root.join("fallback-data");
        std::fs::create_dir_all(&mounted_data).unwrap();

        let (mounted_path, mounted_source) = default_database_path(&mounted_data, &fallback);
        assert_eq!(mounted_path, mounted_data.join("lobby.db"));
        assert_eq!(mounted_source, "durable-data-mount");
        assert_eq!(
            sqlite_url(&mounted_path),
            format!("sqlite://{}?mode=rwc", mounted_path.display())
        );

        let (fallback_path, fallback_source) =
            default_database_path(&root.join("absent"), &fallback);
        assert_eq!(fallback_path, fallback.join("lobby.db"));
        assert_eq!(fallback_source, "local-fallback");
        std::fs::remove_dir_all(root).unwrap();
    }

    #[tokio::test]
    async fn durable_network_volume_uses_the_lock_free_sqlite_vfs() {
        let root = std::env::temp_dir().join(format!(
            "living-room-lobby-network-vfs-{}",
            std::process::id()
        ));
        std::fs::create_dir_all(&root).unwrap();
        let database = root.join("lobby.db");
        let pool = sqlite_pool_options()
            .connect_with(sqlite_connect_options(&sqlite_url(&database), true).unwrap())
            .await
            .unwrap();
        sqlx::query("CREATE TABLE durable_vfs_test (id INTEGER PRIMARY KEY)")
            .execute(&pool)
            .await
            .unwrap();
        pool.close().await;
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn empty_database_recovery_preserves_the_partial_migration_files() {
        let root = std::env::temp_dir().join(format!(
            "living-room-lobby-empty-database-{}",
            std::process::id()
        ));
        std::fs::create_dir_all(&root).unwrap();
        let database = root.join("lobby.db");
        let journal = root.join("lobby.db-journal");
        std::fs::File::create(&database).unwrap();
        std::fs::write(&journal, [7_u8; 512]).unwrap();

        assert!(recover_empty_database(&database).unwrap());
        assert!(!database.exists());
        assert!(!journal.exists());
        let recovery = root.join("recovery");
        let recovered = std::fs::read_dir(&recovery)
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .collect::<Vec<_>>();
        assert_eq!(recovered.len(), 2);
        assert!(recovered.iter().any(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("lobby.db.empty-"))
        }));
        assert!(recovered.iter().any(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("lobby.db-journal.empty-"))
        }));
        std::fs::write(&database, b"SQLite format 3\0").unwrap();
        assert!(!recover_empty_database(&database).unwrap());
        assert_eq!(std::fs::read(&database).unwrap(), b"SQLite format 3\0");
        std::fs::remove_dir_all(root).unwrap();
    }

    #[tokio::test]
    async fn startup_pool_keeps_one_sqlite_connection_for_the_durable_share() {
        let pool = sqlite_pool_options()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        let held = pool.acquire().await.unwrap();
        assert!(
            tokio::time::timeout(Duration::from_millis(30), pool.acquire())
                .await
                .is_err(),
            "a second connection would reintroduce Azure Files startup lock contention"
        );
        drop(held);
        pool.close().await;
    }

    #[tokio::test]
    async fn current_schema_starts_without_a_noop_migration_write() {
        let root = std::env::temp_dir().join(format!(
            "living-room-lobby-current-schema-{}",
            std::process::id()
        ));
        std::fs::create_dir_all(&root).unwrap();
        let database = root.join("lobby.db");
        let url = sqlite_url(&database);
        let setup = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();
        sqlx::migrate!().run(&setup).await.unwrap();
        setup.close().await;

        // A read-only connection can read the already-applied migration list,
        // but would fail if startup unconditionally issued SQLx's no-op
        // migration bookkeeping write. This matches the revision-handover
        // failure where the previous process held the durable database lock.
        let current = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();
        sqlx::query("PRAGMA query_only = ON")
            .execute(&current)
            .await
            .unwrap();
        assert!(migrations_are_current(&current).await.unwrap());
        assert_eq!(
            migrate_with_lock_retry(&current, 1, Duration::ZERO)
                .await
                .unwrap(),
            1
        );
        current.close().await;
        std::fs::remove_dir_all(root).unwrap();
    }

    #[tokio::test]
    async fn startup_waits_for_a_durable_database_lock() {
        let root = std::env::temp_dir().join(format!(
            "living-room-lobby-migration-lock-{}",
            std::process::id()
        ));
        std::fs::create_dir_all(&root).unwrap();
        let database = root.join("lobby.db");
        let url = sqlite_url(&database);
        let setup = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .unwrap();
        sqlx::migrate!().run(&setup).await.unwrap();

        let mut lock = setup.acquire().await.unwrap();
        sqlx::query("BEGIN EXCLUSIVE")
            .execute(&mut *lock)
            .await
            .unwrap();
        let contender_options = url
            .parse::<SqliteConnectOptions>()
            .unwrap()
            .busy_timeout(Duration::from_millis(20));
        let contender = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(contender_options)
            .await
            .unwrap();
        let release = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(120)).await;
            sqlx::query("ROLLBACK").execute(&mut *lock).await.unwrap();
        });

        let attempt = migrate_with_lock_retry(&contender, 10, Duration::from_millis(25))
            .await
            .unwrap();
        assert!(attempt > 1, "the migration did not encounter the held lock");
        release.await.unwrap();
        contender.close().await;
        setup.close().await;
        std::fs::remove_dir_all(root).unwrap();
    }

    #[tokio::test]
    async fn create_join_read_and_play_room_flow() {
        let service = test_app().await;
        let created = service
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/rooms")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(created.status(), StatusCode::OK);
        let json: Value =
            serde_json::from_slice(&created.into_body().collect().await.unwrap().to_bytes())
                .unwrap();
        let code = json["code"].as_str().unwrap();
        let host = json["hostToken"].as_str().unwrap();
        let join = service
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/rooms/{code}/join"))
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"name":"Family","mode":"shared"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(join.status(), StatusCode::OK);
        let joined: Value =
            serde_json::from_slice(&join.into_body().collect().await.unwrap().to_bytes()).unwrap();
        let player = joined["token"].as_str().unwrap();
        let host_body = json!({"token":host,"stage":"playing","game":"point","prompt":"READY","resetRound":true}).to_string();
        let started = service
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/rooms/{code}/host"))
                    .header("content-type", "application/json")
                    .body(Body::from(host_body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(started.status(), StatusCode::OK);
        let action_body = json!({"token":player,"kind":"point","x":20,"y":30}).to_string();
        let action = service
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/rooms/{code}/action"))
                    .header("content-type", "application/json")
                    .body(Body::from(action_body))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(action.status(), StatusCode::OK);
        let read = service
            .oneshot(
                Request::builder()
                    .uri(format!("/api/rooms/{code}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(read.status(), StatusCode::OK);
    }
}
