// app/api/cron/send/route.js
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

export async function GET() {
  try {
    console.log('🚀 Cron job triggered at:', new Date().toISOString());
    
    // Run the cron job
    const scriptPath = path.join(process.cwd(), 'cron', 'overdueFeesJob.js');
    const { stdout, stderr } = await execPromise(`node "${scriptPath}"`);
    
    console.log('Output:', stdout);
    if (stderr) console.error('Error:', stderr);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job completed',
      output: stdout,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}