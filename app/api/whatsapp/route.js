import { NextResponse } from 'next/server';
import { handleAdminCommands } from './admin';
import { handleStudentCommands } from './student';
import { handleHostelAdminCommands } from './hostelAdmin'; // Import hostel admin handler
import { supabase } from '@/lib/supabase';

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
    
    // Check if admin from DATABASE
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('mobile_number')
      .eq('mobile_number', cleanNumber)
      .maybeSingle();
    
    const isAdmin = adminData !== null;
    
    console.log(`👑 Is Admin: ${isAdmin}`);
    
    let replyMessage;
    
    // Route to appropriate handler
    if (isAdmin) {
      // Check if admin wants hostel admin menu
      const upperMsg = userMessage?.toUpperCase().trim() || '';
      if (upperMsg === 'HOSTEL ADMIN') {
        console.log(`🏨 Routing to HOSTEL ADMIN handler`);
        replyMessage = await handleHostelAdminCommands(userMessage, cleanNumber);
      } else {
        console.log(`🔄 Routing to ADMIN handler`);
        replyMessage = await handleAdminCommands(userMessage, cleanNumber);
      }
    } else {
      console.log(`🔄 Routing to STUDENT handler`);
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

// Send WhatsApp message function with PHONE_NUMBER_ID from env
async function sendWhatsAppMessage(to, message) {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  const phoneNoId = process.env.PHONE_NUMBER_ID;
  
  if (!apiKey) {
    console.log("❌ VIRALBOOSTUP_API_KEY missing");
    return;
  }
  
  if (!phoneNoId) {
    console.log("❌ PHONE_NUMBER_ID missing in environment variables");
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
        phoneNoId: phoneNoId,
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