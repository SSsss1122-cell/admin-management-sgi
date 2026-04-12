import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    // Get message from ViralBoostUp
    const payload = await request.json();
    const senderNumber = payload.messages?.[0]?.from;
    const userMessage = payload.messages?.[0]?.text?.body?.toUpperCase();
    
    // Only respond to LIST command
    if (userMessage === 'LIST') {
      // Get students from database
      const { data: students, error } = await supabase
        .from('students')
        .select('full_name, usn');
      
      if (error) {
        // Send error message
        await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: senderNumber,
            type: "text",
            text: { body: "❌ Database error. Please try again." }
          })
        });
      } else {
        // Create student list message
        let message = "📋 STUDENT LIST\n\n";
        
        students.forEach((student, index) => {
          message += `${index + 1}. ${student.full_name}\n`;
          message += `   USN: ${student.usn}\n\n`;
        });
        
        message += `Total: ${students.length} students`;
        
        // Send student list
        await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.VIRALBOOSTUP_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: senderNumber,
            type: "text",
            text: { body: message }
          })
        });
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 200 });
  }
}