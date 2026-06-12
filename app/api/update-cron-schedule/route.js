import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { schedule } = await request.json();
    
    // Update vercel.json
    const vercelPath = path.join(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    
    vercelConfig.crons = [{
      path: "/api/cron/send",
      schedule: schedule
    }];
    
    fs.writeFileSync(vercelPath, JSON.stringify(vercelConfig, null, 2));
    
    return NextResponse.json({ success: true, message: 'Schedule updated in vercel.json' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}