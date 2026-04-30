import { supabase } from '@/lib/supabase';

// ============================================
// MAIN ADMIN HANDLER
// ============================================

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
  else if (upperMsg === 'DEBUG') {
    replyMessage = await debugDatabase();
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
│ 6️⃣  FEE DUE            │
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

⚡ *Debug:* DEBUG - Check system

👑 *Admin:* 9480072737`;
}

function getShortcutGuide() {
  return `╔════════════════════════════╗
║   ⚡ *QUICK COMMANDS*    ║
╚════════════════════════════╝

ADD <name>|<usn>|<branch>|<phone>
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
Example: SEARCH 3TS25CS004

You can search by:
- USN (full or partial)
- Student name (full or partial)`;
}

function getFeeFormat() {
  return `💰 *FEE CHECK*
Format: FEE <USN>
Example: FEE 3TS25CS004

Shows:
• Total fees
• Paid amount
• Due amount
• Payment status`;
}

function getBusStopsFormat() {
  return `🚏 *BUS STOPS*
Format: STOPS <bus_number>
Example: STOPS 101

Shows all bus stops with sequence`;
}

function getBusDetailsFormat() {
  return `🚌 *BUS DETAILS*
Format: DETAILS <bus_number>
Example: DETAILS 101

Shows bus information including:
• Route details
• Expiry dates
• Maintenance schedule`;
}

function getComplaintFormat() {
  return `🛠️ *REGISTER COMPLAINT*
Format: COMPLAINT <title>|<description>
Example: COMPLAINT Bus late|Bus is coming 30 mins late

Your complaint will be sent to the transport department.`;
}

// ============================================
// STUDENT FUNCTIONS
// ============================================

async function getStudentList() {
  try {
    console.log('📋 Fetching student list...');
    
    const { data: students, error } = await supabase
      .from('students')
      .select('full_name, usn, branch, class, division, phone, email, total_fees, paid_amount, due_amount, fees_due')
      .order('full_name', { ascending: true });
    
    if (error) {
      console.error('Student fetch error:', error);
      return `❌ *Database Error*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students found in database*\n\nUse: ADD <name>|<usn>|<branch>|<phone>\n\nExample: ADD John Doe|3TS25CS001|CSE|9876543210';
    }
    
    let message = `📋 *STUDENT LIST* (${students.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Use for loop instead of forEach to allow break
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      message += `${i+1}. 👤 *${s.full_name || 'N/A'}*\n`;
      message += `   📋 USN: ${s.usn || 'N/A'}\n`;
      message += `   📚 Branch: ${s.branch || 'N/A'}`;
      if (s.class) message += ` | Class: ${s.class}`;
      if (s.division) message += `-${s.division}`;
      message += `\n`;
      if (s.phone) message += `   📞 Phone: ${s.phone}\n`;
      if (s.email) message += `   📧 Email: ${s.email}\n`;
      message += `   💰 Fees: ₹${s.paid_amount || 0}/₹${s.total_fees || 0}\n`;
      message += `   📊 Status: ${s.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n`;
      message += `\n`;
      
      // Prevent message from being too long
      if (message.length > 60000 && i < students.length - 1) {
        message += `\n_...${students.length - i - 1} more students_\n`;
        break;  // This works in for loop
      }
    }
    
    return message;
  } catch (error) {
    console.error('Exception in getStudentList:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getStudentCountWithBranch() {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('branch');
    
    if (error) {
      console.error('Count fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students found*';
    }
    
    const branchCount = {};
    students.forEach(s => {
      const branch = s.branch || 'Unknown';
      branchCount[branch] = (branchCount[branch] || 0) + 1;
    });
    
    let message = `📊 *STUDENT COUNT BY BRANCH*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const [branch, count] of Object.entries(branchCount).sort()) {
      message += `• ${branch}: ${count} students\n`;
    }
    
    message += `\n🎓 *TOTAL: ${students.length} students*`;
    
    return message;
  } catch (error) {
    console.error('Exception in getStudentCountWithBranch:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

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
      console.error('Search error:', error);
      return '❌ *Database Error*';
    }
    
    if (!students || students.length === 0) {
      return `❌ *No student found for:* ${query}`;
    }
    
    let message = `🔍 *SEARCH RESULTS* (${students.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const s of students) {
      message += `👤 *${s.full_name}*\n`;
      message += `📋 USN: ${s.usn}\n`;
      message += `📚 Branch: ${s.branch || 'N/A'}`;
      if (s.class) message += ` | Class: ${s.class}`;
      if (s.division) message += `-${s.division}`;
      message += `\n`;
      message += `📞 Phone: ${s.phone || 'N/A'}\n`;
      message += `📧 Email: ${s.email || 'N/A'}\n`;
      message += `💰 Fees: ₹${s.paid_amount || 0}/₹${s.total_fees || 0}\n`;
      message += `📊 Status: ${s.fees_due ? '🔴 PENDING' : '🟢 PAID'}\n\n`;
    }
    
    return message;
  } catch (error) {
    console.error('Exception in searchStudent:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// FEES FUNCTIONS
// ============================================

async function getStudentFeeDetails(searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return getFeeFormat();
  }
  
  try {
    let students = [];
    let searchMethod = '';
    
    // Search by USN (exact match)
    const { data: byUsn, error: usnError } = await supabase
      .from('students')
      .select('*')
      .eq('usn', searchQuery);
    
    if (!usnError && byUsn && byUsn.length > 0) {
      students = byUsn;
      searchMethod = 'USN (exact)';
    }
    
    // If not found by USN, search by Phone (exact match)
    if (students.length === 0) {
      const { data: byPhone, error: phoneError } = await supabase
        .from('students')
        .select('*')
        .eq('phone', searchQuery);
      
      if (!phoneError && byPhone && byPhone.length > 0) {
        students = byPhone;
        searchMethod = 'Phone (exact)';
      }
    }
    
    // If not found by USN or Phone, search by Name (partial match)
    if (students.length === 0) {
      const { data: byName, error: nameError } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', `%${searchQuery}%`);
      
      if (!nameError && byName && byName.length > 0) {
        students = byName;
        searchMethod = `Name (partial - ${students.length} found)`;
      }
    }
    
    // If still not found, search by USN (partial match)
    if (students.length === 0) {
      const { data: byPartialUsn, error: partialError } = await supabase
        .from('students')
        .select('*')
        .ilike('usn', `%${searchQuery}%`);
      
      if (!partialError && byPartialUsn && byPartialUsn.length > 0) {
        students = byPartialUsn;
        searchMethod = `USN (partial - ${students.length} found)`;
      }
    }
    
    // If no students found
    if (students.length === 0) {
      return `❌ *Student not found*

No student found with:
• USN: ${searchQuery}
• Phone: ${searchQuery}
• Name: ${searchQuery}

💡 Tips:
• Check spelling
• Use SEARCH to find student first
• Try with partial name or USN`;
    }
    
    // If multiple students found, show list
    if (students.length > 1) {
      let message = `🔍 *MULTIPLE STUDENTS FOUND* (${students.length})\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `Searching for: "${searchQuery}"\n`;
      message += `Matched by: ${searchMethod}\n\n`;
      message += `Please use exact USN or Phone:\n\n`;
      
      students.forEach((s, i) => {
        message += `${i+1}. 👤 *${s.full_name}*\n`;
        message += `   📋 USN: ${s.usn}\n`;
        message += `   📞 Phone: ${s.phone || 'N/A'}\n`;
        message += `   📚 Branch: ${s.branch || 'N/A'}\n\n`;
      });
      
      message += `💡 Use: FEE <exact USN or Phone>`;
      return message;
    }
    
    // Single student found - show fee details
    const student = students[0];
    
    let message = `💰 *FEE DETAILS*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Student:* ${student.full_name}
📋 *USN:* ${student.usn}
📚 *Branch:* ${student.branch || 'N/A'}`;
    
    if (student.class) message += `\n📖 *Class:* ${student.class}${student.division ? `-${student.division}` : ''}`;
    if (student.semester) message += `\n📅 *Semester:* ${student.semester}`;
    if (student.phone) message += `\n📞 *Phone:* ${student.phone}`;
    if (student.email) message += `\n📧 *Email:* ${student.email}`;
    
    message += `\n
💵 *Total Fees:* ₹${Number(student.total_fees || 0).toLocaleString()}
✅ *Paid Amount:* ₹${Number(student.paid_amount || 0).toLocaleString()}
⚠️ *Due Amount:* ₹${Number(student.due_amount || 0).toLocaleString()}

📊 *Status:* ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}
📅 *Last Payment:* ${student.last_payment_date || 'N/A'}
💳 *Payment Mode:* ${student.payment_mode || 'N/A'}`;

    if (student.next_payment_date) {
      message += `\n📅 *Next Payment Due:* ${student.next_payment_date}`;
    }
    
    message += `\n\n💡 To update fees: UPDATE ${student.usn}|<amount>`;
    
    return message;
  } catch (error) {
    console.error('Exception in getStudentFeeDetails:', error);
    return `❌ *Error*: ${error.message}`;
  }
}
async function getCompleteDueFeesList() {
  try {
    console.log('🔍 Fetching due fees list...');
    
    // First, check if students table has any data
    const { data: allStudents, error: checkError } = await supabase
      .from('students')
      .select('full_name, usn, due_amount, paid_amount, total_fees', { count: 'exact' })
      .limit(5);
    
    if (checkError) {
      console.error('Check error:', checkError);
      return `❌ *Database Error*

Message: ${checkError.message}
Code: ${checkError.code}

Please check Supabase connection.`;
    }
    
    if (!allStudents || allStudents.length === 0) {
      return `📭 *No students found in database*

Total students: 0

Add students using:
ADD <name>|<usn>|<branch>|<phone>`;
    }
    
    // Show sample of what's in the database
    let sampleMessage = `📊 *Database Sample* (First ${allStudents.length} students)\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    allStudents.forEach((s, i) => {
      sampleMessage += `${i+1}. ${s.full_name}\n`;
      sampleMessage += `   USN: ${s.usn}\n`;
      sampleMessage += `   Total Fees: ₹${s.total_fees || 0}\n`;
      sampleMessage += `   Paid: ₹${s.paid_amount || 0}\n`;
      sampleMessage += `   Due: ₹${s.due_amount || 0}\n\n`;
    });
    
    // Now try to get students with due_amount > 0
    const { data: dueStudents, error: dueError } = await supabase
      .from('students')
      .select('full_name, usn, due_amount, paid_amount, total_fees, branch, class, phone')
      .gt('due_amount', 0)
      .order('due_amount', { ascending: false });
    
    if (dueError) {
      console.error('Due error:', dueError);
      return `${sampleMessage}\n\n❌ *Error fetching due list*: ${dueError.message}`;
    }
    
    if (!dueStudents || dueStudents.length === 0) {
      return `${sampleMessage}\n\n✅ *No students with due_amount > 0*

All students have paid in full or due_amount is 0.

💡 To mark fees as due:
UPDATE <usn>|<amount>

Example: UPDATE 3TS25CS001|25000`;
    }
    
    let totalDue = 0;
    let message = `⚠️ *PENDING FEES LIST* (${dueStudents.length} students)\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    dueStudents.forEach((s, i) => {
      const dueAmount = Number(s.due_amount) || 0;
      message += `${i+1}. *${s.full_name}*\n`;
      message += `   📋 ${s.usn}\n`;
      message += `   📚 ${s.branch || 'N/A'}\n`;
      message += `   💰 Total: ₹${Number(s.total_fees || 0).toLocaleString()}\n`;
      message += `   ✅ Paid: ₹${Number(s.paid_amount || 0).toLocaleString()}\n`;
      message += `   ⚠️ Due: ₹${dueAmount.toLocaleString()}\n`;
      if (s.phone) message += `   📞 ${s.phone}\n`;
      message += `\n`;
      totalDue += dueAmount;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *Total Due:* ₹${totalDue.toLocaleString()}`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Exception Error*: ${error.message}`;
  }
}


async function getFeesSummary() {
  try {
    // Get ALL students first
    const { data: students, error } = await supabase
      .from('students')
      .select('total_fees, paid_amount, due_amount, fees_due, full_name, usn');
    
    if (error) {
      console.error('Summary error:', error);
      return `❌ *Database Error*: ${error.message}`;
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students found*';
    }
    
    let totalFees = 0, totalPaid = 0, totalDue = 0, dueCount = 0;
    const sampleStudents = [];
    
    students.forEach(s => {
      totalFees += Number(s.total_fees) || 0;
      totalPaid += Number(s.paid_amount) || 0;
      totalDue += Number(s.due_amount) || 0;
      if (Number(s.due_amount) > 0) dueCount++;
      
      // Collect first 3 students with dues for sample
      if (Number(s.due_amount) > 0 && sampleStudents.length < 3) {
        sampleStudents.push(s);
      }
    });
    
    const collectionPercent = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
    
    let message = `📊 *FEE SUMMARY*
━━━━━━━━━━━━━━━━━━━━━━

📚 *Total Students:* ${students.length}
💰 *Total Fees:* ₹${totalFees.toLocaleString()}
✅ *Collected:* ₹${totalPaid.toLocaleString()}
⚠️ *Total Due:* ₹${totalDue.toLocaleString()}

📈 *Collection Rate:* ${collectionPercent.toFixed(1)}%

👨‍🎓 *Students with Dues:* ${dueCount}

━━━━━━━━━━━━━━━━━━━━━━`;

    if (sampleStudents.length > 0) {
      message += `\n📝 *Sample Students with Dues:*\n`;
      sampleStudents.forEach(s => {
        message += `\n• ${s.full_name}\n`;
        message += `  USN: ${s.usn}\n`;
        message += `  Due: ₹${Number(s.due_amount).toLocaleString()}`;
      });
    } else {
      message += `\n\n✅ *No students with due_amount > 0*\n`;
      message += `All students have due_amount = 0`;
    }
    
    message += `\n\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 To add fees: UPDATE <usn>|<amount>`;
    
    return message;
  } catch (error) {
    console.error('Exception:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// BUS FUNCTIONS
// ============================================

async function getBusList() {
  try {
    const { data: buses, error } = await supabase
      .from('buses')
      .select('bus_number, route_name, is_active')
      .order('bus_number');
    
    if (error) {
      console.error('Bus fetch error:', error);
      return '❌ *Database Error*';
    }
    
    if (!buses || buses.length === 0) {
      return '🚌 *No buses found in database*';
    }
    
    let message = `🚌 *BUS LIST* (${buses.length} buses)\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    buses.forEach((b, i) => {
      message += `${i+1}. Bus *${b.bus_number}*`;
      if (b.route_name) message += ` - ${b.route_name}`;
      message += ` ${b.is_active ? '🟢 Active' : '🔴 Inactive'}\n`;
    });
    
    message += `\n💡 *Commands:*\n`;
    message += `• STOPS <bus_number> - View all stops\n`;
    message += `• DETAILS <bus_number> - Bus details`;
    
    return message;
  } catch (error) {
    console.error('Exception in getBusList:', error);
    return `❌ *Error*: ${error.message}`;
  }
}
async function getBusStops(busNumber) {
  if (!busNumber || busNumber.trim() === '') {
    return getBusStopsFormat();
  }
  
  try {
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('id, bus_number')
      .eq('bus_number', busNumber)
      .single();
    
    if (busError || !bus) {
      return `❌ *Bus not found:* ${busNumber}\n\nUse BUS LIST to see available buses.`;
    }
    
    // Changed: Using 'direction' column instead of 'trip_type'
    const { data: allStops, error: stopsError } = await supabase
      .from('bus_stops')
      .select('stop_name, sequence, estimated_time, is_major, direction')  // Changed: trip_type → direction
      .eq('bus_id', bus.id)
      .order('sequence');
    
    if (stopsError) {
      console.error('Stops fetch error:', stopsError);
      return `❌ *Error fetching bus stops*: ${stopsError.message}`;
    }
    
    if (!allStops || allStops.length === 0) {
      return `🚏 *No stops found for bus* ${busNumber}`;
    }
    
    // Changed: Using 'direction' column instead of 'trip_type'
    const morningStops = allStops.filter(stop => 
      stop.direction === 'morning' || stop.direction === 'to_college'
    );
    const eveningStops = allStops.filter(stop => 
      stop.direction === 'evening' || stop.direction === 'from_college'
    );
    
    let message = `🚏 *BUS ${busNumber} - STOPS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Morning Stops Section
    if (morningStops.length > 0) {
      message += `🌅 *MORNING ROUTE (To College)*\n`;
      morningStops.forEach(stop => {
        message += `${stop.sequence}. ${stop.stop_name}`;
        if (stop.is_major) message += ` ⭐`;
        if (stop.estimated_time) message += ` (${stop.estimated_time} min)`;
        message += `\n`;
      });
      message += `\n`;
    }
    
    // Evening Stops Section
    if (eveningStops.length > 0) {
      message += `🌙 *EVENING ROUTE (From College)*\n`;
      eveningStops.forEach(stop => {
        message += `${stop.sequence}. ${stop.stop_name}`;
        if (stop.is_major) message += ` ⭐`;
        if (stop.estimated_time) message += ` (${stop.estimated_time} min)`;
        message += `\n`;
      });
      message += `\n`;
    }
    
    // If no direction column data, show all stops
    if (morningStops.length === 0 && eveningStops.length === 0) {
      message += `📍 *ALL STOPS*\n`;
      allStops.forEach(stop => {
        message += `${stop.sequence}. ${stop.stop_name}`;
        if (stop.is_major) message += ` .`;
        if (stop.estimated_time) message += ` (${stop.estimated_time} min)`;
        message += `\n`;
      });
      message += `\n`;
    }
    
    message += `\n📊 *Total Stops:* ${allStops.length}\n`;
    message += `🌅 Morning: ${morningStops.length} | 🌙 Evening: ${eveningStops.length}`;
    
    return message;
  } catch (error) {
    console.error('Exception in getBusStops:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getBusDetails(busNumber) {
  if (!busNumber || busNumber.trim() === '') {
    return getBusDetailsFormat();
  }
  
  try {
    const { data: bus, error } = await supabase
      .from('buses')
      .select('*')
      .eq('bus_number', busNumber)
      .single();
    
    if (error || !bus) {
      return `❌ *Bus not found:* ${busNumber}`;
    }
    
    return `🚌 *BUS DETAILS*
━━━━━━━━━━━━━━━━━━━━━━

🔢 *Bus Number:* ${bus.bus_number}
🗺️ *Route:* ${bus.route_name || 'N/A'}
📊 *Status:* ${bus.is_active ? '🟢 Active' : '🔴 Inactive'}
👨‍✈️ *Driver:* ${bus.driver_name || 'N/A'}
📞 *Driver Contact:* ${bus.driver_contact || 'N/A'}

📅 *Expiry Dates:*
• PUC: ${bus.puc_expiry || 'N/A'}
• Insurance: ${bus.insurance_expiry || 'N/A'}
• Fitness: ${bus.fitness_expiry || 'N/A'}
• Permit: ${bus.permit_expiry || 'N/A'}

🔧 *Maintenance:*
• Last Service: ${bus.last_service_date || 'N/A'}
• Next Service: ${bus.next_service_due || 'N/A'}
• Current KM: ${bus.current_km || 'N/A'}

💡 Use STOPS ${busNumber} to see bus stops`;
  } catch (error) {
    console.error('Exception in getBusDetails:', error);
    return `❌ *Error*: ${error.message}`;
  }
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
    .eq('phone', phoneNumber)
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
  try {
    const { data: notices, error } = await supabase
      .from('notices')
      .select('title, description, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Notices error:', error);
      return '❌ *Database Error*';
    }
    
    if (!notices || notices.length === 0) {
      return '📢 *No notices available*';
    }
    
    let message = `📢 *LATEST NOTICES*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    notices.forEach((n, i) => {
      const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : '';
      message += `${i+1}. 📌 *${n.title}*\n`;
      if (n.description) {
        const desc = n.description.length > 60 ? n.description.substring(0, 60) + '...' : n.description;
        message += `   ${desc}\n`;
      }
      if (date) message += `   📅 ${date}\n`;
      message += `\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception in getNotices:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function getDriversList() {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers_new')
      .select('name, contact, driver_code, bus_assigned')
      .limit(20);
    
    if (error) {
      console.error('Drivers error:', error);
      return '❌ *Database Error*';
    }
    
    if (!drivers || drivers.length === 0) {
      return '👨‍✈️ *No drivers found*';
    }
    
    let message = `👨‍✈️ *DRIVERS LIST* (${drivers.length})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    drivers.forEach((d, i) => {
      message += `${i+1}. 👤 *${d.name}*`;
      if (d.driver_code) message += ` [${d.driver_code}]`;
      message += `\n`;
      if (d.contact) message += `   📞 ${d.contact}\n`;
      if (d.bus_assigned) message += `   🚌 Bus: ${d.bus_assigned}\n`;
      message += `\n`;
    });
    
    return message;
  } catch (error) {
    console.error('Exception in getDriversList:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function addStudent(data) {
  if (!data || data.length < 3) {
    return `❌ *Invalid Format*\n\nCorrect format:\nADD <full name>|<usn>|<branch>|<phone>\n\nExample:\nADD John Doe|3TS25CS001|CSE|9876543210`;
  }
  
  const [name, usn, branch, phone, email, classVal, division] = data;
  
  try {
    const { data: existing } = await supabase
      .from('students')
      .select('usn')
      .eq('usn', usn)
      .single();
    
    if (existing) {
      return `❌ *Student already exists*\n\nUSN: ${usn}\nUse UPDATE to modify or DELETE to remove.`;
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
    
    const { error } = await supabase
      .from('students')
      .insert(insertData);
    
    if (error) {
      console.error('Add student error:', error);
      return `❌ *Failed to add student*\n\nError: ${error.message}`;
    }
    
    let message = `✅ *STUDENT ADDED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${name}
📋 *USN:* ${usn}
📚 *Branch:* ${branch || 'N/A'}`;
    
    if (classVal) message += `\n📖 *Class:* ${classVal}${division ? `-${division}` : ''}`;
    if (phone) message += `\n📞 *Phone:* ${phone}`;
    if (email) message += `\n📧 *Email:* ${email}`;
    
    message += `\n\n💡 Use UPDATE ${usn}|<amount> to add fees`;
    
    return message;
  } catch (error) {
    console.error('Exception in addStudent:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function updateStudentFees(usn, amount) {
  if (!usn || !amount) {
    return `❌ *Invalid Format*\n\nCorrect format:\nUPDATE <usn>|<amount>\n\nExample:\nUPDATE 3TS25CS001|25000`;
  }
  
  try {
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('paid_amount, due_amount, total_fees, full_name')
      .eq('usn', usn)
      .single();
    
    if (fetchError || !student) {
      return `❌ *Student not found:* ${usn}`;
    }
    
    const newPaid = (Number(student.paid_amount) || 0) + Number(amount);
    const newDue = (Number(student.total_fees) || 0) - newPaid;
    
    const { error: updateError } = await supabase
      .from('students')
      .update({
        paid_amount: newPaid,
        due_amount: newDue,
        fees_due: newDue > 0,
        last_payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'WhatsApp Update',
        updated_at: new Date().toISOString()
      })
      .eq('usn', usn);
    
    if (updateError) {
      console.error('Update error:', updateError);
      return `❌ *Failed to update fees*\n\nError: ${updateError.message}`;
    }
    
    return `✅ *FEES UPDATED SUCCESSFULLY*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Student:* ${student.full_name}
📋 *USN:* ${usn}

💰 *Previous Paid:* ₹${(student.paid_amount || 0).toLocaleString()}
💵 *Amount Added:* ₹${Number(amount).toLocaleString()}
✅ *New Total Paid:* ₹${newPaid.toLocaleString()}
⚠️ *Remaining Due:* ₹${newDue.toLocaleString()}

📊 *Status:* ${newDue > 0 ? '🔴 PENDING' : '🟢 PAID'}`;
  } catch (error) {
    console.error('Exception in updateStudentFees:', error);
    return `❌ *Error*: ${error.message}`;
  }
}
async function deleteStudent(usn) {
  if (!usn || usn.trim() === '') {
    return `❌ *Invalid Format*\n\nCorrect format:\nDELETE <usn>\n\nExample:\nDELETE 3TS25CS001`;
  }
  
  try {
    const { data: student } = await supabase
      .from('students')
      .select('full_name')
      .eq('usn', usn)
      .single();
    
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('usn', usn);
    
    if (error) {
      console.error('Delete error:', error);
      return `❌ *Failed to delete student*\n\nError: ${error.message}`;
    }
    
    return `✅ *STUDENT DELETED*
━━━━━━━━━━━━━━━━━━━━━━

👤 *Name:* ${student?.full_name || 'Unknown'}
📋 *USN:* ${usn}

⚠️ This action cannot be undone.`;
  } catch (error) {
    console.error('Exception in deleteStudent:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

async function broadcastMessage(message) {
  if (!message || message.trim() === '') {
    return `❌ *Invalid Format*\n\nCorrect format:\nBROADCAST <message>\n\nExample:\nBROADCAST College will remain closed tomorrow due to holiday.`;
  }
  
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('phone, full_name')
      .not('phone', 'is', null);
    
    if (error) {
      console.error('Broadcast fetch error:', error);
      return '❌ *Failed to fetch student list*';
    }
    
    if (!students || students.length === 0) {
      return '📭 *No students with phone numbers found*';
    }
    
    // Here you would integrate with WhatsApp Business API to send bulk messages
    // For now, return summary
    
    return `📢 *BROADCAST INITIATED*
━━━━━━━━━━━━━━━━━━━━━━

📝 *Message:* ${message}

👥 *Recipients:* ${students.length} students

✅ *Status:* Queued for delivery

📞 *Sample recipients:*
${students.slice(0, 3).map(s => `• ${s.full_name}: ${s.phone}`).join('\n')}

⚠️ *Note:* To actually send messages, integrate WhatsApp Business API.`;
  } catch (error) {
    console.error('Exception in broadcastMessage:', error);
    return `❌ *Error*: ${error.message}`;
  }
}

// ============================================
// DEBUG FUNCTION
// ============================================

async function debugDatabase() {
  try {
    let debugInfo = `🔍 *DATABASE DIAGNOSTIC*\n`;
    debugInfo += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Test students table
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (studentError) {
      debugInfo += `❌ *Students Table Error*\n`;
      debugInfo += `Message: ${studentError.message}\n`;
      debugInfo += `Code: ${studentError.code}\n`;
      debugInfo += `Details: ${studentError.details || 'None'}\n\n`;
    } else {
      debugInfo += `✅ *Students Table:* OK\n`;
      if (students && students.length > 0) {
        const columns = Object.keys(students[0]);
        debugInfo += `📋 Columns: ${columns.slice(0, 8).join(', ')}${columns.length > 8 ? '...' : ''}\n`;
      } else {
        debugInfo += `📭 Table is empty\n`;
      }
      
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      debugInfo += `📊 Total Students: ${count || 0}\n\n`;
    }
    
    // Test buses table
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('*')
      .limit(1);
    
    if (busError) {
      debugInfo += `❌ *Buses Table Error*\n`;
      debugInfo += `Message: ${busError.message}\n\n`;
    } else {
      debugInfo += `✅ *Buses Table:* OK\n`;
      const { count } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true });
      debugInfo += `📊 Total Buses: ${count || 0}\n\n`;
    }
    
    debugInfo += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    debugInfo += `💡 *Next Steps:*\n`;
    debugInfo += `• Use ADD to add students\n`;
    debugInfo += `• Use BUS LIST to view buses\n`;
    debugInfo += `• Use STUDENT LIST to view all students`;
    
    return debugInfo;
  } catch (error) {
    console.error('Exception in debugDatabase:', error);
    return `❌ *Debug Error*: ${error.message}`;
  }
}