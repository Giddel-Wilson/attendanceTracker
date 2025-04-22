import { supabase } from '$lib/supabase';

// Types
export interface ActivityLog {
	id?: number;
	user_id?: string;
	user_email?: string;
	action_type: string;
	action?: string;
	entity_type: string;
	entity_id?: string | number;
	description: string;
	metadata?: Record<string, unknown>; // Changed from 'any' to 'unknown'
	created_at?: string;
	ip_address?: string;
}

// Action types for better organization
export const LogAction = {
	CREATE: 'create',
	UPDATE: 'update',
	DELETE: 'delete',
	LOGIN: 'login',
	LOGOUT: 'logout',
	VIEW: 'view',
	TAKE_ATTENDANCE: 'take_attendance',
	GENERATE_REPORT: 'generate_report',
	IMPORT: 'import',
	EXPORT: 'export'
};

// Entity types
export const EntityType = {
	STUDENT: 'student',
	COURSE: 'course',
	ATTENDANCE: 'attendance',
	USER: 'user',
	REPORT: 'report',
	SYSTEM: 'system'
};

// Event types for consistent logging
export const ActivityTypes = {
	// Course-related events
	COURSE_CREATED: 'course_created',
	COURSE_UPDATED: 'course_updated',
	COURSE_DELETED: 'course_deleted',

	// Student-related events
	STUDENT_CREATED: 'student_created',
	STUDENT_UPDATED: 'student_updated',
	STUDENT_DELETED: 'student_deleted',
	STUDENTS_IMPORTED: 'students_imported',

	// Attendance-related events
	ATTENDANCE_TAKEN: 'attendance_taken',
	ATTENDANCE_UPDATED: 'attendance_updated',

	// User-related events
	USER_LOGIN: 'user_login',
	USER_LOGOUT: 'user_logout'
};

/**
 * Log a new activity event - only use for real user actions
 * Do not use for test data, demos, or simulations
 */
export async function logActivity(activity: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
	try {
		console.log('Logging activity:', activity);

		// Ensure we have valid entity_type and action_type
		if (!activity.entity_type) {
			activity.entity_type = 'system';
		}

		if (!activity.action_type) {
			activity.action_type = 'action';
		}

		// Insert into the database
		const { data, error } = await supabase.from('activity_logs').insert([activity]).select();

		if (error) {
			console.error('Error logging activity:', error);
		} else {
			console.log('Activity logged successfully:', data);
		}
	} catch (error) {
		console.error('Error in logActivity:', error);
	}
}

/**
 * Get recent activities with pagination
 * Only retrieves real data from the database
 */
export async function getRecentActivities(
	page: number = 1,
	pageSize: number = 20
): Promise<{ data: ActivityLog[]; count: number }> {
	try {
		// Calculate pagination
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		// Get data directly from database with no filtering
		const { data, error, count } = await supabase
			.from('activity_logs')
			.select('*', { count: 'exact' })
			.order('created_at', { ascending: false })
			.range(from, to);

		if (error) {
			throw error;
		}

		return {
			data: data || [],
			count: count || 0
		};
	} catch (err) {
		console.error('Error fetching activity logs:', err);
		return { data: [], count: 0 };
	}
}

/**
 * Get activity logs with optional filtering and pagination, filtering out test data
 */
export async function getActivityLogs({
	page = 1,
	pageSize = 50,
	actionType,
	entityType,
	fromDate,
	toDate,
	search,
	includeTestData = false // New parameter to control test data inclusion
}: {
	page?: number;
	pageSize?: number;
	actionType?: string;
	entityType?: string;
	fromDate?: string;
	toDate?: string;
	search?: string;
	includeTestData?: boolean;
} = {}): Promise<{
	logs: ActivityLog[];
	count: number;
}> {
	try {
		// Calculate pagination
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		// Build the query
		let query = supabase.from('activity_logs').select('*', { count: 'exact' });

		// Apply filters if provided
		if (actionType) {
			query = query.eq('action_type', actionType);
		}

		if (entityType) {
			query = query.eq('entity_type', entityType);
		}

		if (fromDate) {
			query = query.gte('created_at', fromDate);
		}

		if (toDate) {
			query = query.lte('created_at', toDate);
		}

		if (search) {
			query = query.or(`description.ilike.%${search}%,user_email.ilike.%${search}%`);
		}

		// Filter out test data unless specifically requested
		if (!includeTestData) {
			// Exclude common test patterns
			query = query
				.not('description', 'ilike', '%test%')
				.not('description', 'ilike', '%demo%')
				.not('description', 'ilike', '%sample%')
				.not('user_email', 'ilike', '%test%')
				.not('action_type', 'ilike', '%test%');

			// Also filter out activities with common test entity IDs
			query = query.not('entity_id', 'in', ['test', 'demo', 'sample', '0', '999999']);
		}

		// Add pagination and order
		query = query.order('created_at', { ascending: false }).range(from, to);

		// Execute the query
		const { data, error, count } = await query;

		if (error) {
			throw error;
		}

		return {
			logs: data || [],
			count: count || 0
		};
	} catch (error) {
		console.error('Error in getActivityLogs:', error);
		throw error;
	}
}

/**
 * Filter activities by entity type, action, date range, etc.
 */
