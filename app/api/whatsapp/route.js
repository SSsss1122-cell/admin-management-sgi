import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    const eventData = payload.data;
    
    let senderNumber = null;
    let userMessage = null;
    
    if (eventData) {
      senderNumber = eventData.senderPhoneNumber;
      userMessage = eventData.content?.text?.trim();
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber) {
      return NextResponse.json({ success: true });
    }
    
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    const isAdmin = (cleanNumber === '9480072737');
    
    // Convert to uppercase for case-insensitive matching
    const upperMsg = userMessage?.toUpperCase() || '';
    
    // If not authorized
    if (!isAdmin) {
      let reply = await handlePublicCommands(userMessage, upperMsg);
      if (reply) await sendWhatsAppMessage(senderNumber, reply);
      return NextResponse.json({ success: true });
    }
    
    // ============================================
    // AUTHORIZED USER MENU
    // ============================================
    
    let replyMessage = '';
    
    // MAIN MENU
    if (upperMsg === 'BUS' || upperMsg === 'MENU' || upperMsg === 'START' || upperMsg === 'HELP') {
      replyMessage = getMainMenu();
    }
    
    // STUDENT MENU
    else if (upperMsg === 'STUDENT' || upperMsg === 'STUDENT LIST' || upperMsg === '8') {
      replyMessage = await getStudentList();
    }
    else if (upperMsg === 'SEARCH' || upperMsg === 'SEARCH STUDENT' || upperMsg === '9') {
      replyMessage = getSearchFormat();
    }
    else if (upperMsg === 'COUNT' || upperMsg === 'STUDENT COUNT' || upperMsg === '10') {
      replyMessage = await getStudentCountWithBranch();
    }
    
    // FEES MENU
    else if (upperMsg === 'FEE' || upperMsg === 'FEE CHECK' || upperMsg === '5') {
      replyMessage = getFeeFormat();
    }
    else if (upperMsg === 'FEE DUE' || upperMsg === '6') {
      replyMessage = await getCompleteDueFeesList();
    }
    else if (upperMsg === 'FEE SUMMARY' || upperMsg === '7') {
      replyMessage = await getFeesSummary();
    }
    
    // BUS MENU
    else if (upperMsg === 'BUS LIST' || upperMsg === '1') {
      replyMessage = await getBusList();
    }
    else if (upperMsg === 'BUS STOPS' || upperMsg === '3') {
      replyMessage = getBusStopsFormat();
    }
    else if (upperMsg === 'BUS DETAILS' || upperMsg === '4') {
      replyMessage = getBusDetailsFormat();
    }
    
    // OTHER COMMANDS
    else if (upperMsg === 'COMPLAINT' || upperMsg === '11') {
      replyMessage = getComplaintFormat();
    }
    else if (upperMsg === 'NOTICES' || upperMsg === '12') {
      replyMessage = await getNotices();
    }
    else if (upperMsg === 'DRIVERS' || upperMsg === '13') {
      replyMessage = await getDriversList();
    }
    else if (upperMsg === 'SHORTCUT' || upperMsg === 'SHORTCUTS') {
      replyMessage = getShortcutGuide();
    }
    
    // SEARCH with argument
    else if (userMessage?.match(/^search\s/i)) {
      const query = userMessage.replace(/^search\s/i, '');
      replyMessage = await searchStudent(query);
    }
    
    // FEE with argument
    else if (userMessage?.match(/^fee\s/i)) {
      const usn = userMessage.replace(/^fee\s/i, '');
      replyMessage = await getStudentFeeDetails(usn);
    }
    
    // STOPS with argument
    else if (userMessage?.match(/^stops\s/i)) {
      const busNumber = userMessage.replace(/^stops\s/i, '');
      replyMessage = await getBusStops(busNumber);
    }
    
    // DETAILS with argument
    else if (userMessage?.match(/^details\s/i)) {
      const busNumber = userMessage.replace(/^details\s/i, '');
      replyMessage = await getBusDetails(busNumber);
    }
    
    // COMPLAINT with argument
    else if (userMessage?.match(/^complaint\s/i)) {
      const complaintText = userMessage.replace(/^complaint\s/i, '');
      replyMessage = await registerComplaint(cleanNumber, complaintText);
    }
    
    // ADD STUDENT
    else if (userMessage?.match(/^add\s/i)) {
      const data = userMessage.replace(/^add\s/i, '').split('|');
      replyMessage = await addStudent(data);
    }
    
    // UPDATE FEES
    else if (userMessage?.match(/^update\s/i)) {
      const parts = userMessage.replace(/^update\s/i, '').split('|');
      replyMessage = await updateStudentFees(parts[0], parts[1]);
    }
    
    // DELETE STUDENT
    else if (userMessage?.match(/^delete\s/i)) {
      const usn = userMessage.replace(/^delete\s/i, '');
      replyMessage = await deleteStudent(usn);
    }
    
    // BROADCAST
    else if (userMessage?.match(/^broadcast\s/i)) {
      const msg = userMessage.replace(/^broadcast\s/i, '');
      replyMessage = await broadcastMessage(msg);
    }
    
    // Default
    else if (userMessage && userMessage !== '') {
      replyMessage = `❌ *Unknown Command*\n\n${getMainMenu()}`;
    }
    
    if (replyMessage) {
      await sendWhatsAppMessage(senderNumber, replyMessage);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

function getMainMenu() {
  return `╔════════════════════════╗
║   🤖 *SGI BUS BOT*    ║
║      Admin Panel       ║
╚════════════════════════╝

┌─────────────────────────┐
│  🚌 *BUS MENU*          │
├─────────────────────────┤
│ 1️⃣  BUS LIST           │
│ 3️⃣  BUS STOPS          │
│ 4️⃣  BUS DETAILS        │
└─────────────────────────┘

┌─────────────────────────┐
│  💰 *FEES MENU*         │
├─────────────────────────┤
│ 5️⃣  FEE CHECK          │
│ 6️⃣  FEE DUE LIST       │
│ 7️⃣  FEE SUMMARY        │
└─────────────────────────┘

┌─────────────────────────┐
│  📚 *STUDENT MENU*      │
├─────────────────────────┤
│ 8️⃣  STUDENT LIST       │
│ 9️⃣  SEARCH STUDENT     │
│ 🔟  STUDENT COUNT      │
└─────────────────────────┘

┌─────────────────────────┐
│  📢 *OTHER MENU*        │
├─────────────────────────┤
│ 11️⃣  COMPLAINT         │
│ 12️⃣  NOTICES           │
│ 13️⃣  DRIVERS           │
└─────────────────────────┘

┌─────────────────────────┐
│  ⚡ *QUICK ACTIONS*     │
├─────────────────────────┤
│ • FEE <USN>             │
│ • SEARCH <USN/Name>     │
│ • ADD <name>|<usn>|<br> │
│ • UPDATE <usn>|<amount> │
│ • DELETE <usn>          │
│ • BROADCAST <msg>       │
└─────────────────────────┘

💡 *Tip:* Send *SHORTCUT* for guide
👑 *Admin:* 9480072737`;
}

function getShortcutGuide() {
  return `╔════════════════════════════╗
║   ⚡ *QUICK COMMANDS*    ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 📚 *STUDENT SHORTCUTS*      │
├─────────────────────────────┤
│ ADD <name>|<usn>|<br>|<ph>  │
│ ▸ ADD Raj|3TS25CS100|CS|98  │
│                             │
│ DELETE <usn>                │
│ ▸ DELETE 3TS25CS100         │
│                             │
│ SEARCH <usn or name>        │
│ ▸ SEARCH 3TS25CS004         │
│ ▸ SEARCH Raj                │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 💰 *FEES SHORTCUTS*         │
├─────────────────────────────┤
│ FEE <usn>                   │
│ ▸ FEE 3TS25CS004            │
│                             │
│ UPDATE <usn>|<amount>       │
│ ▸ UPDATE 3TS25CS004|5000    │
│                             │
│ FEE DUE - Pending list      │
│ FEE SUMMARY - Stats         │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🚌 *BUS SHORTCUTS*          │
├─────────────────────────────┤
│ BUS LIST - All buses        │
│ STOPS <bus_no>              │
│ DETAILS <bus_no>            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 📢 *OTHER SHORTCUTS*        │
├─────────────────────────────┤
│ BROADCAST <message>         │
│ COMPLAINT <title>|<desc>    │
│ NOTICES - Latest            │
│ DRIVERS - All drivers       │
└─────────────────────────────┘

✨ *Commands are case-insensitive*`;
}

function getSearchFormat() {
  return `🔍 *SEARCH STUDENT*

┌─────────────────────────┐
│ 📝 *Format:*            │
│ SEARCH <USN or Name>    │
├─────────────────────────┤
│ 📌 *Examples:*          │
│ SEARCH 3TS25CS004       │
│ SEARCH Rohit            │
└─────────────────────────┘

✨ *Shows:* Name, USN, Branch, 
Phone, Email, Due Amount`;
}

function getFeeFormat() {
  return `💰 *FEE CHECK*

┌─────────────────────────┐
│ 📝 *Format:*            │
│ FEE <USN>               │
├─────────────────────────┤
│ 📌 *Example:*           │
│ FEE 3TS25CS004          │
└─────────────────────────┘

✨ *Shows:* Total Fees, Paid, 
Due, Last Payment, Method`;
}

function getBusStopsFormat() {
  return `🚏 *BUS STOPS*

┌─────────────────────────┐
│ 📝 *Format:*            │
│ STOPS <bus_number>      │
├─────────────────────────┤
│ 📌 *Example:*           │
│ STOPS KA01AB1234        │
└─────────────────────────┘`;
}

function getBusDetailsFormat() {
  return `🚌 *BUS DETAILS*

┌─────────────────────────┐
│ 📝 *Format:*            │
│ DETAILS <bus_number>    │
├─────────────────────────┤
│ 📌 *Example:*           │
│ DETAILS KA01AB1234      │
└─────────────────────────┘`;
}

function getComplaintFormat() {
  return `🛠️ *REGISTER COMPLAINT*

┌─────────────────────────┐
│ 📝 *Format:*            │
│ COMPLAINT <title>|<desc>│
├─────────────────────────┤
│ 📌 *Example:*           │
│ COMPLAINT Bus late|Bus  │
│ is coming 30 mins late  │
└─────────────────────────┘

✨ *Status:* Pending
⏰ *Response:* Within 24hrs`;
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

async function getStudentList() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, branch, phone_number, email')
    .order('full_name')
    .limit(30);
  
  if (error) return '❌ *Database Error*';
  if (!students || students.length === 0) return '📭 *No students found*';
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   📋 *STUDENT LIST*     ║\n`;
  message += `║   Total: ${students.length}         ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  
  students.forEach((s, i) => {
    message += `┌───────────── ${i+1} ─────────────┐\n`;
    message += `│ 👤 *${s.full_name}*\n`;
    message += `│ 📋 USN: ${s.usn}\n`;
    message += `│ 📚 Branch: ${s.branch || 'N/A'}\n`;
    if (s.phone_number) message += `│ 📞 Phone: ${s.phone_number}\n`;
    if (s.email) message += `│ 📧 Email: ${s.email}\n`;
    message += `└─────────────────────────────┘\n\n`;
  });
  
  message += `✨ *Send SEARCH <USN> for details*`;
  return message;
}

async function getStudentCountWithBranch() {
  const { data: students, error } = await supabase
    .from('students')
    .select('branch');
  
  if (error) return '❌ *Database Error*';
  
  const branchCount = {};
  students.forEach(s => {
    const branch = s.branch || 'Unknown';
    branchCount[branch] = (branchCount[branch] || 0) + 1;
  });
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   📊 *STUDENT COUNT*    ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  message += `┌─────────────────────────────┐\n`;
  message += `│ 📚 *BRANCH WISE*           │\n`;
  message += `├─────────────────────────────┤\n`;
  
  for (const [branch, count] of Object.entries(branchCount).sort()) {
    message += `│ • ${branch}: ${count} students\n`;
  }
  
  message += `├─────────────────────────────┤\n`;
  message += `│ 🎓 *TOTAL: ${students.length}*     │\n`;
  message += `└─────────────────────────────┘`;
  
  return message;
}

async function searchStudent(query) {
  if (!query) return getSearchFormat();
  
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .or(`usn.ilike.%${query}%, full_name.ilike.%${query}%`)
    .limit(5);
  
  if (error) return '❌ *Database Error*';
  if (!students || students.length === 0) return `❌ *No student found for:* ${query}`;
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   🔍 *SEARCH RESULTS*   ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  
  for (const s of students) {
    message += `┌───────── *STUDENT* ─────────┐\n`;
    message += `│ 👤 *${s.full_name}*\n`;
    message += `│ 📋 USN: ${s.usn}\n`;
    message += `│ 📚 Branch: ${s.branch || 'N/A'}\n`;
    message += `│ 🎓 Class: ${s.class || s.semester || 'N/A'}\n`;
    message += `│ 📞 Phone: ${s.phone_number || s.phone || 'N/A'}\n`;
    message += `│ 📧 Email: ${s.email || 'N/A'}\n`;
    message += `├─────────────────────────────┤\n`;
    message += `│ 💰 *FEE DETAILS*           │\n`;
    message += `│ Total: ₹${s.total_fees || 0}\n`;
    message += `│ Paid: ₹${s.paid_amount || 0}\n`;
    message += `│ Due: ₹${s.due_amount || 0}\n`;
    message += `│ Status: ${s.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n`;
    if (s.last_payment_date) message += `│ Last Payment: ${s.last_payment_date}\n`;
    if (s.payment_mode) message += `│ Payment Mode: ${s.payment_mode}\n`;
    if (s.next_payment_date) message += `│ Next Payment: ${s.next_payment_date}\n`;
    message += `└─────────────────────────────┘\n\n`;
  }
  
  return message;
}

// ============================================
// FEES FUNCTIONS
// ============================================

async function getStudentFeeDetails(usn) {
  if (!usn) return getFeeFormat();
  
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('usn', usn)
    .single();
  
  if (error) return `❌ *Student not found:* ${usn}`;
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   💰 *FEE DETAILS*      ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  message += `┌───────── *STUDENT* ─────────┐\n`;
  message += `│ 👤 ${student.full_name}\n`;
  message += `│ 📋 ${student.usn}\n`;
  message += `│ 📚 ${student.branch || 'N/A'}\n`;
  message += `├─────────────────────────────┤\n`;
  message += `│ 💰 *FINANCIAL SUMMARY*     │\n`;
  message += `├─────────────────────────────┤\n`;
  message += `│ Total Fees:  ₹${student.total_fees || 0}\n`;
  message += `│ Paid Amount: ₹${student.paid_amount || 0}\n`;
  message += `│ Due Amount:  ₹${student.due_amount || 0}\n`;
  message += `├─────────────────────────────┤\n`;
  message += `│ 📊 Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n`;
  
  if (student.due_amount > 0 && student.due_amount < (student.total_fees || 0)) {
    message += `│ ⚠️ *PARTIAL PAYMENT*       \n`;
  }
  
  if (student.last_payment_date) {
    message += `├─────────────────────────────┤\n`;
    message += `│ 📅 Last Payment: ${student.last_payment_date}\n`;
    message += `│ 💳 Payment Mode: ${student.payment_mode || 'N/A'}\n`;
  }
  
  if (student.next_payment_date) {
    message += `│ ⏰ Next Payment: ${student.next_payment_date}\n`;
  }
  
  message += `└─────────────────────────────┘`;
  return message;
}

async function getCompleteDueFeesList() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, branch, due_amount, paid_amount, total_fees, last_payment_date, payment_mode')
    .eq('fees_due', true)
    .gt('due_amount', 0)
    .order('due_amount', { ascending: false });
  
  if (error) return '❌ *Database Error*';
  if (!students || students.length === 0) return '✅ *No pending fees! All students paid.*';
  
  let totalDue = 0;
  let fullDue = 0;
  let partialDue = 0;
  
  students.forEach(s => {
    totalDue += s.due_amount;
    if (s.paid_amount === 0) fullDue++;
    else if (s.due_amount > 0 && s.paid_amount > 0) partialDue++;
  });
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   ⚠️ *PENDING FEES*      ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  message += `┌───────── *SUMMARY* ─────────┐\n`;
  message += `│ 📊 Total Due Students: ${students.length}\n`;
  message += `│ 🔴 Full Due: ${fullDue}\n`;
  message += `│ 🟡 Partial Due: ${partialDue}\n`;
  message += `│ 💰 Total Due Amount: ₹${totalDue}\n`;
  message += `└─────────────────────────────┘\n\n`;
  
  message += `┌──────── *DUE LIST* ─────────┐\n`;
  
  students.slice(0, 20).forEach((s, i) => {
    const status = s.paid_amount === 0 ? '🔴 FULL' : '🟡 PARTIAL';
    message += `│ ${i+1}. *${s.full_name}*\n`;
    message += `│    USN: ${s.usn}\n`;
    message += `│    Branch: ${s.branch || 'N/A'}\n`;
    message += `│    Due: ₹${s.due_amount}\n`;
    message += `│    Status: ${status}\n`;
    if (s.last_payment_date) message += `│    Last Paid: ${s.last_payment_date}\n`;
    message += `├─────────────────────────────┤\n`;
  });
  
  if (students.length > 20) {
    message += `│ 📌 +${students.length - 20} more...\n`;
  }
  
  message += `└─────────────────────────────┘\n\n`;
  message += `💡 *Send FEE <USN> for details*`;
  
  return message;
}

