import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ===============================
// GET STUDENT BY PHONE
// ===============================
async function getStudentByPhone(phone) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`phone.eq.${phone},phone_number.eq.${phone}`)
    .single();

  if (error) return null;
  return data;
}

// ===============================
// MAIN API
// ===============================
export async function POST(request) {
  try {
    const payload = await request.json();
    const eventData = payload.data;

    let senderNumber = eventData?.senderPhoneNumber;
    let userMessage = eventData?.content?.text?.trim();

    if (!senderNumber) {
      return NextResponse.json({ success: true });
    }

    // CLEAN NUMBER
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('+91')) cleanNumber = cleanNumber.slice(3);
    else if (cleanNumber.startsWith('91')) cleanNumber = cleanNumber.slice(2);

    console.log("📱 Student:", cleanNumber);
    console.log("💬 Msg:", userMessage);

    // FIND STUDENT
    const student = await getStudentByPhone(cleanNumber);

    if (!student) {
      await sendWhatsAppMessage(senderNumber, 
        `❌ You are not registered as a student.\n\nContact admin.`
      );
      return NextResponse.json({ success: true });
    }

    const upperMsg = userMessage?.toUpperCase() || '';
    let reply = await handleStudentCommands(student, userMessage, upperMsg);

    if (reply) {
      await sendWhatsAppMessage(senderNumber, reply);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("🔥 Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}

// ===============================
// COMMAND HANDLER
// ===============================
async function handleStudentCommands(student, message, upperMsg) {

  if (upperMsg === 'Hi' || upperMsg === 'HELP' || upperMsg === 'START') {
    return getStudentMenu(student);
  }

  else if (upperMsg === 'PROFILE' || upperMsg === '1') {
    return getStudentProfile(student);
  }

  else if (upperMsg === 'FEE' || upperMsg === '2') {
    return getMyFees(student);
  }

  else if (upperMsg === 'COMPLAINT' || upperMsg === '3') {
    return await getMyComplaints(student);
  }

  else if (upperMsg === 'BUS' || upperMsg === '4') {
    return await getMyBus(student);
  }

  return `❌ Invalid command\n\n${getStudentMenu(student)}`;
}

// ===============================
// MENU
// ===============================
function getStudentMenu(student) {
  return `╔════════════════════════════╗
║   🎓 STUDENT PANEL       ║
╚════════════════════════════╝

👤 ${student.full_name}

1️⃣ PROFILE  
2️⃣ MY FEES  
3️⃣ COMPLAINT STATUS  
4️⃣ BUS DETAILS  

Type option number`;
}

// ===============================
// PROFILE
// ===============================
function getStudentProfile(student) {
  return `👤 PROFILE

Name: ${student.full_name}
USN: ${student.usn}
Branch: ${student.branch}
Phone: ${student.phone || student.phone_number || 'N/A'}`;
}

// ===============================
// FEES
// ===============================
function getMyFees(student) {
  return `💰 MY FEES

Total: ₹${student.total_fees || 0}
Paid: ₹${student.paid_amount || 0}
Due: ₹${student.due_amount || 0}

Status: ${student.fees_due ? '🔴 Pending' : '🟢 Paid'}

Last Payment: ${student.last_payment_date || 'N/A'}`;
}

// ===============================
// COMPLAINTS
// ===============================
async function getMyComplaints(student) {
  const { data } = await supabase
    .from('complaints')
    .select('title, status')
    .eq('student_id', student.id)
    .limit(5);

  if (!data || data.length === 0) return '📭 No complaints';

  let msg = `🛠️ YOUR COMPLAINTS\n\n`;

  data.forEach(c => {
    msg += `📌 ${c.title}\nStatus: ${c.status}\n\n`;
  });

  return msg;
}

// ===============================
// BUS
// ===============================
async function getMyBus(student) {
  if (!student.bus_id) return '🚌 No bus assigned';

  const { data: bus } = await supabase
    .from('buses')
    .select('bus_number, route_name')
    .eq('id', student.bus_id)
    .single();

  if (!bus) return '❌ Bus not found';

  return `🚌 BUS DETAILS

Bus: ${bus.bus_number}
Route: ${bus.route_name}`;
}

// ===============================
// SEND WHATSAPP
// ===============================
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


