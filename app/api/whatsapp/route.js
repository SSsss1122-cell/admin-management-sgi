export default function handler(req, res) {
  try {
    const { message, userId, phone } = req.body;

    // Normalize phone (optional)
    const cleanPhone = phone?.replace(/\D/g, "");

    console.log("📱 Received from:", cleanPhone);
    console.log("💬 Message:", message);

    // 🔐 ADMIN CHECK (replace with your real admin numbers)
    const ADMIN_NUMBERS = ["9480072737", "919480072737"];

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    // 🧠 DEFAULT RESPONSE
    let response = {
      isAdmin: isAdmin,
      name: isAdmin ? "Admin" : "Student",
      reply: ""
    };

    // 👨‍💼 ADMIN RESPONSE
    if (isAdmin) {
      response.reply = "Welcome Admin 👨‍💼";
    } 
    // ❌ NON ADMIN RESPONSE
    else {
      response.reply = "⛔ Access Denied - Only Admin allowed";
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("❌ API Error:", error);

    return res.status(500).json({
      isAdmin: false,
      reply: "Server Error"
    });
  }
}