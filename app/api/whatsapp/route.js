import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const phone = body?.phone;

    console.log("📱 Incoming Phone:", phone);

    const cleanPhone = phone?.replace(/\D/g, "").slice(-10);

    const ADMIN_NUMBERS = ["9480072737"];

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    return NextResponse.json({
      isAdmin,
      reply: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ Access Denied"
    });

  } catch (error) {
    console.error("❌ Error:", error);

    return NextResponse.json(
      {
        isAdmin: false,
        error: "Server error"
      },
      { status: 500 }
    );
  }
}