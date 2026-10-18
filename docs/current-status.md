# Margin — Current Project Status

**Status date:** 2026-10-18
**Project stage:** Local single-user prototype; not production-ready and not deployed.
**Repository:** Initialized as a Git repository on this date; initial snapshot commit records the current working tree.

## Product direction

Margin is a private, local-first reading and learning library. The immediate implemented slice is article capture, extraction, reading, search, and explicitly requested summaries. YouTube, podcasts, learning chat, audio generation, and iOS Shortcuts remain future scope. Do not treat the longer-term architecture proposal or backlog as proof those features exist.

## Implemented in the working tree

- HTTPS article URL capture, controlled retrieval/extraction, worker-backed processing, and a local SQLite data store.
- FTS5 full-text search, article reader/library UI, password gate for local use, archive/restore/delete, and extraction retry.
- On-demand OpenAI Responses API article summaries using a server-side `OPENAI_API_KEY`; capture itself never triggers an AI call.
- Loopback-only development server by default; opt-in guarded private-LAN mode for temporary trusted-Wi-Fi testing.
- A standalone Pi AI ChatGPT OAuth proof of concept under `scripts/poc-chatgpt-oauth.mts`. It is not wired into the article-summary worker and does not include Pi Durable's conversation harness.

## ChatGPT OAuth POC — current evidence and limits

The OAuth POC uses Pi AI 1.3.0's OpenAI provider. The OAuth token is in memory only for the process; only a stable non-secret device UUID is stored under `.data/` with restrictive permissions. A small model request is opt-in with `--run-request` and has a second confirmation prompt. A stale `readline` prompt bug after the browser callback was fixed by honoring Pi AI's abort signal.

The user reported that the POC then appeared to work using the current default candidate `gpt-6.1-sol`. That is user-reported success, not independently observed by the implementation agent. Earlier attempts were rejected for `gpt-4.1-mini` and `gpt-5.3-codex`; do not infer that the OAuth flow is broken from those model-specific 400 errors.

OpenAI's current Sign in with ChatGPT (SIWC) documentation says model availability is account-specific: request `GET https://api.openai.com/v1/models` with the OAuth bearer token, select entries whose `visibility` is `list`, and use the returned `slug`. Its current Codex guidance recommends `gpt-6.1-sol` for Plus/Pro and other paid plans **when available**. The per-account model response is authoritative; Pi AI's general static model catalog is not an entitlement list. OpenAI's guidance also says the SIWC Responses API flow uses the public `/v1/responses` endpoint, with `store: false` and `stream: true`; avoid the legacy ChatGPT `backend-api` endpoint for this flow.

- [OpenAI SIWC models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [OpenAI SIWC preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [OpenAI Codex model guidance](https://learn.chatgpt.com/docs/models)
- [Pi AI 1.3.0 package](https://www.npmjs.com/package/@earendil-works/pi-ai/v/1.3.0)

**Still unverified:** account-specific `/v1/models` discovery in the POC; durable OAuth credential storage/refresh/revocation; full error/usage handling; whether OpenAI's SIWC eligibility terms cover this private single-user Margin app in its intended use; and whether OAuth-backed summaries remain available and within plan limits. ChatGPT subscription usage is subject to its limits; it is distinct from API-key billing. No API key has been validated here, and no live paid API-key request was made.

## Current provider behavior

The existing summary implementation remains API-key-only (`OPENAI_API_KEY`, optional `OPENAI_MODEL`, default `gpt-4.1-mini`). OAuth does not yet power summaries. Article summaries are user-triggered and send article title, URL, and bounded extracted text to OpenAI. Review source sensitivity/provider retention before summarizing any article.

## Security and deployment boundary

- `.env.local`, `.data/`, `node_modules/`, `.next/`, and build artifacts must remain ignored by Git. Commit `.env.example` only; never commit credentials, SQLite data, extracted user articles, or OAuth tokens.
- The local password/cookie is prototype protection, not production authentication. LAN testing is plain HTTP on trusted Wi-Fi only.
- Do not expose this prototype to the public internet. Before deployment: resolve dependency advisories, implement production auth, rate limiting, egress controls, secure credential storage, backups/restore testing, monitoring, and security review.
- No Railway deployment has occurred. The compatibility spike did not establish crash recovery or production deployment readiness.

## Verification snapshot

Most recent checks before the initial Git commit: `npm test` passed (4 files, 11 tests), `npm run typecheck` passed, and `npm run build` passed. POC help path runs without initiating OAuth. No automated test exercises real OAuth or sends a real model request.

## Next actions

1. Extend the POC to retrieve the signed-in account's `/v1/models`, filter to `visibility: "list"`, and select a returned slug rather than guess model IDs. Keep this explicit/user initiated; never print or persist access tokens.
2. Repeat one tiny, streamed Responses API request using a slug actually returned for the account; count success only on `response.completed`. Use `store: false`, `stream: true`, and omit fields disallowed by SIWC preview limitations.
3. Review current SIWC eligibility terms for Margin before deciding whether to rely on ChatGPT-plan OAuth.
4. If approved and proven, add a secure server-side sign-in flow and protected persistent credential store with refresh/logout before making OAuth available to the summary worker. Keep user-triggered generation and clarify plan quotas.
5. Keep the existing API-key path unchanged until the OAuth integration is deliberately approved and tested end-to-end.

For product scope and original design, see `product-brief.md`, `architecture.md`, and `implementation-backlog.md`.
