#!/bin/sh
set -eu

DATA_DIR="${NFZ_DATA_DIR:-/data}"
WORKSPACE_DIR="${NFZ_WORKSPACE_DIR:-/workspace}"
SEED_DIR="${NFZ_WORKSPACE_SEED_DIR:-/opt/nfz/workspace-seed}"
EXPORT_DIR="${NFZ_BUILDER_EXPORT_DIR:-${DATA_DIR}/exports}"
FORCE_RESEED="${NFZ_FORCE_RESEED:-false}"
RESEED_ON_VERSION_CHANGE="${NFZ_RESEED_ON_VERSION_CHANGE:-true}"
BACKUP_ON_RESEED="${NFZ_BACKUP_WORKSPACE_ON_RESEED:-true}"
SEED_VERSION_FILE="${SEED_DIR}/.nfz-seed-version"
WORKSPACE_VERSION_FILE="${WORKSPACE_DIR}/.nfz-seed-version"
BACKUP_ROOT="${DATA_DIR}/workspace-backups"

mkdir -p "$DATA_DIR" "$WORKSPACE_DIR" "$EXPORT_DIR" "$BACKUP_ROOT"

MONGO_EFFECTIVE_URL="${MONGO_URL:-${NFZ_WITH_MONGO_URL:-}}"
if [ -n "$MONGO_EFFECTIVE_URL" ]; then
  export MONGO_URL="$MONGO_EFFECTIVE_URL"
  export NFZ_WITH_MONGO_URL="$MONGO_EFFECTIVE_URL"
  MONGO_MASKED_URL=$(printf "%s" "$MONGO_EFFECTIVE_URL" | sed -E "s#//[^@]+@#//***:***@#")
  echo "[nfz] Mongo target: $MONGO_MASKED_URL"
else
  echo "[nfz] Mongo target: [missing]"
fi

read_version_file() {
  file="$1"
  if [ -f "$file" ]; then
    tr '\n' ';' < "$file" 2>/dev/null || true
  else
    printf ''
  fi
}

backup_workspace() {
  current_version="$1"
  timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
  backup_dir="$BACKUP_ROOT/${timestamp}"
  mkdir -p "$backup_dir"
  if [ -n "$current_version" ]; then
    printf "%s\n" "$current_version" > "$backup_dir/.nfz-seed-version"
  fi
  if find "$WORKSPACE_DIR" -mindepth 1 -maxdepth 1 | grep -q .; then
    cp -R "$WORKSPACE_DIR"/. "$backup_dir"/ 2>/dev/null || true
    echo "[nfz] Workspace backup created at $backup_dir"
  fi
}

reseed_workspace() {
  reason="$1"
  seed_version="$2"
  echo "[nfz] Reseeding workspace ($reason) -> $WORKSPACE_DIR"
  find "$WORKSPACE_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -R "$SEED_DIR"/. "$WORKSPACE_DIR"/
  if [ -n "$seed_version" ]; then
    printf "%s\n" "$seed_version" > "$WORKSPACE_VERSION_FILE"
  fi
}

seed_version=$(read_version_file "$SEED_VERSION_FILE")
workspace_version=$(read_version_file "$WORKSPACE_VERSION_FILE")
need_seed=false
seed_reason=''

if [ ! -d "$SEED_DIR" ]; then
  echo "[nfz] Workspace seed missing: $SEED_DIR"
elif [ ! -f "$WORKSPACE_DIR/nuxt.config.ts" ]; then
  need_seed=true
  seed_reason='workspace-empty'
elif [ "$FORCE_RESEED" = "true" ]; then
  need_seed=true
  seed_reason='force-reseed'
elif [ "$RESEED_ON_VERSION_CHANGE" = "true" ] && [ -n "$seed_version" ] && [ "$seed_version" != "$workspace_version" ]; then
  need_seed=true
  seed_reason="version-change ${workspace_version:-none} -> ${seed_version}"
fi

if [ "$need_seed" = "true" ]; then
  if [ -f "$WORKSPACE_DIR/nuxt.config.ts" ] && [ "$BACKUP_ON_RESEED" = "true" ]; then
    backup_workspace "$workspace_version"
  fi
  reseed_workspace "$seed_reason" "$seed_version"
else
  echo "[nfz] Workspace seed unchanged (${workspace_version:-no-version})"
fi

exec "$@"
