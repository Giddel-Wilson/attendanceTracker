import { browser } from '$app/environment';
import { initializeActivityLog } from '$lib/services/activityLogService';

export const load = async () => {
	// Only initialize on the client side
	if (browser) {
		try {
			// Only initialize the logging system, don't try to purge anything
			await initializeActivityLog();
		} catch (err) {
			console.error('Error initializing activity log system:', err);
		}
	}

	return {};
};
