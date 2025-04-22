<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { logActivity } from '$lib/services/activityLogService';

	// Define proper types for our data
	type Course = string | null;

	interface Activity {
		id: number;
		type: string;
		course: Course;
		action: string;
		details: string;
		user: string;
		time: string;
		date: string;
	}

	// State with proper type definitions
	let isLoading = $state(true);
	let activities = $state<Activity[]>([]);
	let filteredActivities = $state<Activity[]>([]);
	let filter = $state({
		type: 'all',
		course: 'all',
		date: 'all',
		search: ''
	});

	// Remove all mock activities - we'll load real data from the database

	// Filter activities by type with proper type annotation
	function filterByType(type: string): void {
		filter = { ...filter, type };
		applyFilters();
	}

	// Apply all filters
	function applyFilters(): void {
		let filtered = [...activities];

		// Filter by type
		if (filter.type !== 'all') {
			filtered = filtered.filter((activity) => activity.type === filter.type);
		}

		// Filter by course
		if (filter.course !== 'all') {
			filtered = filtered.filter((activity) => activity.course === filter.course);
		}

		filteredActivities = filtered;
	}

	// Get activity icon class by type with proper type annotation
	function getActivityIcon(type: string): string {
		switch (type) {
			case 'attendance':
				return 'bg-blue-100 text-blue-600';
			case 'course':
				return 'bg-purple-100 text-purple-600';
			case 'student':
				return 'bg-green-100 text-green-600';
			case 'report':
				return 'bg-amber-100 text-amber-600';
			case 'system':
				return 'bg-gray-100 text-gray-600';
			default:
				return 'bg-gray-100 text-gray-600';
		}
	}

	// Format date with proper type annotation
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Format time since date for "X days ago" display
	function formatTimeSince(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return new Date(date).toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		} else if (diffDays === 1) {
			return '1 day ago';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else if (diffDays < 14) {
			return '1 week ago';
		} else {
			return `${Math.floor(diffDays / 7)} weeks ago`;
		}
	}

	// Get unique courses from activities
	function getUniqueCourses(): string[] {
		const courses = activities
			.map((a) => a.course)
			.filter((course): course is string => course !== null);

		return ['all', ...new Set(courses)];
	}

	// Load real activities from the database with improved debugging and error handling
	async function loadRealActivities() {
		isLoading = true;
		try {
			console.log('Fetching activity logs from database...');

			// First check if the table exists
			try {
				const { error: tableCheckError } = await supabase
					.from('activity_logs')
					.select('id', { count: 'exact', head: true })
					.limit(1);

				if (tableCheckError) {
					console.error('Activity log table may not exist:', tableCheckError);
					throw new Error('Activity log table not found. Please set up the database tables.');
				}
			} catch (tableErr) {
				console.error('Table check failed:', tableErr);
				throw tableErr;
			}

			// If we get here, the table exists, so fetch data
			const { data, error } = await supabase
				.from('activity_logs')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(50);

			if (error) {
				console.error('Database error:', error);
				throw new Error(error.message);
			}

			console.log('Activity logs retrieved:', data);

			// Transform database records into the Activity format
			if (data && data.length > 0) {
				activities = data.map((record) => {
					// Log each record for debugging
					console.log('Processing record:', record);

					return {
						id: record.id,
						type: record.entity_type || 'system',
						course: record.entity_id as string,
						action: record.action_type || 'Action',
						details: record.description || 'No details available',
						user: record.user_email || 'System',
						time: formatTimeSince(record.created_at),
						date: record.created_at
					};
				});

				console.log('Transformed activities:', activities);
				filteredActivities = [...activities];
			} else {
				console.log('No activity logs found in the database');
				activities = [];
				filteredActivities = [];
			}
		} catch (error) {
			console.error('Error loading activities:', error);
			error = error instanceof Error ? error.message : 'Unknown error loading activities';
			activities = [];
			filteredActivities = [];
		} finally {
			isLoading = false;
		}
	}

	// Initialize with real data
	onMount(async () => {
		await loadRealActivities();

		// Set up a refresh interval to keep the activity log updated
		const refreshInterval = setInterval(() => {
			loadRealActivities();
		}, 30000); // Refresh every 30 seconds

		// Clean up on component unmount
		return () => clearInterval(refreshInterval);
	});

	// Manual refresh function
	async function refreshActivities() {
		await loadRealActivities();
	}

	// Update filtered activities when filter changes
	$effect(() => {
		applyFilters();
	});

	// Find the handleSubmit function and add activity logging
	async function handleSubmit() {
		// ...existing code...

		try {
			// ...existing code...

			// After successful student creation
			await logActivity({
				action_type: 'student_created',
				entity_type: 'student',
				entity_id: newStudent.studentId,
				description: `Added new student: ${newStudent.name} (${newStudent.studentId})`,
				user_email: 'current_user@example.com' // Replace with actual user email when available
			});

			// ...existing code...
		} catch (error) {
			// ...existing code...
		}
	}
