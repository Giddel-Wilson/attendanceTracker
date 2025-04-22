import { supabase } from '../supabase';

export type ReportType = 'course_attendance' | 'student_attendance' | 'low_attendance';

export type ReportFilters = {
	courseId?: number;
	studentId?: number;
	dateFrom?: string;
	dateTo?: string;
	status?: string;
	threshold?: number; // For low attendance reports
};

// Generate course attendance report
export async function generateCourseAttendanceReport(
	courseId: number | string,
	filters?: ReportFilters
) {
	try {
		// Get course details
		const { data: course, error: courseError } = await supabase
			.from('courses')
			.select('name, code, semester')
			.eq('id', courseId)
			.single();

		if (courseError) throw courseError;

		// Build attendance query
		let query = supabase
			.from('attendance_records')
			.select(
				`
        id,
        status,
        session_date,
        students(id, name, student_id, email)
      `
			)
			.eq('course_id', courseId);

		// Apply date filters if provided
		if (filters?.dateFrom) {
			query = query.gte('session_date', filters.dateFrom);
		}

		if (filters?.dateTo) {
			query = query.lte('session_date', filters.dateTo);
		}

		// Get attendance records
		const { data, error } = await query;

		if (error) throw error;

		// Group by student
		const studentMap = new Map();
		const sessionDates = new Set();

		data.forEach((record) => {
			const studentId = record.students.id;
			const sessionDate = record.session_date;

			sessionDates.add(sessionDate);

			if (!studentMap.has(studentId)) {
				studentMap.set(studentId, {
					student: {
						id: record.students.id,
						name: record.students.name,
						studentId: record.students.student_id,
						email: record.students.email
					},
					sessions: new Map(),
					totalPresent: 0,
					totalSessions: 0
				});
			}

			studentMap.get(studentId).sessions.set(sessionDate, record.status);

			if (record.status === 'present') {
				studentMap.get(studentId).totalPresent++;
			}

			studentMap.get(studentId).totalSessions++;
		});

		// Convert to array and calculate percentages
		const sortedDates = [...sessionDates].sort();
		const students = [...studentMap.values()].map((student) => {
			const { totalPresent, totalSessions } = student;
			const attendanceRate =
				totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

			return {
				...student,
				attendanceRate,
				sessionStatus: sortedDates.map((date) => ({
					date,
					status: student.sessions.get(date) || 'not-recorded'
				}))
			};
		});

		// Sort students by name
		students.sort((a, b) => a.student.name.localeCompare(b.student.name));

		return {
			course: {
				id: courseId,
				name: course.name,
				code: course.code,
				semester: course.semester
			},
			sessions: sortedDates,
			students,
			generated: new Date().toISOString()
		};
	} catch (error) {
		console.error(`Error in generateCourseAttendanceReport (${courseId}):`, error);
		throw error;
	}
}

