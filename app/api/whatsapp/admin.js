import { supabase } from '@/lib/supabase';

export async function handleAdminCommands(userMessage, cleanNumber) {
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // ============ MAIN MENU ============
  if (['BUS', 'MENU', 'START', 'HELP'].includes(upperMsg)) {
    replyMessage = getMainMenu();
  }
  
  // ============ STUDENT MENU ============
  else if (['STUDENT', 'STUDENT LIST', '8'].includes(upperMsg)) {
    replyMessage = await getStudentList();
  }
  else if (['SEARCH', 'SEARCH STUDENT', '9'].includes(upperMsg)) {
    replyMessage = getSearchFormat();
  }
  else if (['COUNT', 'STUDENT COUNT', '10'].includes(upperMsg)) {
    replyMessage = await getStudentCountWithBranch();
  }
  
  // ============ FEES MENU ============
  else if (['FEE', 'FEE CHECK', '5'].includes(upperMsg)) {
    replyMessage = getFeeFormat();
  }
  else if (['FEE DUE', '6', 'DUE LIST'].includes(upperMsg)) {
    replyMessage = await getCompleteDueFeesList();
  }
  else if (['FEE SUMMARY', '7'].includes(upperMsg)) {
    replyMessage = await getFeesSummary();
  }
  
  // ============ BUS MENU ============
  else if (['BUS LIST', '1'].includes(upperMsg)) {
    replyMessage = await getBusList();
  }
  else if (['BUS STOPS', '3'].includes(upperMsg)) {
    replyMessage = getBusStopsFormat();
  }
  else if (['BUS DETAILS', '4'].includes(upperMsg)) {
    replyMessage = getBusDetailsFormat();
  }
  
  // ============ OTHER ============
  else if (['COMPLAINT', '11'].includes(upperMsg)) {
    replyMessage = getComplaintFormat();
  }
  else if (['NOTICES', '12'].includes(upperMsg)) {
    replyMessage = await getNotices();
  }
  else if (['DRIVERS', '13'].includes(upperMsg)) {
    replyMessage = await getDriversList();
  }
  else if (['SHORTCUT', 'SHORTCUTS'].includes(upperMsg)) {
    replyMessage = getShortcutGuide();
  }
  
  // ============ SEARCH WITH ARGS ============
  else if (userMessage?.match(/^search\s/i)) {
    const query = userMessage.replace(/^search\s/i, '');
    replyMessage = await searchStudent(query);
  }
  else if (userMessage?.match(/^fee\s/i)) {
    const usn = userMessage.replace(/^fee\s/i, '');
    replyMessage = await getStudentFeeDetails(usn);
  }
  else if (userMessage?.match(/^stops\s/i)) {
    const busNumber = userMessage.replace(/^stops\s/i, '');
    replyMessage = await getBusStops(busNumber);
  }
  else if (userMessage?.match(/^details\s/i)) {
    const busNumber = userMessage.replace(/^details\s/i, '');
    replyMessage = await getBusDetails(busNumber);
  }
  else if (userMessage?.match(/^complaint\s/i)) {
    const complaintText = userMessage.replace(/^complaint\s/i, '');
    replyMessage = await registerComplaint(cleanNumber, complaintText);
  }
  else if (userMessage?.match(/^add\s/i)) {
    const data = userMessage.replace(/^add\s/i, '').split('|');
    replyMessage = await addStudent(data);
  }
  else if (userMessage?.match(/^update\s/i)) {
    const parts = userMessage.replace(/^update\s/i, '').split('|');
    replyMessage = await updateStudentFees(parts[0], parts[1]);
  }
  else if (userMessage?.match(/^delete\s/i)) {
    const usn = userMessage.replace(/^delete\s/i, '');
    replyMessage = await deleteStudent(usn);
  }
  else if (userMessage?.match(/^broadcast\s/i)) {
    const msg = userMessage.replace(/^broadcast\s/i, '');
    replyMessage = await broadcastMessage(msg);
  }
  
  // ============ DEFAULT ============
  else if (userMessage && userMessage !== '') {
    replyMessage = `❌ *Unknown Command*\n\n${getMainMenu()}`;
  }
  
  return replyMessage;
}

// ============================================
// MENU FUNCTIONS
// ============================================

function getMainMenu() {
  return `╔════════════════════════════╗
║   🤖 *SGI BUS BOT*       ║
║      Admin Panel          ║
╚════════════════════════════╝

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

💡 *Commands:* FEE <USN>, SEARCH <name>, DUE LIST

👑 *Admins:* 9480072737`;
}

