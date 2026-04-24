import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
const greetedUsers = new Set();

// ===============================
// HELPERS
// ===============================
async function getStudentByPhone(phone) {
  const variants = [phone, `91${phone}`, `+91${phone}`];

  const { data, error } = await supabase
    .from('students')
    .select('*') // ✅ FIXED
    .or(
      variants
        .map(v => `phone.eq.${v},phone_number.eq.${v}`)
        .join(',')
    )
    .maybeSingle();

  if (error) {
    console.log("Student fetch error:", error);
    return null;
  }

  console.log("📞 Searching:", variants);
  console.log("🎓 Found student:", data);

  return data;
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

    // ===============================
    // NORMALIZE NUMBER
    // ===============================
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('+91')) cleanNumber = cleanNumber.slice(3);
    else if (cleanNumber.startsWith('91')) cleanNumber = cleanNumber.slice(2);

    const text = userMessage.trim();
    const upperMsg = text.toUpperCase();

    // ===============================
    // FETCH DATA FIRST (IMPORTANT)
    // ===============================
    const adminNumbers = await getAdminNumbers();
    const student = await getStudentByPhone(cleanNumber);

    const isAdmin = adminNumbers.includes(cleanNumber);
    const isStudent = !!student;

    console.log({ cleanNumber, isAdmin, isStudent, text });

    // ===============================
    // AUTO WELCOME (FIXED + SAFE)
    // ===============================
    if (!greetedUsers.has(cleanNumber)) {
      greetedUsers.add(cleanNumber);

      let name = "User";

      if (isStudent) name = student.full_name || "Student";
      else if (isAdmin) name = "Admin";

      await sendWhatsAppMessage(
        senderNumber,
        `Hi ${name} 👋\nWelcome to SGI Bot`
      );
    }

    // ===============================
    // ROUTING (SMART ORDER)
    // ===============================

    let reply = null;

    // 🟢 ADMIN
    if (isAdmin) {
      reply = await handleAdminCommands(text, upperMsg, cleanNumber);
    }

    // 🟡 STUDENT
    else if (isStudent) {
      reply = await handleStudentCommands(student, text, upperMsg);
    }

    // 🔵 PUBLIC
    else {
      reply = await handlePublicCommands(text, upperMsg);
    }

    // ===============================
    // SEND RESPONSE
    // ===============================
    if (reply) {
      await sendWhatsAppMessage(senderNumber, reply);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("BOT ERROR:", err);
    return NextResponse.json({ error: 'failed' }, { status: 200 });
  }
}

// ===============================
// ADMIN COMMANDS
// ===============================

async function handleAdminCommands(msg) {
  const text = msg.trim().toLowerCase();

  // MENU
  if (text.includes('menu') || text.includes('help') || text.includes('start')) {
    return getMainMenu();
  }

  // BUS
  if (
    text === '1' ||
    text.includes('bus')
  ) {
    return await getBusList();
  }

  // STUDENTS
  if (
    text === '8' ||
    text.includes('student')
  ) {
    return await getStudentList();
  }

  // SEARCH (remove < > also)
  if (text.includes('search')) {
    const query = text
  .replace(/search/i, '')
  .replace(/[<>:]/g, '')
  .trim();
    return await searchStudent(query);
  }

  // FEE
  if (text.includes('fee')) {
    const usn = text.replace('fee', '').trim();
    return await getStudentFeeDetails(usn);
  }

  return getMainMenu(); // no error ❌
}

// ===============================
// STUDENT COMMANDS
// ===============================
async function handleStudentCommands(student, msg) {
  const text = msg.trim().toLowerCase();

  let reply = "";

  // 👋 GREETING / MENU
  if (
    text === '' ||
    text.includes('hi') ||
    text.includes('hello') ||
    text.includes('hey') ||
    text.includes('menu') ||
    text.includes('help')
  ) {
    reply = `Hi ${student.full_name} 👋`;
  }

  // 👤 PROFILE
  else if (
    text === '1' ||
    text.includes('profile') ||
    text.includes('details')
  ) {
    reply = getStudentProfile(student);
  }

  // 💰 FEES
  else if (
    text === '2' ||
    text.includes('fee') ||
    text.includes('fees') ||
    text.includes('my fee')
  ) {
    reply = getMyFees(student);
  }

  // 🛠 COMPLAINT
  else if (
    text === '3' ||
    text.includes('complaint')
  ) {
    reply = await getMyComplaints(student);
  }

  // 🚌 BUS
  else if (
    text === '4' ||
    text.includes('bus')
  ) {
    reply = await getMyBus(student);
  }

  // 🤖 DEFAULT (NO ❌)
  else {
    reply = `🤖 Try using options below 👇`;
  }

  return `${reply}\n\n${getStudentMenu()}`;
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
  return `🤖 *SGI ADMIN PANEL*

1️⃣ BUS LIST  
8️⃣ STUDENT LIST  

🔍 SEARCH <name>  
💰 FEE <USN>`;
}

function getStudentMenu() {
  return `🎓 *STUDENT PANEL*

1️⃣ PROFILE  
2️⃣ FEES  
3️⃣ COMPLAINT  
4️⃣ BUS  

💡 You can type:
• hi / hello
• my fees
• profile
• bus details`;
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

  return data?.map(s =>
    `${s.full_name || "No Name"} (${s.usn || "No USN"})`
  ).join('\n') || 'No students';
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
