import { supabase } from '$lib/supabase';
import { logActivity, ActivityTypes } from './activityLogService';

export type Course = {
	id: number;
	name: string;
	code: string;
	description?: string;
	instructor?: string;
	schedule?: string;
	status: string;
	attendanceStats?: {
		totalSessions: number;
		averageAttendance: number;
		attendanceByDate: any[];
	};
};

// Get all courses
export async function getCourses(): Promise<Course[]> {
	try {
		console.log('Fetching all courses from database');
		const { data, error } = await supabase.from('courses').select('*').order('code');

		if (error) {
			console.error('Error fetching courses:', error);
			throw error;
		}

		console.log('Courses fetched successfully:', data);
		return data || [];
	} catch (error) {
		console.error('Error in getCourses:', error);
		throw error;
	}
}

// Get course by ID
export async function getCourseById(courseId: number): Promise<Course | null> {
	try {
		// Fetch base course data
		const { data: course, error } = await supabase
			.from('courses')
			.select('*')
			.eq('id', courseId)
			.single();

		if (error) {
			console.error('Error fetching course:', error);
			throw error;
		}

		if (!course) {
			return null;
		}

		// Try to fetch attendance stats if the tables exist
		try {
			const stats = await getCourseAttendanceStats(course.id);
			return { ...course, attendanceStats: stats };
		} catch (statsError) {
			// If attendance tables don't exist, just return the course without stats
			console.warn('Could not fetch attendance stats:', statsError);
			return course;
		}
	} catch (error) {
		console.error('Error in getCourseById:', error);
		throw error;
	}
}

// Create new course
export async function createCourse(courseData: Omit<Course, 'id'>): Promise<Course> {
	try {
		const { data, error } = await supabase.from('courses').insert([courseData]).select();

		if (error) {
			console.error('Error creating course:', error);
			throw error;
		}

		// Log the activity
		await logActivity({
			action_type: ActivityTypes.COURSE_CREATED,
			description: `Course ${courseData.code} - ${courseData.name} was created`,
			entity_id: data![0].id.toString(),
			entity_type: 'course'
		});

		return data![0];
	} catch (error) {
		console.error('Error in createCourse:', error);
		throw error;
	}
}

// Update course
export async function updateCourse(
	courseId: string | number,
	courseData: Partial<Course>
): Promise<Course> {
	try {
		const { data, error } = await supabase
			.from('courses')
			.update(courseData)
			.eq('id', courseId)
			.select();

		if (error) {
			console.error('Error updating course:', error);
			throw error;
		}

		// Log the activity
		await logActivity({
			action_type: ActivityTypes.COURSE_UPDATED,
			description: `Course ${data![0].code} - ${data![0].name} was updated`,
			entity_id: courseId.toString(),
			entity_type: 'course'
		});

		return data![0];
	} catch (error) {
		console.error('Error in updateCourse:', error);
		throw error;
	}
}

// Delete course
export async function deleteCourse(courseId: number): Promise<void> {
	try {
		// First get the course details for the log
		const { data: courseData } = await supabase
			.from('courses')
			.select('code, name')
			.eq('id', courseId)
			.single();

		const { error } = await supabase.from('courses').delete().eq('id', courseId);

		if (error) {
			console.error('Error deleting course:', error);
			throw error;
		}

		// Log the activity
		if (courseData) {
			await logActivity({
				action_type: ActivityTypes.COURSE_DELETED,
				description: `Course ${courseData.code} - ${courseData.name} was deleted`,
				entity_id: courseId.toString(),
				entity_type: 'course'
			});
		}
	} catch (error) {
		console.error('Error in deleteCourse:', error);
		throw error;
	}
}

// Get course attendance statistics
export async function getCourseAttendanceStats(courseId: number) {
	try {
		// Check if attendance_sessions table exists
		try {
			// Check if table exists by attempting a HEAD request
			const { count, error: sessionsCheckError } = await supabase
				.from('attendance_sessions')
				.select('*', { count: 'exact', head: true });

			if (sessionsCheckError) {
				// Table doesn't exist or other error
				return {
					totalSessions: 0,
					averageAttendance: 0,
					attendanceByDate: []
				};
			}
		} catch (checkError) {
			// If check fails, return empty stats
			return {
				totalSessions: 0,
				averageAttendance: 0,
				attendanceByDate: []
			};
		}

		// If we get here, table exists - fetch the data
		const { data: sessions, error: sessionsError } = await supabase
			.from('attendance_sessions')
			.select('*')
			.eq('course_id', courseId)
			.order('date');

		if (sessionsError) {
			console.error('Error fetching attendance for course', courseId, ':', sessionsError);
			return {
				totalSessions: 0,
				averageAttendance: 0,
				attendanceByDate: []
			};
		}

		if (!sessions || sessions.length === 0) {
			return {
				totalSessions: 0,
				averageAttendance: 0,
				attendanceByDate: []
			};
		}

		// Process the session data
		let totalStudents = 0;
		let totalPresent = 0;

		sessions.forEach((session) => {
			totalStudents += session.total_students || 0;
			totalPresent += session.present_students || 0;
		});

		const attendanceByDate = sessions.map((session) => ({
			date: session.date,
			totalStudents: session.total_students,
			presentStudents: session.present_students,
			percentage:
				session.total_students > 0 ? (session.present_students / session.total_students) * 100 : 0
		}));

		return {
			totalSessions: sessions.length,
			averageAttendance: totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0,
			attendanceByDate
		};
	} catch (error) {
		console.error('Error fetching attendance for course', courseId, ':', error);
		// Return empty stats instead of throwing
		return {
			totalSessions: 0,
			averageAttendance: 0,
			attendanceByDate: []
		};
	}
}
