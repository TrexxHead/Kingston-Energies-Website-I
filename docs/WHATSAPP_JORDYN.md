# WhatsApp Jordyn — Feasibility & Free Tooling

_Exploration for bringing Jordyn (the AI assistant) to WhatsApp, and free
workflow apps to orchestrate it. Task #13._

## Verdict

Feasible and low-cost. The recommended stack keeps everything free by reusing
Jordyn's existing Claude logic (`lib/camille.ts` / `app/api/chat`) rather than
rebuilding the assistant.

## Recommended stack

1. **Meta WhatsApp Cloud API** — the message transport. Free within Meta's
   tier (currently ~1,000 free service conversations/month), hosted by Meta,
   no per-message BSP markup. This is the foundation everything else sits on.
2. **n8n (self-hosted, open-source, free)** — visual workflow automation with a
   native WhatsApp Business Cloud node. Flow: inbound WhatsApp message →
   HTTP call to Jordyn's existing chat endpoint → reply back to WhatsApp.
   Free forever when self-hosted (e.g. alongside the app on Railway/Fly.io/a
   small VPS); no per-task ceiling.

## Free alternatives / add-ons

- **Node-RED** (free, open-source) — lighter than n8n for a simple
  message-in/message-out flow.
- **Chatwoot** (free self-hosted) — adds a shared agent inbox + human handoff
  on top of WhatsApp when a person needs to take over from Jordyn.
- **Botpress** (free self-hosted tier) — alternative if a dedicated bot-builder
  UI is preferred over wiring flows by hand.
- **Zapier / Make.com free tiers** — fine for a low-volume pilot (Zapier ~100
  tasks/mo, Make ~1,000 ops/mo) but a SaaS ceiling exists; n8n avoids it.

## How it wires into this codebase

Jordyn's brain already lives in `lib/camille.ts` (`JORDYN_SYSTEM` /
`jordynSystem`) and is served over HTTP by `app/api/chat/route.ts`. A WhatsApp
integration doesn't duplicate any of that — the workflow tool just forwards the
customer's WhatsApp text to that endpoint and relays the streamed reply back.
The main new pieces are:

- A small inbound webhook (in n8n, or a new `app/api/whatsapp` route) that
  verifies Meta's signature and maps WhatsApp payloads ↔ the chat API.
- WhatsApp Business credentials (phone number ID + permanent access token) as
  env vars — the only user-provided setup step.

## Next steps (when you're ready)

1. Create a Meta developer app + WhatsApp Business number (free).
2. Stand up n8n (self-hosted) and import a WhatsApp → HTTP → WhatsApp flow.
3. Point the HTTP node at the deployed `/api/chat` endpoint.
4. (Optional) add Chatwoot for human handoff.
