# Margin — Implementation Work Breakdown

Status: implementation is owner-approved. The first local article-library vertical slice is implemented and under review; remaining backlog items still require explicit scope and unresolved provider/privacy decisions before execution. No production deployment or paid AI integrations are authorized by this status alone.

This backlog follows the approved single-user stack and decisions in `planning-agent-handoff.md`: Next.js/TypeScript, Pi Durable, SQLite + FTS5 + sqlite-vec, one Railway service/instance with persistent volume, local media initially, and off-host backups. It does not introduce Cloudflare, PostgreSQL, Redis, native iOS, or coding-agent tools.

## Evidence baseline and limits

The handoff reports an isolated compatibility spike in `spikes/runtime-compat/`: Pi Durable 1.3.0 persistence reopen, sqlite-vec 0.1.9 vector query/reopen, and FTS5 query passed on Linux x86_64 / Node 24.14.0 and in `node:24.14.0-bookworm-slim` with dependencies mounted from the host. The same report notes Node SQLite's experimental warning and BigInt binding for the tested sqlite-vec primary key. These are **reported spike results**, not independently re-run for this backlog; they do not establish fresh container installs, crash recovery, Railway operation, provider compatibility, iPhone behavior, or production readiness. Do not use them to waive deployment or recovery tests.

## Roles and shared contract gates

- **Owner/product:** resolves product, privacy, provider, and cost choices; supplies URLs/device tests where required.
- **Integration owner/architect:** owns contract versions, cross-module boundaries, migration and release gates.
- **Platform engineer:** app/API, auth, persistence, jobs, deployment, backups.
- **Ingestion engineer:** safe extraction and media adapters.
- **AI/retrieval engineer:** summaries, embeddings, retrieval, citations, Pi Durable tools.
- **Frontend engineer:** mobile web and player.
- **QA/security:** test strategy, abuse cases, evaluation and release evidence.

No concurrent work may alter shared schemas or API contracts without integration-owner approval. Names below are role assignments, not agent dispatches.

## Work items

### Phase 0 — Close decisions and define contracts (documentary work only)

#### PL-01 — Approve operating, provider, and privacy policy
- **Outcome:** Decision record for hosted vs local model use; selected authentication method; monthly/provider spend ceiling and per-job limits; provider data disclosures; supported source/provider class; retention, deletion, backup retention, conversation behavior after item deletion, and transcript/audio upload policy. Document unsupported sources and fallbacks.
- **Owner/module:** Owner with integration owner; `docs/decisions/` (proposed).
- **Dependencies/contracts:** None; informed by PL-02 feasibility. No model/provider selected by implication.
- **Acceptance IDs:** A6, D2, E1, F1–F3.
- **Evidence:** Signed decision record with current provider terms/pricing reviewed at decision time; user approval for data flow and spend. Do not send private content to a provider before approval.
- **Size:** M.
- **Risk/decision needed:** Hosted APIs simplify deployment but incur usage/data-transfer considerations; local inference raises Railway resource and quality demands. **Owner decision required.**

#### PL-02 — Validate external and device feasibility
- **Outcome:** Evidence report for permitted YouTube transcript access on 3–5 owner-supplied lecture/tutorial URLs; a representative podcast input; iOS Shortcut sharing from Brave and X; and iPhone web/audio behavior. Record exact supported input classes, failures, captions/timestamps, restrictions, cost, environment, fallback, and date. No universal support promises.
- **Owner/module:** QA/security + ingestion engineer; owner supplies media and performs phone checks; `docs/feasibility-results.md` (proposed).
- **Dependencies/contracts:** PL-01 for permission/provider constraints; initial findings feed PL-03. Shortcut test requires an HTTPS endpoint later; before then only interaction/source formats can be inspected. Device claims need actual owner iPhone evidence.
- **Acceptance IDs:** A4, D1–D3, E3.
- **Evidence:** Source URLs or sanitized identifiers, permitted method, expected/actual behavior, transcript samples/quality notes, iOS/device/browser version, sanitized screenshots/logs, cost and limitations. Unrun checks remain explicitly unverified.
- **Size:** M.
- **Risk/decision needed:** YouTube caption retrieval can be unavailable or restricted; podcast page URL may not expose audio. If no permitted method works, narrow to supplied transcript/authorized upload. Owner must provide URLs and device time.

