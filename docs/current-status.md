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
## Current provider behavior

The existing summary implementation remains API-key-only (`OPENAI_API_KEY`, optional `OPENAI_MODEL`, default `gpt-4.1-mini`). OAuth does not yet power summaries. Article summaries are user-triggered and send article title, URL, and bounded extracted text to OpenAI. Review source sensitivity/provider retention before summarizing any article.

## Security and deployment boundary

- `.env.local`, `.data/`, `node_modules/`, `.next/`, and build artifacts must remain ignored by Git. Commit `.env.example` only; never commit credentials, SQLite data, extracted user articles, or OAuth tokens.
- The local password/cookie is prototype protection, not production authentication. LAN testing is plain HTTP on trusted Wi-Fi only.
- Do not expose this prototype to the public internet. Before deployment: resolve dependency advisories, implement production auth, rate limiting, egress controls, secure credential storage, backups/restore testing, monitoring, and security review.
- No Railway deployment has occurred. The compatibility spike did not establish crash recovery or production deployment readiness.

## Verification snapshot

Most recent checks before the initial Git commit: `npm test` passed (4 files, 11 tests), `npm run typecheck` passed, and `npm run build` passed. No live paid API request was made.

## Next actions

1. Resolve dependency advisories and review the local-only security boundary before considering deployment.
2. Continue implementation only after the relevant scope and contracts are approved.

For product scope and original design, see `product-brief.md`, `architecture.md`, and `implementation-backlog.md`.
