import { NextResponse } from 'next/server';
import { handleAdminCommands } from './admin';
import { handleStudentCommands } from './student';
import { handleVoiceCommand } from './voiceAi';  // ✅ NEW - Voice AI handler

const ADMIN_NUMBERS = ['9480072737', '919480072737'];

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log('📦 Payload received');
    
    let senderNumber = null;
    let userMessage = null;
    let mediaUrl = null;           // ✅ NEW - For voice messages
    let isVoiceMessage = false;    // ✅ NEW - Voice flag
    
    if (payload.data) {
      senderNumber = payload.data.senderPhoneNumber || payload.data.sender || payload.data.from;
      userMessage = payload.data.content?.text?.trim() || payload.data.message || payload.data.text;
      
      // ✅ NEW - Check for voice message
      if (payload.data.content?.audio || payload.data.content?.voice || payload.data.media?.type === 'audio') {
        isVoiceMessage = true;
        mediaUrl = payload.data.content?.audio?.id || payload.data.content?.voice?.id || payload.data.media?.url;
        console.log('🎤 Voice message detected!');
      }
    }
    
    if (!senderNumber) {
      senderNumber = payload.senderPhoneNumber || payload.sender || payload.from || payload.phone;
    }
    if (!userMessage && !isVoiceMessage) {
      userMessage = payload.content?.text?.trim() || payload.message || payload.text || payload.body;
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    if (!isVoiceMessage) console.log(`💬 Message: ${userMessage}`);
    else console.log(`🎤 Voice message - Processing...`);
    
    if (!senderNumber || (!userMessage && !isVoiceMessage)) {
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
    
    let replyMessage;
    
    // ============ ✅ NEW - VOICE MESSAGE HANDLING ============
    if (isVoiceMessage && mediaUrl) {
      console.log('🎤 Processing voice command with AI...');
      const voiceResponse = await handleVoiceCommand('', cleanNumber, true, mediaUrl, isAdmin);
      if (voiceResponse) {
        replyMessage = voiceResponse;
      } else {
        replyMessage = "❌ Voice samajh nahi aaya. Please type karein ya clearly bolein.\n\nType *MENU* for commands.";
      }
    }
    
    // ============ ✅ NEW - TEXT MESSAGE WITH AI FIRST ============
    else if (userMessage && userMessage !== '') {
      // Pehle AI try karo (natural language understanding)
      const aiResponse = await handleVoiceCommand(userMessage, cleanNumber, false, null, isAdmin);
      
      // Agar AI ne useful response diya
      if (aiResponse && aiResponse !== '' && !aiResponse.includes('unavailable') && aiResponse.length < 800) {
        replyMessage = aiResponse;
      }
      // Warna existing code ke according route karo
      else if (isAdmin) {
        replyMessage = await handleAdminCommands(userMessage, cleanNumber);
      } else {
        replyMessage = await handleStudentCommands(userMessage, cleanNumber);
      }
    }
    
    // ============ Send reply (YOUR EXISTING CODE - NO CHANGE) ============
    if (replyMessage) {
      await sendWhatsAppMessage(senderNumber, replyMessage);
    }
    
    return NextResponse.json({ success: true, role: isAdmin ? 'admin' : 'student' });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}

// ============ YOUR EXISTING SEND FUNCTION (NO CHANGE) ============
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