#### PL-03 — Freeze domain, persistence, and service contracts
- **Outcome:** Versioned schema/API RFC and test fixtures for Item, SourceVersion, Segment, Derivative, ProcessingOperation/Job, Conversation link, Citation, and capture credential. Define stable IDs; canonical URL policy; states; error envelope; payload limits; retries, leases, idempotency, cancellation; FTS/vector indexing lifecycle; deletion propagation; source-version invalidation; export; and contracts between app DB and Pi Durable's separate store. Define media file layout and authenticated access.
- **Owner/module:** Integration owner; `packages/domain`, `packages/db`, `packages/testing` (proposed boundaries only).
- **Dependencies/contracts:** PL-01 decisions; PL-02 input classes. No code implementation before owner approves RFC.
- **Acceptance IDs:** A1–A6, B1–B3, C1–C5, D1–D4, E1–E3, F1–F3.
- **Evidence:** Reviewed contract document, JSON fixtures, state-transition diagrams, API examples, deletion/export scenarios, migration/version rules, and owner sign-off.
- **Size:** L.
- **Risk/decision needed:** Pi Durable state and app data are separate stores; don't promise atomic cross-store transactions. Establish recovery/reconciliation semantics and conversation handling for deleted source material. Owner approves contracts.

#### PL-04 — Select local job and deployment design
- **Outcome:** Verify Railway current plan/service/volume constraints and a single-instance portable Docker topology; select SQLite job implementation after checking Node compatibility and lease/retry support; specify WAL/busy handling, process supervision, graceful shutdown, memory/concurrency limits, off-host backup destination and restore procedure. Pin no dependencies until implementation authorization.
- **Owner/module:** Integration owner + platform engineer; ADR in `docs/decisions/`.
- **Dependencies/contracts:** PL-01, PL-03; may review the reported spike but must independently run deployment-specific tests later.
- **Acceptance IDs:** A1, B3, F2, F3.
- **Evidence:** Dated provider docs and cost assumptions; architecture diagram; compatibility plan. Railway volume persistence/restart/backup and fresh Docker install remain deployment-stage verification, not satisfied by spike.
- **Size:** M.
- **Risk/decision needed:** SQLite one-writer limitations; Railway persistent storage/backup constraints and resource costs may influence topology. Owner accepts single instance and recovery objectives.

**Phase 0 exit gate:** Owner approves PL-01, PL-03 and PL-04; PL-02 either demonstrates a permitted path or explicitly narrows media support; no key data lifecycle or spend decision is implicit.

### Phase 1 — Private article library vertical slice (implementation blocked pending owner approval)

#### IM-01 — Scaffold portable app and local development
- **Outcome:** Minimal Next.js/TypeScript app, agreed workspace/module boundaries, Docker/local setup, health check, CI, pinned dependencies, secrets hygiene, and documented start/test workflow. No unrelated features.
- **Owner/module:** Platform engineer; `apps/web`, `packages/domain`, CI/container files.
- **Dependencies/contracts:** Phase 0 exit; PL-03 contracts and PL-04 topology. Owner implementation authorization.
- **Acceptance IDs:** A6, B3.
- **Evidence:** Clean checkout installs from lockfile; local app/health check and CI pass; no credentials embedded. Experimental Node SQLite warning documented and accepted or mitigated.
- **Size:** M.
- **Risk/decision needed:** SQLite native addon/extension platform support and version pinning. Avoid representing spike's mounted host dependencies as fresh-build proof.

