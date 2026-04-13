import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    console.log("📦 Full Body:", body);

    // 🚫 IGNORE NON-MESSAGE EVENTS (status, delivered, read etc.)
    if (body.event !== "message") {
      console.log("⏭ Ignored Event:", body.event);

      return NextResponse.json({
        isAdmin: false,
        ignore: true
      });
    }

    // ✅ EXTRACT PHONE FROM MESSAGE EVENT
    const phone = body?.data?.senderPhoneNumber;

    console.log("📱 Extracted Phone:", phone);

    const cleanPhone = phone?.replace(/\D/g, "").slice(-10);

    console.log("📱 Clean Phone:", cleanPhone);

    // 🔐 ADMIN LIST (you can later move this to DB)
    const ADMIN_NUMBERS = ["9480072737"];

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    // ✅ FINAL RESPONSE
    return NextResponse.json({
      isAdmin,
      ignore: false,
      reply: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ Access Denied"
    });

  } catch (error) {
    console.error("❌ Error:", error);

    return NextResponse.json(
      {
        isAdmin: false,
        ignore: true,
        error: "Server error"
      },
      { status: 500 }
    );
  }
}