<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import { getCourseById, updateCourse, type Course } from '$lib/services/courseService';
	import { getStudents } from '$lib/services/studentService';

	const courseId = $page.params.id;

	// Define interfaces for student data
	interface Student {
		id: number;
		name: string;
		studentId: string;
		email: string;
		courses: string[];
	}

	// State variables with proper typing
	let isLoading = $state(true);
	let course = $state<Course | null>(null);
	let attendanceSessions = $state<any[]>([]);
	let students = $state<Student[]>([]);
	let isEditMode = $state(false);
	let showAddAttendanceForm = $state(false);
	let errorMessage = $state<string | null>(null);

	// Form data
	let sessionDate = $state(new Date().toISOString().split('T')[0]);
	let attendanceRecords = $state<any[]>([]);

	// Load course data on mount
	onMount(() => {
		loadCourseData();
	});

	// Students card section where the error is occurring
	function safeStudentSlice() {
		if (!students || !Array.isArray(students)) {
			return [];
		}
		return students.slice(0, 5);
	}

	// Load course data
	async function loadCourseData() {
		try {
			isLoading = true;
			errorMessage = null;

			// Fetch course details
			course = await getCourseById(Number(courseId));

			if (!course) {
				errorMessage = 'Course not found';
				isLoading = false;
				return;
			}

			// Fetch all students
			const allStudents = await getStudents();

			// Filter to find students enrolled in this course using the courses array
			if (course.code && allStudents && Array.isArray(allStudents)) {
				students = allStudents.filter(
					(student) =>
						student &&
						student.courses &&
						Array.isArray(student.courses) &&
						student.courses.includes(course!.code)
				);
				console.log(`Found ${students.length} students enrolled in this course`);
			} else {
				students = [];
			}

			try {
				// Check if attendance_sessions table exists before trying to query it
				const { count, error: tableCheckError } = await supabase
					.from('attendance_sessions')
					.select('*', { count: 'exact', head: true });

				// Only fetch attendance sessions if the table exists
				if (tableCheckError) {
					console.warn('Attendance sessions table may not exist:', tableCheckError);
					attendanceSessions = [];
				} else {
					// Fetch attendance sessions for this course
					const { data: sessions, error: sessionsError } = await supabase
						.from('attendance_sessions')
						.select('*')
						.eq('course_id', courseId)
						.order('date', { ascending: false });

					if (sessionsError) {
						console.warn('Error fetching attendance sessions:', sessionsError);
						attendanceSessions = [];
					} else {
						attendanceSessions = sessions || [];
					}
				}
			} catch (err) {
				console.warn('Error checking attendance tables:', err);
				attendanceSessions = [];
			}

			isLoading = false;
		} catch (error) {
			console.error('Error loading course data:', error);
			errorMessage = `Failed to load course data: ${error instanceof Error ? error.message : 'Unknown error'}`;
			isLoading = false;
		}
	}

	// Toggle edit mode
	function toggleEditMode() {
		isEditMode = !isEditMode;
	}

	// Update course details
	async function saveCourseChanges() {
		try {
			isLoading = true;
			if (course) {
				course = await updateCourse(courseId, course);
			}
			isEditMode = false;
		} catch (error) {
			console.error('Error updating course:', error);
			alert('Failed to update course details.');
		} finally {
			isLoading = false;
		}
	}

	// Show attendance form
	function showAttendanceForm() {
		if (!students || students.length === 0) {
			alert('No students enrolled in this course.');
			return;
		}

		attendanceRecords = students.map((student) => ({
			studentId: student.id,
			name: student.name,
			studentIdNum: student.studentId,
			status: 'present',
			notes: ''
		}));

		showAddAttendanceForm = true;
	}

	// Save attendance session
	async function saveAttendanceSession() {
		try {
			isLoading = true;

			// Check if tables exist
			try {
				// Create attendance session in database
				const { data: session, error: sessionError } = await supabase
					.from('attendance_sessions')
					.insert([
						{
							course_id: courseId,
							date: sessionDate,
							total_students: attendanceRecords.length,
							present_students: attendanceRecords.filter((r) => r.status === 'present').length
						}
					])
					.select();

				if (sessionError) {
					// If table doesn't exist, show friendly message
					if (sessionError.code === '42P01') {
						throw new Error(
							'Database tables for attendance are not set up yet. Please set up the attendance_sessions and attendance_records tables.'
						);
					}
					throw sessionError;
				}

				// Insert the individual attendance records for each student
				const sessionId = session[0].id;

				const recordsToInsert = attendanceRecords.map((record) => ({
					session_id: sessionId,
					student_id: record.studentId,
					status: record.status,
					notes: record.notes
				}));

				const { error: recordsError } = await supabase
					.from('attendance_records')
					.insert(recordsToInsert);

				if (recordsError) throw recordsError;

				// Reload data
				await loadCourseData();

				// Close form
				showAddAttendanceForm = false;
				alert('Attendance recorded successfully!');
			} catch (err) {
				// Handle case where tables don't exist
				if (err.message && err.message.includes('not set up yet')) {
					alert(err.message);
				} else {
					throw err;
				}
			}
		} catch (error) {
			console.error('Error recording attendance:', error);
			alert('Failed to record attendance: ' + (error.message || 'Unknown error'));
		} finally {
			isLoading = false;
		}
	}

	// Format date with proper type annotation
	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Safely access attendance data - Prevent "Cannot read properties of undefined"
	function safeGetAttendanceRate(session: any): string {
		if (
			!session ||
			typeof session.present_students === 'undefined' ||
			typeof session.total_students === 'undefined'
		) {
			return '0%';
		}

		if (session.total_students === 0) return '0%';

		const rate = (session.present_students / session.total_students) * 100;
		return rate.toFixed(1) + '%';
	}

	// Get attendance status class safely
	function getAttendanceStatusClass(session: any): string {
		if (
			!session ||
			typeof session.present_students === 'undefined' ||
			typeof session.total_students === 'undefined'
		) {
			return 'bg-gray-100 text-gray-800';
		}

		if (session.total_students === 0) return 'bg-gray-100 text-gray-800';

		const rate = (session.present_students / session.total_students) * 100;

		if (rate >= 90) return 'bg-green-100 text-green-800';
		if (rate >= 80) return 'bg-blue-100 text-blue-800';
		if (rate >= 70) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	}
