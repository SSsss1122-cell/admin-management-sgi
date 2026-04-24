import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ===============================
// HELPERS
// ===============================

async function getStudentByPhone(phone) {
  const variants = [phone, `91${phone}`, `+91${phone}`];

  const { data } = await supabase
    .from('students')
    .select('*')
    .or(`phone.in.(${variants.join(',')}),phone_number.in.(${variants.join(',')})`)
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function getAdminNumbers() {
  const { data } = await supabase
    .from('admins')
    .select('mobile_number');

  return (data || []).map(a => {
    let num = a.mobile_number.toString();
    if (num.startsWith('+91')) num = num.slice(3);
    else if (num.startsWith('91')) num = num.slice(2);
    return num;
  });
}

// ===============================
// MAIN API
// ===============================

export async function POST(request) {
  try {
    const payload = await request.json();
    const eventData = payload.data;

    const senderNumber = eventData?.senderPhoneNumber;
    const userMessage = eventData?.content?.text?.trim() || '';

    if (!senderNumber) {
      return NextResponse.json({ success: true });
    }

    // normalize number
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('+91')) cleanNumber = cleanNumber.slice(3);
    else if (cleanNumber.startsWith('91')) cleanNumber = cleanNumber.slice(2);

    const upperMsg = userMessage.toUpperCase();

    const adminNumbers = await getAdminNumbers();
    const student = await getStudentByPhone(cleanNumber);

    const isAdmin = adminNumbers.includes(cleanNumber);
    const isStudent = !!student;

    console.log({ cleanNumber, isAdmin, isStudent, userMessage });

    // ===============================
    // ADMIN
    // ===============================
    if (isAdmin) {
      const reply = await handleAdminCommands(userMessage, upperMsg, cleanNumber);
      if (reply) await sendWhatsAppMessage(senderNumber, reply);
      return NextResponse.json({ success: true });
    }

    // ===============================
    // STUDENT
    // ===============================
    if (isStudent) {
      const reply = await handleStudentCommands(student, userMessage, upperMsg);
      if (reply) await sendWhatsAppMessage(senderNumber, reply);
      return NextResponse.json({ success: true });
    }

    // ===============================
    // PUBLIC
    // ===============================
    const reply = await handlePublicCommands(userMessage, upperMsg);
    if (reply) await sendWhatsAppMessage(senderNumber, reply);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'failed' }, { status: 200 });
  }
}

// ===============================
// ADMIN COMMANDS
// ===============================

async function handleAdminCommands(msg, upperMsg, phone) {
  if (upperMsg === 'MENU' || upperMsg === 'HELP' || upperMsg === 'START') {
    return getMainMenu();
  }

  if (upperMsg === 'STUDENT LIST' || upperMsg === '8') {
    return await getStudentList();
  }

  if (upperMsg === 'BUS LIST' || upperMsg === '1') {
    return await getBusList();
  }

  if (msg.match(/^search\s/i)) {
    return await searchStudent(msg.replace(/^search\s/i, ''));
  }

  if (msg.match(/^fee\s/i)) {
    return await getStudentFeeDetails(msg.replace(/^fee\s/i, ''));
  }

  if (msg.match(/^add\s/i)) {
    return await addStudent(msg.replace(/^add\s/i, '').split('|'));
  }

  return `❌ Unknown Command\n\n${getMainMenu()}`;
}

// ===============================
// STUDENT COMMANDS
// ===============================

async function handleStudentCommands(student, msg, upperMsg) {
  if (upperMsg === 'MENU') return getStudentMenu(student);

  if (upperMsg === '1') return getStudentProfile(student);

  if (upperMsg === '2') return getMyFees(student);

  if (upperMsg === '3') return await getMyComplaints(student);

  if (upperMsg === '4') return await getMyBus(student);

  return `❌ Invalid\n\n${getStudentMenu(student)}`;
}

// ===============================
// PUBLIC COMMANDS
// ===============================

async function handlePublicCommands(msg, upperMsg) {
  if (upperMsg === 'HELP' || upperMsg === 'START') {
    return `🤖 SGI BUS BOT\n\nType:\nLIST\nBUS LIST\nFEE <USN>`;
  }

  if (upperMsg === 'LIST') return await getStudentList();
  if (upperMsg === 'BUS LIST') return await getBusList();

  if (msg.match(/^fee\s/i)) {
    return await getStudentFeeDetails(msg.replace(/^fee\s/i, ''));
  }

  return null;
}

// ===============================
// WHATSAPP SEND
// ===============================

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;

  await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      phoneNoId: "595231930349201",
      type: "text",
      text: message
    })
  });
}

// ===============================
// SIMPLE FUNCTIONS (REUSED)
// ===============================

function getMainMenu() {
  return `🤖 SGI ADMIN PANEL

1 BUS LIST
8 STUDENT LIST
SEARCH <name>
FEE <USN>`;
}

function getStudentMenu(student) {
  return `🎓 STUDENT PANEL

1 PROFILE
2 FEES
3 COMPLAINT
4 BUS`;
}

function getStudentProfile(s) {
  return `${s.full_name}\n${s.usn}\n${s.branch}`;
}

function getMyFees(s) {
  return `Total: ₹${s.total_fees}\nPaid: ₹${s.paid_amount}\nDue: ₹${s.due_amount}`;
}

// ===============================
// DB FUNCTIONS (SHORT)
// ===============================

async function getStudentList() {
  const { data } = await supabase.from('students').select('*').limit(10);
  return data?.map(s => `${s.full_name} (${s.usn})`).join('\n') || 'No students';
}

async function searchStudent(q) {
  const { data } = await supabase
    .from('students')
    .select('*')
    .or(`usn.ilike.%${q}%,full_name.ilike.%${q}%`);

  return data?.map(s => `${s.full_name} (${s.usn})`).join('\n') || 'Not found';
}

async function getStudentFeeDetails(usn) {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('usn', usn)
    .single();

  if (!data) return 'Not found';

  return `₹${data.paid_amount} paid\n₹${data.due_amount} due`;
}

async function getBusList() {
  const { data } = await supabase.from('buses').select('*').limit(10);
  return data?.map(b => `Bus ${b.bus_number}`).join('\n') || 'No buses';
}

async function getMyComplaints(student) {
  const { data } = await supabase
    .from('complaints')
    .select('*')
    .eq('student_id', student.id);

  return data?.map(c => `${c.title} (${c.status})`).join('\n') || 'No complaints';
}

async function getMyBus(student) {
  if (!student.bus_id) return 'No bus assigned';

  const { data } = await supabase
    .from('buses')
    .select('*')
    .eq('id', student.bus_id)
    .single();

  return data ? `Bus ${data.bus_number}` : 'Not found';
}

async function addStudent(data) {
  const [name, usn, branch, phone] = data;

  await supabase.from('students').insert({
    full_name: name,
    usn,
    branch,
    phone_number: phone
  });

  return `✅ Added ${name}`;
}