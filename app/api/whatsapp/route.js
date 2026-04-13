import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("📥 Method:", req.method);

  let phone = "";

  // ✅ SUPPORT BOTH (IMPORTANT for your bot)
  if (req.method === "POST") {
    phone = req.body?.phone;
  } else if (req.method === "GET") {
    phone = req.query?.phone;
  }

  console.log("📱 Incoming Phone:", phone);

  const cleanPhone = phone?.replace(/\D/g, "").slice(-10);

  try {
    // 🔐 CHECK IN SUPABASE
    const { data, error } = await supabase
      .from("users")
      .select("phone")
      .eq("phone", cleanPhone)
      .single();

    const isAdmin = !!data;

    console.log("🔐 Is Admin:", isAdmin);

    return res.status(200).json({
      isAdmin,
      reply: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ You are not admin"
    });

  } catch (err) {
    console.error("❌ Error:", err);

    return res.status(500).json({
      isAdmin: false,
      reply: "Server Error"
    });
  }
}