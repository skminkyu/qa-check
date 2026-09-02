export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { scheduleReminders } = await import('./lib/remind-cron');
    scheduleReminders();
  }
}
