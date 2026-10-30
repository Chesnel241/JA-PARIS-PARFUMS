// API Stripe simulée pour les tests (CI et local) — aucun appel réel à Stripe.
//
// Couvre exactement ce qu'utilise le site (src/lib/stripe*.ts) :
//   POST /v1/checkout/sessions            création (clé d'idempotence respectée)
//   GET  /v1/checkout/sessions/:id        relecture (expiration à expires_at)
//   POST /v1/checkout/sessions/:id/expire fermeture d'une session ouverte
//   POST /v1/refunds                      remboursement (un seul par paiement)
// et une page de paiement factice :
//   GET  /pay/:id           « Payer » / « Retour »
//   GET  /pay/:id/complete  paiement accepté → success_url
//   GET  /pay/:id/back      abandon → cancel_url
//   GET  /__mock/health     disponibilité
//
// Le site s'y connecte avec une clé de TEST et STRIPE_API_BASE (ignoré avec
// une clé live). Démarrage : `npm run stripe:mock` (port STRIPE_MOCK_PORT,
// 12111 par défaut).
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const PORT = Number(process.env.STRIPE_MOCK_PORT ?? 12111);
const HOST = process.env.STRIPE_MOCK_HOST ?? "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;

const sessions = new Map();
const refundedIntents = new Set();
const idempotent = new Map();

const id = (prefix) => `${prefix}_test_mock${randomBytes(12).toString("hex")}`;
const now = () => Math.floor(Date.now() / 1000);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function stripeError(res, status, message, code) {
  send(res, status, { error: { type: "invalid_request_error", message, ...(code ? { code } : {}) } });
}

function redirect(res, location) {
  res.writeHead(303, { location });
  res.end();
}

async function readForm(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function nested(form, prefix) {
  const out = {};
  for (const [key, value] of form) {
    const match = key.match(new RegExp(`^${prefix.replace(/[[\]]/g, "\\$&")}\\[([^\\]]+)\\]$`));
    if (match) out[match[1]] = value;
  }
  return out;
}

function current(session) {
  if (session.status === "open" && session.expires_at <= now()) session.status = "expired";
  return session;
}

function createSession(form) {
  let amount = 0;
  for (let index = 0; form.has(`line_items[${index}][quantity]`); index += 1) {
    amount += Number(form.get(`line_items[${index}][price_data][unit_amount]`) ?? 0) * Number(form.get(`line_items[${index}][quantity]`));
  }
  amount += Number(form.get("shipping_options[0][shipping_rate_data][fixed_amount][amount]") ?? 0);
  const sessionId = id("cs");
  const session = {
    id: sessionId,
    object: "checkout.session",
    mode: form.get("mode") ?? "payment",
    status: "open",
    payment_status: "unpaid",
    payment_intent: null,
    amount_total: amount,
    currency: "eur",
    customer_email: form.get("customer_email"),
    client_reference_id: form.get("client_reference_id"),
    metadata: nested(form, "metadata"),
    success_url: form.get("success_url"),
    cancel_url: form.get("cancel_url"),
    expires_at: Number(form.get("expires_at") ?? now() + 24 * 3600),
    url: `${BASE}/pay/${sessionId}`,
    livemode: false,
  };
  sessions.set(sessionId, session);
  return session;
}

function payPage(session) {
  const amount = (session.amount_total / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Stripe (simulation)</title></head>
<body style="font-family:system-ui;max-width:420px;margin:60px auto;padding:0 16px">
<h1>Paiement (simulation Stripe)</h1>
<p>Commande ${session.metadata.reference ?? ""} · <strong>${amount}</strong></p>
<p><a href="/pay/${session.id}/complete">Payer ${amount}</a></p>
<p><a href="/pay/${session.id}/back">Retour</a></p>
</body></html>`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", BASE);
    const path = url.pathname;

    if (path === "/__mock/health") return send(res, 200, { ok: true });

    // --- Page de paiement factice -------------------------------------------
    const pay = path.match(/^\/pay\/(cs_[A-Za-z0-9_]+)(\/complete|\/back)?$/);
    if (pay && req.method === "GET") {
      const session = sessions.get(pay[1]);
      if (!session) return stripeError(res, 404, "No such checkout.session");
      current(session);
      if (pay[2] === "/back") return redirect(res, session.cancel_url);
      if (pay[2] === "/complete") {
        if (session.status !== "open") return stripeError(res, 400, `Session ${session.status}`);
        session.status = "complete";
        session.payment_status = "paid";
        session.payment_intent = id("pi");
        return redirect(res, session.success_url.replace("{CHECKOUT_SESSION_ID}", session.id));
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(payPage(session));
    }

    // --- API ------------------------------------------------------------------
    if (!/^Bearer (sk|rk)_test_/.test(req.headers.authorization ?? "")) {
      return send(res, 401, { error: { type: "invalid_request_error", message: "Invalid API Key provided" } });
    }
    const form = req.method === "POST" ? await readForm(req) : new URLSearchParams();
    const key = req.headers["idempotency-key"];
    if (typeof key === "string" && idempotent.has(key)) return send(res, 200, idempotent.get(key));
    const reply = (body) => {
      if (typeof key === "string") idempotent.set(key, body);
      send(res, 200, body);
    };

    if (path === "/v1/checkout/sessions" && req.method === "POST") return reply(createSession(form));

    const one = path.match(/^\/v1\/checkout\/sessions\/(cs_[A-Za-z0-9_]+)(\/expire)?$/);
    if (one) {
      const session = sessions.get(one[1]);
      if (!session) return stripeError(res, 404, `No such checkout.session: '${one[1]}'`, "resource_missing");
      current(session);
      if (!one[2] && req.method === "GET") return send(res, 200, session);
      if (one[2] && req.method === "POST") {
        if (session.status !== "open") return stripeError(res, 400, `Only Checkout Sessions with a status of 'open' can be expired (status: ${session.status}).`);
        session.status = "expired";
        return reply(session);
      }
    }

    if (path === "/v1/refunds" && req.method === "POST") {
      const intent = form.get("payment_intent");
      if (!intent || ![...sessions.values()].some((session) => session.payment_intent === intent)) {
        return stripeError(res, 404, `No such payment_intent: '${intent}'`, "resource_missing");
      }
      if (refundedIntents.has(intent)) return stripeError(res, 400, "Charge has already been refunded.", "charge_already_refunded");
      refundedIntents.add(intent);
      return reply({ id: id("re"), object: "refund", payment_intent: intent, status: "succeeded", metadata: nested(form, "metadata") });
    }

    return stripeError(res, 404, `Unrecognized request URL (${req.method}: ${path})`);
  } catch (error) {
    send(res, 500, { error: { type: "api_error", message: String(error) } });
  }
});

server.listen(PORT, HOST, () => console.log(`API Stripe simulée sur ${BASE}`));
