use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};

use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
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
    room_creation_limiter: Arc<Mutex<HashMap<String, RateWindow>>>,
}

const ROOM_CREATION_LIMIT: u32 = 12;
const ROOM_CREATION_WINDOW: Duration = Duration::from_secs(60);

#[derive(Clone, Copy)]
struct RateWindow {
    started: Instant,
    requests: u32,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            write_lock: Arc::new(Mutex::new(())),
            room_creation_limiter: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn allow_room_creation(&self, client: &str) -> bool {
        let now = Instant::now();
        let mut clients = self.room_creation_limiter.lock().await;
        clients.retain(|_, window| now.duration_since(window.started) < ROOM_CREATION_WINDOW);
        let window = clients.entry(client.to_owned()).or_insert(RateWindow {
            started: now,
            requests: 0,
        });
        if window.requests >= ROOM_CREATION_LIMIT {
            return false;
        }
        window.requests += 1;
        true
    }
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

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_room))
        .route("/:code", get(get_room))
        .route("/:code/join", post(join_room))
        .route("/:code/host", post(host_update))
        .route("/:code/action", post(player_action))
}

async fn create_room(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, ApiError> {
    if !state.allow_room_creation(&client_key(&headers)).await {
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
    let (host_token, mut room) = load_room(&state.pool, &code).await?;
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
}
impl ApiError {
    fn bad(message: &str) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }
    fn not_found() -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: "That room is gone. Check the code or start a new one.".into(),
        }
    }
    fn unauthorized() -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: "This device is not connected to that room.".into(),
        }
    }
    fn internal(message: &str) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }
    fn too_many() -> Self {
        Self {
            status: StatusCode::TOO_MANY_REQUESTS,
            message: "Too many new rooms from this connection. Try again in a minute.".into(),
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
        let is_rate_limited = self.status == StatusCode::TOO_MANY_REQUESTS;
        let mut response = (self.status, Json(json!({ "error": self.message }))).into_response();
        if is_rate_limited {
            response
                .headers_mut()
                .insert(header::RETRY_AFTER, header::HeaderValue::from_static("60"));
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
    async fn room_creation_is_limited_per_forwarded_connection() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        let service = router().with_state(AppState::new(pool));
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
}
