import { supabase } from '../supabase';

export type Student = {
	id: number;
	name: string;
	studentId: string;
	email: string;
	phone?: string;
	status?: string;
	courses?: string[];
};

// Get all students
export async function getStudents() {
	try {
		const { data, error } = await supabase.from('students').select('*').order('name');

		if (error) {
			console.error('Error fetching students:', error);
			throw error;
		}

		// Transform data - making sure courses is always an array
		return (data || []).map((student) => ({
			id: student.id,
			name: student.name || 'Unknown',
			studentId: student.student_id || 'N/A',
			email: student.email || '',
			status: student.status || 'active',
			courses: Array.isArray(student.courses) ? student.courses : []
		}));
	} catch (error) {
		console.error('Error in getStudents:', error);
		return [];
	}
}

/**
 * Get a specific student by ID
 */
export async function getStudentById(id: number | string): Promise<Student> {
	try {
		const { data, error } = await supabase.from('students').select('*').eq('id', id).single();

		if (error) {
			console.error(`Error fetching student ${id}:`, error);
			throw error;
		}

		if (!data) {
			throw new Error(`Student with ID ${id} not found`);
		}

		// Transform to match our Student type
		return {
			id: data.id,
			name: data.name,
			studentId: data.student_id,
			email: data.email,
			status: data.status || 'active',
			courses: Array.isArray(data.courses) ? data.courses : []
		};
	} catch (error) {
		console.error(`Error fetching student ${id}:`, error);
		throw error;
	}
}

/**
 * Add a new student
 */
export async function addStudent(student: Omit<Student, 'id'>): Promise<Student> {
	try {
		const { data, error } = await supabase
			.from('students')
			.insert({
				name: student.name,
				student_id: student.studentId,
				email: student.email,
				phone: student.phone || null,
				status: student.status || 'active',
				courses: student.courses || []
			})
			.select();

		if (error) throw error;

		if (!data || data.length === 0) throw new Error('Failed to add student');

		return {
			id: data[0].id,
			name: data[0].name,
			studentId: data[0].student_id,
			email: data[0].email,
			phone: data[0].phone,
			status: data[0].status,
			courses: data[0].courses || [],
			attendance: 0,
			lastAttended: null
		};
	} catch (error) {
		console.error('Error adding student:', error);
		throw error;
	}
}

/**
 * Update an existing student
 */
export async function updateStudent(
	id: number | string,
	student: Partial<Student>
): Promise<Student> {
	try {
		const { data, error } = await supabase
			.from('students')
			.update({
				name: student.name,
				student_id: student.studentId,
				email: student.email,
				phone: student.phone,
				status: student.status,
				courses: student.courses
			})
			.eq('id', id)
			.select();

		if (error) throw error;

		if (!data || data.length === 0) throw new Error(`Student with ID ${id} not found`);

		return {
			id: data[0].id,
			name: data[0].name,
			studentId: data[0].student_id,
			email: data[0].email,
			phone: data[0].phone,
			status: data[0].status,
			courses: data[0].courses || [],
			attendance: data[0].attendance || 0,
			lastAttended: data[0].last_attended
		};
	} catch (error) {
		console.error(`Error updating student ${id}:`, error);
		throw error;
	}
}

/**
 * Delete a student
 */
export async function deleteStudent(id: number | string): Promise<boolean> {
	try {
		const { error } = await supabase.from('students').delete().eq('id', id);

		if (error) throw error;
		return true;
	} catch (error) {
		console.error(`Error deleting student ${id}:`, error);
		throw error;
	}
}

/**
 * Get mock student data for development/demo purposes
 */
function getMockStudents(): Student[] {
	return [
		{
			id: 1,
			name: 'John Smith',
			studentId: 'U2023/1001',
			email: 'john.smith@example.com',
			attendance: 95,
			courses: ['CS101'],
			lastAttended: '2023-11-01',
			status: 'active'
		},
		{
			id: 2,
			name: 'Sarah Johnson',
			studentId: 'U2023/1002',
			email: 'sarah.j@example.com',
			attendance: 87,
			courses: ['CS101', 'CS202'],
			lastAttended: '2023-11-02',
			status: 'active'
		},
		{
			id: 3,
			name: 'Michael Brown',
			studentId: 'U2023/1003',
			email: 'michael.b@example.com',
			attendance: 78,
			courses: ['CS101'],
			lastAttended: '2023-10-28',
			status: 'inactive'
		},
		{
			id: 4,
			name: 'Emily Davis',
			studentId: 'U2023/1004',
			email: 'emily.d@example.com',
			attendance: 92,
			courses: ['CS202'],
			lastAttended: '2023-11-01',
			status: 'active'
		},
		{
			id: 5,
			name: 'David Wilson',
			studentId: 'U2023/1005',
			email: 'david.w@example.com',
			attendance: 88,
			courses: ['CS101', 'CS202'],
			lastAttended: '2023-10-30',
			status: 'active'
		}
	];
}