#### IM-02 — Private owner authentication and scoped capture credential
- **Outcome:** Single-owner allowlist and secure session; no registration; capture-only random credential stored hashed and revocable; endpoints enforce least privilege and safe origin/CSRF behavior. HTTPS required in deployment.
- **Owner/module:** Platform engineer; `apps/web` auth/API, `packages/db` credential storage.
- **Dependencies/contracts:** IM-01, PL-01 auth choice, PL-03 credential/API contract.
- **Acceptance IDs:** A4, A6.
- **Evidence:** Automated unauthenticated, invalid, revoked, scope-escalation, CSRF/origin, and secret-redaction tests; manual auth flow.
- **Size:** M.
- **Risk/decision needed:** Owner chooses authentication provider/method. Shortcut secret recovery and rotation UX must be decided; never put secret in URL/logs.

#### IM-03 — SQLite schema, storage, and item lifecycle
- **Outcome:** Migrations and repositories for items/source versions/derivatives/operations; canonical URL duplicate behavior; durable create-before-processing; inbox, favorite, archive/restore, delete; private local artifact storage. Pi Durable store remains separately owned. Implement agreed FTS5/vec tables only as dependencies are ready.
- **Owner/module:** Platform engineer; `packages/db`, `packages/storage` (proposed).
- **Dependencies/contracts:** IM-01, PL-03; coordinate `sqlite-vec` build/loading and FTS lifecycle.
- **Acceptance IDs:** A1–A3, A5, B3, F1.
- **Evidence:** Migration/reopen tests; duplicate fixtures including meaningful query parameters; transaction/failure tests; deletion cascade/retry tests; file access boundary checks.
- **Size:** L.
- **Risk/decision needed:** App DB and Pi Durable DB cannot share atomic transaction by assumption; stale agent references/search indexes after deletion need retry-safe cleanup. Owner approves derivative and history retention policy.

#### IM-04 — Durable SQLite background processing
- **Outcome:** Bounded job runner integrated with app DB, leases, attempts/backoff, idempotency keys, cancellation, terminal errors, and independent derivative status. Jobs continue after request/client closes; safe shutdown/restart behavior. No unbounded/automatic paid retries.
- **Owner/module:** Platform engineer; `apps/worker` or in-process supervised worker, `packages/jobs`.
- **Dependencies/contracts:** IM-01, IM-03, PL-03/PL-04, PL-01 budget. Verify selected job mechanism before package choice.
- **Acceptance IDs:** A1–A2, B3, D2, E1, F3.
- **Evidence:** Deterministic tests for duplicate enqueue, lease expiry, retry, cancellation, process termination/restart, independent derivative failures, and budget guard. No paid-provider testing required.
- **Size:** L.
- **Risk/decision needed:** Single process/one SQLite writer; external provider call can complete while process dies before result commit, so calls need idempotency/cache/reconciliation and expense limits.

#### IM-05 — Safe article fetch, extraction, and source segmentation
- **Outcome:** URL validation and controlled fetch; block forbidden schemes/private/local targets and redirect/DNS rebinding paths; size/timeout/redirect limits; sanitized readable text; stable source segments and extraction quality; preserve original URL on failure. Do not bypass access controls.
- **Owner/module:** Ingestion engineer; `packages/ingestion/article`.
- **Dependencies/contracts:** PL-02 supported public article class, PL-03 segment and source-version contract, IM-03/IM-04. Share fetch-security interface with security reviewer.
- **Acceptance IDs:** A1–A3, B1–B3, F3.
- **Evidence:** Fixture tests for supported/unsupported, malformed HTML, scripts/XSS, redirect to private address, DNS/address policy, timeouts, oversized page, extraction failure, canonical duplicates. Review SSRF defenses.
- **Size:** L.
- **Risk/decision needed:** Publisher markup and robots/terms vary; extraction support must be documented. Network egress controls should complement validation.

#### IM-06 — Source-grounded article summary
- **Outcome:** Generate overview and key takeaways from extracted source, tied to versioned source segments; disclose partial extraction; only summarize on successful extraction; persist model/provider/version and usage metadata; cache by source/version/config.
- **Owner/module:** AI/retrieval engineer; `packages/ai/summarization`.
- **Dependencies/contracts:** PL-01 provider/budget approval, PL-03 derivative/citation contract, IM-04/IM-05.
- **Acceptance IDs:** A2, B2–B3, F1.
- **Evidence:** Controlled fixtures with claim-to-passage review and caveat checks; failure/partial-source behavior; cost accounting and retry limits. Human rubric and threshold approved before release.
- **Size:** M.
- **Risk/decision needed:** Hallucination and provider data exposure. Owner approves hosted-provider use and source retention/transmission.

