<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	// Import the Course type from courseService to ensure type compatibility
	import { getCourses, type Course as ImportedCourse } from '$lib/services/courseService';

	// Define proper types
	// Use the imported Course type to avoid type mismatches
	type Course = ImportedCourse;

	type AttendanceRecord = {
		id: number;
		date: string;
		course: Course;
		presentStudents: number;
		totalStudents: number;
		attendanceRate: number;
		recordedBy: string;
	};

	type AttendanceSession = {
		id: number;
		course_id: number;
		date: string;
		total_students: number;
		present_students: number;
		notes?: string;
		recorded_by?: string;
	};

	// State with proper type definitions
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let records = $state<AttendanceRecord[]>([]);
	let filteredRecords = $state<AttendanceRecord[]>([]);
	let searchQuery = $state('');
	let selectedCourse = $state('all');
	let selectedDateRange = $state('all');
	let startDate = $state('');
	let endDate = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	const recordsPerPage = 10;
	let courses = $state<Course[]>([]);
	let attendanceSessions = $state<AttendanceSession[]>([]); // Added missing variable

	// Format date with proper type annotation
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get status class based on attendance rate with proper type annotation
	function getAttendanceStatusClass(percentage: number): string {
		if (percentage >= 90) return 'bg-green-100 text-green-800';
		if (percentage >= 80) return 'bg-blue-100 text-blue-800';
		if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
		return 'bg-red-100 text-red-800';
	}

	// Apply filters
	function applyFilters(): void {
		// Filter by course
		let filtered = [...records];

		if (selectedCourse !== 'all') {
			filtered = filtered.filter((record) => record.course.code === selectedCourse);
		}

		// Filter by date range
		if (selectedDateRange === 'custom' && startDate && endDate) {
			const start = new Date(startDate).getTime();
			const end = new Date(endDate).getTime();
			filtered = filtered.filter((record) => {
				const recordDate = new Date(record.date).getTime();
				return recordDate >= start && recordDate <= end;
			});
		} else if (selectedDateRange === 'week') {
			const oneWeekAgo = new Date();
			oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
			filtered = filtered.filter((record) => new Date(record.date) >= oneWeekAgo);
		} else if (selectedDateRange === 'month') {
			const oneMonthAgo = new Date();
			oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
			filtered = filtered.filter((record) => new Date(record.date) >= oneMonthAgo);
		}

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(record) =>
					record.course.name.toLowerCase().includes(query) ||
					record.course.code.toLowerCase().includes(query)
			);
		}

		filteredRecords = filtered;
		currentPage = 1;
		updateTotalPages();
	}

	// Reset filters
	function resetFilters(): void {
		searchQuery = '';
		selectedCourse = 'all';
		selectedDateRange = 'all';
		startDate = '';
		endDate = '';
		filteredRecords = records;
		currentPage = 1;
		updateTotalPages();
	}

	// Pagination controls
	function goToPage(page: number): void {
		currentPage = page;
	}

	function nextPage(): void {
		if (currentPage < totalPages) {
			currentPage += 1;
		}
	}

	function prevPage(): void {
		if (currentPage > 1) {
			currentPage -= 1;
		}
	}

	// Calculate total pages
	function updateTotalPages(): void {
		totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
		if (totalPages < 1) totalPages = 1;
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
	}

	// Current page records - don't return values from $effect
	$effect(() => {
		updateCurrentPageStudents();
	});

	let currentPageRecords = $state<AttendanceRecord[]>([]);

	function updateCurrentPageStudents(): void {
		const start = (currentPage - 1) * recordsPerPage;
		const end = start + recordsPerPage;
		currentPageRecords = filteredRecords.slice(start, end);
	}

	// Load actual attendance data (without simulation)
	onMount(async () => {
		try {
			isLoading = true;

			// Get courses
			const coursesData = await getCourses();
			courses = coursesData;

			try {
				// Get real attendance sessions from the database - no simulation data
				const { data: sessions, error: sessionError } = await supabase
					.from('attendance_sessions')
					.select('*')
					.order('date', { ascending: false });

				if (sessionError) {
					console.warn('Could not fetch attendance sessions:', sessionError);
					attendanceSessions = [];
				} else {
					attendanceSessions = sessions || [];
				}

				// Transform sessions to records
				let actualRecords: AttendanceRecord[] = attendanceSessions.map(
					(session: AttendanceSession) => {
						const course = courses.find((c) => c.id === session.course_id) || {
							id: 0,
							code: 'Unknown',
							name: 'Unknown Course',
							status: 'active'
						};

						const attendanceRate =
							session.total_students > 0
								? (session.present_students / session.total_students) * 100
								: 0;

						return {
							id: session.id,
							date: session.date,
							course,
							presentStudents: session.present_students,
							totalStudents: session.total_students,
							attendanceRate,
							recordedBy: session.recorded_by || 'System'
						};
					}
				);

				// Use only actual records, no simulation
				records = actualRecords.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
				);

				filteredRecords = [...records];

				updateTotalPages();
				updateCurrentPageStudents();
			} catch (err) {
				console.error('Error with attendance sessions table:', err);
				attendanceSessions = [];
				records = [];
				filteredRecords = [];
			}

			isLoading = false;
		} catch (err) {
			console.error('Error loading attendance history:', err);
			error = err instanceof Error ? err.message : 'Failed to load attendance history';
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>Attendance History - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-800">Attendance History</h1>
		<p class="text-gray-600">View and filter historical attendance records</p>
	</div>

	<!-- Filters -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div>
				<label for="search" class="mb-1 block text-sm font-medium text-gray-700">Search</label>
				<div class="relative rounded-md shadow-sm">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<input
						type="text"
						name="search"
						id="search"
						bind:value={searchQuery}
						oninput={() => applyFilters()}
						class="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						placeholder="Search by course name or code"
					/>
				</div>
			</div>

			<div>
				<label for="course" class="mb-1 block text-sm font-medium text-gray-700">Course</label>
				<select
					id="course"
					bind:value={selectedCourse}
					onchange={() => applyFilters()}
					class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					<option value="all">All Courses</option>
					{#each courses as course}
						<option value={course.code}>{course.code} - {course.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="dateRange" class="mb-1 block text-sm font-medium text-gray-700"
					>Date Range</label
				>
				<select
					id="dateRange"
					bind:value={selectedDateRange}
					onchange={() => applyFilters()}
					class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					<option value="all">All Dates</option>
					<option value="week">Past Week</option>
					<option value="month">Past Month</option>
					<option value="custom">Custom Range</option>
				</select>
			</div>

			<div class="lg:col-span-1">
				<button
					type="button"
					class="mt-5 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					onclick={resetFilters}
				>
					Reset Filters
				</button>
			</div>
		</div>

		{#if selectedDateRange === 'custom'}
			<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label for="startDate" class="mb-1 block text-sm font-medium text-gray-700"
						>Start Date</label
					>
					<input
						type="date"
						id="startDate"
						bind:value={startDate}
						onchange={() => applyFilters()}
						class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					/>
				</div>
				<div>
					<label for="endDate" class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
					<input
						type="date"
						id="endDate"
						bind:value={endDate}
						onchange={() => applyFilters()}
						class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					/>
				</div>
			</div>
		{/if}
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
	{:else if filteredRecords.length === 0}
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
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No attendance records found</h3>
			<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-300">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900"
								>Date & Time</th
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
							<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>Recorded By</th
							>
							<th scope="col" class="relative py-3.5 pr-4 pl-3">
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each currentPageRecords as record}
							<tr>
								<td class="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900">
									{formatDate(record.date)}
								</td>
								<td class="px-3 py-4 text-sm whitespace-nowrap">
									<div class="font-medium text-gray-900">{record.course.code}</div>
									<div class="text-gray-500">{record.course.name}</div>
								</td>
								<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
									{record.presentStudents} / {record.totalStudents}
								</td>
								<td class="px-3 py-4 text-sm whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs font-semibold {getAttendanceStatusClass(
											record.attendanceRate
										)}"
									>
										{record.attendanceRate.toFixed(1)}%
									</span>
								</td>
								<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
									{record.recordedBy}
								</td>
								<td class="px-3 py-4 text-right text-sm font-medium whitespace-nowrap">
									<a
										href={`/attendance/view/${record.course.id}/${record.date.split('T')[0]}`}
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

			<!-- Pagination -->
			{#if totalPages > 1}
				<nav
					class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
					aria-label="Pagination"
				>
					<div class="hidden sm:block">
						<p class="text-sm text-gray-700">
							Showing <span class="font-medium">{(currentPage - 1) * recordsPerPage + 1}</span> to
							<span class="font-medium"
								>{Math.min(currentPage * recordsPerPage, filteredRecords.length)}</span
							>
							of <span class="font-medium">{filteredRecords.length}</span> results
						</p>
					</div>
					<div class="flex flex-1 justify-between sm:justify-end">
						<button
							class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 {currentPage ===
							1
								? 'cursor-not-allowed opacity-50'
								: ''}"
							onclick={prevPage}
							disabled={currentPage === 1}
						>
							Previous
						</button>
						<div class="mx-2 hidden items-center md:flex">
							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								// Show 5 pages, centered around current page
								const totalPagesToShow = 5;
								const halfPagesToShow = Math.floor(totalPagesToShow / 2);

								let startPage = Math.max(1, currentPage - halfPagesToShow);
								let endPage = Math.min(totalPages, startPage + totalPagesToShow - 1);

								if (endPage - startPage + 1 < totalPagesToShow) {
									startPage = Math.max(1, endPage - totalPagesToShow + 1);
								}

								return startPage + i;
							}) as page}
								{#if page <= totalPages}
									<button
										class="mx-1 rounded-md px-3 py-1 {currentPage === page
											? 'bg-indigo-600 text-white'
											: 'text-gray-700 hover:bg-gray-50'}"
										onclick={() => goToPage(page)}
									>
										{page}
									</button>
								{/if}
							{/each}
						</div>
						<button
							class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 {currentPage ===
							totalPages
								? 'cursor-not-allowed opacity-50'
								: ''}"
							onclick={nextPage}
							disabled={currentPage === totalPages}
						>
							Next
						</button>
					</div>
				</nav>
			{/if}
		</div>
	{/if}
</div>