// Generate student attendance report
export async function generateStudentAttendanceReport(
	studentId: number | string,
	filters?: ReportFilters
) {
	try {
		// Get student details
		const { data: student, error: studentError } = await supabase
			.from('students')
			.select('name, student_id, email')
			.eq('id', studentId)
			.single();

		if (studentError) throw studentError;

		// Build attendance query
		let query = supabase
			.from('attendance_records')
			.select(
				`
        id,
        status,
        session_date,
        courses(id, name, code)
      `
			)
			.eq('student_id', studentId);

		// Apply date filters if provided
		if (filters?.dateFrom) {
			query = query.gte('session_date', filters.dateFrom);
		}

		if (filters?.dateTo) {
			query = query.lte('session_date', filters.dateTo);
		}

		// Apply course filter if provided
		if (filters?.courseId) {
			query = query.eq('course_id', filters.courseId);
		}

		// Get attendance records
		const { data, error } = await query.order('session_date', { ascending: false });

		if (error) throw error;

		// Group by course
		const courseMap = new Map();

		data.forEach((record) => {
			const courseId = record.courses.id;

			if (!courseMap.has(courseId)) {
				courseMap.set(courseId, {
					course: {
						id: record.courses.id,
						name: record.courses.name,
						code: record.courses.code
					},
					sessions: [],
					totalPresent: 0,
					totalSessions: 0
				});
			}

			courseMap.get(courseId).sessions.push({
				date: record.session_date,
				status: record.status
			});

			if (record.status === 'present') {
				courseMap.get(courseId).totalPresent++;
			}

			courseMap.get(courseId).totalSessions++;
		});

		// Calculate attendance rates for each course
		const courses = [...courseMap.values()].map((course) => {
			const { totalPresent, totalSessions } = course;
			const attendanceRate =
				totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

			return {
				...course,
				attendanceRate
			};
		});

		// Sort by course name
		courses.sort((a, b) => a.course.name.localeCompare(b.course.name));

		// Calculate overall attendance rate
		const totalSessions = data.length;
		const totalPresent = data.filter((record) => record.status === 'present').length;
		const overallAttendanceRate =
			totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

		return {
			student: {
				id: studentId,
				name: student.name,
				studentId: student.student_id,
				email: student.email
			},
			courses,
			overallAttendanceRate,
			totalSessions,
			totalPresent,
			generated: new Date().toISOString()
		};
	} catch (error) {
		console.error(`Error in generateStudentAttendanceReport (${studentId}):`, error);
		throw error;
	}
}

// Generate low attendance report
export async function generateLowAttendanceReport(
	courseId: number | string,
	threshold: number = 70
) {
	try {
		// Get course details if provided
		let coursesScope = [];

		if (courseId !== 'all') {
			const { data: courseData } = await supabase
				.from('courses')
				.select('id, name, code')
				.eq('id', courseId);

			coursesScope = courseData || [];
		} else {
			// Get all active courses
			const { data: coursesData } = await supabase
				.from('courses')
				.select('id, name, code')
				.eq('status', 'active');

			coursesScope = coursesData || [];
		}

		// Process each course
		const results = [];

		for (const course of coursesScope) {
			// Get all students in the course
			const { data: courseStudents } = await supabase
				.from('course_students')
				.select('student_id, students(id, name, student_id, email)')
				.eq('course_id', course.id);

			if (!courseStudents || courseStudents.length === 0) continue;

			// Get attendance records for each student
			const lowAttendanceStudents = [];

			for (const cs of courseStudents) {
				const { data: attendanceData } = await supabase
					.from('attendance_records')
					.select('status')
					.eq('course_id', course.id)
					.eq('student_id', cs.student_id);

				if (!attendanceData || attendanceData.length === 0) {
					// No attendance records, counts as 0%
					lowAttendanceStudents.push({
						student: {
							id: cs.students.id,
							name: cs.students.name,
							studentId: cs.students.student_id,
							email: cs.students.email
						},
						attendanceRate: 0,
						totalSessions: 0,
						totalPresent: 0
					});
					continue;
				}

				const totalSessions = attendanceData.length;
				const totalPresent = attendanceData.filter((record) => record.status === 'present').length;
				const attendanceRate = Math.round((totalPresent / totalSessions) * 100);

				if (attendanceRate < threshold) {
					lowAttendanceStudents.push({
						student: {
							id: cs.students.id,
							name: cs.students.name,
							studentId: cs.students.student_id,
							email: cs.students.email
						},
						attendanceRate,
						totalSessions,
						totalPresent
					});
				}
			}

			if (lowAttendanceStudents.length > 0) {
				// Sort by attendance rate (lowest first)
				lowAttendanceStudents.sort((a, b) => a.attendanceRate - b.attendanceRate);

				results.push({
					course: {
						id: course.id,
						name: course.name,
						code: course.code
					},
					students: lowAttendanceStudents,
					studentCount: courseStudents.length,
					lowAttendanceCount: lowAttendanceStudents.length,
					lowAttendancePercentage: Math.round(
						(lowAttendanceStudents.length / courseStudents.length) * 100
					)
				});
			}
		}

		return {
			threshold,
			courses: results,
			generated: new Date().toISOString()
		};
	} catch (error) {
		console.error(`Error in generateLowAttendanceReport:`, error);
		throw error;
	}
}
