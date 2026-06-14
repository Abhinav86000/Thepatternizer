import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false
  }
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyWebhook(rawBody, signature) {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-razorpay-signature"];
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !verifyWebhook(rawBody, signature)) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const payment = event.payload?.payment?.entity;
  const email = payment?.email;

  if (!["payment.captured", "order.paid"].includes(event.event)) {
    return res.status(200).json({ received: true, ignored: true });
  }

  if (!email) {
    return res.status(200).json({ received: true, warning: "Payment has no email." });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: profiles, error: findError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .limit(1);

  if (findError) return res.status(500).json({ error: findError.message });
  const profileId = profiles?.[0]?.id;
  if (!profileId) return res.status(200).json({ received: true, warning: "No matching profile." });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      razorpay_payment_id: payment.id
    })
    .eq("id", profileId);

  if (updateError) return res.status(500).json({ error: updateError.message });
  return res.status(200).json({ received: true, upgraded: true });
}