async function getFeesSummary() {
  const { data: students, error } = await supabase
    .from('students')
    .select('total_fees, paid_amount, due_amount, fees_due, branch');
  
  if (error) return '❌ *Database Error*';
  
  let totalFees = 0, totalPaid = 0, totalDue = 0;
  let paidCount = 0, dueCount = 0;
  const branchStats = {};
  
  students.forEach(s => {
    totalFees += Number(s.total_fees) || 0;
    totalPaid += Number(s.paid_amount) || 0;
    totalDue += Number(s.due_amount) || 0;
    
    if (s.fees_due && s.due_amount > 0) dueCount++;
    else if (!s.fees_due) paidCount++;
    
    const branch = s.branch || 'Unknown';
    if (!branchStats[branch]) {
      branchStats[branch] = { total: 0, paid: 0, due: 0 };
    }
    branchStats[branch].total += Number(s.total_fees) || 0;
    branchStats[branch].paid += Number(s.paid_amount) || 0;
    branchStats[branch].due += Number(s.due_amount) || 0;
  });
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   📊 *FEE SUMMARY*       ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  
  message += `┌──────── *OVERALL* ──────────┐\n`;
  message += `│ 💰 Total Fees:  ₹${totalFees}\n`;
  message += `│ ✅ Collected:   ₹${totalPaid}\n`;
  message += `│ ⚠️ Due:         ₹${totalDue}\n`;
  message += `├─────────────────────────────┤\n`;
  message += `│ 📈 Collection Rate: ${((totalPaid/totalFees)*100).toFixed(1)}%\n`;
  message += `│ 🟢 Fully Paid: ${paidCount}\n`;
  message += `│ 🔴 Pending: ${dueCount}\n`;
  message += `│ 👥 Total: ${students.length}\n`;
  message += `└─────────────────────────────┘\n\n`;
  
  message += `┌──────── *BRANCH WISE* ──────┐\n`;
  for (const [branch, stats] of Object.entries(branchStats).sort()) {
    const rate = stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : 0;
    message += `│ 📚 *${branch}*\n`;
    message += `│    Total: ₹${stats.total}\n`;
    message += `│    Paid: ₹${stats.paid}\n`;
    message += `│    Due: ₹${stats.due}\n`;
    message += `│    Rate: ${rate}%\n`;
    message += `├─────────────────────────────┤\n`;
  }
  
  message += `└─────────────────────────────┘\n\n`;
  message += `💡 *Send FEE DUE for pending list*`;
  
  return message;
}

