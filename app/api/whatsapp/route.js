import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    
    console.log("Full Payload:", JSON.stringify(payload, null, 2));
    
    // Safely extract sender number - check multiple possible locations
    let senderNumber = null;
    
    if (payload.messages && payload.messages[0] && payload.messages[0].from) {
      senderNumber = payload.messages[0].from;
    } 
    else if (payload.from) {
      senderNumber = payload.from;
    }
    else if (payload.contact && payload.contact.wa_id) {
      senderNumber = payload.contact.wa_id;
    }
    
    let userMessage = null;
    if (payload.messages && payload.messages[0] && payload.messages[0].text) {
      userMessage = payload.messages[0].text.body;
    }
    else if (payload.message && payload.message.text) {
      userMessage = payload.message.text.body;
    }
    else if (payload.body) {
      userMessage = payload.body;
    }
    
    console.log("Sender:", senderNumber);
    console.log("Message:", userMessage);
    
    // Agar sender number nahi mila toh return
    if (!senderNumber) {
      console.log("No sender number found in payload");
      return NextResponse.json({ success: true });
    }
    
    // Clean number (remove 91 if present)
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    console.log("Clean Number:", cleanNumber);
    console.log("Authorized Number: 9480072737");
    
    // Sirf authorized number (9480072737) se LIST aaye toh bhejo
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
        replyMessage = '📭 No students found';
      }
      else {
        replyMessage = "📋 STUDENT LIST\n\n";
        students.forEach((s, i) => {
          replyMessage += `${i+1}. ${s.full_name}\n`;
          replyMessage += `   ${s.usn}\n\n`;
        });
        replyMessage += `Total: ${students.length} students`;
      }
      
      // Send reply
      const apiKey = process.env.VIRALBOOSTUP_API_KEY;
      if (apiKey) {
        await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: senderNumber,
            type: "text",
            text: { body: replyMessage }
          })
        });
        console.log("✅ Reply sent");
      } else {
        console.log("❌ API Key missing");
      }
    }
    else {
      console.log("❌ Not authorized or not LIST command");
      console.log(`Authorized: ${cleanNumber === '9480072737'}, Is LIST: ${userMessage?.toUpperCase() === 'LIST'}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}