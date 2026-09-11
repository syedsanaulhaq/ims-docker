# Agent Workspace Guidelines

## 1. Docker & Development Server Protection
- **NEVER launch or rebuild Docker containers from inside temporary git worktrees** (`.gemini/antigravity/worktrees/...`).
- **All Docker Compose commands MUST ONLY be run from the main workspace root** (`F:\ECP-Projects\ims-docker-v1`).
- Ensure running containers (`ims-backend`, `ims-frontend`) are always mounted to the primary repository (`F:\ECP-Projects\ims-docker-v1`).
- Do not stop or replace development containers from isolated tasks or subagents.

## 2. Git & Commit Guidelines
- Always commit verified changes to the `development` branch and push to origin (`git push origin development`).
- Use conventional commits format (`feat: ...`, `fix: ...`, `chore: ...`).
