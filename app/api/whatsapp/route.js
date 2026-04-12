import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const payload = await request.json();
    
    // Jisne bheja uski number lo
    let senderNumber = payload.messages?.[0]?.from;
    const userMessage = payload.messages?.[0]?.text?.body?.toUpperCase();
    
    // Number ko clean karo (918 se start ho sakta hai)
    // Remove country code if present
    senderNumber = senderNumber.replace('91', '');
    
    console.log("From:", senderNumber);
    console.log("Message:", userMessage);
    
    // SIRF aapke number se LIST aaye tabhi kaam karo
    if (senderNumber === '9480072737' && userMessage === 'LIST') {
      
      console.log("✅ Authorized user! Fetching students...");
      
      // Database se students lo
      const { data: students, error } = await supabase
        .from('students')
        .select('full_name, usn');
      
      if (error) {
        await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: `91${senderNumber}`,
            type: "text",
            text: { body: "❌ Database error" }
          })
        });
      } 
      else if (!students || students.length === 0) {
        await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: `91${senderNumber}`,
            type: "text",
            text: { body: "📭 No students found in database" }
          })
        });
      }
      else {
        // List banaye
        let listMessage = "📋 STUDENT LIST\n\n";
        students.forEach((s, i) => {
          listMessage += `${i+1}. ${s.full_name}\n`;
          listMessage += `   ${s.usn}\n\n`;
        });
        listMessage += `Total: ${students.length} students`;
        
        // Sirf aapke number pe bhejo
        await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: `91${senderNumber}`,  // 919480072737
            type: "text",
            text: { body: listMessage }
          })
        });
        
        console.log("✅ List sent to authorized number:", senderNumber);
      }
    } 
    else if (senderNumber !== '9480072737') {
      console.log("❌ Unauthorized access from:", senderNumber);
      // Koi reply mat bhejo (ignore)
    }
    else {
      console.log("Not a LIST command");
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}