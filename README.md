# Margin (local article vertical slice)

Margin is a private, local-first reading library. It saves HTTPS article URLs, extracts readable text in a background worker, and provides a library/reader. Article summaries use OpenAI only when you explicitly request them; ingestion never triggers an AI call.

See [`docs/current-status.md`](docs/current-status.md) for implemented scope, ChatGPT OAuth POC evidence, known limits, and next steps. Product and longer-term design documents describe planned work, not features that are necessarily implemented.

## Requirements

- Node.js 22 or newer (tested with Node 24.14.0)
- npm

## Run locally

```sh
cp .env.example .env.local
# Edit .env.local and set MARGIN_PASSWORD to a unique password of at least 12 characters.
npm install
npm run dev
```

Open http://127.0.0.1:3000. The normal development server binds to loopback only. The default data directory is `.data/`; configure `MARGIN_DATA_DIR` to move it. SQLite app data, extracted article text, and generated summaries are stored in `margin.sqlite`; no Pi Durable store is created because chat is not part of this slice. Keep `.data/` private and back it up deliberately.

## OpenAI article summaries (optional)

1. Copy `.env.example` to `.env.local` if you have not already.
2. Add your OpenAI API key to `.env.local` as `OPENAI_API_KEY=...`. **Do not paste the key into chat, commit it, or share `.env.local`.** `.env.local` is git-ignored.
3. Optionally set `OPENAI_MODEL`; default is `gpt-4.1-mini`.
4. Restart Margin and open a successfully extracted article. Tap **Generate summary**. Summaries are never requested automatically during capture; failed summaries can be retried explicitly.

The key is read only by the server-side worker and is not sent to the browser. On generation, Margin sends the article title, URL, and up to 40,000 characters of extracted article text to OpenAI's Responses API (`store: false`), with a 700-token output cap. The source may contain sensitive information; only summarize content you are comfortable sending to OpenAI, and review its current data-use and retention policies. `store: false` is not a substitute for reviewing provider policy.

Each click that starts a summary can incur API charges. There is no automatic generation or hard dollar budget in this prototype; the source and output caps limit each request, but are not a spend ceiling. Set your OpenAI project limits/alerts and monitor usage. Without `OPENAI_API_KEY`, the article remains readable and the UI explains how to enable summaries without sending a request.

## ChatGPT OAuth proof of concept

This standalone proof of concept uses Pi AI's OpenAI provider (the same provider layer used by Pi Durable) to test the ChatGPT subscription OAuth path. It does not modify Margin's existing API-key-based article-summary workflow and does not include Pi Durable's conversation harness.

```sh
npm run poc:chatgpt-oauth
```

Sign in when prompted; OAuth credentials stay in memory and are discarded when the process exits. The POC saves only the stable, non-secret OAuth device UUID in `.data/pi-chatgpt-oauth-poc-device-id` (mode 0600). This default run only checks OAuth authentication and sends no model request. To explicitly test one short Responses API call, run:

```sh
npm run poc:chatgpt-oauth -- --run-request
```

After sign-in, the script asks for a second confirmation before sending the test request. The request uses the ChatGPT OAuth credential, not an API key. The POC defaults to `gpt-6.1-sol`, which OpenAI currently recommends for Plus/Pro and other paid plans when available. OpenAI rejected `gpt-4.1-mini` and `gpt-5.3-codex` in the earlier POC attempts; the latter is deprecated for Codex with ChatGPT sign-in. The authoritative availability check is the account-specific `GET https://api.openai.com/v1/models` response, filtered to models with `visibility: "list"`; the general Pi model catalog is not an account entitlement list. Override the test model with `MARGIN_POC_MODEL` if needed. Subscription eligibility, model availability, and usage limits are controlled by OpenAI. Do not use this prototype's in-memory credential handling as a production integration; Margin would need a secure sign-in UX and protected persistent credential storage.

## Optional iPhone test on your home network

This is a temporary local-network mode, not a public deployment. Use it only on a trusted private Wi-Fi network:

1. Find this computer's private IPv4 address (for example `192.168.1.20`).
2. Add `MARGIN_HOST=192.168.1.20` to `.env.local`, replacing the example with the computer's current private address. The launcher refuses non-private/non-IPv4 addresses.
3. Set a unique temporary `MARGIN_PASSWORD`; this development login is transmitted over plain HTTP in LAN mode.
4. Ensure the computer firewall allows inbound TCP port 3000 only from your trusted home LAN (ideally just the iPhone), and your router has no port-forward for this port. Do not use public/shared Wi-Fi or a guest network.
5. Run `npm run dev:lan`. On the iPhone connected to the same Wi-Fi, open `http://<computer-private-ip>:3000` and sign in.
6. Stop the server with Ctrl-C. Remove `MARGIN_HOST` to return to loopback-only `npm run dev`; rotate the temporary password if you used it on an untrusted network.

LAN mode binds only to the selected private IPv4 address, but anyone who can reach that computer on the LAN can still reach the app's login page. The cookie/password setup is not production authentication; do not expose this app to the internet.

For production builds, the web server and background worker must both run against the same persistent local data directory. `npm run build` builds the web app; `npm run start` starts the web server and `npm run worker` starts the worker separately. Do not deploy this configuration publicly as-is.

## Local authentication and security boundary

The local password is configured with `MARGIN_PASSWORD`; the app uses an HttpOnly, SameSite=Strict, signed seven-day cookie. This is a convenience for a single-user app bound to localhost, **not production-grade authentication**. Before any internet-accessible deployment, replace it with established authentication, enforce HTTPS, implement and test the capture-only credential design, rate limiting, operational monitoring, and review the entire network egress boundary.

Article ingestion accepts HTTPS only, rejects credentials in URLs, validates DNS answers as public addresses, pins the selected IP for the TLS request, revalidates every redirect, limits redirects, uses a timeout and caps HTML at 2 MB. It accepts HTML pages only. Extracted content is converted to plain text and React renders it as escaped text; publisher HTML is never rendered. These controls reduce SSRF risk but are not a substitute for operating-system/network egress restrictions or a security audit. DNS behavior, IPv6 classification and unusual proxy/network environments need additional adversarial testing before exposure beyond localhost.

Unsupported/paywalled pages and pages with insufficient readable text remain saved and show an original-link fallback. The library supports archiving/restoring items and permanently deleting an item with its extracted text and processing jobs. This version does not bypass access controls, import X posts, process YouTube/podcasts, implement learning chat, or generate audio.

A dependency audit during initial development reported advisories in the installed Next.js/PostCSS production dependency tree and in Vitest development dependencies. Re-run `npm audit` before any deployment and update/review affected packages; this local-only prototype is not cleared for internet exposure.

## Checks

```sh
npm test
npm run typecheck
npm run build
```
