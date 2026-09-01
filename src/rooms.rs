use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{Path, Request, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rand::{distributions::Alphanumeric, seq::SliceRandom, Rng};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{Row, SqlitePool};
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    write_lock: Arc<Mutex<()>>,
}

const ROOM_CREATION_LIMIT: u32 = 12;
const ROOM_CREATION_WINDOW_MILLISECONDS: i64 = 60_000;
const API_REQUEST_LIMIT: u32 = 40;
const API_REQUEST_WINDOW_MILLISECONDS: i64 = 1_000;
const DEMO_WORKSPACE_TTL_SECONDS: i64 = 86_400;

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            write_lock: Arc::new(Mutex::new(())),
        }
    }

    async fn allow_room_creation(
        &self,
        client: &str,
        arrived_at: i64,
    ) -> Result<bool, sqlx::Error> {
        allow_within(
            self,
            "room-creation",
            client,
            ROOM_CREATION_LIMIT,
            ROOM_CREATION_WINDOW_MILLISECONDS,
            arrived_at,
        )
        .await
    }

    async fn allow_api_request(&self, client: &str, arrived_at: i64) -> Result<bool, sqlx::Error> {
        allow_within(
            self,
            "api-request",
            client,
            API_REQUEST_LIMIT,
            API_REQUEST_WINDOW_MILLISECONDS,
            arrived_at,
        )
        .await
    }
}

async fn allow_within(
    state: &AppState,
    bucket: &str,
    client: &str,
    limit: u32,
    window_milliseconds: i64,
    arrived_at: i64,
) -> Result<bool, sqlx::Error> {
    // This is kept in SQLite rather than process memory.  It means a process
    // restart cannot erase an active limit, and it shares the same durable
    // boundary as rooms when `/data` is mounted.  The product is still pinned
    // to one replica because SQLite is the room store.
    let _guard = state.write_lock.lock().await;
    // Record arrival time before a SQLite lock is awaited. A concurrent burst
    // must not become a sequence of fresh windows merely because durable
    // storage is slow: verification found that 41 simultaneous demo requests
    // could otherwise cross a one-second boundary while queued.
    let now = arrived_at;
    sqlx::query("DELETE FROM rate_limits WHERE window_started <= ?")
        .bind(now - ROOM_CREATION_WINDOW_MILLISECONDS)
        .execute(&state.pool)
        .await?;
    let current = sqlx::query(
        "SELECT window_started, request_count FROM rate_limits WHERE bucket = ? AND client = ?",
    )
    .bind(bucket)
    .bind(client)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(row) = current {
        let started: i64 = row.try_get("window_started")?;
        let requests: i64 = row.try_get("request_count")?;
        if now - started < window_milliseconds {
            if requests >= i64::from(limit) {
                return Ok(false);
            }
            sqlx::query(
                "UPDATE rate_limits SET request_count = request_count + 1 WHERE bucket = ? AND client = ?",
            )
            .bind(bucket)
            .bind(client)
            .execute(&state.pool)
            .await?;
            return Ok(true);
        }
        sqlx::query(
            "UPDATE rate_limits SET window_started = ?, request_count = 1 WHERE bucket = ? AND client = ?",
        )
        .bind(now)
        .bind(bucket)
        .bind(client)
        .execute(&state.pool)
        .await?;
        return Ok(true);
    }

    sqlx::query(
        "INSERT INTO rate_limits(bucket, client, window_started, request_count) VALUES (?, ?, ?, 1)",
    )
    .bind(bucket)
    .bind(client)
    .bind(now)
    .execute(&state.pool)
    .await?;
    Ok(true)
}

