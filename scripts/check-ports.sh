#!/usr/bin/env bash
# Check that dev ports (5173 frontend, 8787 worker) are free before starting.
# If any are occupied, bail with diagnostic output: tiles process vs other project.
# Usage: check-ports.sh [port...]  (default: 5173 8787)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Port labels for output
declare -A PORT_LABEL=(
  [5173]="frontend (Vite)"
  [8787]="worker (Wrangler)"
)

PORTS=(${@:-5173 8787})

# Get PIDs listening on the port. Prefer ss (iproute2), fallback to lsof.
get_pids() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p { gsub(/.*pid=/, "", $NF); gsub(/[^0-9].*/, "", $NF); if ($NF != "") print $NF }' | sort -u
  elif command -v lsof >/dev/null 2>&1; then
    lsof -i ":$port" -t 2>/dev/null || true
  else
    echo "Port check requires 'ss' or 'lsof'. Install iproute2 or lsof." >&2
    exit 2
  fi
}

# Check if PID is from this project (tiles) by inspecting executable or cmdline.
is_tiles_process() {
  local pid="$1"
  local exe cmd
  if [[ -r /proc/$pid/exe ]]; then
    exe="$(readlink -f /proc/$pid/exe 2>/dev/null)" || exe=""
    [[ -n "$exe" && "$exe" == "$PROJECT_ROOT"* ]] && return 0
  fi
  if [[ -r /proc/$pid/cmdline ]]; then
    cmd="$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null)" || cmd=""
    [[ -n "$cmd" && "$cmd" == *"$PROJECT_ROOT"* ]] && return 0
  fi
  return 1
}

# Human-readable process description
proc_desc() {
  local pid="$1"
  local name=""
  if [[ -r /proc/$pid/cmdline ]]; then
    name="$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null | head -c 120)"
  fi
  [[ -z "$name" ]] && name="(unknown)"
  echo "$name"
}

# Collect occupied ports with their PIDs
occupied=()
for port in "${PORTS[@]}"; do
  pids=($(get_pids "$port"))
  if [[ ${#pids[@]} -gt 0 ]]; then
    occupied+=("$port")
  fi
done

if [[ ${#occupied[@]} -eq 0 ]]; then
  exit 0
fi

echo "Port(s) in use. Dev servers require these ports." >&2
echo "" >&2

for port in "${occupied[@]}"; do
  label="${PORT_LABEL[$port]:-$port}"
  echo "Port $port ($label):" >&2
  pids=($(get_pids "$port"))
  tiles_pids=()
  other_pids=()
  for pid in "${pids[@]}"; do
    [[ ! "$pid" =~ ^[0-9]+$ ]] && continue
    if is_tiles_process "$pid"; then
      tiles_pids+=("$pid")
    else
      other_pids+=("$pid")
    fi
  done

  if [[ ${#tiles_pids[@]} -gt 0 ]]; then
    echo "  Likely TILES (stale process from this project):" >&2
    for pid in "${tiles_pids[@]}"; do
      echo "    PID $pid: $(proc_desc "$pid")" >&2
    done
    echo "  Stop with: kill ${tiles_pids[*]}" >&2
  fi

  if [[ ${#other_pids[@]} -gt 0 ]]; then
    echo "  Likely DIFFERENT project or service:" >&2
    for pid in "${other_pids[@]}"; do
      echo "    PID $pid: $(proc_desc "$pid")" >&2
    done
    echo "  Free the port or stop the process(es) above." >&2
  fi
  echo "" >&2
done

echo "Refusing to start (frontend expects 5173, worker expects 8787)." >&2
exit 1
