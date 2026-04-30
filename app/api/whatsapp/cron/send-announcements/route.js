import { processPendingAnnouncements } from './broadcast';

export async function GET(request) {
  try {
    // Your existing cron auth check
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const validKey = process.env.CRON_SECRET_KEY || 'your-secret-key';
    
    if (key !== validKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🕐 Cron job started at:', new Date().toISOString());
    
    // Process and send pending announcements
    await processPendingAnnouncements();
    
    return Response.json({ 
      success: true, 
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cron error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}