fn unix_milliseconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InternalRoom {
    code: String,
    revision: u64,
    stage: String,
    game: Option<String>,
    prompt: String,
    round: u32,
    players: Vec<InternalPlayer>,
    drawing: Vec<StrokePoint>,
    target_x: f32,
    target_y: f32,
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InternalPlayer {
    id: String,
    token: String,
    name: String,
    mode: String,
    color: String,
    score: i32,
    x: f32,
    y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StrokePoint {
    x: f32,
    y: f32,
    color: String,
    start: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicRoom<'a> {
    code: &'a str,
    revision: u64,
    stage: &'a str,
    game: &'a Option<String>,
    prompt: &'a str,
    round: u32,
    players: Vec<PublicPlayer<'a>>,
    drawing: &'a [StrokePoint],
    target_x: f32,
    target_y: f32,
    message: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicPlayer<'a> {
    id: &'a str,
    name: &'a str,
    mode: &'a str,
    color: &'a str,
    score: i32,
    x: f32,
    y: f32,
}

impl InternalRoom {
    fn public(&self) -> PublicRoom<'_> {
        PublicRoom {
            code: &self.code,
            revision: self.revision,
            stage: &self.stage,
            game: &self.game,
            prompt: &self.prompt,
            round: self.round,
            players: self
                .players
                .iter()
                .map(|p| PublicPlayer {
                    id: &p.id,
                    name: &p.name,
                    mode: &p.mode,
                    color: &p.color,
                    score: p.score,
                    x: p.x,
                    y: p.y,
                })
                .collect(),
            drawing: &self.drawing,
            target_x: self.target_x,
            target_y: self.target_y,
            message: &self.message,
        }
    }
}

#[derive(Deserialize)]
struct JoinRequest {
    name: String,
    mode: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HostRequest {
    token: String,
    stage: Option<String>,
    game: Option<String>,
    prompt: Option<String>,
    round: Option<u32>,
    reset_round: Option<bool>,
    message: Option<String>,
}

#[derive(Deserialize)]
struct PlayerAction {
    token: String,
    kind: String,
    x: Option<f32>,
    y: Option<f32>,
    points: Option<Vec<StrokePoint>>,
    delta: Option<i32>,
}

pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(create_room))
        .route("/:code", get(get_room))
        .route("/:code/join", post(join_room))
        .route("/:code/host", post(host_update))
        .route("/:code/action", post(player_action))
        .route_layer(middleware::from_fn_with_state(state, api_rate_limit))
}

pub fn demo_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(create_demo_workspace))
        .route_layer(middleware::from_fn_with_state(state, api_rate_limit))
}

async fn api_rate_limit(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let arrived_at = unix_milliseconds();
    let client = client_key(request.headers());
    match state.allow_api_request(&client, arrived_at).await {
        Ok(true) => next.run(request).await,
        Ok(false) => ApiError::too_many_requests().into_response(),
        Err(_) => ApiError::internal("The lobby is having trouble. Try again.").into_response(),
    }
}

