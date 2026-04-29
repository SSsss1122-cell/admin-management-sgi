import { supabase } from '@/lib/supabase';

export async function handleStudentCommands(userMessage, cleanNumber) {
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // Help/Menu
  if (['HELP', 'MENU', 'START', 'HI', 'HELLO', 'HLO'].includes(upperMsg)) {
    replyMessage = getStudentMenu();
  }
  
  // My Details (by phone)
  else if (['MY', 'MY DETAILS', 'ME', 'MINE'].includes(upperMsg)) {
    replyMessage = await getStudentByPhone(cleanNumber);
  }
  
  // Search commands
  else if (upperMsg.match(/^(SEARCH|FIND|DETAILS|INFO|CHECK)\s/i)) {
    const query = userMessage.replace(/^(SEARCH|FIND|DETAILS|INFO|CHECK)\s/i, '').trim();
    replyMessage = await searchStudentDetails(query, cleanNumber);
  }
  
  // Default - try to search by USN or name
  else if (userMessage.trim().length >= 2) {
    replyMessage = await searchStudentDetails(userMessage.trim(), cleanNumber);
  }
  
  // Fallback
  else {
    replyMessage = getStudentMenu();
  }
  
  return replyMessage;
}

// ============================================
// STUDENT MENU
// ============================================

function getStudentMenu() {
  return `╔════════════════════════════╗
║   🎓 *STUDENT PORTAL*     ║
║   SGI College              ║
╚════════════════════════════╝

┌─────────────────────────────┐
│ 📚 *How to check details:*  │
├─────────────────────────────┤
│ Send your *USN* or *Name*   │
│ to get your details         │
│                             │
│ 📌 *Examples:*              │
│ • 3TS25CS004                │
│ • SEARCH 3TS25CS004         │
│ • MY DETAILS                │
│ • FIND Rohit                │
└─────────────────────────────┘

💡 *Tip:* Send your USN to see
your complete details instantly!

📞 *Admin Contact:* 9480072737`;
}

// ============================================
// SEARCH STUDENT DETAILS
// ============================================

async function searchStudentDetails(query, phoneNumber) {
  if (!query || query.trim().length < 2) {
    return `❌ *Please provide a valid USN or name*

Send your *USN* or *Name* to check your details.

📌 Example: *3TS25CS004*`;
  }
  
  query = query.trim();
  console.log(`🔍 [Student] Searching for: "${query}"`);
  
  let student = null;
  
  try {
    // Try exact USN match
    const { data: usnMatch } = await supabase
      .from('students')
      .select('*')
      .ilike('usn', query)
      .limit(1);
    
    if (usnMatch && usnMatch.length > 0) {
      student = usnMatch[0];
    }
    
    // Try partial USN match
    if (!student) {
      const { data: partialMatch } = await supabase
        .from('students')
        .select('*')
        .ilike('usn', `%${query}%`)
        .limit(1);
      
      if (partialMatch && partialMatch.length > 0) {
        student = partialMatch[0];
      }
    }
    
    // Try name match
    if (!student) {
      const { data: nameMatch } = await supabase
        .from('students')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .limit(1);
      
      if (nameMatch && nameMatch.length > 0) {
        student = nameMatch[0];
      }
    }
    
  } catch (error) {
    console.error('Search error:', error);
    return `❌ *Database error occurred*

Please try again later.

📞 Contact admin: 9480072737`;
  }
  
  if (!student) {
    return `❌ *No student found for:* "${query}"

📋 Please check your details and try again.

💡 *Examples:*
• Your USN (e.g., 3TS25CS004)
• Your name
• MY DETAILS (if phone registered)

📞 Contact admin: 9480072737`;
  }
  
  return formatStudentDetails(student);
}

// ============================================
// GET STUDENT BY PHONE
// ============================================

async function getStudentByPhone(phoneNumber) {
  const phoneNum = parseInt(phoneNumber);
  if (!phoneNum || isNaN(phoneNum)) {
    return `❌ *Phone number not found in records*

Please send your USN to get details.

📞 Contact admin: 9480072737`;
  }
  
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .or(`phone_number.eq.${phoneNum},phone.eq.${phoneNumber}`)
    .limit(1);
  
  if (!students || students.length === 0) {
    return `❌ *No student found with this phone number*

Please send your USN to get details.

📞 Contact admin: 9480072737`;
  }
  
  return formatStudentDetails(students[0]);
}

// ============================================
// FORMAT STUDENT DETAILS
// ============================================

function formatStudentDetails(student) {
  let message = `╔════════════════════════════╗
║   🎓 *STUDENT DETAILS*   ║
╚════════════════════════════╝

┌─────── *PERSONAL INFO* ──────┐
│ 👤 *Name:* ${student.full_name || 'N/A'}
│ 📋 *USN:* ${student.usn || 'N/A'}
`;
  
  if (student.semester) message += `│ 📚 *Semester:* ${student.semester}\n`;
  if (student.class) {
    message += `│ 🏫 *Class:* ${student.class}`;
    if (student.division) message += ` - ${student.division}`;
    message += `\n`;
  }
  if (student.branch) {
    message += `│ 🔬 *Branch:* ${student.branch}\n`;
    
    // Medical or Engineering
    const branch = student.branch.toLowerCase();
    if (branch.includes('medical') || branch.includes('mbbs') || branch.includes('bds') || branch.includes('pharma')) {
      message += `│ 🏥 *Stream:* Medical\n`;
    } else {
      message += `│ 🔧 *Stream:* Engineering\n`;
    }
  }
  
  message += `├─────────────────────────────┤
│ 📞 *Phone:* ${student.phone_number || student.phone || 'N/A'}
│ 📧 *Email:* ${student.email || 'N/A'}
├─────────────────────────────┤
`;
  
  if (student.routes) message += `│ 🚌 *Route:* ${student.routes}\n`;
  if (student.bus_id) message += `│ 🚍 *Bus ID:* ${student.bus_id}\n`;
  
  message += `├─────────────────────────────┤
│ 💰 *FEE DETAILS*             │
│ Total Fees: ₹${student.total_fees || 0}
│ Paid: ₹${student.paid_amount || 0}
│ Due: ₹${student.due_amount || 0}
│ Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}
`;
  
  if (student.last_payment_date) {
    message += `│ 📅 Last Payment: ${student.last_payment_date}\n`;
  }
  
  message += `└─────────────────────────────┘

💡 *Need help?* Send HELP for options

📞 *Admin:* 9480072737`;
  
  return message;
}