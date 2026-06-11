// app/api/cron-toggle/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'cron-settings.json');

// Read settings
function getSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return { enabled: false, lastRun: null };
}

// Save settings
function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function POST(request) {
  try {
    const { enabled } = await request.json();
    const settings = getSettings();
    settings.enabled = enabled;
    saveSettings(settings);
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}