async fn create_room(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, ApiError> {
    let arrived_at = unix_milliseconds();
    if !state
        .allow_room_creation(&client_key(&headers), arrived_at)
        .await?
    {
        return Err(ApiError::too_many());
    }
    cleanup(&state.pool).await;
    for _ in 0..8 {
        let code = random_code();
        let host_token = random_token();
        let room = InternalRoom {
            code: code.clone(),
            revision: 1,
            stage: "lobby".into(),
            game: None,
            prompt: String::new(),
            round: 0,
            players: vec![],
            drawing: vec![],
            target_x: 50.0,
            target_y: 50.0,
            message: "Waiting for the family".into(),
        };
        let serialized = serde_json::to_string(&room).unwrap();
        let result = sqlx::query(
            "INSERT OR IGNORE INTO rooms(code, host_token, state_json) VALUES (?, ?, ?)",
        )
        .bind(&code)
        .bind(&host_token)
        .bind(serialized)
        .execute(&state.pool)
        .await?;
        if result.rows_affected() == 1 {
            return Ok(Json(
                json!({ "code": code, "hostToken": host_token, "room": room.public() }),
            ));
        }
    }
    Err(ApiError::internal("Could not make a room. Try again."))
}

async fn create_demo_workspace(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let _guard = state.write_lock.lock().await;
    let room = sample_room();
    let workspace = random_id(24);
    let serialized = serde_json::to_string(&room)
        .map_err(|_| ApiError::internal("Could not prepare the sample room."))?;
    sqlx::query("DELETE FROM demo_workspaces WHERE expires_at <= unixepoch()")
        .execute(&state.pool)
        .await?;
    sqlx::query(
        "INSERT INTO demo_workspaces(id, state_json, expires_at) VALUES (?, ?, unixepoch() + ?)",
    )
    .bind(&workspace)
    .bind(serialized)
    .bind(DEMO_WORKSPACE_TTL_SECONDS)
    .execute(&state.pool)
    .await?;
    Ok(Json(json!({
        "workspace": workspace,
        "expiresInSeconds": DEMO_WORKSPACE_TTL_SECONDS,
        "room": room.public(),
    })))
}

fn sample_room() -> InternalRoom {
    InternalRoom {
        code: "DEMO".into(),
        revision: 1,
        stage: "playing".into(),
        game: Some("draw".into()),
        prompt: "BIRTHDAY CAKE".into(),
        round: 2,
        players: vec![
            InternalPlayer {
                id: "demo-asha".into(),
                token: "sample-asha".into(),
                name: "Asha".into(),
                mode: "solo".into(),
                color: "#ff8a5b".into(),
                score: 3,
                x: 29.0,
                y: 41.0,
            },
            InternalPlayer {
                id: "demo-marc".into(),
                token: "sample-marc".into(),
                name: "Marcos".into(),
                mode: "shared".into(),
                color: "#82c7d8".into(),
                score: 2,
                x: 62.0,
                y: 52.0,
            },
            InternalPlayer {
                id: "demo-lee".into(),
                token: "sample-lee".into(),
                name: "Lee and Bo".into(),
                mode: "shared".into(),
                color: "#b7d43d".into(),
                score: 2,
                x: 75.0,
                y: 33.0,
            },
        ],
        drawing: vec![
            StrokePoint {
                x: 27.0,
                y: 64.0,
                color: "#ff8a5b".into(),
                start: true,
            },
            StrokePoint {
                x: 35.0,
                y: 50.0,
                color: "#ff8a5b".into(),
                start: false,
            },
            StrokePoint {
                x: 42.0,
                y: 64.0,
                color: "#ff8a5b".into(),
                start: false,
            },
            StrokePoint {
                x: 29.0,
                y: 58.0,
                color: "#ff8a5b".into(),
                start: true,
            },
            StrokePoint {
                x: 40.0,
                y: 58.0,
                color: "#ff8a5b".into(),
                start: false,
            },
            StrokePoint {
                x: 50.0,
                y: 62.0,
                color: "#82c7d8".into(),
                start: true,
            },
            StrokePoint {
                x: 50.0,
                y: 43.0,
                color: "#82c7d8".into(),
                start: false,
            },
            StrokePoint {
                x: 43.0,
                y: 43.0,
                color: "#82c7d8".into(),
                start: false,
            },
            StrokePoint {
                x: 57.0,
                y: 43.0,
                color: "#82c7d8".into(),
                start: true,
            },
            StrokePoint {
                x: 50.0,
                y: 35.0,
                color: "#82c7d8".into(),
                start: false,
            },
            StrokePoint {
                x: 64.0,
                y: 66.0,
                color: "#b7d43d".into(),
                start: true,
            },
            StrokePoint {
                x: 70.0,
                y: 53.0,
                color: "#b7d43d".into(),
                start: false,
            },
            StrokePoint {
                x: 77.0,
                y: 66.0,
                color: "#b7d43d".into(),
                start: false,
            },
        ],
        target_x: 54.0,
        target_y: 47.0,
        message: "Asha added the candles.".into(),
    }
}

/// Azure Container Apps forwards the original client address in
/// X-Forwarded-For. Direct local traffic intentionally shares a small bucket.
fn client_key(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 64)
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "direct-unknown".to_owned())
}

async fn get_room(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let (_, room) = load_room(&state.pool, &code).await?;
    Ok(Json(json!({ "room": room.public() })))
}

