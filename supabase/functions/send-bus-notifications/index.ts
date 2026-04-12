import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

Deno.serve(async () => {

  // 1️⃣ Supabase client setup
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 2️⃣ Fetch pending bus events
  const { data: events, error: eventsError } = await supabase
    .from("bus_events")
    .select("*")
    .eq("status", "PENDING");

  if (eventsError) {
    return new Response(eventsError.message, { status: 500 });
  }

  if (!events || events.length === 0) {
    return new Response("No pending events");
  }

  // 3️⃣ Test student only
  const students = [
    { phone_number: "+919480072737" }  // <-- replace with your test number
  ];

  // 4️⃣ WhatsApp API credentials from Supabase secrets
  const accessToken = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("PHONE_NUMBER_ID");

  for (const event of events) {

    const message =
      event.event_type === "STARTED"
        ? "🚍 Bus has STARTED! Students, please be at your stops."
        : "🏫 Bus has REACHED the college!";

    for (const student of students ?? []) {
      // 5️⃣ Send WhatsApp message and log API response
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: student.phone_number,
            type: "text",
            text: { body: message },
          }),
        }
      );

      const apiResponse = await res.json();
      console.log("WhatsApp API response for", student.phone_number, ":", apiResponse);

      // 6️⃣ Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    // 7️⃣ Update event status in Supabase
    await supabase
      .from("bus_events")
      .update({ status: "SENT" })
      .eq("id", event.id);
  }

  return new Response("Notifications Sent");
});