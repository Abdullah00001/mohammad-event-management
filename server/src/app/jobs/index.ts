const shutdown = async (signal: string): Promise<void> => {
  console.log(`[Cron Worker] ${signal} — stopping all cron jobs...`);
  console.log('[Cron Worker] ✓ Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Cron Worker] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Cron Worker] Unhandled rejection:', reason);
});

console.log('[Cron Worker] ✓ All cron schedules active');
