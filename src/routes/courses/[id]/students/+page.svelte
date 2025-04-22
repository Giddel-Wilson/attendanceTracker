<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase';
	import { getCourseById } from '$lib/services/courseService';
	import { getStudents } from '$lib/services/studentService';

	const courseId = $page.params.id;

	// Define interfaces for data
	type Student = {
		id: number;
		name: string;
		studentId: string;
		email: string;
		courses: string[];
		status: string;
	};

	type Course = {
		id: number;
		name: string;
		code: string;
		description?: string;
		instructor?: string;
		schedule?: string;
	};

	// State variables
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let course = $state<Course | null>(null);
	let students = $state<Student[]>([]);
	let filteredStudents = $state<Student[]>([]);
	let searchQuery = $state('');
	let selectedSet = $state('all');
	let currentPage = $state(1);
	let totalPages = $state(1);
	const studentsPerPage = 10;
	let currentPageStudents = $state<Student[]>([]);

	// Load data
	onMount(async () => {
		try {
			isLoading = true;
			error = null;

			// Load course data
			const courseData = await getCourseById(courseId);
			if (!courseData) {
				error = 'Course not found';
				return;
			}
			course = courseData;

			// Load all students
			const allStudents = await getStudents();

			// Filter students to those enrolled in this course
			if (course.code) {
				students = allStudents.filter(
					(student) => student.courses && student.courses.includes(course!.code)
				);
			} else {
				students = [];
				error = 'Course code not found';
			}

			// Initialize filtered students
			filteredStudents = [...students];
			updateTotalPages();
			updateCurrentPageStudents();
		} catch (e) {
			console.error('Failed to load course students:', e);
			error = e instanceof Error ? e.message : 'Failed to load data';
		} finally {
			isLoading = false;
		}
	});

	// Pagination functions
	function updateTotalPages(): void {
		totalPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
	}

	function updateCurrentPageStudents(): void {
		const startIndex = (currentPage - 1) * studentsPerPage;
		const endIndex = startIndex + studentsPerPage;
		currentPageStudents = filteredStudents.slice(startIndex, endIndex);
	}

	$effect(() => {
		updateCurrentPageStudents();
	});

	// Apply filters
	function applyFilters(): void {
		let filtered = [...students];

		// Filter by set (year)
		if (selectedSet !== 'all') {
			filtered = filtered.filter((student) => {
				// Extract year from studentId
				const idMatch = student.studentId.match(/U?(\d{4})/);
				const yearPrefix = idMatch ? idMatch[1] : '';
				return yearPrefix === selectedSet;
			});
		}

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(student) =>
					student.name.toLowerCase().includes(query) ||
					student.studentId.toLowerCase().includes(query) ||
					student.email.toLowerCase().includes(query)
			);
		}

		filteredStudents = filtered;
		currentPage = 1;
		updateTotalPages();
	}

	// Reset filters
	function resetFilters(): void {
		searchQuery = '';
		selectedSet = 'all';
		filteredStudents = students;
		currentPage = 1;
		updateTotalPages();
	}

	// Pagination controls
	function goToPage(page: number): void {
		currentPage = page;
	}

	function nextPage(): void {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	function prevPage(): void {
		if (currentPage > 1) {
			currentPage--;
		}
	}
</script>

<svelte:head>
	<title
		>{course?.name ? `${course.name} - Students` : 'Course Students'} - Class Attendance Tracker</title
	>
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
				</div>
			</div>
		</div>
	{:else}
		<!-- Header and back link -->
		<div class="mb-6">
			<div class="mb-3">
				<a
					href="/courses/{courseId}"
					class="inline-flex items-center text-indigo-600 hover:text-indigo-900"
				>
					<svg class="mr-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Course
				</a>
			</div>
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-800">{course?.name}</h1>
					<p class="text-gray-600">{course?.code}</p>
				</div>
				<div
					class="inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-0.5 text-sm font-medium text-indigo-800"
				>
					{students.length} Students
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="mb-6 rounded-lg bg-white p-4 shadow">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
							placeholder="Search by name, ID or email"
						/>
					</div>
				</div>

				<div>
					<label for="set" class="mb-1 block text-sm font-medium text-gray-700">Set</label>
					<select
						id="set"
						bind:value={selectedSet}
						onchange={() => applyFilters()}
						class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					>
						<option value="all">All Sets</option>
						<option value="2019">2019</option>
						<option value="2020">2020</option>
						<option value="2021">2021</option>
					</select>
				</div>
			</div>

			<div class="mt-4 flex justify-end">
				<button
					type="button"
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					onclick={resetFilters}
				>
					Reset Filters
				</button>
			</div>
		</div>

		{#if filteredStudents.length === 0}
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
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No students found</h3>
				<p class="mt-1 text-sm text-gray-500">
					Try adjusting your filters or add students to this course.
				</p>
			</div>
		{:else}
			<!-- Students list -->
			<div class="ring-opacity-5 overflow-hidden shadow ring-1 ring-black sm:rounded-lg">
				<table class="min-w-full divide-y divide-gray-300">
					<thead class="bg-gray-50">
						<tr>
							<th
								scope="col"
								class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
								>Name</th
							>
							<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>ID</th
							>
							<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>Email</th
							>
							<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
								>Other Courses</th
							>
							<th scope="col" class="relative py-3.5 pr-4 pl-3 sm:pr-6">
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each currentPageStudents as student}
							<tr>
								<td class="py-4 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-6">
									<div class="flex items-center">
										<div class="h-10 w-10 flex-shrink-0">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-800"
											>
												{student.name
													.split(' ')
													.map((part) => part[0])
													.join('')}
											</div>
										</div>
										<div class="ml-4">
											<div class="font-medium text-gray-900">{student.name}</div>
										</div>
									</div>
								</td>
								<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
									{student.studentId}
								</td>
								<td class="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
									{student.email}
								</td>
								<td class="px-3 py-4 text-sm text-gray-500">
									<div class="flex flex-wrap gap-1">
										{#each student.courses.filter((c) => c !== course?.code) as course}
											<span
												class="inline-flex rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-800"
												>{course}</span
											>
										{/each}
									</div>
								</td>
								<td
									class="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6"
								>
									<a href="/students/{student.id}" class="text-indigo-600 hover:text-indigo-900"
										>View Profile</a
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if filteredStudents.length > studentsPerPage}
				<nav
					class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
					aria-label="Pagination"
				>
					<div class="hidden sm:block">
						<p class="text-sm text-gray-700">
							Showing <span class="font-medium">{(currentPage - 1) * studentsPerPage + 1}</span> to
							<span class="font-medium"
								>{Math.min(currentPage * studentsPerPage, filteredStudents.length)}</span
							>
							of <span class="font-medium">{filteredStudents.length}</span> results
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
							{#each Array(totalPages)
								.fill(0)
								.map((_, i) => i + 1) as page}
								<button
									class="mx-1 rounded-md px-3 py-1 {currentPage === page
										? 'bg-indigo-600 text-white'
										: 'text-gray-700 hover:bg-gray-50'}"
									onclick={() => goToPage(page)}
								>
									{page}
								</button>
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
		{/if}
	{/if}
</div>
