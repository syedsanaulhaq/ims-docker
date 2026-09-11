# Docker & Environment Execution Rules

## CRITICAL: Container & Worktree Protection
1. **NEVER start, restart, or recreate Docker containers from temporary/isolated worktree directories** (such as `.gemini/antigravity/worktrees/...`).
2. **Docker commands (`docker compose up`, `docker compose build`, `docker run`, etc.) MUST ONLY be executed from the primary workspace root directory** (`F:\ECP-Projects\ims-docker-v1`).
3. **Never hijack host ports or replace running development containers** (`ims-backend`, `ims-frontend`) from any subagent, background task, or isolated worktree branch.
4. **Always verify container bind mounts** point directly to the main workspace directory (`F:\ECP-Projects\ims-docker-v1`) to prevent serving outdated or stale code.