async fn join_room(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Json(input): Json<JoinRequest>,
) -> Result<Json<Value>, ApiError> {
    let name = input.name.trim();
    if name.is_empty() || name.chars().count() > 20 {
        return Err(ApiError::bad("Choose a name from 1 to 20 characters."));
    }
    let mode = input.mode.as_deref().unwrap_or("solo");
    if mode != "solo" && mode != "shared" {
        return Err(ApiError::bad("Unknown play mode."));
    }
    let _guard = state.write_lock.lock().await;
    let (host_token, mut room) = match load_room(&state.pool, &code).await {
        Ok(room) => room,
        // A mistyped code is an expected form outcome, not a broken browser
        // resource. Returning a recovery envelope keeps Chromium from adding a
        // failed-resource console error while preserving 404s for room reads.
        Err(error) if error.status == StatusCode::NOT_FOUND => {
            return Ok(Json(json!({ "error": error.message, "recoverable": true })));
        }
        Err(error) => return Err(error),
    };
    if room.players.len() >= 12 {
        return Err(ApiError::bad("This room already has 12 players."));
    }
    if room.stage != "lobby" {
        return Err(ApiError::bad("This round has started. Join the next one."));
    }
    let player_token = random_token();
    let id = random_id(8);
    let colors = [
        "#ff8a5b", "#82c7d8", "#b7d43d", "#ffd166", "#d6a8e8", "#ff9fb2",
    ];
    room.players.push(InternalPlayer {
        id: id.clone(),
        token: player_token.clone(),
        name: name.into(),
        mode: mode.into(),
        color: colors[room.players.len() % colors.len()].into(),
        score: 0,
        x: 50.0,
        y: 50.0,
    });
    room.revision += 1;
    room.message = format!("{} joined", name);
    save_room(&state.pool, &host_token, &room).await?;
    Ok(Json(
        json!({ "token": player_token, "playerId": id, "room": room.public() }),
    ))
}

async fn host_update(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Json(input): Json<HostRequest>,
) -> Result<Json<Value>, ApiError> {
    let _guard = state.write_lock.lock().await;
    let (host_token, mut room) = load_room(&state.pool, &code).await?;
    if input.token != host_token {
        return Err(ApiError::unauthorized());
    }
    if let Some(stage) = input.stage {
        if !["lobby", "playing", "results"].contains(&stage.as_str()) {
            return Err(ApiError::bad("Unknown room stage."));
        }
        room.stage = stage;
    }
    if let Some(game) = input.game {
        if !["draw", "point", "pass", "statue", "chorus"].contains(&game.as_str()) {
            return Err(ApiError::bad("Unknown game."));
        }
        room.game = Some(game);
    }
    if let Some(prompt) = input.prompt {
        room.prompt = prompt.chars().take(60).collect();
    }
    if let Some(round) = input.round {
        room.round = round.min(99);
    }
    if let Some(message) = input.message {
        room.message = message.chars().take(100).collect();
    }
    if input.reset_round.unwrap_or(false) {
        room.drawing.clear();
        let mut rng = rand::thread_rng();
        room.target_x = rng.gen_range(16.0..84.0);
        room.target_y = rng.gen_range(18.0..78.0);
    }
    room.revision += 1;
    save_room(&state.pool, &host_token, &room).await?;
    Ok(Json(json!({ "room": room.public() })))
}

async fn player_action(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Json(input): Json<PlayerAction>,
) -> Result<Json<Value>, ApiError> {
    let _guard = state.write_lock.lock().await;
    let (host_token, mut room) = load_room(&state.pool, &code).await?;
    let Some(player) = room.players.iter_mut().find(|p| p.token == input.token) else {
        return Err(ApiError::unauthorized());
    };
    match input.kind.as_str() {
        "draw" => {
            let points = input.points.unwrap_or_default();
            if points.len() > 80 {
                return Err(ApiError::bad("Too many drawing points."));
            }
            for mut point in points {
                point.x = point.x.clamp(0.0, 100.0);
                point.y = point.y.clamp(0.0, 100.0);
                point.color = player.color.clone();
                room.drawing.push(point);
            }
            if room.drawing.len() > 5000 {
                room.drawing.drain(0..1000);
            }
        }
        "point" => {
            player.x = input.x.unwrap_or(50.0).clamp(0.0, 100.0);
            player.y = input.y.unwrap_or(50.0).clamp(0.0, 100.0);
        }
        "score" => {
            player.score = (player.score + input.delta.unwrap_or(0).clamp(0, 1)).min(99);
        }
        _ => return Err(ApiError::bad("Unknown player action.")),
    }
    room.revision += 1;
    save_room(&state.pool, &host_token, &room).await?;
    Ok(Json(json!({ "ok": true, "revision": room.revision })))
}