function getShortcutGuide() {
  return `╔════════════════════════════╗
║   ⚡ *QUICK COMMANDS*    ║
╚════════════════════════════╝

ADD <name>|<usn>|<br>|<ph>
DELETE <usn>
SEARCH <usn or name>
FEE <usn>
UPDATE <usn>|<amount>
STOPS <bus_no>
DETAILS <bus_no>`;
}

function getSearchFormat() {
  return `🔍 *SEARCH STUDENT*
Format: SEARCH <USN or Name>
Example: SEARCH 3TS25CS004`;
}

function getFeeFormat() {
  return `💰 *FEE CHECK*
Format: FEE <USN>
Example: FEE 3TS25CS004`;
}

function getBusStopsFormat() {
  return `🚏 *BUS STOPS*
Format: STOPS <bus_number>`;
}

function getBusDetailsFormat() {
  return `🚌 *BUS DETAILS*
Format: DETAILS <bus_number>`;
}

function getComplaintFormat() {
  return `🛠️ *REGISTER COMPLAINT*
Format: COMPLAINT <title>|<desc>
Example: COMPLAINT Bus late|Bus is coming 30 mins late`;
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

async function getStudentList() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, branch, phone_number, email')
    .order('full_name');
  
  if (error) return '❌ *Database Error*';
  if (!students || students.length === 0) return '📭 *No students found*';
  
  let message = `📋 *STUDENT LIST* (${students.length})\n\n`;
  
  students.forEach((s, i) => {
    message += `${i+1}. 👤 *${s.full_name}*\n`;
    message += `   📋 ${s.usn} | 📚 ${s.branch || 'N/A'}\n`;
    if (s.phone_number) message += `   📞 ${s.phone_number}\n`;
    message += `\n`;
  });
  
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
  
  let message = `📊 *STUDENT COUNT*\n\n`;
  
  for (const [branch, count] of Object.entries(branchCount).sort()) {
    message += `• ${branch}: ${count}\n`;
  }
  
  message += `\n🎓 *TOTAL: ${students.length}*`;
  
  return message;
}

async function searchStudent(query) {
  if (!query) return getSearchFormat();
  
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .or(`usn.ilike.%${query}%, full_name.ilike.%${query}%`);
  
  if (error) return '❌ *Database Error*';
  if (!students || students.length === 0) return `❌ *No student found for:* ${query}`;
  
  let message = `🔍 *SEARCH RESULTS* (${students.length})\n\n`;
  
  for (const s of students) {
    message += `👤 *${s.full_name}*\n`;
    message += `📋 USN: ${s.usn}\n`;
    message += `📚 Branch: ${s.branch || 'N/A'}\n`;
    message += `📞 Phone: ${s.phone_number || 'N/A'}\n`;
    message += `💰 Fees: ₹${s.paid_amount || 0}/₹${s.total_fees || 0}\n`;
    message += `📊 Status: ${s.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n\n`;
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
  
  return `💰 *FEE DETAILS*
👤 ${student.full_name}
📋 ${student.usn}
📚 ${student.branch || 'N/A'}

💰 Total: ₹${student.total_fees || 0}
✅ Paid: ₹${student.paid_amount || 0}
⚠️ Due: ₹${student.due_amount || 0}
📊 Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}
📅 Last Payment: ${student.last_payment_date || 'N/A'}`;
}

async function getCompleteDueFeesList() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, due_amount, paid_amount')
    .eq('fees_due', true)
    .gt('due_amount', 0)
    .order('due_amount', { ascending: false });
  
  if (error) return '❌ *Database Error*';
  if (!students || students.length === 0) return '✅ *No pending fees!*';
  
  let message = `⚠️ *PENDING FEES* (${students.length})\n\n`;
  
  students.forEach((s, i) => {
    message += `${i+1}. ${s.full_name} - ₹${s.due_amount}\n`;
    message += `   USN: ${s.usn}\n\n`;
  });
  
  return message;
}

