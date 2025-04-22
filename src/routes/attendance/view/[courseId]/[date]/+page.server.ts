import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { courseId, date } = params;

	try {
		// Validate params
		if (!courseId || isNaN(Number(courseId))) {
			throw error(400, 'Invalid course ID');
		}

		if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			throw error(400, 'Invalid date format');
		}

		// Get course data
		const { data: courseData, error: courseError } = await supabase
			.from('courses')
			.select('*')
			.eq('id', Number(courseId))
			.single();

		if (courseError) {
			console.error('Error fetching course:', courseError);
			throw error(404, 'Course not found');
		}

		// Get attendance session data
		const { data: sessionData, error: sessionError } = await supabase
			.from('attendance_sessions')
			.select('*')
			.eq('course_id', Number(courseId))
			.eq('date', date)
			.single();

		if (sessionError) {
			console.error('Error fetching attendance session:', sessionError);
			throw error(404, 'Attendance session not found');
		}

		// Get attendance records
		const { data: recordsData, error: recordsError } = await supabase
			.from('attendance_records')
			.select('*')
			.eq('session_id', sessionData.id);

		if (recordsError) {
			console.error('Error fetching attendance records:', recordsError);
			throw error(500, 'Failed to load attendance records');
		}

		// Get all students for this course
		const { data: allStudents, error: studentsError } = await supabase.from('students').select('*');

		if (studentsError) {
			console.error('Error fetching students:', studentsError);
			throw error(500, 'Failed to load students');
		}

		// Filter students enrolled in this course
		const enrolledStudents = allStudents.filter(
			(s) => s.courses && s.courses.includes(courseData.code)
		);

		// Map students with attendance data
		const studentsWithAttendance = enrolledStudents.map((s) => {
			const record = recordsData.find((r) => r.student_id === s.id);
			return {
				...s,
				attendance: record
					? {
							status: record.status,
							notes: record.notes || ''
						}
					: {
							status: 'unknown',
							notes: ''
						}
			};
		});

		return {
			course: courseData,
			session: sessionData,
			students: studentsWithAttendance
		};
	} catch (err) {
		console.error('Error in page load:', err);
		if (err.status) {
			throw err; // Rethrow SvelteKit errors
		}
		throw error(500, 'Internal Server Error');
	}
};
