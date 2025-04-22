<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { getStudents } from '$lib/services/studentService';
	import { getCourseById } from '$lib/services/courseService';
	import { logActivity } from '$lib/services/activityLogService';

	// Use courseId instead of id to match the route parameter
	const courseId = $page.params.courseId;

	// Types
	type Student = {
		id: number;
		name: string;
		studentId: string;
		email: string;
		present: boolean;
		note: string;
	};

	type Course = {
		id: number;
		name: string;
		code: string;
		description: string;
		instructor: string;
		status: string;
	};

	// State
	let course = $state<Course | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let students = $state<Student[]>([]);
	let allStudents = $state<any[]>([]);
	let date = $state(new Date().toISOString().split('T')[0]);
	let notes = $state('');
	let isSaving = $state(false);
	let saveSuccess = $state(false);
	let saveError = $state(false);

	onMount(async () => {
		try {
			isLoading = true;
			error = null;

			// Load course data
			const courseData = await getCourseById(Number(courseId));
			if (!courseData) {
				error = 'Course not found';
				return;
			}

			if (courseData.status === 'completed') {
				error = 'Cannot take attendance for a completed course';
				return;
			}

			course = courseData;

			// Load all students
			const studentsData = await getStudents();
			allStudents = studentsData;

			// Filter students to those enrolled in this course
			if (course.code) {
				students = studentsData
					.filter((student) => student.courses && student.courses.includes(course!.code))
					.map((student) => ({
						id: student.id,
						name: student.name,
						studentId: student.studentId,
						email: student.email,
						present: true, // Default to present
						note: ''
					}));
			}

			isLoading = false;
		} catch (err) {
			console.error('Error loading data:', err);
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			isLoading = false;
		}
	});

	// Toggle all students
	function toggleAllAttendance(present: boolean): void {
		students = students.map((student) => ({
			...student,
			present
		}));
	}

	// Toggle individual student
	function toggleStudentAttendance(studentId: number): void {
		students = students.map((student) =>
			student.id === studentId ? { ...student, present: !student.present } : student
		);
	}

	// Update student note
	function updateStudentNote(studentId: number, note: string): void {
		students = students.map((student) =>
			student.id === studentId ? { ...student, note } : student
		);
	}

	// Submit attendance
	async function submitAttendance(): Promise<void> {
		if (!course) return;

		try {
			isSaving = true;
			saveError = false;

			// Create session record
			const presentCount = students.filter((s) => s.present).length;
			const totalCount = students.length;

			const { data: sessionData, error: sessionError } = await supabase
				.from('attendance_sessions')
				.insert([
					{
						course_id: course.id,
						date,
						total_students: totalCount,
						present_students: presentCount,
						notes
					}
				])
				.select();

			if (sessionError) {
				throw sessionError;
			}

			const sessionId = sessionData[0].id;

			// Create individual attendance records
			const attendanceRecords = students.map((student) => ({
				session_id: sessionId,
				student_id: student.id,
				status: student.present ? 'present' : 'absent',
				notes: student.note || null
			}));

			const { error: recordsError } = await supabase
				.from('attendance_records')
				.insert(attendanceRecords);

			if (recordsError) {
				throw recordsError;
			}

			// Log the activity
			try {
				await logActivity({
					action_type: 'attendance_taken',
					entity_type: 'attendance',
					entity_id: courseId.toString(),
					description: `Attendance taken for ${course.name} with ${presentCount} present (${((presentCount / totalCount) * 100).toFixed(1)}%)`,
					user_email: 'current_user@example.com'
				});
			} catch (logErr) {
				console.error('Failed to log activity:', logErr);
			}

			saveSuccess = true;

			// Redirect to attendance dashboard instead of the view page that's having issues
			setTimeout(() => {
				goto('/attendance');
			}, 1500);
		} catch (err) {
			console.error('Error saving attendance:', err);
			saveError = true;
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Take Attendance - {course ? course.name : 'Loading...'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div
				class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"
			></div>
		</div>
	{:else if error}
		<div class="my-4 rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>
					<div class="mt-2">
						<a href="/attendance" class="text-sm font-medium text-red-700 underline">
							Return to attendance dashboard
						</a>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center">
				<a
					href="/attendance"
					class="mr-2 text-indigo-600 hover:text-indigo-800"
					aria-label="Back to attendance"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</a>
				<span class="text-sm text-gray-500">Back to Attendance Dashboard</span>
			</div>

			<div class="flex flex-col justify-between md:flex-row md:items-center">
				<div>
					<div
						class="mb-1 inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-0.5 text-sm font-medium text-indigo-800"
					>
						{course?.code}
					</div>
					<h1 class="text-3xl font-bold text-gray-800">Take Attendance</h1>
					<p class="text-gray-600">{course?.name}</p>
				</div>
			</div>
		</div>

		<!-- Attendance form -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Attendance list -->
			<div class="lg:col-span-2">
				<div class="overflow-hidden rounded-lg bg-white shadow">
					<div class="border-b border-gray-200 px-4 py-4 sm:px-6">
						<div class="flex flex-wrap items-center justify-between">
							<h2 class="text-lg font-medium text-gray-900">Students</h2>
							<div class="mt-2 flex space-x-2 sm:mt-0">
								<button
									type="button"
									class="inline-flex items-center rounded-md border border-transparent bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200"
									onclick={() => toggleAllAttendance(true)}
								>
									Mark All Present
								</button>
								<button
									type="button"
									class="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
									onclick={() => toggleAllAttendance(false)}
								>
									Mark All Absent
								</button>
							</div>
						</div>
						<div class="mt-2">
							<label for="date" class="block text-sm font-medium text-gray-700">Date</label>
							<input
								type="date"
								id="date"
								bind:value={date}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							/>
						</div>
					</div>

					{#if students.length === 0}
						<div class="py-8 text-center">
							<p class="text-gray-500">No students enrolled in this course</p>
						</div>
					{:else}
						<ul class="divide-y divide-gray-200">
							{#each students as student}
								<li class="px-4 py-4 sm:px-6">
									<div class="flex items-center justify-between">
										<div class="flex items-center">
											<div class="h-10 w-10 flex-shrink-0">
												<div
													class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600"
												>
													{student.name
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</div>
											</div>
											<div class="ml-4">
												<div class="text-sm font-medium text-gray-900">{student.name}</div>
												<div class="text-sm text-gray-500">{student.studentId}</div>
											</div>
										</div>
										<div>
											<button
												type="button"
												class="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium {student.present
													? 'bg-green-100 text-green-800 hover:bg-green-200'
													: 'bg-red-100 text-red-800 hover:bg-red-200'}"
												onclick={() => toggleStudentAttendance(student.id)}
											>
												{student.present ? 'Present' : 'Absent'}
											</button>
										</div>
									</div>
									<div class="mt-2 flex">
										<input
											type="text"
											placeholder="Add note (optional)"
											value={student.note}
											oninput={(e) => updateStudentNote(student.id, e.target.value)}
											class="block w-full rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
										/>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<!-- Summary and submission -->
			<div class="lg:col-span-1">
				<div class="overflow-hidden rounded-lg bg-white shadow">
					<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
						<h3 class="text-lg leading-6 font-medium text-gray-900">Attendance Summary</h3>
					</div>
					<div class="px-4 py-5 sm:p-6">
						<div>
							<label for="notes" class="block text-sm font-medium text-gray-700"
								>Session Notes</label
							>
							<textarea
								id="notes"
								bind:value={notes}
								rows="3"
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								placeholder="Add any notes about this session..."
							></textarea>
						</div>

						<div class="mt-4 rounded-md bg-gray-50 p-4">
							<dl class="grid grid-cols-1 gap-4">
								<div class="sm:col-span-1">
									<dt class="text-sm font-medium text-gray-500">Total Students</dt>
									<dd class="mt-1 text-sm text-gray-900">{students.length}</dd>
								</div>
								<div class="sm:col-span-1">
									<dt class="text-sm font-medium text-gray-500">Present</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{students.filter((s) => s.present).length}
									</dd>
								</div>
								<div class="sm:col-span-1">
									<dt class="text-sm font-medium text-gray-500">Absent</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{students.filter((s) => !s.present).length}
									</dd>
								</div>
								<div class="sm:col-span-1">
									<dt class="text-sm font-medium text-gray-500">Attendance Rate</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{students.length > 0
											? (
													(students.filter((s) => s.present).length / students.length) *
													100
												).toFixed(1)
											: '0.0'}%
									</dd>
								</div>
							</dl>
						</div>

						{#if saveSuccess}
							<div class="mt-4 rounded-md bg-green-50 p-4">
								<div class="flex">
									<div class="flex-shrink-0">
										<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
									<div class="ml-3">
										<p class="text-sm font-medium text-green-800">
											Attendance saved successfully! Redirecting...
										</p>
									</div>
								</div>
							</div>
						{/if}

						{#if saveError}
							<div class="mt-4 rounded-md bg-red-50 p-4">
								<div class="flex">
									<div class="flex-shrink-0">
										<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
									<div class="ml-3">
										<p class="text-sm font-medium text-red-800">
											Failed to save attendance. Please try again.
										</p>
									</div>
								</div>
							</div>
						{/if}

						<div class="mt-5">
							<button
								type="button"
								onclick={submitAttendance}
								disabled={isSaving || students.length === 0}
								class="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
							>
								{#if isSaving}
									<span class="flex items-center justify-center">
										<svg
											class="mr-2 h-4 w-4 animate-spin text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Saving...
									</span>
								{:else}
									Submit Attendance
								{/if}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
