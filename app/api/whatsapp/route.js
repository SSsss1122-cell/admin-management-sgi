import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_NUMBERS = ['9480072737', '7204326912', '919480072737'];

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log("📦 Incoming:", payload);

    // ✅ Extract data safely
    const data = payload?.data || {};
    const senderNumber = data?.senderPhoneNumber || "";
    const userMessage = data?.content?.text || "";

    if (!senderNumber) {
      console.log("❌ No phone number");
      return NextResponse.json({ success: true });
    }

    // ✅ Clean phone number
    let cleanNumber = senderNumber.replace(/\D/g, "");
    if (cleanNumber.length > 10) {
      cleanNumber = cleanNumber.slice(-10);
    }

    console.log("📱 Clean Number:", cleanNumber);

    // ✅ Admin check
    const isAdmin = ADMIN_NUMBERS.includes(cleanNumber);
    console.log("👑 Is Admin:", isAdmin);

    const upperMsg = userMessage.trim().toUpperCase();

    // ====================================
    // ❌ NON ADMIN
    // ====================================
    if (!isAdmin) {
      await sendWhatsAppMessage(senderNumber, "⛔ You are not authorized.");
      return NextResponse.json({ success: true });
    }

    // ====================================
    // ✅ ADMIN LOGIC
    // ====================================

    let reply = "";

    if (upperMsg === "BUS" || upperMsg === "MENU") {
      reply = `🚌 *BUS ADMIN PANEL*

1️⃣ STUDENT LIST  
2️⃣ BUS LIST  
3️⃣ FEE SUMMARY`;
    }

    else if (upperMsg === "1" || upperMsg === "STUDENT") {
      reply = await getStudentList();
    }

    else if (upperMsg === "2" || upperMsg === "BUS LIST") {
      reply = await getBusList();
    }

    else if (upperMsg === "3" || upperMsg === "FEE") {
      reply = await getFeesSummary();
    }

    else {
      reply = "❌ Unknown command. Type *BUS*";
    }

    await sendWhatsAppMessage(senderNumber, reply);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    return NextResponse.json({ error: "Server error" });
  }
}

// ============================
// FUNCTIONS
// ============================

async function getStudentList() {
  const { data, error } = await supabase.from('students').select('*').limit(10);

  if (error) return "❌ DB Error";

  let msg = "📋 *STUDENTS*\n\n";

  data.forEach((s, i) => {
    msg += `${i + 1}. ${s.full_name} (${s.usn})\n`;
  });

  return msg;
}

async function getBusList() {
  const { data, error } = await supabase.from('buses').select('*').limit(10);

  if (error) return "❌ DB Error";

  let msg = "🚌 *BUSES*\n\n";

  data.forEach((b, i) => {
    msg += `${i + 1}. ${b.bus_number} - ${b.route_name}\n`;
  });

  return msg;
}

async function getFeesSummary() {
  const { data } = await supabase.from('students').select('paid_amount, due_amount');

  let totalPaid = 0;
  let totalDue = 0;

  data.forEach(s => {
    totalPaid += s.paid_amount || 0;
    totalDue += s.due_amount || 0;
  });

  return `💰 *FEES SUMMARY*

Paid: ₹${totalPaid}
Due: ₹${totalDue}`;
}

// ============================
// SEND MESSAGE
// ============================

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;

  await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: to,
      phoneNoId: "595231930349201",
      type: "text",
      text: message
    })
  });
}