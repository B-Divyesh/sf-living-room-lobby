#!/usr/bin/env bash
# Deploy the product with its checked-in Container App persistence and scale
# contract. The factory mounts the durable product share at /data; SQLite and
# the per-client limiter must never be spread across multiple local replicas.
set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
config="$repo_dir/.factory/container-app.json"
readarray -t deployment < <(python3 - "$config" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as config_file:
    config = json.load(config_file)

required = ("kind", "dockerfile", "port", "dataDir", "minReplicas", "maxReplicas")
if any(key not in config for key in required):
    raise SystemExit("container deployment config is incomplete")
if (
    config["kind"] != "container"
    or config["dataDir"] != "/data"
    or config["minReplicas"] != 1
    or config["maxReplicas"] != 1
):
    raise SystemExit("Living Room Lobby must use /data and deploy as exactly one replica")
print(config["dockerfile"])
print(config["port"])
print(config["dataDir"])
PY
)

dockerfile=${deployment[0]}
port=${deployment[1]}
data_dir=${deployment[2]}
if [[ "${1:-}" == "--validate-only" ]]; then
  printf 'valid container deployment: %s on port %s, data at %s, one replica\n' "$dockerfile" "$port" "$data_dir"
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

# `az containerapp update` has historically succeeded even when a later generic
# deployment changed the scale settings. Refuse to report a successful repair
# unless the active template really carries the one-replica boundary.
readarray -t actual_scale < <(
  az containerapp show --name "$app_name" --resource-group "$resource_group" \
    --query '[properties.template.scale.minReplicas, properties.template.scale.maxReplicas]' \
    --output tsv
)
if [[ "${actual_scale[0]:-}" != "1" || "${actual_scale[1]:-}" != "1" ]]; then
  printf 'deployment scale verification failed: expected 1/1, got %s/%s\n' \
    "${actual_scale[0]:-missing}" "${actual_scale[1]:-missing}" >&2
  exit 1
fi
printf 'deployed %s with durable data path %s and scale 1/1\n' "$image" "$data_dir"
