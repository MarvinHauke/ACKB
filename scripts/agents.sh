#!/usr/bin/env bash
# Opens the ACKB agent team as splits in one tmux window "ackb-agents" (at most 4 panes).
# Each agent runs as a peer Claude session with the session id from its .claude/agents/*.md
# ("Session id: <uuid>"); an existing session is resumed, a new one gets that id.
# Usage: scripts/agents.sh            start curator and reviewer
#        scripts/agents.sh curator    start only one of them
set -euo pipefail
cd "$(dirname "$0")/.."
WINDOW=ackb-agents
MAX_PANES=4

# name  agent-file  model
AGENTS=(
	"ackb-curator content-curator sonnet"
	"ackb-reviewer taxonomy-architect opus"
)

[ -n "${TMUX:-}" ] || { echo "run this inside tmux"; exit 1; }

session_id() { grep -oE 'Session id: `[0-9a-f-]+`' ".claude/agents/$1.md" | grep -oE '[0-9a-f-]{36}'; }
session_exists() { ls ~/.claude/projects/*/"$1".jsonl >/dev/null 2>&1; }

for entry in "${AGENTS[@]}"; do
	read -r name agent model <<<"$entry"
	[ $# -eq 0 ] || [[ " $* " == *" ${name#ackb-} "* ]] || continue
	id=$(session_id "$agent")
	if session_exists "$id"; then
		cmd="claude --resume $id --agent $agent --model $model --permission-mode auto"
	else
		cmd="claude --session-id $id --agent $agent -n $name --model $model --permission-mode auto"
	fi
	if ! tmux list-windows -F '#W' | grep -qx "$WINDOW"; then
		tmux new-window -d -n "$WINDOW" -c "$PWD" "$cmd"
	else
		panes=$(tmux list-panes -t "$WINDOW" | wc -l | tr -d ' ')
		if [ "$panes" -ge "$MAX_PANES" ]; then echo "$WINDOW already has $MAX_PANES panes, not starting $name"; continue; fi
		tmux split-window -d -t "$WINDOW" -c "$PWD" "$cmd"
	fi
	tmux select-layout -t "$WINDOW" tiled >/dev/null
	echo "started $name ($id, $model)"
done
