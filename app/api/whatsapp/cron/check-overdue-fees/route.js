// app/api/whatsapp/cron/check-overdue-fees/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'cron-settings.json');

function isCronEnabled() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      return settings.enabled === true;
    }
  } catch (error) {}
  return false;
}

export async function GET() {
  // Check if cron is enabled
  if (!isCronEnabled()) {
    return NextResponse.json({ 
      success: false, 
      message: 'Cron is disabled. Enable from control panel.' 
    });
  }

  try {
    // Run your cron job logic here
    const { checkOverdueFeesAndSendReminders } = await import('../../../../cron/overdueFeesJob.js');
    await checkOverdueFeesAndSendReminders();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}