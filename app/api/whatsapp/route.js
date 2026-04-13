export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed - Use POST"
    });
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