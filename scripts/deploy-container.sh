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
if [[ ! "$source_sha" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'deployment requires a full Git source SHA, got %s\n' "$source_sha" >&2
  exit 1
fi
if [[ -n "$(git -C "$repo_dir" status --porcelain --untracked-files=normal)" ]]; then
  printf 'deployment requires a clean committed checkout\n' >&2
  exit 1
fi
image_tag="$app_name:$source_sha"
image="$registry.azurecr.io/$image_tag"

az acr build --registry "$registry" --image "$image_tag" --file "$dockerfile" \
  --build-arg "BUILD_SHA=$source_sha" \
  --build-arg "GIT_SHA=$source_sha" \
  --build-arg "SOURCE_COMMIT=$source_sha" \
  "$repo_dir"

# Create one ordinary room before the handover. Reading this exact code after
# the new revision starts proves the durable /data share was preserved instead
# of merely proving that the candidate can create fresh state.
durability_probe=$(node "$repo_dir/scripts/durable-room-probe.mjs" create)
if [[ ! "$durability_probe" =~ ^[A-Z0-9]{4}$ ]]; then
  printf 'deployment durability probe returned an invalid room code: %s\n' "$durability_probe" >&2
  exit 1
fi

# Azure Files rejects SQLite's advisory locks. The runtime therefore uses its
# lock-free VFS only under the product's already-required one-replica boundary.
# Stop any older product revisions before starting a candidate so two writers
# can never overlap on /data during a handover. This deliberately creates a
# short maintenance window after the image is safely built.
readarray -t active_revisions < <(
  az containerapp revision list --name "$app_name" --resource-group "$resource_group" \
    --query '[?properties.active].name' --output tsv
)
if (( ${#active_revisions[@]} > 0 )); then
  printf 'stopping %s active product revision(s) before durable SQLite handover\n' "${#active_revisions[@]}"
  for revision in "${active_revisions[@]}"; do
    az containerapp revision deactivate --name "$app_name" --resource-group "$resource_group" \
      --revision "$revision" --output none
  done
  # Container Apps uses a graceful termination window. Give the previous
  # process time to close its SQLite files before the next revision opens them.
  sleep 35
  remaining_active=$(az containerapp revision list --name "$app_name" --resource-group "$resource_group" \
    --query 'length([?properties.active])' --output tsv)
  if [[ "$remaining_active" != "0" ]]; then
    printf 'deployment handover failed: %s old revision(s) remain active\n' "$remaining_active" >&2
    exit 1
  fi
fi

az containerapp update --name "$app_name" --resource-group "$resource_group" \
  --image "$image" --set-env-vars "PORT=$port" --min-replicas 1 --max-replicas 1 \
  --revision-suffix "${source_sha:0:12}"

# An accepted API update is not a successful release. Verification 6 found an
# unhealthy latest revision while ingress continued serving the prior healthy
# build. Wait until this exact image is the ready revision, and confirm that the
# durable mount and one-replica contract survived the update.
rollout_ready=false
for _attempt in $(seq 1 60); do
  readarray -t actual_release < <(
    az containerapp show --name "$app_name" --resource-group "$resource_group" \
      --query '[properties.template.containers[0].image, properties.latestRevisionName, properties.latestReadyRevisionName, properties.template.scale.minReplicas, properties.template.scale.maxReplicas, properties.template.containers[0].volumeMounts[?mountPath==`/data`].mountPath | [0], properties.template.volumes[?name==`data`].storageName | [0]]' \
      --output tsv
  )
  actual_image=${actual_release[0]:-}
  actual_latest=${actual_release[1]:-}
  actual_ready=${actual_release[2]:-}
  actual_min=${actual_release[3]:-}
  actual_max=${actual_release[4]:-}
  actual_mount=${actual_release[5]:-}
  actual_storage=${actual_release[6]:-}
  if [[ "$actual_image" == "$image" && -n "$actual_latest" && "$actual_latest" == "$actual_ready" ]]; then
    rollout_ready=true
    break
  fi
  sleep 10
done
if [[ "$rollout_ready" != true ]]; then
  printf 'deployment readiness verification failed: image=%s latest=%s ready=%s\n' \
    "${actual_image:-missing}" "${actual_latest:-missing}" "${actual_ready:-missing}" >&2
  exit 1
fi
if [[ "$actual_min" != "1" || "$actual_max" != "1" ]]; then
  printf 'deployment scale verification failed: expected 1/1, got %s/%s\n' \
    "${actual_min:-missing}" "${actual_max:-missing}" >&2
  exit 1
fi
if [[ "$actual_mount" != "/data" || "$actual_storage" != "sf-living-room-lobby-data" ]]; then
  printf 'deployment storage verification failed: expected sf-living-room-lobby-data at /data, got %s at %s\n' \
    "${actual_storage:-missing}" "${actual_mount:-missing}" >&2
  exit 1
fi
node "$repo_dir/scripts/durable-room-probe.mjs" verify "$durability_probe"
# This is intentionally the last release action. It reads the public health
# endpoint, HTML shell + emitted JavaScript, worker source + cold worker cache,
# and footer in fresh contexts.  Do not hand off merely because Azure reports a
# ready revision: all public identity surfaces must name this exact candidate.
node "$repo_dir/scripts/release-gate.mjs" "$source_sha"
printf 'deployed and verified %s with data path %s and scale 1/1\n' "$image" "$data_dir"
