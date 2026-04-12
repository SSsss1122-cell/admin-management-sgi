import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

export async function POST(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
  };
  
  try {
    const body = await request.json();
    console.log("Received:", body);
    
    return NextResponse.json({ 
      success: true, 
      message: "Backend is working!" 
    }, { headers });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { headers });
  }
}