async fn load_room(pool: &SqlitePool, raw_code: &str) -> Result<(String, InternalRoom), ApiError> {
    let code = raw_code.trim().to_ascii_uppercase();
    if code.len() != 4 || !code.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err(ApiError::not_found());
    }
    let row = sqlx::query("SELECT host_token, state_json FROM rooms WHERE code = ? AND updated_at > unixepoch() - 21600")
        .bind(&code).fetch_optional(pool).await? .ok_or_else(ApiError::not_found)?;
    let host_token: String = row.try_get("host_token")?;
    let json: String = row.try_get("state_json")?;
    let room =
        serde_json::from_str(&json).map_err(|_| ApiError::internal("Room data was damaged."))?;
    Ok((host_token, room))
}

async fn save_room(
    pool: &SqlitePool,
    host_token: &str,
    room: &InternalRoom,
) -> Result<(), ApiError> {
    let json =
        serde_json::to_string(room).map_err(|_| ApiError::internal("Could not save the room."))?;
    sqlx::query("UPDATE rooms SET state_json = ?, updated_at = unixepoch() WHERE code = ? AND host_token = ?")
        .bind(json).bind(&room.code).bind(host_token).execute(pool).await?;
    Ok(())
}

async fn cleanup(pool: &SqlitePool) {
    let _ = sqlx::query("DELETE FROM rooms WHERE updated_at < unixepoch() - 21600")
        .execute(pool)
        .await;
}
fn random_token() -> String {
    random_id(32)
}
fn random_id(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}
fn random_code() -> String {
    let mut rng = rand::thread_rng();
    (0..4)
        .map(|_| *b"23456789ABCDEFGHJKMNPQRSTUVWXYZ".choose(&mut rng).unwrap() as char)
        .collect()
}

