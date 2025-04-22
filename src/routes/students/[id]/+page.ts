import { error } from '@sveltejs/kit';
import { getStudentById } from '$lib/services/studentService';
import type { PageLoad } from './$types';

export const load = (async ({ params }) => {
	try {
		const studentId = params.id;

		if (!studentId) {
			throw error(404, 'Student ID is required');
		}

		const student = await getStudentById(Number(studentId));

		if (!student) {
			throw error(404, 'Student not found');
		}

		// Return the student data to be used with $props()
		return {
			student
		};
	} catch (e) {
		console.error('Error loading student:', e);
		throw error(500, 'Failed to load student data');
	}
}) satisfies PageLoad;
