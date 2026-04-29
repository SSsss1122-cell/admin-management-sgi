// app/api/whatsapp/student.js

import { supabase } from '@/lib/supabase';

export async function handleStudentCommands(userMessage, cleanNumber) {
  const upperMsg = userMessage?.toUpperCase().trim() || '';
  let replyMessage = '';
  
  // When student says Hi/Hello/Help - SHOW THEIR DETAILS DIRECTLY
  if (['HELP', 'MENU', 'START', 'HI', 'HELLO', 'HLO'].includes(upperMsg)) {
    // Search by their phone number
    replyMessage = await getStudentByPhone(cleanNumber);
  }
  
  // My Details command
  else if (['MY', 'MY DETAILS', 'ME', 'MINE', 'DETAILS'].includes(upperMsg)) {
    replyMessage = await getStudentByPhone(cleanNumber);
  }
  
  // Search commands
  else if (upperMsg.match(/^(SEARCH|FIND|INFO|CHECK)\s/i)) {
    const query = userMessage.replace(/^(SEARCH|FIND|INFO|CHECK)\s/i, '').trim();
    replyMessage = await searchStudentDetails(query);
  }
  
  // Default - try to search by USN or name
  else if (userMessage.trim().length >= 2) {
    replyMessage = await searchStudentDetails(userMessage.trim());
  }
  
  // Fallback
  else {
    replyMessage = await getStudentByPhone(cleanNumber);
  }
  
  return replyMessage;
}

// ============================================
// GET STUDENT BY PHONE NUMBER
// ============================================

async function getStudentByPhone(phoneNumber) {
  console.log(`🔍 [Student] Looking up by phone: ${phoneNumber}`);
  
  const phoneNum = parseInt(phoneNumber);
  
  if (!phoneNum || isNaN(phoneNum)) {
    return `❌ *Phone number not registered*

Please register your phone number with the college.

📞 Contact admin: 9480072737`;
  }
  
  try {
    // Search by phone_number or phone field
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .or(`phone_number.eq.${phoneNum},phone.eq.${phoneNumber}`)
      .limit(1);
    
    if (error) {
      console.error('Phone search error:', error);
      return `❌ *Error finding your details*

📞 Contact admin: 9480072737`;
    }
    
    if (!students || students.length === 0) {
      return `❌ *No student found with this phone number*

Your number: ${phoneNumber}

Please send your USN to get your details.
Example: 3TS25CS004

📞 Contact admin: 9480072737`;
    }
    
    return formatStudentDetails(students[0]);
    
  } catch (error) {
    console.error('Error:', error);
    return `❌ *Something went wrong*

📞 Contact admin: 9480072737`;
  }
}

// ============================================
// SEARCH STUDENT BY USN OR NAME
// ============================================

async function searchStudentDetails(query) {
  if (!query || query.trim().length < 2) {
    return `❌ *Please provide a valid USN or name*

Send your *USN* to get your details.
Example: 3TS25CS004`;
  }
  
  query = query.trim();
  console.log(`🔍 [Student] Searching for: "${query}"`);
  
  try {
    // Try exact USN match first
    const { data: usnMatch } = await supabase
      .from('students')
      .select('*')
      .ilike('usn', query)
      .limit(1);
    
    if (usnMatch && usnMatch.length > 0) {
      return formatStudentDetails(usnMatch[0]);
    }
    
    // Try partial USN match
    const { data: partialMatch } = await supabase
      .from('students')
      .select('*')
      .ilike('usn', `%${query}%`)
      .limit(1);
    
    if (partialMatch && partialMatch.length > 0) {
      return formatStudentDetails(partialMatch[0]);
    }
    
    // Try name match
    const { data: nameMatch } = await supabase
      .from('students')
      .select('*')
      .ilike('full_name', `%${query}%`)
      .limit(1);
    
    if (nameMatch && nameMatch.length > 0) {
      return formatStudentDetails(nameMatch[0]);
    }
    
    // No student found
    return `❌ *No student found for:* "${query}"

📋 Please check your details and try again.

💡 *Examples:*
• Your USN (e.g., 3TS25CS004)
• Your name
• Send HI to get your details by phone

📞 Contact admin: 9480072737`;
    
  } catch (error) {
    console.error('Search error:', error);
    return `❌ *Database error*

📞 Contact admin: 9480072737`;
  }
}

// ============================================
// FORMAT STUDENT DETAILS
// ============================================

function formatStudentDetails(student) {
  let message = `╔════════════════════════════╗
║   🎓 *STUDENT DETAILS*   ║
╚════════════════════════════╝

┌──────── *PERSONAL INFO* ──────┐
│ 👤 *Name:* ${student.full_name || 'N/A'}
│ 📋 *USN:* ${student.usn || 'N/A'}
│ 🔬 *Branch:* ${student.branch || 'N/A'}
`;
  
  if (student.semester) {
    message += `│ 📚 *Semester:* ${student.semester}\n`;
  }
  
  if (student.class) {
    message += `│ 🏫 *Class:* ${student.class}`;
    if (student.division) message += ` - ${student.division}`;
    message += `\n`;
  }
  
  message += `├─────────────────────────────┤
│ 📞 *Phone:* ${student.phone_number || student.phone || 'N/A'}
│ 📧 *Email:* ${student.email || 'N/A'}
`;
  
  if (student.routes) {
    message += `│ 🚌 *Route:* ${student.routes}\n`;
  }
  
  message += `├─────────────────────────────┤
│ 💰 *FEE DETAILS*             │
│ 💵 Total Fees: ₹${student.total_fees || 0}
│ ✅ Paid Amount: ₹${student.paid_amount || 0}
│ ⚠️ Due Amount: ₹${student.due_amount || 0}
│ 📊 Status: ${student.fees_due ? '🔴 PENDING' : '🟢 PAID'}
`;
  
  if (student.last_payment_date) {
    message += `│ 📅 Last Payment: ${student.last_payment_date}\n`;
  }
  
  if (student.payment_mode) {
    message += `│ 💳 Payment Mode: ${student.payment_mode}\n`;
  }
  
  if (student.next_payment_date) {
    message += `│ 📆 Next Payment: ${student.next_payment_date}\n`;
  }
  
  message += `└─────────────────────────────┘

💡 *Tip:* Send your USN anytime to view your details

📞 *Admin Contact:* 9480072737`;
  
  return message;
}