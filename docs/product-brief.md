# Margin — Product Brief

**Save what interests you. Understand it deeply.**

Working product name: Margin.

Status: Agreed product direction; implementation contracts and feasibility checks pending.

## Purpose
A private, mobile-first library to save, condense, and understand articles, podcasts, and YouTube videos. Built for one person's use initially.

Core journey: Save → Skim → Read or listen → Ask questions → Explore related saves.

## User and platform
- Primary device: iPhone, regularly using Brave and discovering articles on X.
- YouTube usage: mostly lectures and tutorials.
- No native iOS compilation or testing setup.
- Mobile-first web app, optional Home Screen installation, and an iOS capture Shortcut. Copy/paste remains the capture fallback.
- Private access is required; single-user does not mean publicly accessible data.

## MVP scope
### Capture and library
- Save public article URLs, YouTube URLs, and supported podcast/audio sources.
- Search, favorite, archive, and delete saved items.
- Preserve a saved link when extraction or processing fails; show processing status and retry options.
- Detect obvious duplicate URLs.
- X is a discovery channel: prefer the linked article URL. Resolving an article from a shared X post is best-effort; otherwise ask the user to share the article directly.
- Provide basic export and a backup path.

### Reading and summaries
- Clean article reader with original-page fallback.
- Source-grounded overview and key takeaways.
- Audio/video transcripts, timestamped sections, and skimmable chapter summaries.
- YouTube MVP understanding is transcript-based. Clearly disclose that on-screen code, charts, and demonstrations may be missing.
- Tutorial steps must be supported by available source content; do not infer unseen code or actions.

### Audio briefings
- On-demand, concise, single-narrator adaptations, not simulated host conversations.
- Proposed target: 3–5 minutes when warranted by source length; shorter otherwise.
- Show the briefing script and identify it as AI-generated.
- Preserve important caveats and access to the original source.

### Learning agent
- On-demand interaction, not reminders or unsolicited outreach.
- Discuss a current item and retrieve related items from the saved library.
- Support library-level questions, comparisons, and synthesis.
- Ground responses in original passages or transcript segments, not summaries alone.
- Link references to passages or timestamps.
- Distinguish source claims, agent inference, and general background knowledge.
- State when evidence is missing, inaccessible, or dependent on unseen visuals.

## Primary use cases
1. Save an article from Brave or X and skim it before deciding to read.
2. Listen to a concise briefing instead of reading a long article.
3. Skim a podcast through its overview, chapters, and transcript.
4. Condense a YouTube lecture and jump to relevant explanations.
5. Ask the agent to explain a tutorial, prerequisites, or an argument.
6. Compare claims across articles, podcasts, and videos in the library.
7. Recover relevant saved material through a natural-language question.

## Boundaries and safeguards
- No paywall, authentication, or DRM bypass.
- Do not promise universal YouTube caption access or podcast platform support.
- Use permitted transcript integrations. If unavailable, preserve the link and allow a supplied transcript or authorized media upload where supported.
- Saved content and generated adaptations are private by default.
- Explain external processing of saved content and define deletion of derivatives.
- Proposed cost behavior: automatic article summaries; explicit initiation/confirmation for costly transcription and audio generation.

## Out of scope
- Public signup, billing, collaboration, social features.
- Native mobile apps and browser extensions.
- Full X post/thread extraction.
- Visual video understanding.
- Proactive reminders, adaptive learning plans, automatic quizzes.
- Agent public-web research.
- Multi-host generated podcasts and automatic daily shows.
- Offline reading and universal media-platform support.

## Delivery milestones
1. Articles and learning agent: capture, reader, summaries, library search, item and cross-library chat with references.
2. YouTube and podcasts: ingestion, transcripts, timestamped summaries, retrieval integration.
3. Narrated briefings and iPhone polish: audio generation, capture/playback validation on the actual phone.

All three milestones comprise the MVP.

## Feasibility checks before dependent implementation
- Validate permitted YouTube transcript access with representative lectures/tutorials; check timestamps and failure behavior.
- Validate an iOS share-sheet Shortcut from Brave and X, including URL formats and a revocable save-only credential.
- Select the initially supported podcast input and test ingestion.
- Test iPhone audio playback, background/lock-screen behavior, and a download fallback.

## Open implementation decisions
- Hosting, authentication, database, background processing, and AI providers.
- Initial podcast source format and media limits.
- Processing cost limits and retention/deletion policy.
- Source-reference format, content states, data model, and API contracts.
- Export format and backup/restore procedure.

## Success criteria
- The user can reliably save from their iPhone without keeping the app open for processing.
- Summaries help decide whether to consume the full source.
- The agent provides useful explanations and cross-source comparisons with inspectable evidence.
- Unsupported sources fail clearly without losing saved links.
- Audio and transcript experiences make switching formats genuinely useful.
