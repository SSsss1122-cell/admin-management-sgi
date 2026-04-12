import { createClient } from '@supabase/supabase-js';

// ✅ ENV variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_KEY = process.env.VIRAL_API_KEY;

// ✅ GET (health check)
export async function GET() {
  return new Response("Webhook working ✅");
}

// ✅ POST (main logic)
export async function POST(req) {
  try {
    const body = await req.json();

    console.log("Incoming:", JSON.stringify(body, null, 2));

    // ✅ ViralBoostUp payload handling
    const message =
      body.data?.message ||
      body.data?.text ||
      "";

    const from =
      body.data?.from ||
      body.data?.phone ||
      "";

    console.log("message:", message);
    console.log("from:", from);
    console.log("API KEY:", API_KEY);

    // ❗ safety check
    if (!from) {
      console.log("No sender number found ❌");
      return new Response("ok");
    }

    // ✅ LIST command
    if (message && message.toUpperCase() === "LIST") {

      const { data, error } = await supabase
        .from("students")
        .select("full_name, usn")
        .limit(10);

      if (error) {
        console.error("Supabase error:", error);
      }

      let reply = "📋 Student List:\n\n";

      if (data && data.length > 0) {
        data.forEach((s, i) => {
          reply += `${i + 1}. ${s.full_name} (${s.usn})\n`;
        });
      } else {
        reply = "No students found ❌";
      }

      // ✅ Send message back
      const response = await fetch(
        "https://app.viralboostup.in/api/v2/whatsapp-business/messages",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: from,
            type: "text",
            text: {
              body: reply,
            },
          }),
        }
      );

      const result = await response.text();
      console.log("Send response:", result);
    }

    return new Response("ok");

  } catch (err) {
    console.error("ERROR:", err);
    return new Response("error", { status: 500 });
  }
}