// cron/scheduler.js
const cron = require('node-cron');
const { exec } = require('child_process');

console.log('🕐 Auto Scheduler Starting...');
console.log('📅 Will run daily at 9:00 AM');

// Run every day at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log(`\n⏰ [${new Date().toLocaleString()}] Running auto fee reminder...`);
  
  exec('node cron/overdueFeesJob.js', (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) console.error('Error:', error);
  });
});

// Keep process running
console.log('✅ Scheduler started. Press Ctrl+C to stop.');