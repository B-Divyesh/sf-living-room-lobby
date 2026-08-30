#!/usr/bin/env bash
# Deploy the product with its checked-in Container App scale contract.  Local
# SQLite and the in-process per-client limiter are correct only with one live
# replica, so do not substitute the factory helper's generic max-replica default.
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
config="$repo_dir/.factory/container-app.json"
readarray -t deployment < <(python3 - "$config" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as config_file:
    config = json.load(config_file)

required = ("kind", "dockerfile", "port", "minReplicas", "maxReplicas")
if any(key not in config for key in required):
    raise SystemExit("container deployment config is incomplete")
if config["kind"] != "container" or config["minReplicas"] != 1 or config["maxReplicas"] != 1:
    raise SystemExit("Living Room Lobby must deploy as exactly one replica")
print(config["dockerfile"])
print(config["port"])
PY
)

dockerfile=${deployment[0]}
port=${deployment[1]}
if [[ "${1:-}" == "--validate-only" ]]; then
  printf 'valid container deployment: %s on port %s, one replica\n' "$dockerfile" "$port"
  exit 0
fi
app_name=sf-living-room-lobby
registry=sociobotregistry
resource_group=sociobot
source_sha=$(git -C "$repo_dir" rev-parse HEAD)
image_tag="$app_name:${source_sha:0:12}"
image="$registry.azurecr.io/$image_tag"

az acr build --registry "$registry" --image "$image_tag" --file "$dockerfile" \
  --build-arg "BUILD_SHA=$source_sha" \
  --build-arg "GIT_SHA=$source_sha" \
  --build-arg "SOURCE_COMMIT=$source_sha" \
  "$repo_dir"
az containerapp update --name "$app_name" --resource-group "$resource_group" \
  --image "$image" --set-env-vars "PORT=$port" --min-replicas 1 --max-replicas 1
