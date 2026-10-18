# Margin — Agent Work Packages

## Status and execution rule
Planning only: agents have not been launched and no implementation stack has been selected.

Read `product-brief.md` and `acceptance-scenarios.md` before starting. Acceptance IDs below refer to that document. Do not independently invent shared schemas or APIs. An integration owner approves shared contracts before parallel implementation begins.

## Phase 0 — Decisions and feasibility

### P0: Integration owner — architecture and shared contracts
Deliver:
- Architecture decision record covering hosting, authentication, database, jobs, storage, retrieval, and provider boundaries, with cost and operational trade-offs.
- Versioned contracts for items, source segments, derivatives, jobs, conversations, citations, and capture credentials.
- Endpoint and error conventions; idempotency, retry, deletion, retention, export, and backup rules.
- Configurable media limits and processing budgets; external-provider privacy disclosure.
- Repository structure, package ownership, shared fixtures, CI, and local-development instructions.

Contract requirements:
- Separate original content from generated derivatives.
- Stable source segment references with text ranges or timestamps and content versioning.
- Independent operation status so failed audio does not invalidate readable content.
- Retrieval results identify real items and source segments.
- Treat fetched and retrieved content as untrusted data.

Exit gate: owner reviews proposed trade-offs with the user; shared contracts and test fixtures are committed. Unknowns must be explicit rather than hidden in implementation.

### P1: Feasibility agent — capture and media access
Can run alongside P0, but findings must inform its final contracts.

Deliver:
- A documented, permitted YouTube transcript-access option tested against representative lectures/tutorials, including timestamps and failure cases.
- Recommendation for the initial podcast input format, validated with a sample episode.
- iOS Shortcut prototype/specification for Brave and X URL capture using a scoped credential.
- Audio playback spike suitable for manual testing on the user's iPhone.
- Supported-input matrix, costs/limits, and fallback behavior. Do not claim device checks passed without user/device evidence.

Exit gate: identify viable supported inputs or explicitly narrow scope. No universal YouTube or podcast compatibility claims.

## Phase 1 — Article library and learning agent
After P0 contracts are approved, workstreams may run in parallel against shared fixtures and mocks. Agree file ownership before dispatch.

### P2: Platform and library agent
Own: authentication, persistence, item lifecycle, jobs infrastructure, private storage, export/backup foundation.

Deliver:
- Private access and revocable save-only capture credentials.
- Durable, idempotent capture API and item management/search interfaces.
- Job execution/retry primitives and operation status.
- Deletion propagation, export, backup and restore procedure.

Acceptance: A1, A3, A5, A6, B3, F1–F3.
Dependencies: P0; coordinate fetch-security boundary with P3.

### P3: Article ingestion and summary agent
Own: article fetch/extraction adapter, sanitization, source segmentation, source-grounded summaries.

Deliver:
- Safe fetching with redirect/address checks, limits, timeouts, and fixtures.
- Readable content extraction, canonicalization policy, failure fallback.
- Summary outputs connected to source segments and extraction-quality flags.

Acceptance: A1–A3, B1–B3, F3.
Dependencies: P0 contracts; integrate with P2 jobs/storage.

### P4: Learning and retrieval agent
Own: indexing, retrieval, item/library conversations, citation validation.

Deliver:
- Retrieval over original source segments, not only generated summaries.
- Persistent conversation context, comparison flows, and inspectable references.
- Missing-evidence behavior and distinctions between source claims and background explanation.
- Evaluation fixtures for retrieval, citation support, and prompt-injection resistance.
- Removal of deleted content from retrieval.

Acceptance: C1–C5, A5 content search, F1 retrieval behavior.
Dependencies: P0 contracts; use fixture segments until P3 is ready.

### P5: Mobile web experience agent
Own: app shell, capture UI, library, reader, summary and conversation views.

Deliver:
- Responsive iPhone-first layouts, accessible controls, and keyboard-safe chat.
- Inbox/archive/favorites, save and retry flows, visible processing states.
- Source-reference navigation and original-page fallbacks.
- Home Screen installation guidance and copy/paste fallback.

Acceptance: A1–A6 UI behavior, B1–B3, C1–C4 interaction flows.
Dependencies: P0 API contracts; build against mocks before integration.

Phase 1 gate: a private article can be saved, summarized, discussed, compared with another save, and deleted end to end.

## Phase 2 — YouTube and podcasts

### P6: Media ingestion agent
Own: approved media adapters, transcript normalization, timestamped sections, transcription integration where supported.

Deliver:
- Only integrations validated in P1; documented limitations and supplied-content fallback.
- Timestamped source segments compatible with existing retrieval contracts.
- Transcript-quality/visual-limit disclosures and long-input cost controls.

Acceptance: D1–D4, B3, F3.
Dependencies: P1 feasibility, P2 jobs, P3 summary interface, P4 segment indexing.
Coordinate with P5 for transcript navigation; avoid independent UI changes without ownership agreement.

Phase 2 gate: representative podcast and YouTube content can be skimmed and compared with an article using valid source references.

## Phase 3 — Audio and iPhone validation

### P7: Narrated briefing agent
Own: briefing-script generation, speech adapter, private audio artifacts.

Deliver:
- On-demand single-narrator briefing with visible script and source linkage.
- Bounded generation costs, status/retry behavior, and deletion hooks.
- Playback/download contract; coordinate player implementation with P5.

Acceptance: E1–E3, B3, F1.
Dependencies: stable source/summary contracts and job/storage infrastructure.

### P8: Integration and quality agent
Starts test planning during Phase 0; validates each milestone rather than waiting until the end.

Deliver:
- Contract and end-to-end tests mapped to acceptance IDs.
- Security checks for private access, credentials, untrusted content, and URL ingestion.
- Human-review rubric and representative source-grounded answer evaluations.
- iPhone manual test checklist and recorded results, supported by actual device testing.
- Backup/restore demonstration, known-limitations document, and release checklist.

Acceptance: all scenarios, with specific ownership of release evidence.
Dependencies: staged integrations from all packages.

## Agent handoff template
Every task handoff must state:
1. Scope and explicit non-goals.
2. Owned files/modules and shared contract version.
3. Dependencies and mock/fixture inputs.
4. Acceptance scenario IDs.
5. Tests run and actual results.
6. Limitations, unresolved decisions, and migration/configuration instructions.

## Coordination rules
- Integration owner controls shared schema/API changes and milestone merges.
- Use separate branches/worktrees when available; avoid simultaneous edits to shared files.
- Provider calls sit behind adapters and have fixture-based tests.
- No credentials in source control, logs, fixtures, or agent handoffs.
- Agents must not report live integrations or iPhone behavior as verified without evidence.
- Delegation does not replace review: check cross-module flows and citation quality at every gate.
