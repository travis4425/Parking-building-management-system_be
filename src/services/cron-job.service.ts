import { reservationService } from './reservation.service';

export interface CronJobConfig {
  enabled: boolean;
  interval: number; // in milliseconds
}

let cronJobId: NodeJS.Timeout | null = null;

export const cronJobService = {
  startAutoCancel(config: CronJobConfig = { enabled: true, interval: 60000 }) {
    if (!config.enabled || cronJobId) {
      console.log('ℹ️  Auto-cancel cron job already running or disabled');
      return;
    }

    console.log(`🔄 Starting auto-cancel reservation cron job (interval: ${config.interval}ms)`);

    cronJobId = setInterval(async () => {
      try {
        const cancelledCount = await reservationService.autoCancelExpired();
        if (cancelledCount > 0) {
          console.log(`✅ Auto-cancelled ${cancelledCount} expired reservations`);
        }
      } catch (error) {
        console.error('❌ Error in auto-cancel cron job:', error);
      }
    }, config.interval);
  },

  stopAutoCancel() {
    if (cronJobId) {
      clearInterval(cronJobId);
      cronJobId = null;
      console.log('⏹️  Auto-cancel cron job stopped');
    }
  },

  getStatus() {
    return {
      isRunning: cronJobId !== null,
      lastCheck: new Date().toISOString(),
    };
  },
};
