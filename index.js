// index.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ====== GANTI VIA ENV DI RAILWAY ======
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "DEV_TOKEN_TEST"; // sementara

// simpan donasi terakhir di memory
let lastDonation = null;

app.use(cors());
app.use(bodyParser.json());

function isValidSignature(body, webhookToken, signature) {
  if (!signature || !webhookToken) return false;

  const generatedSignature = crypto
    .createHmac("sha256", webhookToken)
    .update(JSON.stringify(body))
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const genBuf = Buffer.from(generatedSignature, "hex");

  if (sigBuf.length !== genBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, genBuf);
}

// 1) WEBHOOK DARI BAGIBAGI
app.post("/bagibagi/webhook", (req, res) => {
  const body = req.body;

  // NOTE: kita belum tahu header pastinya → log dulu
  const signature =
    req.headers["x-signature"] ||
    req.headers["x-bagibagi-signature"] ||
    req.headers["x-webhook-signature"] ||
    req.headers["signature"];

  console.log("Webhook body:", body);
  console.log("Signature header:", signature);

  // sementara: TIDAK blok kalau signature salah, cuma warning
  if (signature && !isValidSignature(body, WEBHOOK_TOKEN, signature)) {
    console.log("❌ Signature tidak cocok (akan tetap diterima sementara)");
  } else {
    console.log("✅ Webhook diterima");
  }

  lastDonation = {
    transaction_id: body.transaction_id,
    name: body.name,
    amount: body.amount,
    message: body.message,
    mediaShareUrl: body.mediaShareUrl,
    created_at: body.created_at,
    received_at: new Date().toISOString(),
  };

  console.log("💜 Donasi terakhir disimpan:", lastDonation);

  res.json({ ok: true });
});

// 2) ENDPOINT UNTUK ROBLOX
app.get("/api/ibiza/last-donation", (req, res) => {
  if (!lastDonation) {
    return res.json({ ok: true, hasDonation: false });
  }

  res.json({ ok: true, hasDonation: true, donation: lastDonation });
});

// 3) TEST MANUAL (opsional)
app.post("/test/send-fake-donation", (req, res) => {
  lastDonation = {
    transaction_id: "TEST-" + Date.now(),
    name: req.body.name || "GesitTest",
    amount: req.body.amount || 12345,
    message: req.body.message || "Test donasi dari server",
    created_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
  };

  console.log("⚙️ Fake donation diset:", lastDonation);
  res.json({ ok: true, donation: lastDonation });
});

app.get("/", (req, res) => {
  res.send("Ibiza ⇄ Bagibagi bridge is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
