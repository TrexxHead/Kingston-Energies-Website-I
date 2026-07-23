# WhatsApp & Instagram automation (via n8n)

Automated replies (powered by Jordyn) on your WhatsApp Business and Instagram
accounts, that answer questions, funnel people to the website, **and** take
orders in-chat — with every order landing in the same admin dashboard as your
website orders, tagged by channel.

```
Customer ──▶ WhatsApp / Instagram ──▶ Meta webhook ──▶  n8n  ──▶  Kingston Energies API
                                                          │            /api/integrations/chat     (Jordyn reply)
                                                          │            /api/integrations/products  (live prices)
                                                          ▼            /api/integrations/orders    (create order)
                                              sends reply back to the customer
```

The website exposes the API. n8n is the "glue" that listens to Meta and calls
the API. You never expose the database or the Anthropic key to Meta or n8n —
only a single shared secret.

---

## 1. Turn the API on (in Vercel)

Generate a long random secret and add it as an environment variable:

```bash
openssl rand -hex 32
```

In **Vercel → Settings → Environment Variables** add:

| Variable | Value |
|----------|-------|
| `INTEGRATION_API_KEY` | the random string you just generated |

Redeploy. Until this is set, every `/api/integrations/*` route returns `503` —
so the endpoints are never open to the public.

> Jordyn's replies also need `ANTHROPIC_API_KEY` set (item #4). Without it, the
> chat endpoint still responds, but with the built-in navigation fallback text
> instead of AI answers.

---

## 2. The API endpoints (what n8n calls)

All requests need the header:

```
Authorization: Bearer <INTEGRATION_API_KEY>
```

Base URL is your live site, e.g. `https://kingstonenergies.com`.

### `GET /api/integrations/products`
Live catalog with current prices/stock. Use it to quote accurately.
```json
{
  "products": [
    { "id": "pb10", "name": "Charmast 10,400", "price": 5500,
      "priceFormatted": "J$5,500", "inStock": true, "capacity": "10,400mAh",
      "url": "https://.../product/pb10" }
  ],
  "summary": "• Charmast 10,400 — J$5,500 — https://.../product/pb10\n• …",
  "shopUrl": "https://.../shop"
}
```

### `POST /api/integrations/chat`
Get a Jordyn reply for a customer message. Returns a single JSON object (no
streaming) so it's easy to forward.
```jsonc
// request
{
  "message": "which power bank charges an iphone the most times?",
  "channel": "whatsapp",
  "from": "+18761234567",            // stable sender id (for rate-limiting)
  "history": [                        // optional, last few turns
    { "role": "user", "content": "hi" },
    { "role": "assistant", "content": "Hi! I'm Jordyn 👋" }
  ]
}
// response
{ "reply": "The Charmast 20,000mAh gives you about…", "source": "jordyn" }
```

### `POST /api/integrations/orders`
Create an order from the chat. Prices are resolved server-side from the live
catalog — the bot can't set its own prices.
```jsonc
// request
{
  "channel": "whatsapp",
  "customerName": "Marsha B.",
  "contact": "+18761234567",         // WA number / IG handle (optional)
  "email": "marsha@example.com",     // optional — sends a confirmation email
  "payment": "online",               // "online" (pay via site) or "cod" (pay on delivery)
  "items": [
    { "id": "pb10", "qty": 1 },       // match by catalog id…
    { "name": "MagSafe", "qty": 2 }   // …or by name (fuzzy)
  ]
}
// response
{
  "orderNo": "KE-1043",
  "total": 21500,
  "totalFormatted": "J$21,500",
  "status": "PENDING",
  "payment": "online",
  "payUrl": "https://.../track",
  "trackUrl": "https://.../track",
  "reply": "✅ Order KE-1043 received!\n\n1× Charmast 10,400 — J$5,500\n…"
}
```
The `reply` field is a ready-to-send confirmation — forward it to the customer
verbatim. Unknown items return `400` (with `notFound`); out-of-stock items
return `409` (with `outOfStock`) so the bot can tell the customer.

Every order created this way appears in **Admin → Orders** with a WhatsApp /
Instagram badge, and in the Executive **"Needs attention"** feed.

---

## 3. Connect WhatsApp (Meta WhatsApp Business Cloud API)

**Prerequisites:** a [Meta Business](https://business.facebook.com) account, a
[Meta for Developers](https://developers.facebook.com) app (type *Business*),
and a WhatsApp Business number (Meta gives you a free test number to start).

1. In your Meta app → **Add product → WhatsApp → Set up**. Note the
   **Phone number ID** and generate a **permanent access token** (via a System
   User in Business Settings — the temporary 24h token is only for testing).
2. In **n8n**, create a workflow with a **Webhook** trigger node. Copy its
   *production* URL.
3. Back in Meta → WhatsApp → **Configuration → Webhook**, set the callback URL
   to the n8n webhook URL and a **Verify token** you make up. Subscribe to the
   **messages** field. (n8n's webhook must answer Meta's verification challenge —
   add a small "Respond to Webhook" branch that echoes `hub.challenge`, or use
   n8n's WhatsApp trigger node which handles this for you.)
4. Build the flow (see §5).

## 4. Connect Instagram (Meta)

**Prerequisites:** an Instagram **Professional** (Business/Creator) account,
**linked to a Facebook Page**, and the same Meta app with the **Instagram** and
**Messenger** products added.

1. Meta app → **Add product → Instagram → API setup with Instagram login**, and
   connect your IG professional account.
2. Add the **Messenger** product and, under **Instagram settings**, set the
   webhook to your n8n webhook URL; subscribe to the **messages** field.
3. For **production** (messaging people who aren't admins of your app), Meta
   requires App Review for the `instagram_manage_messages` permission — plan for
   a few days' review. While in development you can test with accounts that have
   a role on the app.

> Instagram and WhatsApp can point at the **same** n8n webhook or two separate
> ones. If shared, branch on the payload shape to set `channel` correctly.

---

## 5. The n8n workflow (logic)

A minimal, reliable flow:

1. **Webhook trigger** — receives the inbound message from Meta.
2. **Set node** — extract `message` text, `from` (sender id), and `channel`
   (`whatsapp` / `instagram`) from Meta's payload.
3. **HTTP Request → `POST /api/integrations/chat`** — with the `Authorization`
   header and the fields above. (Optionally keep a short `history` per sender in
   n8n static data for context.)
4. **HTTP Request → send reply** — post the `reply` back via Meta's
   Send Message API (WhatsApp: `POST /{phone-number-id}/messages`; Instagram:
   `POST /{ig-id}/messages`).

**Taking an order:** the simplest robust pattern is a keyword/step flow —
when the customer confirms ("order", "checkout", "buy"), have n8n collect the
items + name + pay preference (buttons work well on WhatsApp), then call
**`POST /api/integrations/orders`** and send back its `reply`. You can let
Jordyn handle the conversation and only switch to the order call once the
customer says yes.

**Tip:** call `GET /api/integrations/products` at the start (or cache it) so the
bot always quotes live prices and never offers out-of-stock items.

---

## Cost & hosting notes
- **n8n**: self-host (free, Docker) or n8n Cloud (paid). Either works — it just
  needs to reach your live API over HTTPS.
- **WhatsApp Cloud API**: Meta gives a monthly allotment of free
  service/utility conversations; beyond that it's pay-per-conversation. Check
  Meta's current pricing for Jamaica.
- **Jordyn (Anthropic)**: each `/chat` call uses Claude Haiku — inexpensive, but
  it's the same key/billing as the on-site widget (#4).
