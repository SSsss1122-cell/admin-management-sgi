import { NextResponse } from 'next/server';
import { handleAdminCommands } from './admin';
import { handleStudentCommands } from './student';

const ADMIN_NUMBERS = ['9480072737', '919480072737'];

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log('📦 Payload received');
    
    let senderNumber = null;
    let userMessage = null;
    
    if (payload.data) {
      senderNumber = payload.data.senderPhoneNumber || payload.data.sender || payload.data.from;
      userMessage = payload.data.content?.text?.trim() || payload.data.message || payload.data.text;
    }
    
    if (!senderNumber) {
      senderNumber = payload.senderPhoneNumber || payload.sender || payload.from || payload.phone;
    }
    if (!userMessage) {
      userMessage = payload.content?.text?.trim() || payload.message || payload.text || payload.body;
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber || !userMessage) {
      return NextResponse.json({ success: true });
    }
    
    // Clean phone number
    let cleanNumber = senderNumber.toString().replace(/[^\d]/g, '');
    if (cleanNumber.startsWith('91')) cleanNumber = cleanNumber.substring(2);
    cleanNumber = cleanNumber.replace(/^0+/, '');
    
    // Check if admin
    const isAdmin = ADMIN_NUMBERS.some(adminNum => {
      const cleanAdmin = adminNum.replace(/[^\d]/g, '').replace(/^91/, '').replace(/^0+/, '');
      return cleanNumber === cleanAdmin;
    });
    
    console.log(`👑 Is Admin: ${isAdmin}`);
    console.log(`🔄 Routing to: ${isAdmin ? 'ADMIN' : 'STUDENT'}`);
    
    // Route to appropriate handler
    let replyMessage;
    if (isAdmin) {
      replyMessage = await handleAdminCommands(userMessage, cleanNumber);
    } else {
      replyMessage = await handleStudentCommands(userMessage, cleanNumber);
    }
    
    // Send reply
    if (replyMessage) {
      await sendWhatsAppMessage(senderNumber, replyMessage);
    }
    
    return NextResponse.json({ success: true, role: isAdmin ? 'admin' : 'student' });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}

// Shared send function
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