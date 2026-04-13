import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    console.log("📦 Full Body:", body);

    // 🚫 IGNORE STATUS EVENTS
    if (body.event !== "message") {
      console.log("⏭ Ignored event:", body.event);
      return NextResponse.json({ skip: true });
    }

    // ✅ ONLY FOR MESSAGE
    const phone = body?.data?.senderPhoneNumber;

    console.log("📱 Extracted Phone:", phone);

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
      { isAdmin: false },
      { status: 500 }
    );
  }
}