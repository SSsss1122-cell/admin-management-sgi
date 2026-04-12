import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ GET
export async function GET() {
  return new Response("Webhook working ✅");
}

// ✅ POST
export async function POST(req) {
  try {
    const body = await req.json();

    console.log("Incoming:", JSON.stringify(body, null, 2));

    // ✅ SAFELY extract message
    let message = "";
    let from = "";

    if (body.messages && body.messages.length > 0) {
      message = body.messages[0]?.text?.body || "";
      from = body.messages[0]?.from;
    } else if (body.Body) {
      message = body.Body;
      from = body.From;
    }

    console.log("message:", message);
    console.log("from:", from);

    // ✅ check command
    if (message && message.toUpperCase() === "LIST") {

      const { data, error } = await supabase
        .from("students")
        .select("full_name, usn")
        .limit(10);

      if (error) {
        console.error(error);
      }

      let reply = "📋 Student List:\n\n";

      data.forEach((s, i) => {
        reply += `${i + 1}. ${s.full_name} (${s.usn})\n`;
      });

      // ✅ send reply
      await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
        method: "POST",
        headers: {
          "Authorization": "Bearer YOUR_API_KEY",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: from,
          type: "text",
          text: {
            body: reply
          }
        })
      });
    }

    return new Response("ok");

  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
}