#### IM-07 — Mobile-first library, article reader, and status UI
- **Outcome:** Responsive iPhone-first inbox, save/paste, item states, retry, archive/favorite/delete, article reader, summary, original fallback, references to source passages; keyboard-safe layouts and accessible controls. Copy/paste fallback usable without Shortcut.
- **Owner/module:** Frontend engineer; `apps/web` library/reader components.
- **Dependencies/contracts:** PL-03 APIs; IM-02 auth, IM-03 lifecycle, IM-05/IM-06 payloads. Mock implementation can start only after interfaces are approved and owner authorizes build.
- **Acceptance IDs:** A1–A5, B1–B3.
- **Evidence:** Component/flow tests and responsive viewport checks; manual iPhone check for save, reader typography, keyboard and status states. Native iOS build is not required.
- **Size:** L.
- **Risk/decision needed:** iPhone/Safari behavior must be tested on actual device; Home Screen install remains optional and not a capture guarantee.

#### IM-08 — Article vertical-slice integration and security gate
- **Outcome:** Authenticated user saves article, processing survives page close, reads summary/source, searches it, and deletes it; failures are recoverable. Review the end-to-end system for private access, SSRF, injection, retry duplication, and deletion leaks.
- **Owner/module:** Integration owner + QA/security; `packages/testing`, integration suite.
- **Dependencies/contracts:** IM-02–IM-07; all API/schema contracts frozen.
- **Acceptance IDs:** A1–A6, B1–B3, F1, F3.
- **Evidence:** End-to-end test report on clean deployment; security review findings closed or accepted; no secrets/source content in logs; negative tests included.
- **Size:** L.
- **Risk/decision needed:** Failure across app DB and agent storage can leave orphaned records; reconciliation path required. Owner accepts quality threshold and known source limitations.

**Phase 1 exit gate:** IM-08 passes; a private article can be saved, summarized, searched, read, and deleted end-to-end. No dependency on unvalidated audio or video integrations.

### Phase 1b — Learning agent and cross-library retrieval (may run in parallel after contracts and article fixtures)

#### IM-09 — Search indexing and hybrid retrieval
- **Outcome:** Index original source segments in FTS5 and sqlite-vec; track embedding model/version; support reindex and deletion; merge/rank exact and semantic results with source/version metadata. Never retrieve archived/deleted content incorrectly (archived remains searchable by product rule).
- **Owner/module:** AI/retrieval engineer; `packages/ai/retrieval`, `packages/db/search`.
- **Dependencies/contracts:** PL-03 segment/index contract; IM-03, IM-05; embedding choice from PL-01. Reported spike is context only; validate chosen Node driver/build in project environment.
- **Acceptance IDs:** A5, C2–C3, D4, F1.
- **Evidence:** Tests for exact terms, paraphrase queries, ranking, no-result, item scoping, version replacement, deletion, sqlite-vec/FTS migrations and reopen. Embedding provider costs/disclosures approved.
- **Size:** L.
- **Risk/decision needed:** sqlite-vec extension ABI/platform compatibility; embedding drift requires rebuild strategy. No scale claims without benchmark.

