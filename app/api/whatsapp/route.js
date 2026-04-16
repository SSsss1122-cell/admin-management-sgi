export default async function handler(req, res) {
  try {
    console.log("📦 Body:", req.body);

    // ✅ Extract phone correctly
    const phone =
      req.body?.data?.senderPhoneNumber ||
      req.body?.phone ||
      "";

    console.log("📱 Phone:", phone);

    // ✅ Clean phone (remove +91)
    const cleanPhone = phone.replace(/\D/g, "").slice(-12);

    console.log("📱 Clean Phone:", cleanPhone);

    // ✅ Check DB
    const ADMINS = ["919480072737"]; // or fetch from DB

    const isAdmin = ADMINS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    return res.status(200).json({
      isAdmin,
      message: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ You are not admin",
    });

  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}