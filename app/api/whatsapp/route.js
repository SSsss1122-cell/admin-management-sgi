import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    console.log("📦 Full Body:", body);

    // 🚫 Ignore non-message events
    if (body.event !== "message") {
      console.log("⏭ Ignored Event:", body.event);
      return NextResponse.json({
        isAdmin: false,
        ignore: true
      });
    }

    // ✅ CORRECT EXTRACTION
    const phone = body?.data?.senderPhoneNumber;

    console.log("📱 Extracted Phone:", phone);

    const cleanPhone = phone?.replace(/\D/g, "").slice(-10);

    console.log("📱 Clean Phone:", cleanPhone);

    const ADMIN_NUMBERS = ["9480072737"];

    const isAdmin = ADMIN_NUMBERS.includes(cleanPhone);

    console.log("🔐 Is Admin:", isAdmin);

    return NextResponse.json({
      isAdmin,
      ignore: false
    });

  } catch (error) {
    console.error("❌ Error:", error);

    return NextResponse.json(
      { isAdmin: false, ignore: true },
      { status: 500 }
    );
  }
}