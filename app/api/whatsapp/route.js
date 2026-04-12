export async function GET() {
  return new Response("Webhook working ✅");
}

export async function POST(req) {
  try {
    // 🔥 RAW TEXT dekhne ke liye
    const raw = await req.text();

    console.log("RAW DATA:", raw);

    return new Response("ok");
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
}