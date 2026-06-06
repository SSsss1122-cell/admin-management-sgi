export async function GET() {
  const apiKey = process.env.VIRALBOOSTUP_API_KEY;
  
  // Test with a simple curl equivalent
  const testPhone = "919876543210"; // Replace with your test number
  
  const result = {
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    testPhone: testPhone,
    endpoint: "https://app.viralboostup.in/api/v2/whatsapp-business/messages"
  };
  
  try {
    const response = await fetch("https://app.viralboostup.in/api/v2/whatsapp-business/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: testPhone,
        phoneNoId: "595231930349201",
        type: "text",
        text: "Test message from SGI system at " + new Date().toISOString()
      })
    });
    
    const responseText = await response.text();
    
    result.status = response.status;
    result.ok = response.ok;
    result.responseBody = responseText.substring(0, 500);
    
    if (responseText) {
      try {
        result.responseJson = JSON.parse(responseText);
      } catch (e) {
        result.parseError = e.message;
      }
    }
    
  } catch (error) {
    result.error = error.message;
  }
  
  return Response.json(result);
}