#### IM-10 — Pi Durable learning conversations and safe tools
- **Outcome:** Integrate Pi Durable with its own persistent store and one-process ownership; persist conversation mapping to items; implement narrowly scoped `search_library`, `read_source_segments`, and `get_transcript_sections` tools. No shell/filesystem/code tools. Provide current-item default and explicit library scope, reconnectable view, request-id idempotency, and safe handling of untrusted source text.
- **Owner/module:** AI/retrieval engineer; `packages/ai/agent`, `packages/agent-runtime/pi-durable`.
- **Dependencies/contracts:** PL-01 provider; PL-03 conversation/tool/citation contract; IM-03/IM-04/IM-09. Pi Durable package/API pinned and reviewed during authorized implementation.
- **Acceptance IDs:** C1–C5, A6, F1.
- **Evidence:** Mock-model tests for item and library scope, retries/request IDs, reconnection and history; injected source instructions cannot access secrets or invoke absent tools; independently verify reopen/crash recovery and missing-extension/task behavior. Reported reopen spike is not crash recovery evidence.
- **Size:** L.
- **Risk/decision needed:** Experimental Pi Durable API/storage semantics and provider context limits. Avoid unsupported atomicity between agent and app DB; define orphan reconciliation. Owner chooses model/provider and spend cap.

#### IM-11 — Citation validation and source-grounded response UI
- **Outcome:** Constrain model citations to retrieved source IDs/segments and timestamp ranges, validate every reference against stored source version, render navigable passages/timestamps, and distinguish source statements from inference/background. State uncertainty when evidence is absent.
- **Owner/module:** AI/retrieval engineer + frontend engineer; `packages/ai/citations`, `apps/web/chat`.
- **Dependencies/contracts:** PL-03 citation contract, IM-09, IM-10, IM-07.
- **Acceptance IDs:** C1–C5.
- **Evidence:** Adversarial evaluation with unsupported questions, mixed sources, invalid IDs, cross-version stale citations, prompt injection, and human check that citations actually support claims (not merely exist).
- **Size:** L.
- **Risk/decision needed:** A valid reference does not prove its claim; define acceptable citation-support threshold and response UI for background information.

#### IM-12 — Library chat and learning evaluation
- **Outcome:** Complete item chat, explicit cross-library retrieval, comparison/synthesis, persistent follow-ups, and a repeatable human-reviewed evaluation set for usefulness, source fidelity, and missing-evidence behavior.
- **Owner/module:** AI/retrieval engineer + QA; `packages/testing/evals`, `apps/web/chat`.
- **Dependencies/contracts:** IM-09–IM-11 and at least two source fixtures. Can develop with fixtures before full UI integration.
- **Acceptance IDs:** C1–C5, A5.
- **Evidence:** Representative questions with cited evidence, no-source behavior, comparisons across saved documents, prompt-injection tests, review rubric and owner-approved threshold. Track model and prompt version.
- **Size:** M.
- **Risk/decision needed:** Evaluation thresholds and model quality/cost vary; owner approves whether results meet personal-use bar.

**Phase 1b exit gate:** IM-12 evaluation passes owner-agreed threshold; citations resolve and are substantively supported; persistent conversations recover after restart tests. Combined with Phase 1, article-to-learning loop works.

### Phase 2 — iPhone Shortcut, YouTube, and podcasts (each integration gated by PL-02)

#### IM-13 — iOS Shortcut capture
- **Outcome:** Document/installable Shortcut accepts a shared URL from Brave/X, sends HTTPS POST with scoped capture credential, displays receipt, and fails safely offline/revoked; copy/paste remains independent. Do not promise native share-sheet extension behavior.
- **Owner/module:** Platform engineer + owner device tester; `docs/ios-shortcut/` and capture UI/API.
- **Dependencies/contracts:** IM-02 capture endpoint; PL-02 confirms URL behavior; deployed HTTPS endpoint. Owner must manually install/test on own iPhone.
- **Acceptance IDs:** A4, A3, A6.
- **Evidence:** Actual device test from Brave and X article link, post fallback, duplicate, revoked credential and network failure; secret absent from URL/export/logs. Record iOS/browser/Shortcut version.
- **Size:** M.
- **Risk/decision needed:** X may share post URL not article URL; Shortcut import/sharing can expose secret. Decide rotation/revocation procedure and safe installation instructions.

