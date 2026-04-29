// app/api/student-whatsapp/route.js

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  try {
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase admin client is not initialized');
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection not available. Check your environment variables.' 
      }, { status: 500 });
    }

    const payload = await request.json();
    console.log('📦 Full Payload:', JSON.stringify(payload, null, 2));
    
    let senderNumber = null;
    let userMessage = null;
    
    // Try multiple possible payload structures
    if (payload.data) {
      // Structure: { data: { senderPhoneNumber: "...", content: { text: "..." } } }
      senderNumber = payload.data.senderPhoneNumber || payload.data.sender || payload.data.from;
      userMessage = payload.data.content?.text || payload.data.message || payload.data.text;
    }
    
    // Direct structure: { senderPhoneNumber: "...", content: { text: "..." } }
    if (!senderNumber) {
      senderNumber = payload.senderPhoneNumber || payload.sender || payload.from || payload.phone;
    }
    if (!userMessage) {
      userMessage = payload.content?.text || payload.message || payload.text || payload.body;
    }
    
    // Query params (for GET requests or testing)
    if (!senderNumber && !userMessage) {
      const url = new URL(request.url);
      senderNumber = url.searchParams.get('phone') || url.searchParams.get('sender');
      userMessage = url.searchParams.get('message') || url.searchParams.get('text');
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    // If no message, return help
    if (!userMessage) {
      const replyMessage = getStudentMenu();
      if (senderNumber) {
        await sendWhatsAppMessage(senderNumber, replyMessage);
      }
      return NextResponse.json({ 
        success: true, 
        message: 'No message provided. Returning help menu.',
        reply: replyMessage 
      });
    }
    
    // If no sender number but has message, return error
    if (!senderNumber && userMessage) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is required',
        reply: '❌ Please provide your phone number to use this service.'
      }, { status: 400 });
    }
    
    // Clean the phone number
    let cleanNumber = senderNumber.toString();
    // Remove any non-digit characters except +
    cleanNumber = cleanNumber.replace(/[^\d+]/g, '');
    // Remove country code
    if (cleanNumber.startsWith('+91')) {
      cleanNumber = cleanNumber.substring(3);
    } else if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    // Remove leading zeros
    cleanNumber = cleanNumber.replace(/^0+/, '');
    
    console.log(`🧹 Clean Number: ${cleanNumber}`);
    console.log(`📝 Processing message: "${userMessage}"`);
    
    const upperMsg = userMessage.toUpperCase().trim();
    let replyMessage = '';
    
    // Help/Menu command
    if (['HELP', 'MENU', 'START', 'HI', 'HELLO', 'HLO'].includes(upperMsg)) {
      replyMessage = getStudentMenu();
    }
    // Search commands
    else if (upperMsg.match(/^(SEARCH|FIND|DETAILS|INFO|MY|CHECK)\b/i) || /^[A-Z0-9]{3,20}$/i.test(userMessage.trim())) {
      let query = userMessage.trim();
      const commandMatch = userMessage.match(/^(SEARCH|FIND|DETAILS|INFO|MY|CHECK)\s+(.+)/i);
      if (commandMatch) {
        query = commandMatch[2].trim();
      }
      console.log(`🔍 Search query: "${query}"`);
      replyMessage = await searchStudentDetails(query, cleanNumber);
    }
    // Default - try to search anyway
    else {
      if (userMessage.trim().length >= 2) {
        replyMessage = await searchStudentDetails(userMessage.trim(), cleanNumber);
      } else {
        replyMessage = getStudentMenu();
      }
    }
    
    console.log(`✅ Reply generated (${replyMessage.length} chars)`);
    
    // Send reply via WhatsApp
    if (replyMessage) {
      console.log(`📤 Sending to ${senderNumber}...`);
      const sent = await sendWhatsAppMessage(senderNumber, replyMessage);
      return NextResponse.json({ 
        success: true, 
        message: 'Reply sent',
        sentTo: senderNumber,
        reply: replyMessage.substring(0, 200) + '...',
        apiResponse: sent 
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'No reply generated'
    });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
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
  console.log(`🔍 Searching for: "${query}"`);
  console.log(`📱 PhNumber: "${phoneNumber}"`);
  
  let student = null;
  
  try {
    // Try exact USN match first
    console.log('Trying exact USN match...');
    const { data: usnMatch, error: usnError } = await supabaseAdmin
      .from('students')
      .select('*')
      .ilike('usn', query)
      .limit(1);
    
    if (usnError) console.error('USN search error:', usnError);
    
    if (usnMatch && usnMatch.length > 0) {
      student = usnMatch[0];
      console.log('✅ Found by USN:', student.full_name);
    }
    
    // Try phone number match (for MY DETAILS)
    if (!student && query.match(/^(MY|ME|MINE)$/i)) {
      console.log('Trying phone match with:', phoneNumber);
      const phoneNum = parseInt(phoneNumber);
      if (!isNaN(phoneNum)) {
        const { data: phoneMatch, error: phoneError } = await supabaseAdmin
          .from('students')
          .select('*')
          .or(`phone_number.eq.${phoneNum},phone.eq.${phoneNumber}`)
          .limit(1);
        
        if (phoneError) console.error('Phone search error:', phoneError);
        
        if (phoneMatch && phoneMatch.length > 0) {
          student = phoneMatch[0];
          console.log('✅ Found by phone:', student.full_name);
        }
      }
    }
    
    // Try partial USN match
    if (!student) {
      console.log('Trying partial USN match...');
      const { data: partialMatch, error: partialError } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('usn', `%${query}%`)
        .limit(1);
      
      if (partialError) console.error('Partial USN error:', partialError);
      
      if (partialMatch && partialMatch.length > 0) {
        student = partialMatch[0];
        console.log('✅ Found by partial USN:', student.full_name);
      }
    }
    
    // Try name match
    if (!student) {
      console.log('Trying name match...');
      const { data: nameMatch, error: nameError } = await supabaseAdmin
        .from('students')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .limit(1);
      
      if (nameError) console.error('Name search error:', nameError);
      
      if (nameMatch && nameMatch.length > 0) {
        student = nameMatch[0];
        console.log('✅ Found by name:', student.full_name);
      }
    }
    
  } catch (error) {
    console.error('Search error:', error);
    return `❌ *Database error occurred*

Please try again later.

📞 Contact admin: 9480072737`;
  }
  
  if (!student) {
    console.log('❌ No student found');
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

// ============================================
// SEND WHATSAPP MESSAGE
// ============================================

async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️ WhatsApp API key not configured. Skipping message send.");
    console.log("📤 Would have sent to:", to);
    console.log("💬 Message:", message.substring(0, 100) + "...");
    return { status: 'skipped', reason: 'API key not configured' };
  }
  
  // Clean the phone number for WhatsApp
  let cleanTo = to.toString().replace(/[^\d]/g, '');
  // Ensure it has country code
  if (!cleanTo.startsWith('91')) {
    cleanTo = '91' + cleanTo;
  }
  
  console.log(`📤 Sending WhatsApp message to: ${cleanTo}`);
  
  try {
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: cleanTo,
        phoneNoId: "595231930349201",
        type: "text",
        text: message
      })
    });
    
    const result = await response.json();
    console.log(`📬 WhatsApp API Response: ${response.status}`, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("❌ WhatsApp send error:", error);
    return { status: 'error', error: error.message };
  }
}