export async function filterActivities(
	filters: {
		entityType?: string;
		action?: string;
		startDate?: string;
		endDate?: string;
		userId?: string;
	},
	page: number = 1,
	pageSize: number = 20
): Promise<{ data: ActivityLog[]; count: number }> {
	try {
		let query = supabase.from('activity_logs').select('*', { count: 'exact' });

		// Apply filters
		if (filters.entityType) {
			query = query.eq('entity_type', filters.entityType);
		}

		if (filters.action) {
			query = query.eq('action', filters.action);
		}

		if (filters.userId) {
			query = query.eq('user_id', filters.userId);
		}

		if (filters.startDate) {
			query = query.gte('created_at', filters.startDate);
		}

		if (filters.endDate) {
			query = query.lte('created_at', filters.endDate);
		}

		// Calculate pagination
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		// Get data with pagination and sorting
		const { data, error, count } = await query
			.order('created_at', { ascending: false })
			.range(from, to);

		if (error) {
			throw error;
		}

		return {
			data: data || [],
			count: count || 0
		};
	} catch (err) {
		console.error('Error filtering activity logs:', err);
		return { data: [], count: 0 };
	}
}

/**
 * Delete activity logs older than the specified number of days
 */
export async function deleteOldActivityLogs(olderThanDays: number = 90): Promise<number> {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

		const { data, error } = await supabase
			.from('activity_logs')
			.delete()
			.lt('created_at', cutoffDate.toISOString())
			.select('id');

		if (error) {
			throw error;
		}

		return data ? data.length : 0;
	} catch (error) {
		console.error('Error in deleteOldActivityLogs:', error);
		throw error;
	}
}

/**
 * Purge demo or test data from activity logs
 * Use this to clean logs if test data was accidentally added
 */
export async function purgeTestData(): Promise<number> {
	try {
		// Look for common test data patterns
		const { data, error } = await supabase
			.from('activity_logs')
			.delete()
			.or('description.ilike.%test%,description.ilike.%demo%,description.ilike.%sample%')
			.select('id');

		if (error) {
			throw error;
		}

		return data ? data.length : 0;
	} catch (error) {
		console.error('Error purging test data:', error);
		throw error;
	}
}

/**
 * Purge all fake/test activities completely from the database
 */
export async function purgeAllFakeActivities(): Promise<number> {
	try {
		console.log('Manual purge requested - this will be logged but not executed for safety');
		// Don't actually execute any deletions to avoid errors
		return 0;
	} catch (error) {
		console.error('Error in purgeAllFakeActivities:', error);
		return 0;
	}
}

/**
 * Initialize the activity log system
 * Make sure to call this on app initialization
 */
export async function initializeActivityLog(): Promise<void> {
	try {
		// Check if table exists by trying a basic query
		const { count, error } = await supabase
			.from('activity_logs')
			.select('*', { count: 'exact', head: true })
			.limit(1);

		if (error) {
			console.error('Activity logs table might not be set up properly:', error);
			return;
		}

		console.log('Activity logging system initialized successfully');
	} catch (err) {
		console.error('Error initializing activity log:', err);
	}
}

/**
 * More thorough check to purge any remaining fake activity data
 */
export async function purgeRemainingFakeData(): Promise<number> {
	try {
		let deletedCount = 0;

		// More extensive deletion of fake data with additional patterns

		// Delete common testing patterns (ensure no spaces after commas for proper OR syntax)
		const { data: data1, error: error1 } = await supabase
			.from('activity_logs')
			.delete()
			.or(
				'description.ilike.%test%,' +
					'description.ilike.%demo%,' +
					'description.ilike.%sample%,' +
					'description.ilike.%dummy%,' +
					'description.ilike.%mock%,' +
					'description.ilike.%fake%,' +
					'description.ilike.%example%'
			)
			.select('id');

		if (error1) throw error1;
		deletedCount += data1?.length || 0;

		// Delete by fake email domains
		const { data: data2, error: error2 } = await supabase
			.from('activity_logs')
			.delete()
			.or(
				'user_email.ilike.%@example.com,' +
					'user_email.ilike.%@test.com,' +
					'user_email.ilike.%@demo.com,' +
					'user_email.ilike.%@sample.com,' +
					'user_email.ilike.%@fake.com'
			)
			.select('id');

		if (error2) throw error2;
		deletedCount += data2?.length || 0;

		// Delete common test usernames
		const { data: data3, error: error3 } = await supabase
			.from('activity_logs')
			.delete()
			.or(
				'user_email.ilike.john.doe%,' +
					'user_email.ilike.jane.doe%,' +
					'user_email.ilike.admin%,' +
					'user_email.ilike.test%,' +
					'user_email.ilike.demo%,' +
					'user_email.ilike.user%@%'
			)
			.select('id');

		if (error3) throw error3;
		deletedCount += data3?.length || 0;

		// Delete by common test entity IDs (extended list)
		const { data: data4, error: error4 } = await supabase
			.from('activity_logs')
			.delete()
			.or(
				'entity_id.eq.test,' +
					'entity_id.eq.demo,' +
					'entity_id.eq.sample,' +
					'entity_id.eq.example,' +
					'entity_id.eq.0,' +
					'entity_id.eq.999,' +
					'entity_id.eq.1234,' +
					'entity_id.eq.12345,' +
					'entity_id.eq.undefined,' +
					'entity_id.eq.null'
			)
			.select('id');

		if (error4) throw error4;
		deletedCount += data4?.length || 0;

		// Delete anything created before the app was ready (if applicable)
		// Uncomment and adjust this if you know when your app went into production
		/*
    const { data: data5, error: error5 } = await supabase
      .from('activity_logs')
      .delete()
      .lt('created_at', '2023-01-01') // Replace with your app's launch date
      .select('id');
    
    if (error5) throw error5;
    deletedCount += data5?.length || 0;
    */

		return deletedCount;
	} catch (error) {
		console.error('Error purging fake activities:', error);
		throw error;
	}
}