#### IM-14 — YouTube transcript adapter
- **Outcome:** Implement only the permitted transcript approach validated in PL-02; normalize text/timestamps, retain original URL, expose provider limitations and transcript quality. If unavailable, preserve link and offer only approved supplied-transcript/authorized-upload fallback.
- **Owner/module:** Ingestion engineer; `packages/ingestion/youtube`.
- **Dependencies/contracts:** PL-02 approval and PL-01 rights/provider policy; PL-03 media/source contract; IM-04/IM-09. Blocked if no permitted access path.
- **Acceptance IDs:** D1–D4, A2, B3, F3.
- **Evidence:** Representative lecture/tutorial fixtures; language, missing captions, timestamp and quality checks; permitted access/source restrictions documented; URL-fetch safety and limits. No metadata-only fabricated summary.
- **Size:** L.
- **Risk/decision needed:** Captions may be unavailable, inaccurate, or restricted; visually dependent tutorials exceed transcript-only capability. Owner supplies sample URLs and approves fallback.

#### IM-15 — Podcast ingestion/transcription adapter
- **Outcome:** Support exactly the input class selected in PL-02 (e.g. accessible audio URL and/or authorized upload); enforce format/size/duration limits; create transcript, timestamped segments, and operation status. Do not imply arbitrary podcast-platform support.
- **Owner/module:** Ingestion engineer; `packages/ingestion/podcast`.
- **Dependencies/contracts:** PL-02 source choice, PL-01 budget/rights, PL-03 media contract, IM-04/IM-09.
- **Acceptance IDs:** D1–D4, A2, B3, F3.
- **Evidence:** A legally usable representative episode; download/format/timeouts, transcript quality/timestamp, cost and cleanup checks; negative unsupported-source case. Authorized-upload path tested only if selected.
- **Size:** L.
- **Risk/decision needed:** Transcription cost, long-duration processing, licensing and access limitations. Owner chooses initial source and maximum duration/size.

#### IM-16 — Timestamped transcript and media views
- **Outcome:** Mobile skimmable transcript, overview/key takeaways/chapters, timestamp jumps, transcript-based video caveat and unavailable-visual handling; processed segments are searchable and usable by the agent.
- **Owner/module:** Frontend engineer + ingestion engineer; `apps/web/media`, shared transcript view.
- **Dependencies/contracts:** IM-14/IM-15 outputs, IM-07 components, IM-09 indexing, IM-11 citations.
- **Acceptance IDs:** D1–D4, C1–C4, B3.
- **Evidence:** Representative lecture/tutorial/podcast tests, timestamp navigation on source, mobile long-transcript usability, missing timestamp/transcript fallback and explicit visual limitations.
- **Size:** L.
- **Risk/decision needed:** Platform timestamp links differ; auto captions can be wrong; owner accepts transcript-only boundary and any unsupported media class.

**Phase 2 exit gate:** Only validated supported podcast/YouTube classes are advertised; representative media can be skimmed, searched, discussed, and compared to an article with accurate timestamps/references. Unsupported cases preserve URL and disclose limitation.

### Phase 3 — Narrated briefing, backups, Railway deployment, and release validation

#### IM-17 — Article briefing script and speech adapter
- **Outcome:** User-triggered generation of a concise single-narrator article adaptation with visible script, AI label, source linkage, caveats, bounded duration and independent processing status. Cache by source/config; no host-style dialogue.
- **Owner/module:** AI/retrieval engineer; `packages/ai/audio`.
- **Dependencies/contracts:** PL-01 selected provider and budget; PL-03 derivative contract; IM-04/IM-06. Only after article text summaries validated.
- **Acceptance IDs:** E1–E2, B3, F1.
- **Evidence:** Script claim/caveat review against article; duplicate request/retry/cost tests; audio artifact access/deletion tests; no paid calls absent owner approval.
- **Size:** M.
- **Risk/decision needed:** Speech provider, pronunciation, data exposure, and costs. Owner confirms duration target and spend limit.

