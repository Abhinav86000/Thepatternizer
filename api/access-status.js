import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ paid: false, error: "Missing auth token" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return res.status(401).json({ paid: false });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_paid, paid_at")
    .eq("id", userData.user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ paid: false, error: error.message });
  }

  return res.status(200).json({
    paid: Boolean(profile?.is_paid),
    paidAt: profile?.paid_at || null
  });
}
