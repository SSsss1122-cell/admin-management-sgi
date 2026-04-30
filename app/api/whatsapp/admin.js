import { supabase } from '@/lib/supabase';

// ============================================
// =============== MAIN ADMIN HANDLER ==========
// ============================================

export async function handleAdminCommands(userMessage, cleanNumber, isAdminUser = false) {
  // Block non-admin users
  if (!isAdminUser) {
    return "🔒 *Access Denied*\n\nSend *MENU* for available options.";
  }
  
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // MENU
  if (['BUS', 'MENU', 'START', 'HELP'].includes(upperMsg)) {
    replyMessage = getAdminMenu();
  }
  
  // ========== STUDENT SECTION ==========
  else if (['STUDENT', 'STUDENT LIST', '8'].includes(upperMsg)) {
    replyMessage = await getStudentList();
  }
  else if (['SEARCH', 'SEARCH STUDENT', '9'].includes(upperMsg)) {
    replyMessage = getSearchFormat();
  }
  else if (['COUNT', 'STUDENT COUNT', '10'].includes(upperMsg)) {
    replyMessage = await getStudentCountWithBranch();
  }
  
  // ========== FEES SECTION ==========
  else if (['FEE', 'FEE CHECK', '5'].includes(upperMsg)) {
    replyMessage = getFeeFormat();
  }
  else if (['FEE DUE', '6', 'DUE LIST'].includes(upperMsg)) {
    replyMessage = await getCompleteDueFeesList();
  }
  else if (['FEE SUMMARY', '7'].includes(upperMsg)) {
    replyMessage = await getFeesSummary();
  }
  
  // ========== BUS SECTION ==========
  else if (['BUS LIST', '1'].includes(upperMsg)) {
    replyMessage = await getBusList();
  }
  else if (['BUS STOPS', '3'].includes(upperMsg)) {
    replyMessage = getBusStopsFormat();
  }
  else if (['BUS DETAILS', '4'].includes(upperMsg)) {
    replyMessage = getBusDetailsFormat();
  }
  
  // ========== OTHER SECTION ==========
  else if (['COMPLAINT', '11'].includes(upperMsg)) {
    replyMessage = getComplaintFormat();
  }
  else if (['NOTICES', '12'].includes(upperMsg)) {
    replyMessage = await getNotices();
  }
  else if (['DRIVERS', '13'].includes(upperMsg)) {
    replyMessage = await getDriversList();
  }
  else if (upperMsg === 'DEBUG') {
    replyMessage = await debugDatabase();
  }
  
  // ========== COMMANDS WITH ARGUMENTS ==========
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
  
  // DEFAULT
  else if (userMessage && userMessage !== '') {
    replyMessage = `❌ *Unknown Command*\n\n${getAdminMenu()}`;
  }
  
  return replyMessage;
}

// ============================================
// =================== MENUS ==================
// ============================================

function getAdminMenu() {
  return `╔════════════════════════════╗
║   👑 *ADMIN PANEL*         ║
╚════════════════════════════╝

┌─────────────────────────┐
│  🚌 *BUS*               │
├─────────────────────────┤
│ 1️⃣ BUS LIST            │
│ 3️⃣ BUS STOPS           │
│ 4️⃣ BUS DETAILS         │
└─────────────────────────┘

┌─────────────────────────┐
│  💰 *FEES*              │
├─────────────────────────┤
│ 5️⃣ FEE CHECK           │
│ 6️⃣ FEE DUE LIST        │
│ 7️⃣ FEE SUMMARY         │
└─────────────────────────┘

┌─────────────────────────┐
│  📚 *STUDENT*           │
├─────────────────────────┤
│ 8️⃣ STUDENT LIST        │
│ 9️⃣ SEARCH STUDENT      │
│ 🔟 STUDENT COUNT       │
└─────────────────────────┘

⚡ DEBUG - Check system`;
}

function getSearchFormat() {
  return `🔍 *SEARCH STUDENT*\nFormat: SEARCH <USN or Name>`;
}

function getFeeFormat() {
  return `💰 *FEE CHECK*\nFormat: FEE <USN>`;
}

function getBusStopsFormat() {
  return `🚏 *BUS STOPS*\nFormat: STOPS <bus_number>`;
}

function getBusDetailsFormat() {
  return `🚌 *BUS DETAILS*\nFormat: DETAILS <bus_number>`;
}