#### IM-18 — Private audio playback and optional media briefings
- **Outcome:** Authenticated streaming/download for generated files, player seek/resume behavior, cleanup and independent audio-job failure. Article audio is required; podcast/video briefing only if separately approved and content-quality validated.
- **Owner/module:** Frontend engineer + platform engineer; `apps/web/audio`, storage adapter.
- **Dependencies/contracts:** IM-17, IM-02 access control, PL-03 private media contract; iPhone test access.
- **Acceptance IDs:** E1, E3, A6, F1.
- **Evidence:** Authorized/unauthorized media fetch, expiry/deletion, actual iPhone play/pause/seek/reopen/download/background/lock-screen observations. Do not claim behavior not observed.
- **Size:** M.
- **Risk/decision needed:** Browser/iOS background playback restrictions; generated files increase volume use. Owner accepts download fallback and retention policy.

#### IM-19 — Export, off-host backup, and restore
- **Outcome:** Agreed export of saved URLs and available source/transcript/script data; SQLite-consistent backup including Pi Durable state and media; off-host retention and tested restore to clean environment. Ensure snapshots are mutually usable despite separate stores.
- **Owner/module:** Platform engineer; `packages/backup`, operational runbook.
- **Dependencies/contracts:** PL-01 retention, PL-03 export/deletion contract, IM-03 and Pi Durable storage integration, PL-04 backup choice.
- **Acceptance IDs:** F1–F2, A6.
- **Evidence:** Automated export contents check; restore drill verifying representative items, transcripts, derivatives, conversations/references, and indexes; sanitized runbook and recovery-point objective.
- **Size:** L.
- **Risk/decision needed:** Independent file/database snapshots can be inconsistent; Pi Durable WAL/state and SQLite WAL need supported backup procedure. Owner selects off-host destination, retention and recovery objectives.

#### IM-20 — Railway deploy and operations validation
- **Outcome:** Deploy portable container as one instance with persistent volume, HTTPS, health/readiness, graceful restart, bounded worker concurrency, migration/rollback procedure, logs without secrets/private source by default, usage visibility and backup schedule. No horizontal scaling.
- **Owner/module:** Platform engineer; container/deployment config and runbooks.
- **Dependencies/contracts:** PL-04; IM-01/02/03/04/19; owner approves provider spend and deploy.
- **Acceptance IDs:** A1, A6, B3, F2–F3.
- **Evidence:** Fresh image build/install; live persistent-volume write/restart/redeploy test; sqlite-vec load and FTS/vector queries in actual image; job recovery; auth/HTTPS; backup restore; dated Railway cost and resource observations. No claim from local spike substitutes.
- **Size:** L.
- **Risk/decision needed:** Railway current pricing/volume semantics and Node addon compatibility; one instance is a single failure domain. Owner explicitly authorizes deployment and spending.

#### IM-21 — Full acceptance, safety, and personal-use release gate
- **Outcome:** Run complete acceptance suite, security review, human faithfulness/retrieval/citation evaluation, supported-source smoke tests, iPhone capture/media checks, backup restore, and known-limitations review. Track unresolved issues and require owner acceptance.
- **Owner/module:** QA/security + integration owner; release checklist/evaluation report.
- **Dependencies/contracts:** IM-08, IM-12, IM-13–IM-20; source/provider/device access and approved cost ceilings.
- **Acceptance IDs:** A1–A6, B1–B3, C1–C5, D1–D4, E1–E3, F1–F3.
- **Evidence:** Test matrix by scenario ID; pass/fail and environment; human-reviewed sample; security findings disposition; actual iPhone behavior; source support matrix; restore report; owner sign-off.
- **Size:** L.
- **Risk/decision needed:** Release quality thresholds, provider terms, and limitations acceptance are personal owner decisions. Any critical access-control, SSRF, citation fabrication, or data-loss issue blocks release.

**Phase 3 exit gate:** IM-21 evidence is complete; no unresolved critical security/data-loss defect; all remaining limitations are documented and accepted by owner. This is a personal-use release, not a public launch certification.

## Dependency graph

