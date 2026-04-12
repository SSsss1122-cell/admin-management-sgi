Deno.serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
      return new Response(challenge); // Important: plain text
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // POST requests (real messages/events)
  if (req.method === "POST") {
    const data = await req.json();
    console.log("Webhook event received:", data);
    return new Response("Received");
  }

  return new Response("Method not allowed", { status: 405 });
});