function getComplaintFormat() {
  return `🛠️ *COMPLAINT*\nFormat: COMPLAINT <title>|<description>`;
}

// ============================================
// =========== GET STUDENT LIST (MAIN) ========
// ============================================

async function getStudentList() {
  try {
    console.log('📋 Fetching student list...');
    
    const { data: students, error } = await supabase
      .from('students')
      .select('full_name, usn, branch, class, division, phone, email, total_fees, paid_amount, due_amount, fees_due')
      .order('full_name', { ascending: true });
    
    // SHOW REAL ERROR IF ANY
    if (error) {
      console.error('❌ Supabase Error:', error);
      return `❌ *DATABASE ERROR*

Message: ${error.message}
Code: ${error.code}
Details: ${error.details || 'None'}

Please check:
• Table 'students' exists
• Column names are correct
• Supabase connection is working`;
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students found*\n\nUse: ADD <name>|<usn>|<branch>|<phone>';
    }
    
    let message = `📋 *STUDENT LIST* (${students.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    students.forEach((s, i) => {
      message += `${i+1}. 👤 *${s.full_name || 'N/A'}*\n`;
      message += `   📋 USN: ${s.usn || 'N/A'}\n`;
      message += `   📚 Branch: ${s.branch || 'N/A'}`;
      if (s.class) message += ` | Class: ${s.class}`;
      if (s.division) message += `-${s.division}`;
      message += `\n`;
      if (s.phone) message += `   📞 Phone: ${s.phone}\n`;
      message += `   💰 Fees: ₹${s.paid_amount || 0}/₹${s.total_fees || 0}\n`;
      message += `\n`;
    });
    
    return message;
  } catch (error) {
    console.error('❌ Exception:', error);
    return `❌ *ERROR*: ${error.message}`;
  }
}

// ============================================
// ========== GET STUDENT COUNT ===============
// ============================================

async function getStudentCountWithBranch() {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('branch');
    
    if (error) {
      return `❌ *Error*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students found*';
    }
    
    const branchCount = {};
    students.forEach(s => {
      const branch = s.branch || 'Unknown';
      branchCount[branch] = (branchCount[branch] || 0) + 1;
    });
    
    let message = `📊 *STUDENT COUNT*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    for (const [branch, count] of Object.entries(branchCount).sort()) {
      message += `• ${branch}: ${count}\n`;
    }
    message += `\n🎓 TOTAL: ${students.length}`;
    
    return message;
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// =========== SEARCH STUDENT =================
// ============================================

async function searchStudent(query) {
  if (!query || query.trim() === '') {
    return getSearchFormat();
  }
  
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .or(`usn.ilike.%${query}%, full_name.ilike.%${query}%, phone.ilike.%${query}%`);
    
    if (error) {
      return `❌ *Search Error*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return `❌ *No student found for:* ${query}`;
    }
    
    let message = `🔍 *SEARCH RESULTS* (${students.length})\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const s of students) {
      message += `👤 *${s.full_name}*\n`;
      message += `📋 USN: ${s.usn}\n`;
      message += `📚 Branch: ${s.branch || 'N/A'}\n`;
      message += `📞 Phone: ${s.phone || 'N/A'}\n`;
      message += `💰 Fees: ₹${s.paid_amount || 0}/₹${s.total_fees || 0}\n`;
      message += `📊 Status: ${s.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n\n`;
    }
    
    return message;
  } catch (error) {
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// =========== ADD STUDENT ====================
// ============================================

async function addStudent(data) {
  if (!data || data.length < 3) {
    return `❌ Format: ADD <name>|<usn>|<branch>|<phone>`;
  }
  
  const [name, usn, branch, phone, email, classVal, division] = data;
  
  try {
    const { data: existing } = await supabase
      .from('students')
      .select('usn')
      .eq('usn', usn)
      .single();
    
    if (existing) {
      return `❌ Student already exists: ${usn}`;
    }
    
    const insertData = {
      full_name: name?.trim(),
      usn: usn?.trim(),
      branch: branch?.trim(),
      phone: phone?.trim(),
      total_fees: 0,
      paid_amount: 0,
      due_amount: 0,
      fees_due: false,
      created_at: new Date().toISOString()
    };
    
    if (email) insertData.email = email?.trim();
    if (classVal) insertData.class = classVal?.trim();
    if (division) insertData.division = division?.trim();
    
    const { error } = await supabase.from('students').insert(insertData);
    
    if (error) throw error;
    
    return `✅ STUDENT ADDED\n👤 ${name}\n📋 ${usn}\n📚 ${branch}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== DELETE STUDENT =================
// ============================================

async function deleteStudent(usn) {
  if (!usn) return `❌ Format: DELETE <usn>`;
  
  try {
    const { data: student } = await supabase
      .from('students')
      .select('full_name')
      .eq('usn', usn)
      .single();
    
    const { error } = await supabase.from('students').delete().eq('usn', usn);
    
    if (error) throw error;
    
    return `✅ DELETED: ${student?.full_name || usn}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== FEE DETAILS ====================
// ============================================

async function getStudentFeeDetails(usn) {
  if (!usn) return getFeeFormat();
  
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('usn', usn)
      .single();
    
    if (error) return `❌ Student not found: ${usn}`;
    
    return `💰 *FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━━━
👤 ${student.full_name}
📋 ${student.usn}
📚 ${student.branch || 'N/A'}

Total: ₹${student.total_fees || 0}
Paid: ₹${student.paid_amount || 0}
Due: ₹${student.due_amount || 0}
Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== DUE FEES LIST ==================
// ============================================

async function getCompleteDueFeesList() {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('full_name, usn, due_amount, branch, phone')
      .eq('fees_due', true)
      .gt('due_amount', 0)
      .order('due_amount', { ascending: false });
    
    if (error) throw error;
    if (!students || students.length === 0) return '✅ No pending fees!';
    
    let totalDue = 0;
    let message = `⚠️ *PENDING FEES* (${students.length})\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    students.forEach((s, i) => {
      message += `${i+1}. *${s.full_name}*\n`;
      message += `   📋 ${s.usn}\n`;
      message += `   ⚠️ Due: ₹${s.due_amount.toLocaleString()}\n\n`;
      totalDue += s.due_amount;
    });
    
    message += `💰 Total Due: ₹${totalDue.toLocaleString()}`;
    return message;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== FEE SUMMARY ====================
// ============================================

async function getFeesSummary() {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('total_fees, paid_amount, due_amount, fees_due');
    
    if (error) throw error;
    if (!students || students.length === 0) return '📭 No students found';
    
    let totalFees = 0, totalPaid = 0, totalDue = 0, dueCount = 0;
    
    students.forEach(s => {
      totalFees += Number(s.total_fees) || 0;
      totalPaid += Number(s.paid_amount) || 0;
      totalDue += Number(s.due_amount) || 0;
      if (s.fees_due) dueCount++;
    });
    
    const percent = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
    
    return `📊 *FEE SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━
Total Fees: ₹${totalFees.toLocaleString()}
Collected: ₹${totalPaid.toLocaleString()}
Due: ₹${totalDue.toLocaleString()}
Collection: ${percent.toFixed(1)}%
Paid: ${students.length - dueCount}
Pending: ${dueCount}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== UPDATE FEES ====================
// ============================================

async function updateStudentFees(usn, amount) {
  if (!usn || !amount) return `❌ Format: UPDATE <usn>|<amount>`;
  
  try {
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('paid_amount, due_amount, total_fees, full_name')
      .eq('usn', usn)
      .single();
    
    if (fetchError) return `❌ Student not found: ${usn}`;
    
    const newPaid = (student.paid_amount || 0) + Number(amount);
    const newDue = (student.total_fees || 0) - newPaid;
    
    const { error: updateError } = await supabase
      .from('students')
      .update({
        paid_amount: newPaid,
        due_amount: newDue,
        fees_due: newDue > 0,
        last_payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'WhatsApp Update'
      })
      .eq('usn', usn);
    
    if (updateError) throw updateError;
    
    return `✅ FEES UPDATED\n👤 ${student.full_name}\nPrevious: ₹${student.paid_amount || 0}\nAdded: ₹${amount}\nNew Paid: ₹${newPaid}\nDue: ₹${newDue}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== BUS LIST =======================
// ============================================

async function getBusList() {
  try {
    const { data: buses, error } = await supabase
      .from('buses')
      .select('bus_number, route_name, is_active')
      .order('bus_number');
    
    if (error) throw error;
    if (!buses || buses.length === 0) return '🚌 No buses found';
    
    let message = `🚌 *BUS LIST* (${buses.length})\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    buses.forEach((b, i) => {
      message += `${i+1}. Bus ${b.bus_number}`;
      if (b.route_name) message += ` - ${b.route_name}`;
      message += ` ${b.is_active ? '🟢' : '🔴'}\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== BUS STOPS ======================
// ============================================

async function getBusStops(busNumber) {
  if (!busNumber) return getBusStopsFormat();
  
  try {
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('id')
      .eq('bus_number', busNumber)
      .single();
    
    if (busError) return `❌ Bus not found: ${busNumber}`;
    
    const { data: stops, error: stopsError } = await supabase
      .from('bus_stops')
      .select('stop_name, sequence, is_major')
      .eq('bus_id', bus.id)
      .order('sequence');
    
    if (stopsError) throw stopsError;
    if (!stops || stops.length === 0) return `🚏 No stops for bus ${busNumber}`;
    
    let message = `🚏 *BUS ${busNumber} STOPS*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    stops.forEach(s => {
      message += `${s.sequence}. ${s.stop_name}${s.is_major ? ' ⭐' : ''}\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== BUS DETAILS ====================
// ============================================

async function getBusDetails(busNumber) {
  if (!busNumber) return getBusDetailsFormat();
  
  try {
    const { data: bus, error } = await supabase
      .from('buses')
      .select('*')
      .eq('bus_number', busNumber)
      .single();
    
    if (error) return `❌ Bus not found: ${busNumber}`;
    
    return `🚌 *BUS DETAILS*
━━━━━━━━━━━━━━━━━━━━━━
Bus: ${bus.bus_number}
Route: ${bus.route_name || 'N/A'}
Status: ${bus.is_active ? '🟢 Active' : '🔴 Inactive'}
Driver: ${bus.driver_name || 'N/A'}
Contact: ${bus.driver_contact || 'N/A'}`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== NOTICES ========================
// ============================================

async function getNotices() {
  try {
    const { data: notices, error } = await supabase
      .from('notices')
      .select('title, description, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    if (!notices || notices.length === 0) return '📢 No notices';
    
    let message = `📢 *NOTICES*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    notices.forEach((n, i) => {
      message += `${i+1}. *${n.title}*\n`;
      if (n.description) message += `   ${n.description.substring(0, 50)}...\n`;
      message += `\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== DRIVERS LIST ===================
// ============================================

async function getDriversList() {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers_new')
      .select('name, contact, driver_code')
      .limit(15);
    
    if (error) throw error;
    if (!drivers || drivers.length === 0) return '👨‍✈️ No drivers';
    
    let message = `👨‍✈️ *DRIVERS* (${drivers.length})\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    drivers.forEach((d, i) => {
      message += `${i+1}. ${d.name}`;
      if (d.driver_code) message += ` [${d.driver_code}]`;
      if (d.contact) message += `\n   📞 ${d.contact}`;
      message += `\n\n`;
    });
    
    return message;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== DEBUG DATABASE =================
// ============================================

async function debugDatabase() {
  try {
    // Test connection
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return `❌ *CONNECTION ERROR*

Message: ${error.message}
Code: ${error.code}
Details: ${error.details || 'None'}

Check:
• Supabase URL in .env
• Supabase Anon Key
• Table permissions`;
    }
    
    // Get column names
    const { data: sample } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    let columns = 'None';
    if (sample && sample.length > 0) {
      columns = Object.keys(sample[0]).join(', ');
    }
    
    return `✅ *DATABASE OK*

Students: ${count || 0}
Columns: ${columns}

💡 Try: STUDENT LIST`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

// ============================================
// =========== BROADCAST (FIXED) ==============
// ============================================

async function broadcastMessage(message) {
  if (!message || message.trim() === '') {
    return `❌ *Format*: BROADCAST <message>`;
  }
  
  try {
    // Get all students with phone numbers
    const { data: students, error } = await supabase
      .from('students')
      .select('phone, full_name')
      .not('phone', 'is', null);
    
    if (error) {
      console.error('Broadcast error:', error);
      return `❌ *Failed*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students with phone numbers found*';
    }
    
    // Return summary (actual broadcast needs WhatsApp API)
    return `📢 *BROADCAST READY*
━━━━━━━━━━━━━━━━━━━━━━

📝 Message: ${message}
👥 Recipients: ${students.length} students

✅ Status: Ready to send

📞 Sample numbers:
${students.slice(0, 3).map(s => `${s.full_name}: ${s.phone}`).join('\n')}

⚠️ To actually send, integrate WhatsApp Business API`;
    
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}