```text
PL-01 owner policy ─┬─> PL-03 shared contracts ─> IM-01 scaffold
                    ├─> PL-02 feasibility ──────┘
                    └─> PL-04 Railway/jobs ADR ─────┐
                                                     v
IM-01 -> IM-02 auth/credentials -> IM-03 SQLite lifecycle -> IM-04 durable jobs
                                      |                  |
                                      v                  v
                                IM-05 article fetch -> IM-06 summaries
                                      |                  |
                                      +------> IM-07 mobile UI <----+
                                                       |
IM-03/05 -> IM-09 hybrid indexing -> IM-10 Pi Durable tools -> IM-11 citations -> IM-12 eval
                                                       |
PL-02 media gates -> IM-14 YouTube ----┐              |
PL-02 media gates -> IM-15 podcast ----+-> IM-16 transcript view/search/agent integration
IM-06 -> IM-17 briefing -> IM-18 private player/iPhone validation
IM-03 + IM-10 + media -> IM-19 backup/restore -> IM-20 Railway operations
IM-08 + IM-12 + IM-16 + IM-18 + IM-19 + IM-20 -> IM-21 release gate
```

IM-07 can build against PL-03-approved mocks while ingestion/backend modules proceed, but integration must respect contract freeze. IM-09/IM-10 can use fixture segments after IM-03 and PL-03; they do not need the complete media milestone. IM-13 depends on a deployed authenticated capture endpoint and must be manually tested by owner.

## Parallelizable work waves

- **Wave 0 (planning, no implementation):** PL-01 owner choices; PL-02 source/device feasibility; PL-03 contracts; PL-04 hosting/job ADR. PL-02 and PL-04 can investigate in parallel with PL-03; final contracts incorporate their findings. No coding agents dispatched.
- **Wave 1 (after Phase 0 approval):** IM-01 foundation, then IM-02/03. IM-05 article extraction design/tests may proceed against approved contracts and fixtures; IM-07 UI may proceed against mocks after API contract freeze.
- **Wave 2:** IM-04 jobs; IM-05 ingestion; IM-06 summary; IM-07 UI integration. IM-09 indexing can start from fixtures once DB/segment contracts and IM-03 exist.
- **Wave 3:** IM-10 Pi Durable integration can proceed with mock retrieval while IM-09 matures; IM-11 citations and IM-12 evaluation depend on actual tool/retrieval contracts. IM-08 integrates article flow after IM-02–07.
- **Wave 4:** IM-13 Shortcut (needs HTTPS capture endpoint); IM-14 and IM-15 are independent only after PL-02 validates respective inputs; IM-16 integrates the selected media adapters and retrieval/UI.
- **Wave 5:** IM-17/18 audio; IM-19 backup/restore can begin once persistence contracts stabilize, then IM-20 Railway; IM-21 validates all shipped scope.

## Owner decisions and unresolved questions

1. **AI provider and data handling:** Hosted API vs local inference; approve provider terms/data transfer and model choices. Required before IM-06/09/10/14/15/17.
2. **Operating budget:** Monthly hosting and AI ceiling; per-item audio/transcription limits and hard stop/confirmation behavior. Required before paid integrations.
3. **Authentication:** Single-owner login method/provider and recovery process; capture credential rotation and revocation UX.
4. **Source support:** Provide representative YouTube URLs and podcast episode; choose podcast source class only after permitted-access test. No universal platform assumption.
5. **Data lifecycle:** Whether deletion preserves chat history/quotations or purges it; provider retention; backup expiry; export scope and media inclusion.
6. **Railway operations:** Confirm current plan/volume capability and cost, restore target, acceptable outage/data-loss window, off-host backup destination. Deployment requires separate explicit approval.
7. **Evaluation threshold:** Owner-defined minimum for summary faithfulness, retrieval usefulness, and citation support before personal release.
8. **iPhone validation:** Owner device participation required for Shortcut, Home Screen/browser, transcript navigation, and audio/background behavior.

## Implementation authorization boundary

Every IM task remains **blocked** until the owner explicitly resumes implementation and approves Phase 0 decisions/contracts. Planning tasks PL-01–PL-04 may be completed as documentation/research when separately authorized; this backlog itself does not dispatch agents or authorize spend, device integration, deployment, or paid model calls. Cloudflare remains deferred. The existing runtime spike is context only; repeat and expand checks under the applicable task's evidence requirements.
