import { supabase } from '$lib/supabase';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
	id?: number;
	student_id: number;
	course_code: string;
	class_date: string;
	status: AttendanceStatus;
	notes?: string;
	created_at?: string;
}

export interface AttendanceWithStudent extends AttendanceRecord {
	student: {
		name: string;
		student_id: string;
		email: string;
	};
}

/**
 * Get attendance records for a specific course and date
 */
export async function getAttendanceByCourseDateAndStudents(
	courseCode: string,
	classDate: string,
	studentIds?: number[]
) {
	try {
		let query = supabase
			.from('attendance')
			.select(
				`
        id,
        student_id,
        course_code,
        class_date,
        status,
        notes,
        created_at
      `
			)
			.eq('course_code', courseCode)
			.eq('class_date', classDate);

		if (studentIds && studentIds.length > 0) {
			query = query.in('student_id', studentIds);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching attendance records:', error);
			throw error;
		}

		return data || [];
	} catch (error) {
		console.error('Error in getAttendanceByCourseDateAndStudents:', error);
		throw error;
	}
}

/**
 * Get attendance history for a student across all courses or a specific course
 */
export async function getStudentAttendanceHistory(
	studentId: number,
	courseCode?: string,
	startDate?: string,
	endDate?: string
) {
	try {
		let query = supabase
			.from('attendance')
			.select(
				`
        id,
        student_id,
        course_code,
        class_date,
        status,
        notes,
        created_at
      `
			)
			.eq('student_id', studentId)
			.order('class_date', { ascending: false });

		if (courseCode) {
			query = query.eq('course_code', courseCode);
		}

		if (startDate) {
			query = query.gte('class_date', startDate);
		}

		if (endDate) {
			query = query.lte('class_date', endDate);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching student attendance history:', error);
			throw error;
		}

		return data || [];
	} catch (error) {
		console.error('Error in getStudentAttendanceHistory:', error);
		throw error;
	}
}

/**
 * Save attendance records (create or update)
 */
export async function saveAttendanceRecords(records: AttendanceRecord[]) {
	try {
		// Split into records with id (update) and without id (insert)
		const recordsToUpdate = records.filter((record) => record.id);
		const recordsToInsert = records.filter((record) => !record.id);

		const results = [];

		// Handle inserts
		if (recordsToInsert.length > 0) {
			const { data: insertedData, error: insertError } = await supabase
				.from('attendance')
				.insert(recordsToInsert)
				.select();

			if (insertError) {
				console.error('Error inserting attendance records:', insertError);
				throw insertError;
			}

			results.push(...(insertedData || []));
		}

		// Handle updates (one by one to ensure proper error handling)
		for (const record of recordsToUpdate) {
			const { data: updatedData, error: updateError } = await supabase
				.from('attendance')
				.update({
					status: record.status,
					notes: record.notes
				})
				.eq('id', record.id)
				.select();

			if (updateError) {
				console.error(`Error updating attendance record ${record.id}:`, updateError);
				throw updateError;
			}

			results.push(...(updatedData || []));
		}

		return results;
	} catch (error) {
		console.error('Error in saveAttendanceRecords:', error);
		throw error;
	}
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(id: number) {
	try {
		const { error } = await supabase.from('attendance').delete().eq('id', id);

		if (error) {
			console.error(`Error deleting attendance record ${id}:`, error);
			throw error;
		}

		return true;
	} catch (error) {
		console.error('Error in deleteAttendanceRecord:', error);
		throw error;
	}
}

/**
 * Get course attendance statistics
 */
export async function getCourseAttendanceStats(courseId: string) {
	try {
		// Get all attendance records for the course
		const { data, error } = await supabase
			.from('attendance_sessions')
			.select('*')
			.eq('course_id', courseId);

		if (error) {
			console.error('Error fetching course attendance stats:', error);
			throw error;
		}

		if (!data || data.length === 0) {
			return {
				totalSessions: 0,
				totalStudents: 0,
				averageAttendance: 0,
				attendanceByDate: {}
			};
		}

		// Calculate statistics
		const totalSessions = data.length;
		let totalStudents = 0;
		let totalPresent = 0;

		data.forEach((session) => {
			totalStudents += session.total_students || 0;
			totalPresent += session.present_students || 0;
		});

		const averageAttendance = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

		// Create attendance by date mapping
		const attendanceByDate = {};
		data.forEach((session) => {
			const date = session.date;
			const total = session.total_students || 0;
			const present = session.present_students || 0;

			attendanceByDate[date] = {
				total,
				present,
				percentage: total > 0 ? (present / total) * 100 : 0
			};
		});

		return {
			totalSessions,
			totalStudents: totalStudents / totalSessions, // Average students per session
			averageAttendance,
			attendanceByDate
		};
	} catch (error) {
		console.error('Error in getCourseAttendanceStats:', error);
		throw error;
	}
}
