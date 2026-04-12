import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    
    const eventData = payload.data;
    
    let senderNumber = null;
    let userMessage = null;
    
    if (eventData) {
      senderNumber = eventData.senderPhoneNumber;
      userMessage = eventData.content?.text;
    }
    
    console.log(`📱 Sender: ${senderNumber}`);
    console.log(`💬 Message: ${userMessage}`);
    
    if (!senderNumber) {
      return NextResponse.json({ success: true });
    }
    
    let cleanNumber = senderNumber.toString();
    if (cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.substring(2);
    }
    
    if (cleanNumber === '9480072737' && userMessage?.toUpperCase() === 'LIST') {
      
      console.log("✅ Fetching students from Supabase...");
      
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
      
      const apiKey = process.env.VIRALBOOSTUP_API_KEY;
      
      if (!apiKey) {
        console.log("❌ API Key missing!");
        return NextResponse.json({ success: false });
      }
      
      // Correct format as per API docs
      const requestBody = {
        to: senderNumber,           // "919480072737"
        phoneNoId: "595231930349201", // Phone number ID
        type: "text",
        text: replyMessage
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
      }
    }
    else {
      console.log(`❌ Not authorized: ${cleanNumber} sent "${userMessage}"`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("🔥 Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}