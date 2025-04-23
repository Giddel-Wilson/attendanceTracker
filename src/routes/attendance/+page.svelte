<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { getAttendanceByCourseDateAndStudents } from '$lib/services/attendanceService';
	import { getStudents } from '$lib/services/studentService';

	// Import the actual courses function and Course type to use the same type
	import { getCourses, type Course as ImportedCourse } from '$lib/services/courseService';

	// Define proper types
	type Student = {
		id: number;
		name: string;
		studentId: string;
		email: string;
		courses: string[];
		status: string;
	};

	// Use the imported Course type to avoid type mismatches
	type Course = ImportedCourse;

	type AttendanceSession = {
		id: number;
		course_id: number;
		date: string;
		total_students: number;
		present_students: number;
		notes?: string;
	};

	type OverallStats = {
		totalStudents: number;
		totalCourses: number;
		totalSessions: number;
		averageAttendance: number;
	};

	// State variables
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let students = $state<Student[]>([]);
	let courses = $state<Course[]>([]);
	let activeCourses = $state<Course[]>([]);
	let attendanceSessions = $state<AttendanceSession[]>([]);
	let overallStats = $state<OverallStats | null>(null);
	let showTakeCourseModal = $state(false);

	// Load data
	onMount(async () => {
		try {
			isLoading = true;
			error = null;

			// Load real course data and students from the database
			const [courseData, studentData] = await Promise.all([getCourses(), getStudents()]);

			courses = courseData || [];
			students = studentData || [];

			// Log the courses we got from the database
			console.log('Loaded courses from database:', courses);

			// Filter active courses only
			activeCourses = courses.filter((course) => course.status !== 'completed');

			try {
				// Get attendance sessions from the database - wrapped in try/catch to handle missing table
				const { data: sessions, error: sessionError } = await supabase
					.from('attendance_sessions')
					.select('*')
					.order('date', { ascending: false });

				if (sessionError) {
					console.warn('Could not fetch attendance sessions:', sessionError);
					// Instead of throwing, just set to empty array
					attendanceSessions = [];
				} else {
					attendanceSessions = sessions || [];
				}
			} catch (sessionError) {
				console.warn('Error with attendance sessions table:', sessionError);
				attendanceSessions = [];
			}

			// Calculate overall stats from real data
			const totalStudents = students.length;
			const totalCourses = courses.length;
			const totalSessions = attendanceSessions.length;

			let totalPresent = 0;
			let totalAttendance = 0;
			attendanceSessions.forEach((session) => {
				totalPresent += session.present_students;
				totalAttendance += session.total_students;
			});

			const averageAttendance = totalAttendance > 0 ? (totalPresent / totalAttendance) * 100 : 0;

			overallStats = {
				totalStudents,
				totalCourses,
				totalSessions,
				averageAttendance
			};

			isLoading = false;
		} catch (err) {
			console.error('Failed to load attendance data:', err);
			error = err instanceof Error ? err.message : 'Failed to load data';
			isLoading = false;
		}
	});

	// Open take attendance modal
	function openTakeCourseModal() {
		// Refresh courses data before showing modal
		getCourses()
			.then((courseData) => {
				courses = courseData || [];
				// Show all courses in the modal, not just active ones
				showTakeCourseModal = true;
			})
			.catch((err) => {
				console.error('Error fetching updated course data:', err);
				error = err instanceof Error ? err.message : 'Failed to load courses';
			});
	}

	// Close take attendance modal
	function closeTakeCourseModal() {
		showTakeCourseModal = false;
	}

	// Select course for attendance - make sure this is consistent
	function selectCourseForAttendance(courseId: number) {
		goto(`/attendance/take/${courseId}`); // This should use courseId consistently
	}

	// Format date for display
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Format percentage
	function formatPercentage(value: number): string {
		return value.toFixed(1) + '%';
	}

	// Get attendance status class
	function getAttendanceStatusClass(percentage: number): string {
		if (percentage >= 90) return 'bg-green-100 text-green-800';
		if (percentage >= 80) return 'bg-blue-100 text-blue-800';
		if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	}
</script>

