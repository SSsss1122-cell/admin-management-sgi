import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Full Payload:", JSON.stringify(payload, null, 2));
    
    // ViralBoostUp ka payload structure
    // Data inside "data" object
    const eventData = payload.data;
    
    let senderNumber = null;
    let userMessage = null;
    
    if (eventData) {
      // Number extract karo
      if (eventData.senderPhoneNumber) {
        senderNumber = eventData.senderPhoneNumber;
      }
      
      // Message extract karo
      if (eventData.content && eventData.content.text) {
        userMessage = eventData.content.text;
      }
    }
    
    console.log("Sender:", senderNumber);
    console.log("Message:", userMessage);
    
    // Agar sender number nahi mila
    if (!senderNumber) {
      console.log("No sender number found");
      return NextResponse.json({ success: true });
    }
    
    // Clean number (remove 91 if present)
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    console.log("Clean Number:", cleanNumber);
    console.log("Authorized Number: 9480072737");
    
    // Sirf authorized number se LIST aaye toh bhejo
    if (cleanNumber === '9480072737' && userMessage && userMessage.toUpperCase() === 'LIST') {
      
      console.log("✅ Authorized! Fetching students...");
      
      const { data: students, error } = await supabase
        .from('students')
        .select('full_name, usn');
      
      let replyMessage = '';
      
      if (error) {
        replyMessage = '❌ Database error';
        console.error("Supabase error:", error);
      } 
      else if (!students || students.length === 0) {
        replyMessage = '📭 No students found in database';
      }
      else {
        replyMessage = "📋 *STUDENT LIST*\n\n";
        students.forEach((s, i) => {
          replyMessage += `${i+1}. ${s.full_name}\n`;
          replyMessage += `   📍 USN: ${s.usn}\n\n`;
        });
        replyMessage += `━━━━━━━━━━━━━━━\n📊 Total: ${students.length} students`;
      }
      
      console.log("Sending reply:", replyMessage);
      
      // Send reply to same number
      const apiKey = process.env.VIRALBOOSTUP_API_KEY;
      if (apiKey) {
        const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: senderNumber,  // Original number with 91
            type: "text",
            text: { body: replyMessage }
          })
        });
        
        const result = await response.json();
        console.log("API Response:", result);
        console.log("✅ Reply sent to", senderNumber);
      } else {
        console.log("❌ API Key missing!");
      }
    }
    else {
      console.log(`❌ Not authorized or not LIST command`);
      console.log(`- Authorized: ${cleanNumber === '9480072737'}`);
      console.log(`- Is LIST: ${userMessage?.toUpperCase() === 'LIST'}`);
      console.log(`- Message was: ${userMessage}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}