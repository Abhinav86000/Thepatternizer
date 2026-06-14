import Razorpay from "razorpay";

const FULL_ACCESS_AMOUNT_IN_PAISE = 49900;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: "Razorpay keys are not configured." });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const order = await razorpay.orders.create({
    amount: Number(process.env.PATTERNIZER_PRICE_PAISE || FULL_ACCESS_AMOUNT_IN_PAISE),
    currency: "INR",
    receipt: "patternizer_" + Date.now(),
    notes: {
      plan: "patternizer_full_access"
    }
  });

  return res.status(200).json({
    key: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency
  });
}