// ============================================
// BUS FUNCTIONS
// ============================================

async function getBusList() {
  const { data: buses, error } = await supabase
    .from('buses')
    .select('bus_number, route_name, is_active')
    .limit(20);
  
  if (error) return '❌ *Database Error*';
  if (!buses || buses.length === 0) return '🚌 *No buses found*';
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   🚌 *BUS LIST*         ║\n`;
  message += `║   Total: ${buses.length}          ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  
  buses.forEach((b, i) => {
    message += `┌───────── BUS ${i+1} ─────────┐\n`;
    message += `│ 🔢 *${b.bus_number}*\n`;
    message += `│ 🗺️ Route: ${b.route_name || 'N/A'}\n`;
    message += `│ ${b.is_active ? '🟢 Active' : '🔴 Inactive'}\n`;
    message += `└─────────────────────────────┘\n\n`;
  });
  
  return message;
}

async function getBusDetails(busNumber) {
  if (!busNumber) return getBusDetailsFormat();
  
  const { data: bus, error } = await supabase
    .from('buses')
    .select('*')
    .eq('bus_number', busNumber)
    .single();
  
  if (error) return `❌ *Bus not found:* ${busNumber}`;
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   🚌 *BUS DETAILS*      ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  message += `┌─────────────────────────────┐\n`;
  message += `│ 🔢 *${bus.bus_number}*\n`;
  message += `│ 🗺️ Route: ${bus.route_name || 'N/A'}\n`;
  message += `│ 📊 Status: ${bus.is_active ? '🟢 Active' : '🔴 Inactive'}\n`;
  message += `├─────────────────────────────┤\n`;
  message += `│ 📅 *EXPIRY DATES*           │\n`;
  message += `│ PUC: ${bus.puc_expiry || 'N/A'}\n`;
  message += `│ Insurance: ${bus.insurance_expiry || 'N/A'}\n`;
  message += `│ Fitness: ${bus.fitness_expiry || 'N/A'}\n`;
  message += `│ Permit: ${bus.permit_expiry || 'N/A'}\n`;
  message += `├─────────────────────────────┤\n`;
  message += `│ 🔧 *MAINTENANCE*            │\n`;
  message += `│ Last Service: ${bus.last_service_date || 'N/A'}\n`;
  message += `│ Next Service: ${bus.next_service_due || 'N/A'}\n`;
  message += `│ Current KM: ${bus.current_km || 'N/A'}\n`;
  if (bus.remarks) message += `│ 📝 Remarks: ${bus.remarks}\n`;
  message += `└─────────────────────────────┘`;
  
  return message;
}

