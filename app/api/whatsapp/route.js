export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { message, phone } = req.body || {};

  const ADMIN_NUMBERS = ["9480072737"];

  const cleanPhone = phone?.replace(/\D/g, "");
  const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

  return res.status(200).json({
    isAdmin,
    reply: isAdmin ? "Welcome Admin 👨‍💼" : "⛔ Access Denied"
  });
}