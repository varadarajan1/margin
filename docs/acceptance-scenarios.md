# Margin — MVP Acceptance Scenarios

These scenarios define observable MVP behavior. Provider selection, exact API shapes, and numerical limits remain implementation decisions. Use controlled fixtures for automated tests; live integrations need separate smoke tests.

## A. Private capture and library

### A1 — Save an article
Given an authenticated user, when they submit a supported article URL, then the app confirms durable saving without waiting for extraction. The item appears in the inbox with processing status and remains saved if the page is closed.

### A2 — Extraction fails
Given an inaccessible or unsupported page, when extraction fails, then the original URL remains available, the failure is explained without exposing internal secrets, and retry and original-page actions are available. Failure must not produce a fabricated summary.

### A3 — Duplicate capture
Given an already saved canonical URL, when the same URL is submitted again, then the existing item is returned rather than creating another item. URL normalization must not indiscriminately strip meaningful query parameters.

### A4 — Capture from iPhone
When the user shares a URL through the configured iOS Shortcut from Brave or X, then saving succeeds with a revocable save-only credential. That credential cannot read the library or delete items. Copy/paste works independently of the Shortcut.

If a shared X post cannot be resolved to its linked article, preserve the link and ask the user to share the article URL. Full thread ingestion is not required.

### A5 — Manage and find items
When the user favorites, archives, restores, or deletes an item, then the action persists across reopening the app. Archived items remain searchable. Search returns matching titles and indexed content for successfully processed items.

### A6 — Access boundaries
Unauthenticated requests cannot read private items, conversations, transcripts, or generated audio. Invalid or revoked capture credentials cannot save. Download links must respect the chosen private-access design.

## B. Reader and summaries

### B1 — Read an article
For a supported fixture, the reader shows extracted text with usable mobile typography and a link to the original. Extracted HTML is sanitized; source scripts cannot execute.

### B2 — Skim a summary
For successfully processed content, show an overview and key takeaways supported by the source, preserving material caveats. The user can inspect supporting source content. Incomplete extraction is disclosed.

### B3 — Processing visibility
Pending, processing, ready, and failed outcomes are distinguishable. A failure in one derivative, such as audio, does not make an available article or transcript unusable. Retry does not create duplicate items or duplicate active work for the same operation.

## C. Learning conversations

### C1 — Discuss an item
From an article or transcript, the user asks an explanatory question and receives an answer grounded in relevant original passages. References navigate to passages or media timestamps. Follow-up questions retain conversation context after reopening.

### C2 — Search the library in conversation
When asked for related saved material, the agent retrieves existing items and explains their relevance. It never invents a saved source. If no useful match is found, it says so.

### C3 — Compare sources
Given an article and a related episode, when asked to compare their claims, then the answer cites both sources, distinguishes agreement from disagreement, and acknowledges when they address different questions.

### C4 — Evidence boundaries
When source content cannot answer a question, the agent states the limitation. General background explanation and inference are distinguishable from source claims. It does not claim to have searched the web or seen unavailable visuals.

### C5 — Untrusted source instructions
Given source text containing instructions to ignore rules, reveal secrets, or access unrelated resources, the agent treats that text as content, not authority. Retrieved content cannot authorize actions or credential disclosure.

## D. Podcasts and YouTube

### D1 — Supported media
For a supported podcast source or accessible YouTube transcript, processing creates readable text, timestamped sections, an overview, and key takeaways. Timestamp links open the relevant source location where supported.

### D2 — Unsupported or unavailable transcript
If transcript access fails, preserve the link and clearly explain that summarization is unavailable. Offer a supplied transcript or authorized upload only where implemented. Do not bypass access controls or silently summarize metadata as though it were the full video.

### D3 — Lecture and tutorial boundaries
Label video understanding as transcript-based. For a fixture whose essential code or diagram appears only visually, the agent acknowledges missing information rather than inventing exact steps or code. Auto-caption inaccuracies remain an explicit possible limitation.

### D4 — Shared knowledge library
Once processed, media transcripts participate in library search and cross-source conversation with timestamp references, alongside articles.

## E. Narrated briefings

### E1 — Generate deliberately
Audio generation begins only after user request. Show processing status and a retry path on failure. The output is a concise single-narrator adaptation, with an inspectable script and AI-generated label, not a claimed full reading.

### E2 — Faithful adaptation
The script captures the main argument, supporting points, and important caveats without adding unsupported source claims. Target roughly 3–5 minutes when appropriate, not a mandatory minimum.

### E3 — iPhone playback
On the user's iPhone, validate play/pause, seeking, reopening, and audio download. Record background and lock-screen playback behavior honestly; do not promise unsupported behavior.

## F. Data and operational safety

### F1 — Delete content
Deleted items cease appearing in retrieval, search, and the library. Remove their stored source content and generated derivatives according to a documented policy. Define treatment of historical chat quotations, external provider retention, and backups before implementation is accepted.

### F2 — Export and recovery
Export saved URLs and available user-owned content in the agreed format. Demonstrate backup restoration into a clean test environment and verify representative items and conversations.

### F3 — Safe ingestion
URL fetchers reject disallowed schemes, local/private network targets, and redirects to prohibited destinations. Enforce configurable input sizes, duration limits, timeouts, and processing budgets. Do not log credentials or unnecessary private content.

## Release evidence
- Automated tests covering normal, failure, duplicate, access-control, and citation behavior.
- Representative article, lecture, tutorial, and podcast fixtures, legally usable for testing.
- Manual iPhone checks for capture, keyboard/layout, long transcript navigation, and audio.
- Live integration smoke tests documenting supported sources and known restrictions.
- A small human-reviewed evaluation set for summary faithfulness, retrieval usefulness, and citation support; thresholds agreed before release.