<svelte:head>
	<title>Attendance Dashboard - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6 flex flex-col justify-between md:flex-row md:items-center">
		<h1 class="text-3xl font-bold text-gray-800">Attendance Dashboard</h1>
		<div class="mt-4 flex space-x-3 md:mt-0">
			<button
				class="flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				onclick={openTakeCourseModal}
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				Take Attendance
			</button>
			<a
				href="/attendance/reports"
				class="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				Generate Reports
			</a>
		</div>
	</div>

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
				</div>
			</div>
		</div>
	{:else}
		<!-- Overview Stats - Simplified cards without best/worst courses -->
		<div class="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Average Attendance -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="truncate text-sm font-medium text-gray-500">Average Attendance</dt>
					<dd class="mt-1 flex items-baseline">
						<span class="text-2xl font-semibold text-gray-900">
							{formatPercentage(overallStats?.averageAttendance || 0)}
						</span>
					</dd>
				</div>
			</div>

			<!-- Total Students -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="truncate text-sm font-medium text-gray-500">Total Students</dt>
					<dd class="mt-1 text-2xl font-semibold text-gray-900">
						{overallStats?.totalStudents || 0}
					</dd>
				</div>
			</div>

			<!-- Total Courses -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="truncate text-sm font-medium text-gray-500">Total Courses</dt>
					<dd class="mt-1 text-2xl font-semibold text-gray-900">
						{overallStats?.totalCourses || 0}
					</dd>
				</div>
			</div>

			<!-- Total Sessions -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="px-4 py-5 sm:p-6">
					<dt class="truncate text-sm font-medium text-gray-500">Total Sessions</dt>
					<dd class="mt-1 text-2xl font-semibold text-gray-900">
						{overallStats?.totalSessions || 0}
					</dd>
				</div>
			</div>
		</div>

		<!-- Recent Attendance Records -->
		<div class="mb-6 overflow-hidden rounded-lg bg-white shadow">
			<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
				<div class="flex flex-wrap items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900">Recent Attendance Records</h3>
					<a
						href="/attendance/history"
						class="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 sm:mt-0"
					>
						View All Records
					</a>
				</div>
			</div>

			{#if attendanceSessions.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">No attendance records yet. Start taking attendance!</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-300">
						<thead class="bg-gray-50">
							<tr>
								<th
									scope="col"
									class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900">Date</th
								>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>Course</th
								>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>Students</th
								>
								<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
									>Attendance</th
								>
								<th scope="col" class="relative py-3.5 pr-4 pl-3">
									<span class="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each attendanceSessions.slice(0, 5) as session}
								{@const course = courses.find((c) => c.id === session.course_id)}
								{@const attendancePercentage =
									session.total_students > 0
										? (session.present_students / session.total_students) * 100
										: 0}
								<tr>
									<td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900">
										{formatDate(session.date)}
									</td>
									<td class="px-3 py-4 text-sm whitespace-nowrap">
										{#if course}
											<div class="font-medium text-gray-900">{course.code}</div>
											<div class="text-gray-500">{course.name}</div>
										{:else}
											<div class="text-gray-500">Unknown Course</div>
										{/if}
									</td>
									<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
										{session.present_students} / {session.total_students}
									</td>
									<td class="px-3 py-4 text-sm whitespace-nowrap">
										<span
											class="inline-flex rounded-full px-2 text-xs font-semibold {getAttendanceStatusClass(
												attendancePercentage
											)}"
										>
											{formatPercentage(attendancePercentage)}
										</span>
									</td>
									<td class="px-3 py-4 text-right text-sm font-medium whitespace-nowrap">
										<a
											href={`/attendance/view/${session.course_id}/${session.date}`}
											class="text-indigo-600 hover:text-indigo-900"
										>
											View Details
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Add a message when attendance_sessions table doesn't exist -->
	{#if !isLoading && error && error.includes('does not exist')}
		<div class="mb-6 rounded-lg bg-yellow-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg
						class="h-5 w-5 text-yellow-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-yellow-800">Database Setup Required</h3>
					<div class="mt-2 text-sm text-yellow-700">
						<p>The attendance tables need to be created in your database. Follow these steps:</p>
						<ol class="mt-1.5 list-decimal pl-5">
							<li>Go to your Supabase project dashboard</li>
							<li>Click on "SQL Editor"</li>
							<li>Create a new query</li>
							<li>
								Copy and paste the SQL from the <code>db/create_attendance_tables.sql</code> file
							</li>
							<li>Run the query</li>
							<li>Refresh this page</li>
						</ol>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Course Selection Modal - Show all courses but make completed ones inactive -->
{#if showTakeCourseModal}
	<div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
		<div class="flex min-h-screen items-center justify-center px-2 py-4 sm:p-0">
			<div class="relative w-full max-w-sm transform overflow-hidden rounded-lg bg-white px-3 py-4 shadow-xl transition-all sm:max-w-md sm:px-4 sm:py-5">
				<div class="mb-3 sm:mb-4 flex items-center justify-between">
					<h3 class="text-base sm:text-lg font-medium leading-6 text-gray-900">Select Course for Attendance</h3>
					<button
						type="button"
						class="rounded-full sm:rounded-md p-1.5 sm:p-1 bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						onclick={closeTakeCourseModal}
						aria-label="Close"
					>
						<span class="sr-only">Close</span>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="mt-2 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto py-2 -mx-3 px-3 sm:mx-0 sm:px-0">
					{#if courses.length === 0}
						<div class="py-8 text-center">
							<p class="text-gray-500">No courses available. Add courses first!</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each courses as course (course.id)}
								<div
									class="flex items-center justify-between rounded-lg border p-2.5 sm:p-3
									{course.status === 'completed'
										? 'cursor-not-allowed bg-gray-100 opacity-70'
										: 'cursor-pointer transition-colors hover:bg-gray-50'}"
								>
									<div class="flex-1 min-w-0 pr-1 sm:pr-2">
										<div class="flex flex-wrap items-center gap-1 sm:gap-2">
											<span
												class="text-xs sm:text-sm font-bold truncate {course.status === 'completed'
													? 'text-gray-500'
													: 'text-gray-900'}">{course.code}</span
											>
											{#if course.status === 'completed'}
												<span
													class="inline-flex items-center rounded-full bg-gray-100 px-1.5 sm:px-2 py-0.5 text-xs font-medium text-gray-800"
												>
													Completed
												</span>
											{/if}
										</div>
										<span
											class="block truncate text-xs sm:text-sm {course.status === 'completed'
												? 'text-gray-400'
												: 'text-gray-600'}">{course.name}</span
										>
									</div>

									{#if course.status !== 'completed'}
										<button
											onclick={() => selectCourseForAttendance(course.id!)}
											class="flex-shrink-0 rounded-md p-2.5 sm:p-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
											aria-label="Select course {course.code}"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
										</button>
									{:else}
										<div class="flex-shrink-0 p-2">
											<svg
												class="h-5 w-5 text-gray-300"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
												/>
											</svg>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