</script>

<svelte:head>
	<title>{course?.name || 'Course Details'} - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div
				class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"
			></div>
		</div>
	{:else if !course}
		<div class="rounded-lg bg-red-50 p-4 text-red-700">
			<p>Course not found or an error occurred.</p>
			{#if errorMessage}
				<p class="mt-2 text-sm">Error details: {errorMessage}</p>
			{/if}
			<a href="/courses" class="mt-2 inline-block rounded bg-indigo-600 px-4 py-2 text-white"
				>Return to Courses</a
			>
		</div>
	{:else}
		<!-- Course header -->
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<div>
				<div class="flex items-center">
					<a href="/courses" class="mr-2 text-indigo-600 hover:text-indigo-900">
						<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</a>
					<h1 class="text-3xl font-bold text-gray-800">
						{#if isEditMode}
							<input
								type="text"
								bind:value={course.name}
								class="w-full rounded border-gray-300 text-3xl"
							/>
						{:else}
							{course.name}
						{/if}
					</h1>
				</div>
				<div class="mt-1 flex items-center">
					<span
						class="mr-2 inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-0.5 text-sm font-medium text-indigo-800"
					>
						{#if isEditMode}
							<input
								type="text"
								bind:value={course.code}
								class="w-24 rounded border-gray-300 text-sm"
							/>
						{:else}
							{course.code}
						{/if}
					</span>
					<span
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
						{course.status === 'active'
							? 'bg-green-100 text-green-800'
							: course.status === 'upcoming'
								? 'bg-blue-100 text-blue-800'
								: 'bg-gray-100 text-gray-800'}"
					>
						{#if isEditMode}
							<select bind:value={course.status} class="rounded border-gray-300 text-xs">
								<option value="active">Active</option>
								<option value="upcoming">Upcoming</option>
								<option value="completed">Completed</option>
							</select>
						{:else}
							{course.status.charAt(0).toUpperCase() + course.status.slice(1)}
						{/if}
					</span>
				</div>
			</div>
			<div class="flex space-x-3">
				{#if isEditMode}
					<button
						class="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
						aria-label="Save course changes"
						onclick={saveCourseChanges}
					>
						<svg
							class="mr-2 h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Save Changes
					</button>
					<button
						class="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
						aria-label="Cancel editing"
						onclick={toggleEditMode}
					>
						Cancel
					</button>
				{:else}
					<button
						class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
						aria-label="Edit course details"
						onclick={toggleEditMode}
					>
						<svg
							class="mr-2 h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						Edit Course
					</button>
				{/if}
				<a
					href="/attendance/take/{course.id}"
					class="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				>
					Take Attendance
				</a>
			</div>
		</div>

		<!-- Course info cards -->
		<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
			<!-- Students -->
			<div class="rounded-lg bg-white p-5 shadow">
				<div class="flex items-center">
					<div
						class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-500"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-sm font-medium text-gray-500">Students</h2>
						<p class="text-2xl font-semibold">{students.length}</p>
					</div>
				</div>
			</div>

			<!-- Attendance Rate -->
			<div class="rounded-lg bg-white p-5 shadow">
				<div class="flex items-center">
					<div
						class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-500"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-sm font-medium text-gray-500">Attendance Rate</h2>
						<p class="text-2xl font-semibold">{course.attendance}%</p>
					</div>
				</div>
			</div>

			<!-- Sessions -->
			<div class="rounded-lg bg-white p-5 shadow">
				<div class="flex items-center">
					<div
						class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-500"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-sm font-medium text-gray-500">Sessions</h2>
						<p class="text-2xl font-semibold">{attendanceSessions.length}</p>
					</div>
				</div>
			</div>

			<!-- Credits -->
			<div class="rounded-lg bg-white p-5 shadow">
				<div class="flex items-center">
					<div
						class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-500"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-sm font-medium text-gray-500">Credits</h2>
						<p class="text-2xl font-semibold">
							{#if isEditMode}
								<input
									type="number"
									bind:value={course.credits}
									class="w-16 rounded border-gray-300"
									min="1"
								/>
							{:else}
								{course.credits}
							{/if}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Course details -->
		<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left column -->
			<div class="lg:col-span-2">
				<!-- Course description -->
				<div class="mb-6 rounded-lg bg-white p-5 shadow">
					<h2 class="mb-4 text-lg font-medium text-gray-900">About this course</h2>
					{#if isEditMode}
						<textarea
							bind:value={course.description}
							class="w-full rounded border-gray-300"
							rows="4"
							placeholder="Enter course description..."
						></textarea>
					{:else}
						<p class="text-gray-700">{course.description || 'No description provided.'}</p>
					{/if}
				</div>

				<!-- Attendance sessions -->
				<div class="rounded-lg bg-white p-5 shadow">
					<h2 class="mb-4 text-lg font-medium text-gray-900">Attendance History</h2>

					{#if attendanceSessions.length === 0}
						<p class="py-4 text-center text-gray-500">No attendance records yet.</p>
					{:else}
						<div class="overflow-hidden rounded-lg border border-gray-200">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th
											class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
											>Date</th
										>
										<th
											class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
											>Attendance</th
										>
										<th
											class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
											>Present</th
										>
										<th
											class="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
											>Actions</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200 bg-white">
									{#each attendanceSessions as session}
										<tr>
											<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900"
												>{formatDate(session.date)}</td
											>
											<td class="px-4 py-3 text-sm">
												<div class="flex items-center">
													<div
														class="mr-2 h-2 w-full max-w-[100px] overflow-hidden rounded-full bg-gray-200"
													>
														<div
															class="h-full rounded-full bg-green-500"
															style="width: {session.attendanceRate}%"
														></div>
													</div>
													<span>{session.attendanceRate}%</span>
												</div>
											</td>
											<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
												{session.records.filter((r: any) => r.status === 'present').length} / {session
													.records.length}
											</td>
											<td class="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
												<a
													href="/courses/{courseId}/attendance/{session.date}"
													class="text-indigo-600 hover:text-indigo-900">View</a
												>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>

			<!-- Right column -->
			<div>
				<!-- Course details -->
				<div class="mb-6 rounded-lg bg-white p-5 shadow">
					<h2 class="mb-4 text-lg font-medium text-gray-900">Course Details</h2>
					<div class="space-y-3">
						<!-- Instructor -->
						<div>
							<h3 class="text-sm font-medium text-gray-500">Instructor</h3>
							{#if isEditMode}
								<input
									type="text"
									bind:value={course.instructor}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								/>
							{:else}
								<p class="text-gray-900">{course.instructor || 'Not assigned'}</p>
							{/if}
						</div>

						<!-- Schedule -->
						<div>
							<h3 class="text-sm font-medium text-gray-500">Schedule</h3>
							{#if isEditMode}
								<input
									type="text"
									bind:value={course.schedule}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									placeholder="e.g., Mon/Wed 10:00-11:30 AM"
								/>
							{:else}
								<p class="text-gray-900">{course.schedule || 'Not scheduled'}</p>
							{/if}
						</div>

						<!-- Location -->
						<div>
							<h3 class="text-sm font-medium text-gray-500">Location</h3>
							{#if isEditMode}
								<input
									type="text"
									bind:value={course.location}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									placeholder="e.g., Room 201, Building A"
								/>
							{:else}
								<p class="text-gray-900">{course.location || 'No location set'}</p>
							{/if}
						</div>

						<!-- Semester -->
						<div>
							<h3 class="text-sm font-medium text-gray-500">Semester</h3>
							{#if isEditMode}
								<select
									bind:value={course.semester}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								>
									<option value="First Semester">First Semester</option>
									<option value="Second Semester">Second Semester</option>
								</select>
							{:else}
								<p class="text-gray-900">{course.semester}</p>
							{/if}
						</div>

						<!-- Next Session -->
						<div>
							<h3 class="text-sm font-medium text-gray-500">Next Session</h3>
							{#if isEditMode}
								<input
									type="date"
									bind:value={course.nextSession}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									disabled={course.status === 'completed'}
								/>
							{:else}
								<p class="text-gray-900">
									{course.nextSession ? formatDate(course.nextSession) : 'Not scheduled'}
								</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Students list -->
				<div class="rounded-lg bg-white p-5 shadow">
					<h2 class="mb-4 text-lg font-medium text-gray-900">Enrolled Students</h2>

					{#if students.length === 0}
						<p class="py-4 text-center text-gray-500">No students enrolled yet.</p>
					{:else}
						<ul class="divide-y divide-gray-200">
							{#each safeStudentSlice() as student}
								<li class="py-3">
									<div class="flex items-center justify-between">
										<div>
											<p class="font-medium text-gray-900">{student?.name || 'Unknown'}</p>
											<p class="text-sm text-gray-500">{student?.studentId || 'N/A'}</p>
										</div>
										<a href="/students/{student.id}" class="text-indigo-600 hover:text-indigo-900"
											>View</a
										>
									</div>
								</li>
							{/each}
						</ul>

						{#if students.length > 5}
							<div class="mt-4 text-center">
								<a href="/courses/{courseId}/students" class="text-indigo-600 hover:text-indigo-900"
									>View all students</a
								>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>

		<!-- Attendance card -->
		<div class="col-span-1">
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
					<h3 class="text-lg leading-6 font-medium text-gray-900">Recent Attendance</h3>
				</div>
				<div class="px-4 py-5 sm:p-6">
					{#if attendanceSessions && attendanceSessions.length > 0}
						<ul class="divide-y divide-gray-200">
							{#each attendanceSessions.slice(0, 3) as session}
								<li class="py-3">
									<div class="flex justify-between">
										<div>
											<p class="text-sm font-medium text-gray-900">
												{formatDate(session.date)}
											</p>
										</div>
										<div>
											<span
												class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold {getAttendanceStatusClass(
													session
												)}"
											>
												{session.present_students ?? 0} / {session.total_students ?? 0}
											</span>
										</div>
									</div>
								</li>
							{/each}
						</ul>
						{#if attendanceSessions.length > 3}
							<div class="mt-4 text-center">
								<a
									href="/attendance/history?course={course?.code ?? ''}"
									class="text-sm text-indigo-600 hover:text-indigo-500"
								>
									View all attendance records
								</a>
							</div>
						{/if}
					{:else}
						<div class="py-4 text-center">
							<p class="text-sm text-gray-500">No attendance records yet</p>
							{#if course && course.status !== 'completed'}
								<a
									href="/attendance/take/{course.id}"
									class="mt-2 inline-flex items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
								>
									Take attendance
								</a>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Take Attendance Modal -->
	{#if showAddAttendanceForm}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
				<div class="mb-5 flex items-center justify-between">
					<h3 class="text-xl font-medium text-gray-900">Take Attendance</h3>
					<button
						onclick={() => (showAddAttendanceForm = false)}
						class="text-gray-400 hover:text-gray-600"
						aria-label="Close attendance form"
					>
						<svg
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="mb-4">
					<label for="sessionDate" class="block text-sm font-medium text-gray-700">Date</label>
					<input
						type="date"
						id="sessionDate"
						bind:value={sessionDate}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					/>
				</div>

				<div class="mb-4 overflow-hidden rounded-lg border border-gray-200">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Name</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Mat No.</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Status</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Notes</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each attendanceRecords as record, i}
								<tr>
									<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900">{record.name}</td>
									<td class="px-4 py-3 text-sm whitespace-nowrap text-gray-500"
										>{record.studentIdNum}</td
									>
									<td class="px-4 py-3 text-sm">
										<select
											bind:value={attendanceRecords[i].status}
											class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
										>
											<option value="present">Present</option>
											<option value="absent">Absent</option>
											<option value="excused">Excused</option>
										</select>
									</td>
									<td class="px-4 py-3 text-sm">
										<input
											type="text"
											bind:value={attendanceRecords[i].notes}
											class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
											placeholder="Optional notes"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="flex justify-end space-x-3">
					<button
						type="button"
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-700"
						onclick={() => (showAddAttendanceForm = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-md bg-indigo-600 px-4 py-2 text-white"
						onclick={saveAttendanceSession}
					>
						Save Attendance
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