async function getBusStops(busNumber) {
  if (!busNumber) return getBusStopsFormat();
  
  const { data: bus } = await supabase
    .from('buses')
    .select('id')
    .eq('bus_number', busNumber)
    .single();
  
  if (!bus) return `❌ *Bus not found:* ${busNumber}`;
  
  const { data: stops } = await supabase
    .from('bus_stops')
    .select('stop_name, sequence, estimated_time, is_major')
    .eq('bus_id', bus.id)
    .order('sequence')
    .limit(20);
  
  if (!stops || stops.length === 0) return `🚏 *No stops found for* ${busNumber}`;
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   🚏 *BUS STOPS*        ║\n`;
  message += `║   ${busNumber}    ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  message += `┌─────────────────────────────┐\n`;
  
  stops.forEach(s => {
    message += `│ ${s.sequence}. ${s.stop_name}`;
    if (s.is_major) message += ` ⭐`;
    if (s.estimated_time) message += ` (${s.estimated_time} min)`;
    message += `\n`;
  });
  
  message += `└─────────────────────────────┘`;
  return message;
}

// ============================================
// OTHER FUNCTIONS
// ============================================

async function registerComplaint(phoneNumber, complaintText) {
  const parts = complaintText.split('|');
  const title = parts[0]?.trim();
  const description = parts[1]?.trim();
  
  if (!title || !description) return getComplaintFormat();
  
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (!student) return '❌ *Student not found. Contact admin.*';
  
  const { error } = await supabase
    .from('complaints')
    .insert({
      student_id: student.id,
      title: title,
      description: description,
      status: 'pending'
    });
  
  if (error) return '❌ *Failed to register complaint*';
  
  return `╔════════════════════════════╗
║   ✅ *COMPLAINT LOGGED*   ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 📌 *${title}*
│ 📝 ${description}
├─────────────────────────────┤
│ 📊 Status: Pending
│ 🆔 ID: ${Date.now().toString().slice(-8)}
├─────────────────────────────┤
│ ⏰ Response within 24hrs
└─────────────────────────────┘

✨ *Thank you for reporting*`;
}

