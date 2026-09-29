#!/usr/bin/env bash
# Starts the ACKB agent team. Each agent is a peer Claude session with the session id from its
# .claude/agents/*.md ("Session id: <uuid>"); an existing session is resumed, a new one gets that id.
# - curator, reviewer, ui and seo open as splits in one tmux window "ackb-agents"
#   (4 panes, tiled into an equal 2x2 grid)
# - the architect replaces this script in the current pane (your main window)
# Usage: scripts/agents.sh                    start everything (architect in this pane)
#        scripts/agents.sh curator reviewer   start only these peers (also: ui, seo)
#        scripts/agents.sh architect          start only the architect
#        DRY_RUN=1 scripts/agents.sh          print the commands instead of running them
set -euo pipefail
cd "$(dirname "$0")/.."
WINDOW=ackb-agents
MAX_PANES=4

# name  agent-file  model
PEERS=(
	"ackb-curator content-curator sonnet"
	"ackb-reviewer taxonomy-architect opus"
	"ackb-ui ui-designer sonnet"
	"ackb-seo seo sonnet"
)
ARCHITECT="ackb-architect ackb-architect opus"

[ -n "${DRY_RUN:-}" ] || [ -n "${TMUX:-}" ] || { echo "run this inside tmux"; exit 1; }

session_id() { grep -oE 'Session id: `[0-9a-f-]+`' ".claude/agents/$1.md" | grep -oE '[0-9a-f-]{36}'; }
session_exists() { ls ~/.claude/projects/*/"$1".jsonl >/dev/null 2>&1; }
selected() { [ $# -eq 1 ] && [ ${#ARGS[@]} -eq 0 ] || [[ " ${ARGS[*]} " == *" ${1#ackb-} "* ]]; }

# claude_cmd <name> <agent> <model>: resume the agent's session, or start it under its id.
claude_cmd() {
	local id
	id=$(session_id "$2")
	if session_exists "$id"; then
		echo "claude --resume $id --agent $2 --model $3 --permission-mode auto"
	else
		echo "claude --session-id $id --agent $2 -n $1 --model $3 --permission-mode auto"
	fi
}

ARGS=("$@")

for entry in "${PEERS[@]}"; do
	read -r name agent model <<<"$entry"
	selected "$name" || continue
	cmd=$(claude_cmd "$name" "$agent" "$model")
	if [ -n "${DRY_RUN:-}" ]; then echo "[$WINDOW] $cmd"; continue; fi
	if ! tmux list-windows -F '#W' | grep -qx "$WINDOW"; then
		tmux new-window -d -n "$WINDOW" -c "$PWD" "$cmd"
	else
		panes=$(tmux list-panes -t "$WINDOW" | wc -l | tr -d ' ')
		if [ "$panes" -ge "$MAX_PANES" ]; then echo "$WINDOW already has $MAX_PANES panes, not starting $name"; continue; fi
		tmux split-window -d -t "$WINDOW" -c "$PWD" "$cmd"
	fi
	tmux select-layout -t "$WINDOW" tiled >/dev/null
	echo "started $name ($model)"
done

read -r name agent model <<<"$ARCHITECT"
selected "$name" || exit 0
id=$(session_id "$agent")
if pgrep -f "claude.*$id" >/dev/null; then
	echo "$name is already running ($id)"
	exit 0
fi
cmd=$(claude_cmd "$name" "$agent" "$model")
if [ -n "${DRY_RUN:-}" ]; then echo "[this pane] $cmd"; exit 0; fi
echo "starting $name in this pane ($model)"
exec $cmd
