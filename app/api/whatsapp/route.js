import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("=========================================");
    console.log("📦 Full Payload:", JSON.stringify(payload, null, 2));
    console.log("=========================================");
    
    // ViralBoostUp ka payload structure
    const eventData = payload.data;
    
    let senderNumber = null;
    let userMessage = null;
    let recipientPhoneNumberId = null;
    
    if (eventData) {
      if (eventData.senderPhoneNumber) {
        senderNumber = eventData.senderPhoneNumber;
      }
      if (eventData.content && eventData.content.text) {
        userMessage = eventData.content.text;
      }
      if (eventData.recipientPhoneNumberId) {
        recipientPhoneNumberId = eventData.recipientPhoneNumberId;
      }
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    console.log(`🆔 Phone Number ID: ${recipientPhoneNumberId}`);
    
    // Agar sender number nahi mila
    if (!senderNumber) {
      console.log("❌ No sender number found");
      return NextResponse.json({ success: true });
    }
    
    // Clean number (remove 91 if present)
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    console.log(`🧹 Clean Number: ${cleanNumber}`);
    console.log(`🔐 Authorized Number: 9480072737`);
    
    // Sirf authorized number se LIST aaye toh bhejo
    if (cleanNumber === '9480072737' && userMessage && userMessage.toUpperCase() === 'LIST') {
      
      console.log("✅ Authorized user! Fetching students from Supabase...");
      
      const { data: students, error } = await supabase
        .from('students')
        .select('full_name, usn');
      
      let replyMessage = '';
      
      if (error) {
        replyMessage = '❌ Database error. Please try again.';
        console.error("Supabase error:", error);
      } 
      else if (!students || students.length === 0) {
        replyMessage = '📭 No students found in database.';
      }
      else {
        replyMessage = "📋 *STUDENT LIST*\n\n";
        students.forEach((s, i) => {
          const usnText = s.usn && s.usn !== 'null' ? s.usn : 'Not Assigned';
          replyMessage += `${i+1}. ${s.full_name}\n`;
          replyMessage += `   📍 USN: ${usnText}\n\n`;
        });
        replyMessage += `━━━━━━━━━━━━━━━\n📊 Total: ${students.length} students`;
      }
      
      console.log("📤 Sending reply:", replyMessage.substring(0, 200) + "...");
      
      // Send reply to same number
      const apiKey = process.env.VIRALBOOSTUP_API_KEY;
      
      if (!apiKey) {
        console.log("❌ VIRALBOOSTUP_API_KEY is missing!");
        return NextResponse.json({ success: false, error: "API Key missing" });
      }
      
      console.log("🔑 API Key found, sending message...");
      
      // ViralBoostUp API requires phone_number_id
      const requestBody = {
        phone_number_id: recipientPhoneNumberId || "595231930349201", // From payload
        to: senderNumber,
        type: "text",
        text: {
          body: replyMessage
        }
      };
      
      console.log("📨 Request Body:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      console.log(`📬 API Response Status: ${response.status}`);
      console.log(`📬 API Response Body:`, JSON.stringify(result, null, 2));
      
      if (response.ok) {
        console.log("✅ Message sent successfully to WhatsApp!");
      } else {
        console.log("❌ Failed to send message!");
        console.log("Error details:", result);
      }
    }
    else {
      console.log(`❌ Not authorized or not LIST command`);
      console.log(`   Authorized: ${cleanNumber === '9480072737'}`);
      console.log(`   Is LIST: ${userMessage?.toUpperCase() === 'LIST'}`);
      console.log(`   Message was: ${userMessage}`);
    }
    
    console.log("=========================================");
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Webhook Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}