async function getNotices() {
  const { data: notices, error } = await supabase
    .from('notices')
    .select('title, description, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) return '❌ *Database Error*';
  if (!notices || notices.length === 0) return '📢 *No notices available*';
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   📢 *LATEST NOTICES*   ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  
  notices.forEach((n, i) => {
    message += `┌───────── NOTICE ${i+1} ────────┐\n`;
    message += `│ 📌 *${n.title}*\n`;
    if (n.description) {
      const desc = n.description.length > 50 ? n.description.substring(0, 50) + '...' : n.description;
      message += `│ 📝 ${desc}\n`;
    }
    message += `│ 📅 ${new Date(n.created_at).toLocaleDateString()}\n`;
    message += `└─────────────────────────────┘\n\n`;
  });
  
  return message;
}

async function getDriversList() {
  const { data: drivers, error } = await supabase
    .from('drivers_new')
    .select('name, contact, driver_code')
    .limit(15);
  
  if (error) return '❌ *Database Error*';
  if (!drivers || drivers.length === 0) return '👨‍✈️ *No drivers found*';
  
  let message = `╔════════════════════════════╗\n`;
  message += `║   👨‍✈️ *DRIVERS LIST*    ║\n`;
  message += `║   Total: ${drivers.length}          ║\n`;
  message += `╚════════════════════════════╝\n\n`;
  
  drivers.forEach((d, i) => {
    message += `┌───────── DRIVER ${i+1} ───────┐\n`;
    message += `│ 👤 *${d.name}*\n`;
    if (d.driver_code) message += `│ 🆔 Code: ${d.driver_code}\n`;
    if (d.contact) message += `│ 📞 ${d.contact}\n`;
    message += `└─────────────────────────────┘\n\n`;
  });
  
  return message;
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

async function addStudent(data) {
  if (!data || data.length < 3) {
    return `❌ *ADD STUDENT FORMAT*

┌─────────────────────────────┐
│ 📝 Format:                  │
│ ADD <name>|<usn>|<branch>   │
│      |<phone>|<email>       │
├─────────────────────────────┤
│ 📌 Example:                 │
│ ADD Raj Kumar|3TS25CS100|   │
│ Computer Science|9876543210 │
│ |raj@email.com              │
└─────────────────────────────┘`;
  }
  
  const [name, usn, branch, phone, email] = data;
  
  const { error } = await supabase
    .from('students')
    .insert({
      full_name: name,
      usn: usn,
      branch: branch,
      phone_number: phone,
      email: email,
      total_fees: 0,
      paid_amount: 0,
      due_amount: 0,
      fees_due: false
    });
  
  if (error) return `❌ *Failed:* ${error.message}`;
  
  return `╔════════════════════════════╗
║   ✅ *STUDENT ADDED*      ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 👤 *${name}*
│ 📋 USN: ${usn}
│ 📚 Branch: ${branch}
│ 📞 Phone: ${phone || 'N/A'}
│ 📧 Email: ${email || 'N/A'}
├─────────────────────────────┤
│ 📊 Status: Active
└─────────────────────────────┘`;
}

async function updateStudentFees(usn, amount) {
  if (!usn || !amount) {
    return `❌ *UPDATE FEES FORMAT*

┌─────────────────────────────┐
│ 📝 Format:                  │
│ UPDATE <usn>|<amount>       │
├─────────────────────────────┤
│ 📌 Example:                 │
│ UPDATE 3TS25CS004|5000      │
└─────────────────────────────┘`;
  }
  
  const { data: student } = await supabase
    .from('students')
    .select('paid_amount, due_amount, total_fees')
    .eq('usn', usn)
    .single();
  
  if (!student) return `❌ *Student not found:* ${usn}`;
  
  const newPaid = (student.paid_amount || 0) + Number(amount);
  const newDue = (student.total_fees || 0) - newPaid;
  
  const { error } = await supabase
    .from('students')
    .update({
      paid_amount: newPaid,
      due_amount: newDue,
      fees_due: newDue > 0,
      last_payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'WhatsApp Update'
    })
    .eq('usn', usn);
  
  if (error) return `❌ *Failed:* ${error.message}`;
  
  return `╔════════════════════════════╗
║   ✅ *FEES UPDATED*       ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 📋 USN: ${usn}
├─────────────────────────────┤
│ 💰 Previous Paid: ₹${student.paid_amount || 0}
│ 💵 Amount Added: ₹${amount}
│ ✅ New Paid: ₹${newPaid}
│ ⚠️ Due: ₹${newDue}
├─────────────────────────────┤
│ 📊 Status: ${newDue > 0 ? '🔴 PENDING' : '🟢 PAID'}
└─────────────────────────────┘`;
}

async function deleteStudent(usn) {
  if (!usn) return '❌ *Usage:* DELETE <usn>';
  
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('usn', usn);
  
  if (error) return `❌ *Failed:* ${error.message}`;
  
  return `✅ *Student Deleted:* ${usn}`;
}

async function broadcastMessage(message) {
  if (!message) return '❌ *Usage:* BROADCAST <message>';
  
  const { data: students } = await supabase
    .from('students')
    .select('phone_number');
  
  let sent = 0;
  for (const student of students) {
    if (student.phone_number) {
      const broadcastMsg = `╔════════════════════════════╗
║   📢 *BROADCAST*        ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 📝 ${message}
└─────────────────────────────┘

✨ *SGI College*`;
      await sendWhatsAppMessage(`91${student.phone_number}`, broadcastMsg);
      sent++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return `✅ *Broadcast sent to ${sent} students*`;
}

async function handlePublicCommands(message, upperMsg) {
  if (upperMsg === 'HELP' || upperMsg === 'START') {
    return `🤖 *SGI BUS BOT*

┌─────────────────────────────┐
│ 📚 *Available Commands*     │
├─────────────────────────────┤
│ • LIST - All students       │
│ • FEE <USN> - Check fees    │
│ • BUS LIST - All buses      │
│ • NOTICES - Latest notices  │
│ • DRIVERS - All drivers     │
└─────────────────────────────┘

📞 *Contact admin for issues*`;
  }
  else if (upperMsg === 'LIST') {
    return await getStudentList();
  }
  else if (upperMsg === 'BUS LIST') {
    return await getBusList();
  }
  else if (upperMsg === 'NOTICES') {
    return await getNotices();
  }
  else if (upperMsg === 'DRIVERS') {
    return await getDriversList();
  }
  else if (message?.match(/^fee\s/i)) {
    const usn = message.replace(/^fee\s/i, '');
    return await getStudentFeeDetails(usn);
  }
  
  return null;
}

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  if (!apiKey) {
    console.log("❌ API Key missing");
    return;
  }
  
  try {
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
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
    
    const result = await response.json();
    console.log(`📬 API Response: ${response.status}`);
    return result;
  } catch (error) {
    console.error("Send error:", error);
  }
}