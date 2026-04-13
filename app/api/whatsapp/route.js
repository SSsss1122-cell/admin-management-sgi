export default function handler(req, res) {
  // CORS FIX (VERY IMPORTANT)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { message, phone } = req.body || {};

    console.log("📱 Phone:", phone);
    console.log("💬 Message:", message);

    const ADMIN_NUMBERS = ["9480072737"];
    const cleanPhone = phone?.replace(/\D/g, "");

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    return res.status(200).json({
      isAdmin: isAdmin,
      reply: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ Access Denied"
    });

  } catch (error) {
    return res.status(500).json({
      isAdmin: false,
      reply: "Server Error"
    });
  }
}