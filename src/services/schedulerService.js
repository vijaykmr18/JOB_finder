import cron from 'node-cron';
import User from '../models/User.js';
import { generateDailyMatches } from './matchingService.js';

let task;

export function startScheduler() {
  if (task) return task;

  task = cron.schedule(
    '15 2 * * *',
    async () => {
      console.log('Starting scheduled daily job sync');
      const users = await User.find({ isActive: true });

      for (const user of users) {
        try {
          await generateDailyMatches(user._id, { force: true });
          console.log(`Daily jobs synced for ${user.email}`);
        } catch (error) {
          console.error(`Daily sync failed for ${user.email}: ${error.message}`);
        }
      }
    },
    {
      timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata'
    }
  );

  return task;
}
