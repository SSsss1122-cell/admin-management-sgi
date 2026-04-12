// ✅ GET → webhook verification / health check
export async function GET() {
  return new Response("Webhook working ✅", { status: 200 });
}

// ✅ POST → incoming messages
export async function POST(req) {
  try {
    const body = await req.json();

    console.log("Message aaya:", body);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
}