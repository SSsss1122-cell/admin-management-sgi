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
    
    // If not authorized, only allow HELP and simple commands
    if (!isAdmin) {
      let reply = await handlePublicCommands(userMessage);
      if (reply) await sendWhatsAppMessage(senderNumber, reply);
      return NextResponse.json({ success: true });
    }
    
    // ============================================
    // AUTHORIZED USER (9480072737) - FULL ACCESS
    // ============================================
    
    let replyMessage = '';
    const upperMsg = userMessage?.toUpperCase() || '';
    
    // MAIN MENU - Just type "BUS" or "MENU"
    if (upperMsg === 'BUS' || upperMsg === 'MENU' || upperMsg === 'START') {
      replyMessage = getMainMenu();
    }
    
    // STUDENT MENU OPTIONS
    else if (upperMsg === 'STUDENT' || upperMsg === 'STUDENT LIST' || upperMsg === '8') {
      replyMessage = await getStudentList();
    }
    else if (upperMsg === 'SEARCH' || upperMsg === 'SEARCH STUDENT' || upperMsg === '9') {
      replyMessage = "🔍 *SEARCH STUDENT*\n\nSend: SEARCH <USN or Name>\n\nExample: SEARCH 3TS25CS004\nExample: SEARCH Rohit";
    }
    else if (upperMsg === 'COUNT' || upperMsg === 'STUDENT COUNT' || upperMsg === '10') {
      replyMessage = await getStudentCount();
    }
    
    // FEES MENU OPTIONS
    else if (upperMsg === 'FEE' || upperMsg === 'FEE CHECK' || upperMsg === '5') {
      replyMessage = "💰 *FEE CHECK*\n\nSend: FEE <USN>\n\nExample: FEE 3TS25CS004";
    }
    else if (upperMsg === 'FEE DUE' || upperMsg === '6') {
      replyMessage = await getDueFeesStudents();
    }
    else if (upperMsg === 'FEE SUMMARY' || upperMsg === '7') {
      replyMessage = await getFeesSummary();
    }
    
    // BUS MENU OPTIONS
    else if (upperMsg === 'BUS LIST' || upperMsg === '1') {
      replyMessage = await getBusList();
    }
    else if (upperMsg === 'BUS LOCATION' || upperMsg === '2') {
      replyMessage = "📍 *BUS LOCATION*\n\nSend: LOCATION <bus_number>\n\nExample: LOCATION KA01AB1234";
    }
    else if (upperMsg === 'BUS STOPS' || upperMsg === '3') {
      replyMessage = "🚏 *BUS STOPS*\n\nSend: STOPS <bus_number>\n\nExample: STOPS KA01AB1234";
    }
    else if (upperMsg === 'BUS DETAILS' || upperMsg === '4') {
      replyMessage = "🚌 *BUS DETAILS*\n\nSend: DETAILS <bus_number>\n\nExample: DETAILS KA01AB1234";
    }
    
    // OTHER COMMANDS
    else if (upperMsg === 'COMPLAINT' || upperMsg === '11') {
      replyMessage = "🛠️ *REGISTER COMPLAINT*\n\nSend: COMPLAINT <title> | <description>\n\nExample: COMPLAINT Bus late | Bus is coming 30 mins late";
    }
    else if (upperMsg === 'NOTICES' || upperMsg === '12') {
      replyMessage = await getNotices();
    }
    else if (upperMsg === 'DRIVERS' || upperMsg === '13') {
      replyMessage = await getDriversList();
    }
    else if (upperMsg === 'HELP') {
      replyMessage = getMainMenu();
    }
    
    // SEARCH with argument
    else if (userMessage?.startsWith('SEARCH ')) {
      const query = userMessage.substring(7);
      replyMessage = await searchStudent(query);
    }
    
    // FEE with argument
    else if (userMessage?.startsWith('FEE ')) {
      const usn = userMessage.substring(4);
      replyMessage = await getStudentFee(usn);
    }
    
    // LOCATION with argument
    else if (userMessage?.startsWith('LOCATION ')) {
      const busNumber = userMessage.substring(9);
      replyMessage = await getBusLocation(busNumber);
    }
    
    // STOPS with argument
    else if (userMessage?.startsWith('STOPS ')) {
      const busNumber = userMessage.substring(6);
      replyMessage = await getBusStops(busNumber);
    }
    
    // DETAILS with argument
    else if (userMessage?.startsWith('DETAILS ')) {
      const busNumber = userMessage.substring(8);
      replyMessage = await getBusDetails(busNumber);
    }
    
    // COMPLAINT with argument
    else if (userMessage?.startsWith('COMPLAINT ')) {
      const complaintText = userMessage.substring(10);
      replyMessage = await registerComplaint(cleanNumber, complaintText);
    }
    
    // ADD STUDENT - Simple template
    else if (userMessage?.startsWith('ADD ')) {
      const data = userMessage.substring(4).split('|');
      replyMessage = await addStudent(data);
    }
    
    // UPDATE FEES - Simple
    else if (userMessage?.startsWith('UPDATE ')) {
      const parts = userMessage.substring(7).split('|');
      replyMessage = await updateStudentFees(parts[0], parts[1]);
    }
    
    // DELETE STUDENT
    else if (userMessage?.startsWith('DELETE ')) {
      const usn = userMessage.substring(7);
      replyMessage = await deleteStudent(usn);
    }
    
    // BROADCAST
    else if (userMessage?.startsWith('BROADCAST ')) {
      const msg = userMessage.substring(10);
      replyMessage = await broadcastMessage(msg);
    }
    
    // Default - show menu
    else if (userMessage && userMessage !== '') {
      replyMessage = `❌ Unknown: "${userMessage}"\n\n${getMainMenu()}`;
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
// MAIN MENU
// ============================================

function getMainMenu() {
  return `🤖 *SGI BUS BOT* - Main Menu

━━━━━━━━━━━━━━━
🚌 *BUS MENU*
━━━━━━━━━━━━━━━
1️⃣ BUS LIST
2️⃣ BUS LOCATION  
3️⃣ BUS STOPS
4️⃣ BUS DETAILS

━━━━━━━━━━━━━━━
💰 *FEES MENU*
━━━━━━━━━━━━━━━
5️⃣ FEE CHECK
6️⃣ FEE DUE
7️⃣ FEE SUMMARY

━━━━━━━━━━━━━━━
📚 *STUDENT MENU*
━━━━━━━━━━━━━━━
8️⃣ STUDENT LIST
9️⃣ SEARCH STUDENT
🔟 STUDENT COUNT

━━━━━━━━━━━━━━━
📢 *OTHER*
━━━━━━━━━━━━━━━
1️⃣1️⃣ COMPLAINT
1️⃣2️⃣ NOTICES
1️⃣3️⃣ DRIVERS

━━━━━━━━━━━━━━━
💡 *Quick Commands*
━━━━━━━━━━━━━━━
• FEE <USN>
• SEARCH <USN/Name>
• LOCATION <bus_no>
• ADD <name>|<usn>|<branch>|<phone>

Send *HELP* anytime

👑 Admin: 9480072737`;
}

async function handlePublicCommands(message) {
  const upperMsg = message?.toUpperCase() || '';
  
  if (upperMsg === 'HELP') {
    return `🤖 *SGI BUS BOT*\n\nAvailable Commands:\n• LIST - All students\n• FEE <USN> - Check fees\n• BUS LIST - All buses\n• COMPLAINT <title> | <desc>\n• NOTICES - Latest notices\n\nContact admin for issues.`;
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
  else if (message?.startsWith('FEE ')) {
    return await getStudentFee(message.substring(4));
  }
  else if (message?.startsWith('COMPLAINT ')) {
    return "Please register complaint via registered mobile number.";
  }
  
  return null;
}

// ============================================
// SEND WHATSAPP MESSAGE
// ============================================

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

// ============================================
// STUDENT FUNCTIONS
// ============================================

async function getStudentList() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, branch')
    .order('full_name')
    .limit(30);
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return '📭 No students found';
  
  let message = `📋 *STUDENT LIST* (${students.length})\n\n`;
  students.forEach((s, i) => {
    message += `${i+1}. *${s.full_name}*\n`;
    message += `   USN: ${s.usn}\n`;
    message += `   Branch: ${s.branch || 'N/A'}\n\n`;
  });
  message += `\nSend SEARCH <USN> for details`;
  return message;
}

async function getStudentCount() {
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  
  if (error) return '❌ Database error';
  return `📊 *Total Students*: ${count}`;
}

async function searchStudent(query) {
  if (!query) return '❌ Usage: SEARCH <USN or Name>';
  
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .or(`usn.ilike.%${query}%, full_name.ilike.%${query}%`)
    .limit(5);
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return `❌ No student found for: ${query}`;
  
  let message = '';
  for (const s of students) {
    message += `👤 *${s.full_name}*\n`;
    message += `📋 USN: ${s.usn}\n`;
    message += `📚 Branch: ${s.branch || 'N/A'}\n`;
    message += `📞 Phone: ${s.phone_number || s.phone || 'N/A'}\n`;
    message += `💰 Due Amount: ₹${s.due_amount || 0}\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
  }
  return message;
}

// ============================================
// FEES FUNCTIONS (Only FEE USN working)
// ============================================

async function getStudentFee(usn) {
  if (!usn) return '❌ Usage: FEE <USN>\nExample: FEE 3TS25CS004';
  
  const { data: student, error } = await supabase
    .from('students')
    .select('full_name, usn, total_fees, paid_amount, due_amount, fees_due')
    .eq('usn', usn)
    .single();
  
  if (error) return `❌ Student not found: ${usn}`;
  
  let message = `💰 *FEE DETAILS*\n\n`;
  message += `👤 Name: ${student.full_name}\n`;
  message += `📋 USN: ${student.usn}\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `💰 Total Fees: ₹${student.total_fees || 0}\n`;
  message += `✅ Paid: ₹${student.paid_amount || 0}\n`;
  message += `⚠️ Due: ₹${student.due_amount || 0}\n`;
  message += `📊 Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n`;
  return message;
}

async function getDueFeesStudents() {
  const { data: students, error } = await supabase
    .from('students')
    .select('full_name, usn, due_amount')
    .eq('fees_due', true)
    .gt('due_amount', 0)
    .limit(20);
  
  if (error) return '❌ Database error';
  if (!students || students.length === 0) return '✅ No pending fees!';
  
  let message = `⚠️ *PENDING FEES* (${students.length})\n\n`;
  students.forEach((s, i) => {
    message += `${i+1}. ${s.full_name}\n`;
    message += `   Due: ₹${s.due_amount}\n\n`;
  });
  return message;
}

async function getFeesSummary() {
  const { data: students, error } = await supabase
    .from('students')
    .select('total_fees, paid_amount, due_amount');
  
  if (error) return '❌ Database error';
  
  let totalFees = 0, totalPaid = 0, totalDue = 0;
  students.forEach(s => {
    totalFees += Number(s.total_fees) || 0;
    totalPaid += Number(s.paid_amount) || 0;
    totalDue += Number(s.due_amount) || 0;
  });
  
  let message = `📊 *FEES SUMMARY*\n\n`;
  message += `💰 Total Fees: ₹${totalFees}\n`;
  message += `✅ Collected: ₹${totalPaid}\n`;
  message += `⚠️ Due: ₹${totalDue}\n`;
  message += `📈 Rate: ${((totalPaid/totalFees)*100).toFixed(1)}%`;
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
  
  if (error) return '❌ Database error';
  if (!buses || buses.length === 0) return '🚌 No buses found';
  
  let message = `🚌 *BUS LIST* (${buses.length})\n\n`;
  buses.forEach((b, i) => {
    message += `${i+1}. *${b.bus_number}*\n`;
    message += `   Route: ${b.route_name || 'N/A'}\n`;
    message += `   Status: ${b.is_active ? '🟢 Active' : '🔴 Inactive'}\n\n`;
  });
  return message;
}

async function getBusDetails(busNumber) {
  if (!busNumber) return '❌ Usage: DETAILS <bus_number>';
  
  const { data: bus, error } = await supabase
    .from('buses')
    .select('*')
    .eq('bus_number', busNumber)
    .single();
  
  if (error) return `❌ Bus not found: ${busNumber}`;
  
  let message = `🚌 *BUS DETAILS*\n\n`;
  message += `🔢 Number: ${bus.bus_number}\n`;
  message += `🗺️ Route: ${bus.route_name || 'N/A'}\n`;
  message += `📊 Status: ${bus.is_active ? '🟢 Active' : '🔴 Inactive'}\n`;
  message += `📅 PUC: ${bus.puc_expiry || 'N/A'}\n`;
  message += `🔧 Service: ${bus.next_service_due || 'N/A'}\n`;
  return message;
}

async function getBusLocation(busNumber) {
  const { data: bus, error } = await supabase
    .from('buses')
    .select('id')
    .eq('bus_number', busNumber)
    .single();
  
  if (error) return `❌ Bus not found: ${busNumber}`;
  
  const { data: location } = await supabase
    .from('bus_locations')
    .select('latitude, longitude, speed, last_updated')
    .eq('bus_id', bus.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!location) return `📍 Live location not available for ${busNumber}`;
  
  return `📍 *BUS LOCATION* - ${busNumber}\n\n🗺️ Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}\n💨 Speed: ${location.speed || 0} km/h\n🕐 ${new Date(location.last_updated).toLocaleTimeString()}`;
}

async function getBusStops(busNumber) {
  const { data: bus } = await supabase
    .from('buses')
    .select('id')
    .eq('bus_number', busNumber)
    .single();
  
  if (!bus) return `❌ Bus not found: ${busNumber}`;
  
  const { data: stops } = await supabase
    .from('bus_stops')
    .select('stop_name, sequence')
    .eq('bus_id', bus.id)
    .order('sequence')
    .limit(15);
  
  if (!stops || stops.length === 0) return `No stops found for ${busNumber}`;
  
  let message = `🚏 *BUS STOPS* - ${busNumber}\n\n`;
  stops.forEach(s => {
    message += `${s.sequence}. ${s.stop_name}\n`;
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
  
  if (!title || !description) {
    return '❌ Format: COMPLAINT <title> | <description>';
  }
  
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (!student) return '❌ Student not found. Contact admin.';
  
  const { error } = await supabase
    .from('complaints')
    .insert({
      student_id: student.id,
      title: title,
      description: description,
      status: 'pending'
    });
  
  if (error) return '❌ Failed to register complaint';
  return `✅ Complaint registered!\n📌 ${title}\n📊 Status: Pending`;
}

async function getNotices() {
  const { data: notices, error } = await supabase
    .from('notices')
    .select('title, description, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) return '❌ Database error';
  if (!notices || notices.length === 0) return '📢 No notices';
  
  let message = `📢 *LATEST NOTICES*\n\n`;
  notices.forEach((n, i) => {
    message += `${i+1}. *${n.title}*\n`;
    if (n.description) message += `   ${n.description.substring(0, 50)}...\n`;
    message += `   📅 ${new Date(n.created_at).toLocaleDateString()}\n\n`;
  });
  return message;
}

async function getDriversList() {
  const { data: drivers, error } = await supabase
    .from('drivers_new')
    .select('name, contact')
    .limit(10);
  
  if (error) return '❌ Database error';
  if (!drivers || drivers.length === 0) return '👨‍✈️ No drivers';
  
  let message = `👨‍✈️ *DRIVERS* (${drivers.length})\n\n`;
  drivers.forEach((d, i) => {
    message += `${i+1}. ${d.name}\n`;
    if (d.contact) message += `   📞 ${d.contact}\n\n`;
  });
  return message;
}

// ============================================
// ADMIN FUNCTIONS (Simple Template)
// ============================================

async function addStudent(data) {
  if (!data || data.length < 3) {
    return `❌ *ADD STUDENT FORMAT*\n\nSend:\nADD <name>|<usn>|<branch>|<phone>\n\nExample:\nADD Raj Kumar|3TS25CS100|Computer Science|9876543210`;
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
  return `✅ Student Added!\n👤 ${name}\n📋 ${usn}\n📚 ${branch}`;
}

async function updateStudentFees(usn, amount) {
  if (!usn || !amount) {
    return `❌ *UPDATE FEES FORMAT*\n\nSend:\nUPDATE <usn>|<amount>\n\nExample:\nUPDATE 3TS25CS004|5000`;
  }
  
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
      last_payment_date: new Date().toISOString().split('T')[0]
    })
    .eq('usn', usn);
  
  if (error) return `❌ Failed: ${error.message}`;
  return `✅ Fees Updated!\n📋 ${usn}\n✅ Paid: ₹${newPaid}\n⚠️ Due: ₹${newDue}`;
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
  
  const { data: students } = await supabase
    .from('students')
    .select('phone_number');
  
  let sent = 0;
  for (const student of students) {
    if (student.phone_number) {
      await sendWhatsAppMessage(`91${student.phone_number}`, `📢 *BROADCAST*\n\n${message}`);
      sent++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return `✅ Broadcast sent to ${sent} students!`;
}