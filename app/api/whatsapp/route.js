// app/api/whatsapp/route.js

export async function POST(request) {
  const API_KEY = process.env.VIRALBOOST_API_KEY;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  
  try {
    const { to } = await request.json();
    if (!API_KEY || !PHONE_NUMBER_ID) {
      return Response.json({ error: 'Server is not configured' }, { status: 500 });
    }
    if (!to || typeof to !== 'string') {
      return Response.json({ error: 'Missing or invalid "to"' }, { status: 400 });
    }
    
    const requestBody = {
      phone_number_id: PHONE_NUMBER_ID,
      to: to,
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en" }
      }
    };
    
    const response = await fetch(
      "https://app.viralboostup.in/api/v2/whatsapp-business/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    const data = await response.json();
    
    return Response.json({
      status: response.status,
      data
    });
    
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to check phone numbers
export async function GET() {
  const API_KEY = process.env.VIRALBOOST_API_KEY;
  
  try {
    if (!API_KEY) {
      return Response.json({ error: 'Server is not configured' }, { status: 500 });
    }
    // Try to fetch phone numbers from ViralBoost
    const response = await fetch(
      "https://app.viralboostup.in/api/v2/whatsapp-business/phone-numbers",
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    const data = await response.json();
    
    return Response.json({
      phone_numbers_from_api: data
    });
  } catch (error) {
    return Response.json({
      error: 'Failed to fetch phone numbers'
    });
  }
}