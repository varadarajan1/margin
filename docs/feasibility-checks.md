# Margin — Phase 0 Feasibility Checks

Status: Not run. This is an evidence checklist, not a compatibility claim.

## YouTube transcripts — highest uncertainty
Inputs needed: 3–5 representative public lecture/tutorial URLs, including a long lecture and a visually dependent tutorial.

Check:
- Identify a permitted transcript-access integration and its access conditions; do not assume the official API exposes captions for arbitrary videos.
- Record success/failure, language, timestamp accuracy, transcript completeness, latency, cost, and restrictions.
- Check auto-generated caption handling and absent captions.
- Compare summary claims with sampled original passages.
- Verify failure preserves the link and does not produce a full-video summary from metadata alone.

Gate: choose a viable integration for the tested input class, or narrow first release to user-supplied transcripts. No access-control bypass.

## Podcast ingestion
Proposed initial inputs: accessible episode audio URL or authorized audio upload.

Check a representative episode for download limits, redirects, format handling, duration, transcription quality, timestamp accuracy, cost, and cleanup. Evaluate RSS episode resolution separately before promising it. Streaming-platform page URLs are not equivalent to accessible audio.

Gate: document exact supported input formats and upload/duration limits.

## iPhone share-sheet capture
Requires user/device participation; desktop inspection cannot establish success.

Prototype Shortcut: receive URL → POST to HTTPS capture endpoint with save-only credential → show success/failure receipt.

Check Brave article sharing, X article/post sharing, multiple URL handling, unavailable network, revoked credential, and duplicate saves. Confirm secrets are not placed in query strings or copied into shared Shortcut exports. Keep copy/paste as an independent fallback.

Gate: user successfully saves an article from Brave and follows the documented X fallback.

## iPhone web and audio
Use a deployed HTTPS test page, not an iOS binary.

Check Safari/Home Screen opening, Brave browser use, keyboard-safe chat, long transcript navigation, play/pause, seeking, screen locking, app switching, and audio downloading. Record iOS version and actual behavior. Background playback is an empirical compatibility check, not a guarantee.

## Evidence format
For each check record date, environment, source class, expected/actual result, permitted access method, costs if known, and sanitized logs/screenshots. Never include tokens or private source content in committed evidence.

## Inputs requested from owner
- Representative YouTube URLs and one podcast episode.
- Hosting preference and approximate monthly budget.
- Willingness to use hosted AI APIs.
- Later: a short manual iPhone test session against the deployed prototype.
