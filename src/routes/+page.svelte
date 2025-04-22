<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { getCourses } from '$lib/services/courseService';
	import { getStudents } from '$lib/services/studentService';
	import StatCard from '$lib/components/StatCard.svelte';
	import AttendanceChart from '$lib/components/AttendanceChart.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import SimpleAttendanceChart from '$lib/components/SimpleAttendanceChart.svelte';

	// State variables with proper types
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let courses = $state<any[]>([]);
	let studentCount = $state(0);
	let sessionCount = $state(0);
	let avgAttendance = $state(0);
	let selectedCourseId = $state<number | null>(null);

	// New function to safely filter courses
	function getActiveCourses() {
		if (!courses || !Array.isArray(courses)) return [];
		return courses.filter((c) => c && c.id !== undefined && c.status === 'active');
	}

	// Stats for the dashboard - will be updated with real data
	let stats = $state([
		{ title: 'Total Courses', value: '0', icon: 'book', change: '' },
		{ title: 'Total Students', value: '0', icon: 'users', change: '' },
		{ title: 'Avg. Attendance', value: '0%', icon: 'chart-line', change: '' },
		{ title: 'Total Sessions', value: '0', icon: 'calendar', change: '' }
	]);

	// Load real data from backend
	onMount(async () => {
		try {
			isLoading = true;

			// Fetch courses
			const coursesData = await getCourses();
			courses = coursesData || [];

			// Fetch students
			const studentsData = await getStudents();
			studentCount = studentsData?.length || 0;

			// Fetch attendance sessions
			const { data: sessionsData, error: sessionsError } = await supabase
				.from('attendance_sessions')
				.select('*');

			if (sessionsError) {
				console.error('Error fetching sessions:', sessionsError);
				// Don't throw error here, just log it and continue with zero sessions
			}

			// Calculate attendance statistics
			let totalSessions = sessionsData?.length || 0;
			let totalPresent = 0;
			let totalStudents = 0;

			if (sessionsData && sessionsData.length > 0) {
				sessionsData.forEach((session) => {
					totalPresent += session.present_students || 0;
					totalStudents += session.total_students || 0;
				});
			}

			sessionCount = totalSessions;
			avgAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

			// Update stats with real data
			stats = [
				{
					title: 'Total Courses',
					value: courses.length.toString(),
					icon: 'book',
					change: `${courses.filter((c) => c.status === 'active').length} active`
				},
				{
					title: 'Total Students',
					value: studentCount.toString(),
					icon: 'users',
					change: ''
				},
				{
					title: 'Avg. Attendance',
					value: `${avgAttendance}%`,
					icon: 'chart-line',
					change: totalSessions > 0 ? `from ${totalSessions} sessions` : 'No sessions yet'
				},
				{
					title: 'Total Sessions',
					value: sessionCount.toString(),
					icon: 'calendar',
					change: ''
				}
			];
		} catch (err) {
			console.error('Error loading dashboard data:', err);
			error = err instanceof Error ? err.message : 'Failed to load dashboard data';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Dashboard - Class Attendance Tracker</title>
</svelte:head>

<main class="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
	<!-- Header -->
	<header class="mb-6 sm:mb-8">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
			<h1 class="mb-3 text-2xl font-bold text-gray-800 sm:mb-0 sm:text-3xl">Dashboard</h1>
			<div class="flex items-center">
				<a
					href="/attendance"
					class="btn flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-indigo-700 sm:px-4 sm:py-2"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 sm:h-5 sm:w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
						/>
					</svg>
					<span>Take Attendance</span>
				</a>
			</div>
		</div>
	</header>

	<!-- Stats Overview -->
	{#if isLoading}
		<div class="flex h-52 items-center justify-center sm:h-64">
			<div
				class="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500 sm:h-12 sm:w-12"
			></div>
		</div>
	{:else if error}
		<div
			class="relative my-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700"
			role="alert"
		>
			<p>{error}</p>
		</div>
	{:else}
		<!-- Stats Overview -->
		<div class="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
			{#each stats as stat}
				<StatCard {stat} />
			{/each}
		</div>

		<!-- Attendance Chart and Recent Activity -->
		<div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
			<div class="rounded-lg bg-white shadow lg:col-span-2">
				<div class="border-b border-gray-200 px-6 py-5">
					<h2 class="text-lg font-medium text-gray-900">Attendance Trends</h2>
					<p class="mt-1 text-sm text-gray-500">Attendance rates over the past 30 days</p>
				</div>
				<div class="px-6 py-5">
					<div class="h-80 w-full sm:h-96">
						<!-- Use SimpleAttendanceChart for now -->
						<SimpleAttendanceChart {selectedCourseId} />
					</div>

					<!-- Course selection buttons -->
					<div class="mt-6 border-t border-gray-100 pt-4">
						<h3 class="mb-3 text-sm font-medium text-gray-500">Filter by active courses:</h3>
						<div class="flex flex-wrap gap-2">
							<button
								class="rounded-full border px-3 py-1.5 text-xs font-medium
                      {selectedCourseId === null
									? 'border-indigo-200 bg-indigo-100 text-indigo-800'
									: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
								on:click={() => (selectedCourseId = null)}
							>
								Cumulative
							</button>

							{#each getActiveCourses() as course}
								<button
									class="rounded-full border px-3 py-1.5 text-xs font-medium
                        {selectedCourseId === course.id
										? 'border-indigo-200 bg-indigo-100 text-indigo-800'
										: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
									on:click={() => (selectedCourseId = course.id)}
								>
									{course.code || 'Unknown'}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="rounded-lg bg-white shadow">
				<div class="flex items-center justify-between border-b border-gray-200 px-6 py-5">
					<div>
						<h2 class="text-lg font-medium text-gray-900">Recent Activity</h2>
						<p class="mt-1 text-sm text-gray-500">Latest actions and events</p>
					</div>
					<a href="/activity" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">
						View all
					</a>
				</div>
				<div class="px-6 py-2">
					<div class="-mx-6 h-80 overflow-y-auto px-6 sm:h-96">
						<RecentActivity />
					</div>
				</div>
			</div>
		</div>
	{/if}
</main>
