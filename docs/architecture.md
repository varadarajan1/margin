# Margin — Architecture Proposal

Status: Starting stack approved: Railway, Pi Durable, SQLite, FTS5, and sqlite-vec. Exact provider APIs and deployment compatibility still require verification. No integrations or device behavior have been verified.

## Approved deployment direction

Start simple on Railway: one service instance with a persistent volume, hosting the web application, Pi Durable runtime, and background processing. Use explicit process supervision and graceful shutdown if running multiple processes. Do not assume separate Railway services can share this volume.

Store application data in `margin.sqlite`, let Pi Durable own a separate supported persistent store, and keep media on the volume initially. Use independent off-host backups. No horizontal scaling or Cloudflare-specific adaptation in the MVP. Verify current Railway pricing, volume behavior, memory requirements, and extension compatibility before deployment.

## Recommended starting stack

- TypeScript throughout.
- Next.js for the mobile-first web application and authenticated HTTP API.
- SQLite for items, source segments, durable job records, and application metadata; FTS5 for full-text search.
- sqlite-vec for semantic retrieval alongside full-text search.
- Pi Durable for learning-agent execution and conversation state, using its supported persistent storage and library-specific tools. Verify official APIs before integration.
- A separate Node.js worker for extraction, transcription, summarization, indexing, and speech generation.
- Private filesystem storage behind an adapter for source/media artifacts and generated audio, on Railway's persistent volume. Object storage can be added later.
- Portable Docker deployment with local persistent directories for development; Railway for initial production hosting.

### Why this approach
One language and an embedded application database keep the project manageable. Pi Durable owns its separate agent-state store; do not assume atomic transactions across the two stores. Long-running media work survives closing the iPhone app and does not depend on web-request timeouts. Hybrid text/vector retrieval helps with both exact technical terms and conceptual questions. Separate adapters avoid coupling the domain model to one AI or media provider.

### Alternatives deferred
- Native iOS: incompatible with the current development/testing setup and unnecessary for the initial workflow.
- Browser-only persistence: unsuitable for durable background processing and a shared server-side library.
- PostgreSQL, a separate vector database, or Redis: additional operations without demonstrated need at this scale.
- Cloudflare Workers/Durable Objects: potentially inexpensive, but require runtime/storage adaptation and a replacement for native sqlite-vec.
- Serverless-only execution: possible later, but long media jobs require explicit runtime and storage planning.

## Runtime flow
1. Capture API validates and durably records a URL, then returns an item ID.
2. A SQLite-backed job mechanism schedules ingestion with leases, bounded concurrency, retries, and idempotency. Evaluate compatible maintained options before implementing custom queue logic. Use short transactions, WAL mode, and appropriate busy handling.
3. Worker fetches/extracts supported content and records a versioned source document and stable segments.
4. Independent jobs generate summaries and embeddings. Requested audio generation is separate.
5. Chat retrieves original segments and returns answers with validated source references.
6. UI polls operation status initially; streaming chat may be added without changing durable conversation storage.

## Private access
Use an established authentication library with a single allowlisted owner identity and secure server-side session handling. No public registration. Exact login method depends on deployment and available identity provider.

Shortcut credentials are separately generated, hashed at rest, revocable, and scoped to capture only. Return only minimal capture receipts through that scope. Never put credentials in URLs. Browser APIs require appropriate CSRF/origin protections; all deployments require HTTPS outside local development.

## Retrieval and grounding
- Index original source segments, with source/document version, title, and timestamp/range metadata.
- Combine full-text and vector retrieval; optionally rerank only if evaluation warrants it.
- Scope item chat to the item by default; allow explicit library retrieval when requested.
- Only accept citations to segments actually supplied to generation.
- Citation existence validation does not prove claim support: human-reviewed evaluations remain necessary.
- Retrieved content is untrusted; it cannot authorize tool actions or override instructions.
- No public-web research tools in the MVP.

## Data lifecycle
Each item owns source versions, segments, summaries, audio artifacts, and indexing records. Each derivative records its source version, generator configuration/version, and creation time.

Deletion immediately hides an item and excludes it from retrieval; background cleanup removes artifacts and index records with retryable status. Proposed conversation behavior: retain conversations but mark deleted references unavailable, with a separate delete-conversation action. Historical quotations may remain in those conversations; disclose this and obtain approval before implementation.

Backups and external provider retention require explicit policies. Proposed export: JSON manifest plus available extracted text, transcripts, and briefing scripts; media export optional. A database-and-object backup restore must be tested, not merely documented.

## Safety and cost controls
- Restrict URL protocols and block private/local destinations, including redirects and DNS rebinding paths; use a vetted fetch boundary or controlled egress.
- Sanitize extracted HTML. Apply input-size, duration, timeout, redirect, and concurrency limits.
- Treat uploaded files as untrusted; validate actual formats and avoid arbitrary command interpolation.
- Configurable daily processing budget and per-job limits; log usage without source bodies or secrets by default.
- Automatic article summaries; explicit request for transcription and speech generation. Retry policy must avoid uncontrolled repeated paid calls.
- Document what content each provider receives before enabling it.

## Suggested module boundaries
- `apps/web`: UI, authenticated API, mobile presentation.
- `apps/worker`: background orchestration.
- `packages/domain`: schemas and shared contracts.
- `packages/db`: persistence and migrations.
- `packages/ingestion`: article and media adapters.
- `packages/ai`: model adapters, summaries, retrieval, conversation logic.
- `packages/testing`: fixtures and evaluation cases.

Use a workspace package manager; pin versions after checking compatibility during scaffolding.

## Decisions needed before implementation
1. Verify Railway service sizing, current price, persistent-volume behavior, backup destination, and sqlite-vec loading in the deployment image.
2. AI preference: hosted APIs for simplest setup, or local inference with corresponding hardware/quality constraints.
3. Monthly operating budget, especially transcription and audio.
4. Initial podcast input: recommend direct accessible episode audio URLs and authorized uploads, not arbitrary platform links.
5. Approve deletion/conversation behavior and retention policy.

No concrete provider, pricing, or transcript service is endorsed here without validation.