struct ApiError {
    status: StatusCode,
    message: String,
    retry_after: Option<&'static str>,
}
impl ApiError {
    fn bad(message: &str) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
            retry_after: None,
        }
    }
    fn not_found() -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: "That room is gone. Check the code or start a new one.".into(),
            retry_after: None,
        }
    }
    fn unauthorized() -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: "This device is not connected to that room.".into(),
            retry_after: None,
        }
    }
    fn internal(message: &str) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
            retry_after: None,
        }
    }
    fn too_many() -> Self {
        Self {
            status: StatusCode::TOO_MANY_REQUESTS,
            message: "Too many new rooms from this connection. Try again in a minute.".into(),
            retry_after: Some("60"),
        }
    }
    fn too_many_requests() -> Self {
        Self {
            status: StatusCode::TOO_MANY_REQUESTS,
            message: "Too many requests from this connection. Try again in a second.".into(),
            retry_after: Some("1"),
        }
    }
}
impl From<sqlx::Error> for ApiError {
    fn from(_: sqlx::Error) -> Self {
        ApiError::internal("The lobby is having trouble. Try again.")
    }
}
impl axum::response::IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let mut response = (self.status, Json(json!({ "error": self.message }))).into_response();
        if let Some(retry_after) = self.retry_after {
            response.headers_mut().insert(
                header::RETRY_AFTER,
                header::HeaderValue::from_static(retry_after),
            );
        }
        response
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use http_body_util::BodyExt;
    use tower::ServiceExt;
    #[test]
    fn public_room_never_serializes_player_tokens() {
        let room = InternalRoom {
            code: "ABCD".into(),
            revision: 1,
            stage: "lobby".into(),
            game: None,
            prompt: "".into(),
            round: 0,
            players: vec![InternalPlayer {
                id: "1".into(),
                token: "secret".into(),
                name: "Moss".into(),
                mode: "solo".into(),
                color: "green".into(),
                score: 0,
                x: 0.0,
                y: 0.0,
            }],
            drawing: vec![],
            target_x: 50.0,
            target_y: 50.0,
            message: "".into(),
        };
        let value = serde_json::to_string(&room.public()).unwrap();
        assert!(!value.contains("secret"));
    }

    #[tokio::test]
    async fn claim_real_room_retention_expires_after_six_hours() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        sqlx::query("INSERT INTO rooms(code, host_token, state_json, updated_at) VALUES ('OLD1', 'token', '{}', unixepoch() - 21601)")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO rooms(code, host_token, state_json, updated_at) VALUES ('LIVE', 'token', '{}', unixepoch() - 21600)")
            .execute(&pool)
            .await
            .unwrap();

        cleanup(&pool).await;

        let remaining: Vec<String> = sqlx::query_scalar("SELECT code FROM rooms ORDER BY code")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(
            remaining,
            vec!["LIVE"],
            "rooms expire only after six hours of inactivity"
        );
    }

    #[tokio::test]
    async fn room_creation_is_limited_per_forwarded_connection() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        let state = AppState::new(pool);
        let service = router(state.clone()).with_state(state);
        for _ in 0..ROOM_CREATION_LIMIT {
            let response = service
                .clone()
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/")
                        .header("x-forwarded-for", "203.0.113.42")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
        }
        let limited = service
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/")
                    .header("x-forwarded-for", "203.0.113.42")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(limited.headers()[header::RETRY_AFTER], "60");
        let body = limited.into_body().collect().await.unwrap().to_bytes();
        assert!(std::str::from_utf8(&body)
            .unwrap()
            .contains("Too many new rooms"));

        let next_connection = service
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/")
                    .header("x-forwarded-for", "198.51.100.10")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(next_connection.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn every_room_api_route_has_a_per_connection_rate_limit() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        let state = AppState::new(pool);
        let service = router(state.clone()).with_state(state);
        for _ in 0..API_REQUEST_LIMIT {
            let response = service
                .clone()
                .oneshot(
                    Request::builder()
                        .uri("/ABCD")
                        .header("x-forwarded-for", "203.0.113.88")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::NOT_FOUND);
        }
        let limited = service
            .oneshot(
                Request::builder()
                    .uri("/ABCD")
                    .header("x-forwarded-for", "203.0.113.88")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(limited.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(limited.headers()[header::RETRY_AFTER], "1");
    }

    #[tokio::test]
    async fn missing_room_join_returns_a_recovery_payload_without_a_404() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        let state = AppState::new(pool);
        let service = router(state.clone()).with_state(state);
        let response = service
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/ZZZZ/join")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"name":"Verifier","mode":"solo"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let recovery: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(recovery["recoverable"], true);
        assert_eq!(
            recovery["error"],
            "That room is gone. Check the code or start a new one."
        );
        assert!(recovery.get("room").is_none());
    }

    #[tokio::test]
    async fn two_app_instances_can_read_the_same_room_from_one_sqlite_store() {
        let path =
            std::env::temp_dir().join(format!("living-room-lobby-shared-{}.db", random_id(12)));
        let database_url = format!("sqlite://{}?mode=rwc", path.display());
        let first_pool = SqlitePool::connect(&database_url).await.unwrap();
        sqlx::migrate!().run(&first_pool).await.unwrap();
        let second_pool = SqlitePool::connect(&database_url).await.unwrap();
        let first_state = AppState::new(first_pool);
        let second_state = AppState::new(second_pool);
        let first = router(first_state.clone()).with_state(first_state);
        let second = router(second_state.clone()).with_state(second_state);

        let created = first
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/")
                    .header("x-forwarded-for", "203.0.113.201")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(created.status(), StatusCode::OK);
        let created: Value =
            serde_json::from_slice(&created.into_body().collect().await.unwrap().to_bytes())
                .unwrap();
        let code = created["code"].as_str().unwrap();

        for _ in 0..20 {
            let response = second
                .clone()
                .oneshot(
                    Request::builder()
                        .uri(format!("/{code}"))
                        .header("x-forwarded-for", "203.0.113.202")
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
        }

        let _ = std::fs::remove_file(path);
    }

    #[tokio::test]
    async fn host_and_phone_share_durable_room_state_between_app_instances() {
        // This reproduces the production boundary: the host and phone can be
        // routed to independently constructed application instances. They
        // must still see one room because both use the durable SQLite file.
        let path =
            std::env::temp_dir().join(format!("living-room-lobby-host-phone-{}.db", random_id(12)));
        let database_url = format!("sqlite://{}?mode=rwc", path.display());
        let host_pool = SqlitePool::connect(&database_url).await.unwrap();
        sqlx::migrate!().run(&host_pool).await.unwrap();
        let phone_pool = SqlitePool::connect(&database_url).await.unwrap();
        let host_state = AppState::new(host_pool);
        let phone_state = AppState::new(phone_pool);
        let host = router(host_state.clone()).with_state(host_state);
        let phone = router(phone_state.clone()).with_state(phone_state);

        let created = host
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/")
                    .header("x-forwarded-for", "203.0.113.211")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(created.status(), StatusCode::OK);
        let created: Value =
            serde_json::from_slice(&created.into_body().collect().await.unwrap().to_bytes())
                .unwrap();
        let code = created["code"].as_str().unwrap();
        let host_token = created["hostToken"].as_str().unwrap();

        // The verifier caught exactly this step returning a mixed 200/404
        // result. Alternate requests between the host and phone instances so
        // a local process cache can never conceal a split durable store.
        for attempt in 0..20 {
            let service = if attempt % 2 == 0 {
                host.clone()
            } else {
                phone.clone()
            };
            let client = if attempt % 2 == 0 {
                "203.0.113.212"
            } else {
                "203.0.113.213"
            };
            let response = service
                .oneshot(
                    Request::builder()
                        .uri(format!("/{code}"))
                        .header("cache-control", "no-store")
                        .header("x-forwarded-for", client)
                        .body(Body::empty())
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(
                response.status(),
                StatusCode::OK,
                "room read {attempt} was split"
            );
        }

        let joined = phone
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/{code}/join"))
                    .header("content-type", "application/json")
                    .header("x-forwarded-for", "203.0.113.213")
                    .body(Body::from(r#"{"name":"Shared family","mode":"shared"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(joined.status(), StatusCode::OK);
        let joined: Value =
            serde_json::from_slice(&joined.into_body().collect().await.unwrap().to_bytes())
                .unwrap();
        let player_token = joined["token"].as_str().unwrap();

        let started = host
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/{code}/host"))
                    .header("content-type", "application/json")
                    .header("x-forwarded-for", "203.0.113.211")
                    .body(Body::from(
                        json!({
                            "token": host_token,
                            "stage": "playing",
                            "game": "draw",
                            "prompt": "CAKE",
                            "resetRound": true
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(started.status(), StatusCode::OK);

        let drew = phone
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/{code}/action"))
                    .header("content-type", "application/json")
                    .header("x-forwarded-for", "203.0.113.213")
                    .body(Body::from(
                        json!({
                            "token": player_token,
                            "kind": "draw",
                            "points": [
                                { "x": 20, "y": 30, "color": "", "start": true },
                                { "x": 40, "y": 50, "color": "", "start": false }
                            ]
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(drew.status(), StatusCode::OK);

        let visible_to_host = host
            .oneshot(
                Request::builder()
                    .uri(format!("/{code}"))
                    .header("x-forwarded-for", "203.0.113.212")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(visible_to_host.status(), StatusCode::OK);
        let visible_to_host: Value = serde_json::from_slice(
            &visible_to_host
                .into_body()
                .collect()
                .await
                .unwrap()
                .to_bytes(),
        )
        .unwrap();
        assert_eq!(visible_to_host["room"]["stage"], "playing");
        assert_eq!(visible_to_host["room"]["game"], "draw");
        assert_eq!(
            visible_to_host["room"]["players"][0]["name"],
            "Shared family"
        );
        assert_eq!(
            visible_to_host["room"]["drawing"].as_array().unwrap().len(),
            2
        );

        let _ = std::fs::remove_file(path);
    }
}
