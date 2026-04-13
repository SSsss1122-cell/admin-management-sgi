export default function handler(req, res) {
  console.log("📥 Incoming Request Method:", req.method);

  // ❌ METHOD CHECK
  if (req.method !== "POST") {
    console.log("❌ Wrong Method:", req.method);

    return res.status(405).json({
      error: "Method Not Allowed - Use POST"
    });
  }

  try {
    // 📦 BODY DATA
    const { message, phone } = req.body || {};

    console.log("💬 Message:", message);
    console.log("📱 Raw Phone:", phone);

    // 🔧 CLEAN PHONE
    const cleanPhone = phone?.replace(/\D/g, "").slice(-10);

    console.log("🧹 Clean Phone:", cleanPhone);

    // 🔐 ADMIN CHECK
    const ADMIN_NUMBERS = ["9480072737"];

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    // ✅ FINAL RESPONSE
    const response = {
      isAdmin,
      reply: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ Access Denied"
    };

    console.log("📤 Sending Response:", response);

    return res.status(200).json(response);

  } catch (error) {
    console.error("🔥 ERROR OCCURRED:", error);

    return res.status(500).json({
      isAdmin: false,
      error: error.message || "Server Error"
    });
  }
}