</script>

<svelte:head>
	<title>Activity Log - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-800">Activity Log</h1>
		<p class="text-gray-600">Track all actions and events in the system</p>
	</div>

	<!-- Filters -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
			<div class="flex-grow">
				<label for="filter" class="block text-sm font-medium text-gray-700">Filter by type</label>
				<select
					id="filter"
					bind:value={filter.type}
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					<option value="all">All Activities</option>
					<option value="attendance">Attendance</option>
					<option value="student">Student</option>
					<option value="course">Course</option>
					<option value="report">Report</option>
				</select>
			</div>

			<div class="mt-4 flex justify-end gap-2 sm:mt-0">
				<button
					on:click={refreshActivities}
					class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
				>
					<svg
						class="mr-2 h-5 w-5 text-white"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Refresh
				</button>

				<button
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
				>
					<svg
						class="mr-2 h-5 w-5 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
						/>
					</svg>
					Filter
				</button>

				<button
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
				>
					<svg
						class="mr-2 h-5 w-5 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
					Export
				</button>
			</div>
		</div>
	</div>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div
				class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"
			></div>
		</div>
	{:else if filteredActivities.length === 0}
		<div class="rounded-lg bg-gray-50 py-8 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No activities found</h3>
			<p class="mt-1 text-sm text-gray-500">
				You might need to create some activities first or check your database setup.
			</p>
			<div class="mt-4 flex justify-center gap-4">
				<a
					href="/attendance/take"
					class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
				>
					Take Attendance
				</a>
				<a
					href="/courses/new"
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
				>
					Create Course
				</a>
			</div>
			<div class="mt-6 text-sm text-gray-500">
				<p>
					If you've already performed actions and don't see them here, verify that your database is
					set up correctly.
				</p>
			</div>
		</div>
	{:else}
		<div class="rounded-lg bg-white shadow">
			<ul class="divide-y divide-gray-200">
				{#each filteredActivities as activity (activity.id)}
					<li class="p-4 hover:bg-gray-50">
						<div class="flex space-x-4">
							<div
								class="{getActivityIcon(
									activity.type
								)} flex h-10 w-10 items-center justify-center rounded-md"
							>
								<span class="{getActivityIcon(activity.type)} h-6 w-6"></span>
							</div>
							<div class="flex-1 space-y-1">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-medium text-gray-900">{activity.action}</h3>
									<p class="text-sm text-gray-500">{activity.time}</p>
								</div>
								<p class="text-sm text-gray-600">{activity.details}</p>
								<div class="flex items-center">
									{#if activity.course}
										<span
											class="mr-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
											>{activity.course}</span
										>
									{/if}
									<span class="text-xs text-gray-500">by {activity.user}</span>
								</div>
								<p class="text-xs text-gray-400">{formatDate(activity.date)}</p>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
