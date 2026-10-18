# Margin — Planning-Only Agent Handoff

## Assignment
Produce an implementation-ready work breakdown for Margin. Do not implement the application, scaffold packages, install dependencies, run paid APIs, deploy infrastructure, or change existing compatibility spikes. The owner explicitly paused implementation.

## Approved decisions
- Single-user personal learning library, primarily used on iPhone.
- Mobile-first web app with optional Home Screen installation; copy/paste capture and an iOS Shortcut.
- Articles discovered in Brave and X; full X thread ingestion excluded.
- Podcasts and YouTube lectures/tutorials; initial video understanding is transcript-based.
- Source-grounded summaries, concise single-narrator briefings, item and cross-library learning conversations.
- No proactive reminders or coding tools in the learning agent.
- Next.js/TypeScript, Pi Durable, SQLite, FTS5, sqlite-vec.
- Railway: one service instance, persistent volume, separate agent-state ownership, local media initially, off-host backups.

## Read first
- `docs/product-brief.md`
- `docs/acceptance-scenarios.md`
- `docs/architecture.md`
- `docs/feasibility-checks.md`
- `docs/agent-work-packages.md`

If earlier documents conflict, the approved decisions above take precedence. Flag inconsistencies rather than silently introducing new stack choices.

## Evidence already collected
An isolated spike exists in `spikes/runtime-compat/`. It passed locally on Linux x86_64 / Node 24.14.0 and in `node:24.14.0-bookworm-slim` with host-installed dependencies mounted into the container:
- Pi Durable 1.3.0 opens a SQLite store, commits application document state, closes, and reopens the same conversation/state.
- sqlite-vec 0.1.9 loads, performs a nearest-neighbor query, and survives database reopen.
- SQLite FTS5 indexing/querying works.
- Node's SQLite API emits an experimental warning.
- Integer IDs for the tested vec0 insert required BigInt bindings with node:sqlite.

This is NOT evidence of a fresh Docker dependency installation, crash recovery, Railway deployment, provider integration, iPhone compatibility, or production readiness. No paid model calls were made.

Official Pi Durable package docs confirm a Cloudflare SQLite adapter exists. Cloudflare remains deferred by owner preference, not because a custom storage adapter is necessarily required.

## Work breakdown to produce

### 0. Planning and contracts
- Resolve open decisions and record assumptions requiring owner approval.
- Specify content/source/segment/derivative identifiers and versioning.
- Define capture, library, processing-status, conversation, and citation interfaces.
- Define job retry, lease, idempotency, cancellation, and deletion behavior.
- Specify credentials, provider disclosures, budgets, export, and backup retention.

### 1. Platform foundation
- Repository and development setup (plan only).
- SQLite schema/migrations, private storage abstraction, and private authentication.
- Pi Durable adapter and one-process ownership rules.
- Background job mechanism and resource limits.
- Portable container and Railway volume layout.

### 2. Article vertical slice
- Durable URL capture and duplicate handling.
- Safe extraction, sanitization, segmentation, and failure fallback.
- Source-grounded summaries.
- Mobile library and reader.

### 3. Learning agent
- FTS5 and vector indexing with embedding-version tracking.
- Hybrid retrieval over original content.
- Item/library conversations, reference validation, comparison, and missing-evidence behavior.
- Reconnection, persistence, and crash-recovery tests.

### 4. Capture and media
- iOS Shortcut with revocable capture-only credential.
- Permitted YouTube transcript feasibility and supported podcast input selection.
- Transcript ingestion, chapters, timestamps, and retrieval integration.
- Explicit unsupported-source and visual-information limits.

### 5. Narrated briefings
- On-demand script generation and speech adapter.
- Private playback/download, cost limits, and artifact cleanup.
- Actual iPhone playback checks.

### 6. Release readiness
- Access-control and ingestion security tests.
- Faithfulness/retrieval/citation evaluation set.
- Off-host backup and restore drill.
- Railway deploy/restart/volume behavior checks.
- iPhone acceptance testing and documented limitations.

## Required output
Write `docs/implementation-backlog.md` only. Each task must include:
- Stable task ID and bounded outcome.
- Owner role and intended module ownership.
- Explicit dependencies and shared contracts.
- Acceptance-scenario IDs from `acceptance-scenarios.md`.
- Test/evidence requirements.
- Relative size (S/M/L), not speculative calendar promises.
- Risks and owner decisions needed.

Include a dependency graph, parallelizable waves, milestone exit gates, and a short list of unresolved decisions. Separate documentary planning work from implementation work that remains blocked on owner approval.

## Delegation boundaries
- You are a planning agent, not an implementation agent.
- Do not launch additional agents or spend money.
- Do not change source code, lockfiles, runtime configuration, or deploy anything.
- Do not claim tests passed beyond the evidence described above.
- Return a concise handoff summarizing the backlog and blockers.

## Dispatch status
Prepared, not dispatched. The current session exposes file and shell tools but no dedicated sub-agent delegation tool. Do not describe this assignment as running or completed without an actual agent launch and returned result.
