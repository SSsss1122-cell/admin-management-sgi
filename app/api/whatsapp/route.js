// app/api/whatsapp/route.js

export async function POST(request) {
  const API_KEY = process.env.VIRALBOOST_API_KEY;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  
  try {
    const { to } = await request.json();
    
    console.log("=".repeat(50));
    console.log("📤 Sending request to ViralBoost");
    console.log("=".repeat(50));
    console.log("Phone Number ID:", PHONE_NUMBER_ID);
    console.log("Phone Number ID length:", PHONE_NUMBER_ID?.length);
    console.log("To:", to);
    
    const requestBody = {
      phone_number_id: PHONE_NUMBER_ID,
      to: to,
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en" }
      }
    };
    
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    
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
    
    console.log("Response Status:", response.status);
    console.log("Response Data:", data);
    
    return Response.json({
      status: response.status,
      data: data,
      phone_id_used: PHONE_NUMBER_ID,
      suggestion: response.status === 400 ? 
        "Phone Number ID is incorrect - check ViralBoost dashboard" : 
        "Check the response"
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
      message: "Check your ViralBoost dashboard for correct Phone Number ID",
      current_phone_id: process.env.PHONE_NUMBER_ID,
      phone_numbers_from_api: data,
      instructions: "Go to ViralBoost → WhatsApp → Phone Numbers and copy the correct ID"
    });
  } catch (error) {
    return Response.json({
      message: "Go to ViralBoost dashboard to find your Phone Number ID",
      current_phone_id: process.env.PHONE_NUMBER_ID,
      url: "https://app.viralboostup.in"
    });
  }
}