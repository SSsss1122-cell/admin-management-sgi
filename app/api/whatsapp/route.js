// ========== CORS HANDLER ==========
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request) {
  // Set CORS headers in response
  const response = await handleRequest(request);
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;
}