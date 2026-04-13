import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    console.log("📦 Full Body:", body);

    // 🚫 Ignore status / non-message events
    if (body.event !== "message") {
      console.log("⏭ Ignored Event:", body.event);

      return NextResponse.json({
        isAdmin: "false",
        ignore: "true"
      });
    }

    // ✅ Extract sender phone
    const phone = body?.data?.senderPhoneNumber;

    console.log("📱 Extracted Phone:", phone);

    const cleanPhone = phone?.replace(/\D/g, "").slice(-10);

    console.log("📱 Clean Phone:", cleanPhone);

    // 🔐 Admin numbers (later you can fetch from DB)
    const ADMIN_NUMBERS = ["9480072737"];

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    // ✅ FINAL RESPONSE (STRING FORMAT — IMPORTANT)
    return NextResponse.json({
      isAdmin: isAdmin ? "true" : "false",
      ignore: "false",
      reply: isAdmin
        ? "Welcome Admin 👨‍💼"
        : "⛔ You are not admin"
    });

  } catch (error) {
    console.error("❌ Error:", error);

    return NextResponse.json(
      {
        isAdmin: "false",
        ignore: "true",
        error: "Server error"
      },
      { status: 500 }
    );
  }
}