async function getFeesSummary() {
  const { data: students, error } = await supabase
    .from('students')
    .select('total_fees, paid_amount, due_amount, fees_due');
  
  if (error) return '❌ *Database Error*';
  
  let totalFees = 0, totalPaid = 0, totalDue = 0, dueCount = 0;
  
  students.forEach(s => {
    totalFees += Number(s.total_fees) || 0;
    totalPaid += Number(s.paid_amount) || 0;
    totalDue += Number(s.due_amount) || 0;
    if (s.fees_due) dueCount++;
  });
  
  return `📊 *FEE SUMMARY*

💰 Total Fees: ₹${totalFees}
✅ Collected: ₹${totalPaid}
⚠️ Due: ₹${totalDue}
📈 Collection: ${((totalPaid/totalFees)*100).toFixed(1)}%
🟢 Paid: ${students.length - dueCount}
🔴 Pending: ${dueCount}`;
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
  
  let message = `🚌 *BUS LIST* (${buses.length})\n\n`;
  
  buses.forEach((b, i) => {
    message += `${i+1}. ${b.bus_number} - ${b.route_name || 'N/A'} [${b.is_active ? '🟢' : '🔴'}]\n`;
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
  
  return `🚌 *BUS DETAILS*
🔢 ${bus.bus_number}
🗺️ Route: ${bus.route_name || 'N/A'}
📊 Status: ${bus.is_active ? '🟢 Active' : '🔴 Inactive'}

📅 *EXPIRY DATES*
PUC: ${bus.puc_expiry || 'N/A'}
Insurance: ${bus.insurance_expiry || 'N/A'}
Fitness: ${bus.fitness_expiry || 'N/A'}
Permit: ${bus.permit_expiry || 'N/A'}

🔧 *MAINTENANCE*
Last Service: ${bus.last_service_date || 'N/A'}
Next Service: ${bus.next_service_due || 'N/A'}
Current KM: ${bus.current_km || 'N/A'}`;
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
  
  let message = `🚏 *BUS STOPS - ${busNumber}*\n\n`;
  
  stops.forEach(s => {
    message += `${s.sequence}. ${s.stop_name}`;
    if (s.is_major) message += ` ⭐`;
    if (s.estimated_time) message += ` (${s.estimated_time} min)`;
    message += `\n`;
  });
  
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
  
  if (!student) return '❌ *Student not found*';
  
  const { error } = await supabase
    .from('complaints')
    .insert({
      student_id: student.id,
      title: title,
      description: description,
      status: 'pending'
    });
  
  if (error) return '❌ *Failed to register complaint*';
  
  return `✅ *COMPLAINT LOGGED*
📌 ${title}
📝 ${description}
📊 Status: Pending`;
}

async function getNotices() {
  const { data: notices, error } = await supabase
    .from('notices')
    .select('title, description, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) return '❌ *Database Error*';
  if (!notices || notices.length === 0) return '📢 *No notices available*';
  
  let message = `📢 *LATEST NOTICES*\n\n`;
  
  notices.forEach((n, i) => {
    message += `${i+1}. 📌 ${n.title}\n`;
    if (n.description) {
      const desc = n.description.length > 50 ? n.description.substring(0, 50) + '...' : n.description;
      message += `   ${desc}\n`;
    }
    message += `\n`;
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
  
  let message = `👨‍✈️ *DRIVERS LIST* (${drivers.length})\n\n`;
  
  drivers.forEach((d, i) => {
    message += `${i+1}. 👤 ${d.name}`;
    if (d.driver_code) message += ` [${d.driver_code}]`;
    if (d.contact) message += `\n   📞 ${d.contact}`;
    message += `\n\n`;
  });
  
  return message;
}

async function addStudent(data) {
  if (!data || data.length < 3) {
    return `❌ Format: ADD <name>|<usn>|<branch>|<phone>`;
  }
  
  const [name, usn, branch, phone] = data;
  
  const { error } = await supabase
    .from('students')
    .insert({
      full_name: name,
      usn: usn,
      branch: branch,
      phone_number: phone,
      total_fees: 0,
      paid_amount: 0,
      due_amount: 0,
      fees_due: false
    });
  
  if (error) return `❌ Failed: ${error.message}`;
  
  return `✅ *STUDENT ADDED*
👤 ${name}
📋 USN: ${usn}
📚 Branch: ${branch}
📞 Phone: ${phone || 'N/A'}`;
}

async function updateStudentFees(usn, amount) {
  if (!usn || !amount) return `❌ Format: UPDATE <usn>|<amount>`;
  
  const { data: student } = await supabase
    .from('students')
    .select('paid_amount, due_amount, total_fees')
    .eq('usn', usn)
    .single();
  
  if (!student) return `❌ Student not found: ${usn}`;
  
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
  
  if (error) return `❌ Failed: ${error.message}`;
  
  return `✅ *FEES UPDATED*
📋 USN: ${usn}
💰 Previous: ₹${student.paid_amount || 0}
💵 Added: ₹${amount}
✅ New Paid: ₹${newPaid}
⚠️ Due: ₹${newDue}
📊 Status: ${newDue > 0 ? '🔴 PENDING' : '🟢 PAID'}`;
}

async function deleteStudent(usn) {
  if (!usn) return '❌ Usage: DELETE <usn>';
  
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('usn', usn);
  
  if (error) return `❌ Failed: ${error.message}`;
  
  return `✅ Student Deleted: ${usn}`;
}

async function broadcastMessage(message) {
  if (!message) return '❌ Usage: BROADCAST <message>';
  
  return `✅ Broadcast would be sent with: ${message}`;
  // Note: Implement actual broadcast if needed
}