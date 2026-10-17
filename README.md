# handdrawn-explainer

Hand-drawn whiteboard explainer videos from a scene file. See SKILL.md for the workflow and references/ for the format, style and pipeline.

Install:
- Claude Code: copy this folder to `~/.claude/skills/handdrawn-explainer/` (or a project's `.claude/skills/`).
- Codex: copy it to `~/.codex/skills/handdrawn-explainer/` (check your Codex version's skills directory).
- claude.ai: upload the `.skill` file via Settings, or paste SKILL.md as a project instruction and upload the folder.

Requirements for rendering video: Node 18+, ffmpeg, `npm i playwright && npx playwright install chromium`.
