<script lang="ts">
	import { onMount } from 'svelte';
	import CourseCard from '$lib/components/CourseCard.svelte';
	import {
		getCourses,
		createCourse,
		updateCourse,
		deleteCourse,
		type Course
	} from '$lib/services/courseService';

	// State with proper type definitions
	let isLoading = $state(true);
	let courses = $state<Course[]>([]);
	let filteredCourses = $state<Course[]>([]);
	let searchQuery = $state('');
	let selectedStatus = $state('all');
	let selectedSemester = $state('all');
	let showNewCourseForm = $state(false);
	let showDeleteConfirm = $state(false);
	let courseToDelete = $state<Course | null>(null);

	// New course form fields
	let newCourse = $state<Course>({
		name: '',
		code: '',
		students: 0,
		attendance: 0,
		nextSession: new Date(Date.now() + 86400000).toISOString().split('T')[0],
		semester: 'First Semester',
		status: 'active',
		description: '',
		schedule: '',
		location: '',
		startDate: '',
		endDate: '',
		instructor: '',
		credits: 3
	});

	// When status changes, update the next session field
	$effect(() => {
		if (newCourse.status === 'completed') {
			newCourse.nextSession = undefined;
		} else if (!newCourse.nextSession) {
			newCourse.nextSession = new Date(Date.now() + 86400000).toISOString().split('T')[0];
		}
	});

	// Load courses from Supabase
	async function loadCourses() {
		isLoading = true;
		try {
			const data = await getCourses();
			courses = data;
			applyFilters();
		} catch (error) {
			console.error('Failed to load courses:', error);
			// Display error notification to user
		} finally {
			isLoading = false;
		}
	}

	// Apply filters to courses
	function applyFilters() {
		let filtered = [...courses];

		// Filter by status
		if (selectedStatus !== 'all') {
			filtered = filtered.filter((course) => course.status === selectedStatus);
		}

		// Filter by semester
		if (selectedSemester !== 'all') {
			filtered = filtered.filter((course) => course.semester === selectedSemester);
		}

		// Filter by search query
		if (searchQuery.trim() !== '') {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(course) =>
					course.name.toLowerCase().includes(query) || course.code.toLowerCase().includes(query)
			);
		}

		filteredCourses = filtered;
	}

	// Toggle new course form
	function toggleNewCourseForm() {
		console.log('Toggle form - before:', showNewCourseForm);
		showNewCourseForm = !showNewCourseForm;
		console.log('Toggle form - after:', showNewCourseForm);

		// Reset form when opening
		if (showNewCourseForm) {
			newCourse = {
				name: '',
				code: '',
				students: 0,
				attendance: 0,
				nextSession: new Date(Date.now() + 86400000).toISOString().split('T')[0],
				semester: 'First Semester',
				status: 'active',
				description: '',
				schedule: '',
				location: '',
				startDate: '',
				endDate: '',
				instructor: '',
				credits: 3
			};
		}
	}

	// Additional state for error modal
	let showErrorModal = $state(false);
	let errorMessage = $state('');

	// Toast notification state
	let showToast = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	// Function to show toast notification
	function showToastNotification(message: string, type: 'success' | 'error' = 'success') {
		toastMessage = message;
		toastType = type;
		showToast = true;

		// Auto-hide toast after 3 seconds
		setTimeout(() => {
			showToast = false;
		}, 3000);
	}

	// Add new course
	async function addNewCourse() {
		try {
			// Validate required fields
			if (!newCourse.name || !newCourse.code) {
				// Show error modal instead of alert
				errorMessage = 'Please fill in all required fields.';
				showErrorModal = true;
				return;
			}

			isLoading = true;

			// Create a minimal course object with only fields that are known to exist in the database
			// Based on error messages, nextSession doesn't exist in the DB schema
			const courseToCreate = {
				name: newCourse.name,
				code: newCourse.code,
				students: newCourse.students || 0,
				attendance: newCourse.attendance || 0,
				semester: newCourse.semester,
				status: newCourse.status,
				description: newCourse.description || '',
				// Only include instructor if it's not empty
				...(newCourse.instructor ? { instructor: newCourse.instructor } : {}),
				// Only include credits if it's defined
				...(newCourse.credits ? { credits: newCourse.credits } : {})
				// Removing all other fields that might not exist
				// nextSession: newCourse.nextSession,
				// schedule: newCourse.schedule,
				// location: newCourse.location,
				// startDate: newCourse.startDate,
				// endDate: newCourse.endDate
			};

			console.log('Creating course with data:', courseToCreate);

			// Create the new course in Supabase
			const course = await createCourse(courseToCreate);

			// Update local state with the new course
			courses = [course, ...courses];
			applyFilters();

			// Close form and show success toast instead of alert
			showNewCourseForm = false;
			showToastNotification('Course added successfully!');
		} catch (error) {
			console.error('Error adding course:', error);
			// Show error modal instead of alert
			errorMessage = error.message || 'Failed to add course. Please try again.';
			showErrorModal = true;
		} finally {
			isLoading = false;
		}
	}

	// Close error modal
	function closeErrorModal() {
		showErrorModal = false;
		errorMessage = '';
	}

	// Delete course functions
	function confirmDeleteCourse(course: Course) {
		courseToDelete = course;
		showDeleteConfirm = true;
	}

	async function deleteCourseHandler() {
		if (courseToDelete?.id) {
			try {
				isLoading = true;
				await deleteCourse(courseToDelete.id);

				// Remove course from local state
				courses = courses.filter((c) => c.id !== courseToDelete?.id);
				applyFilters();

				showDeleteConfirm = false;
				courseToDelete = null;
				showToastNotification('Course deleted successfully!');
			} catch (error) {
				console.error('Error deleting course:', error);
				errorMessage = error.message || 'Failed to delete course. Please try again.';
				showErrorModal = true;
			} finally {
				isLoading = false;
			}
		}
	}

	// Cancel delete
	function cancelDelete() {
		showDeleteConfirm = false;
		courseToDelete = null;
	}

	// Initialize component - load courses on mount
	onMount(() => {
		loadCourses();
	});
</script>

<svelte:head>
	<title>Courses - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6 flex flex-col justify-between md:flex-row md:items-center">
		<h1 class="text-3xl font-bold text-gray-800">Courses</h1>
		<div class="mt-4 md:mt-0">
			<button
				class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
				on:click|preventDefault={toggleNewCourseForm}
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Add New Course
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow md:flex-row md:items-center">
		<div class="w-full md:max-w-xs">
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
					class="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					placeholder="Search courses..."
					on:input={() => applyFilters()}
				/>
			</div>
		</div>

		<div class="w-full md:w-auto">
			<label for="status" class="mb-1 block text-sm font-medium text-gray-700">Status</label>
			<select
				id="status"
				bind:value={selectedStatus}
				class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				on:change={() => applyFilters()}
			>
				<option value="all">All Status</option>
				<option value="active">Active</option>
				<option value="upcoming">Upcoming</option>
				<option value="completed">Completed</option>
			</select>
		</div>

		<div class="w-full md:w-auto">
			<label for="semester" class="mb-1 block text-sm font-medium text-gray-700">Semester</label>
			<select
				id="semester"
				bind:value={selectedSemester}
				class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				on:change={() => applyFilters()}
			>
				<option value="all">All Semesters</option>
				<option value="First Semester">First Semester</option>
				<option value="Second Semester">Second Semester</option>
			</select>
		</div>
	</div>

	<!-- Course grid -->
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div
				class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"
			></div>
		</div>
	{:else if filteredCourses.length === 0}
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
			<h3 class="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
			<p class="mt-1 text-sm text-gray-500">Get started by creating a new course.</p>
			<div class="mt-6">
				<button
					type="button"
					class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
					on:click|preventDefault={toggleNewCourseForm}
				>
					<svg class="mr-1.5 -ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					Add Course
				</button>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filteredCourses as course (course.id)}
				<CourseCard {course} onDelete={() => confirmDeleteCourse(course)} />
			{/each}
		</div>
	{/if}

	<!-- New Course Modal -->
	{#if showNewCourseForm}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="w-full max-w-lg rounded-lg bg-white p-6">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Add New Course</h3>

				<form class="space-y-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700">Course Name</label>
						<input
							type="text"
							id="name"
							bind:value={newCourse.name}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							required
						/>
					</div>
					<div>
						<label for="code" class="block text-sm font-medium text-gray-700">Course Code</label>
						<input
							type="text"
							id="code"
							bind:value={newCourse.code}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							required
						/>
					</div>
					<div>
						<label for="instructor" class="block text-sm font-medium text-gray-700"
							>Instructor</label
						>
						<input
							type="text"
							id="instructor"
							bind:value={newCourse.instructor}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="credits" class="block text-sm font-medium text-gray-700">Credits</label>
							<input
								type="number"
								id="credits"
								bind:value={newCourse.credits}
								min="1"
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							/>
						</div>
						<div>
							<label for="status" class="block text-sm font-medium text-gray-700">Status</label>
							<select
								id="status"
								bind:value={newCourse.status}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							>
								<option value="active">Active</option>
								<option value="upcoming">Upcoming</option>
								<option value="completed">Completed</option>
							</select>
						</div>
					</div>
					<div>
						<label for="nextSession" class="block text-sm font-medium text-gray-700"
							>Next Session Date</label
						>
						<input
							type="date"
							id="nextSession"
							bind:value={newCourse.nextSession}
							disabled={newCourse.status === 'completed'}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm {newCourse.status ===
							'completed'
								? 'cursor-not-allowed bg-gray-100'
								: ''}"
						/>
						{#if newCourse.status === 'completed'}
							<p class="mt-1 text-sm text-gray-500">Not applicable for completed courses</p>
						{/if}
					</div>
					<div>
						<label for="semester" class="block text-sm font-medium text-gray-700">Semester</label>
						<select
							id="semester"
							bind:value={newCourse.semester}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						>
							<option value="First Semester">First Semester</option>
							<option value="Second Semester">Second Semester</option>
						</select>
					</div>
				</form>

				<div class="mt-6 flex justify-end space-x-3">
					<button
						type="button"
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-700"
						on:click|preventDefault={toggleNewCourseForm}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-md bg-indigo-600 px-4 py-2 text-white"
						on:click|preventDefault={addNewCourse}
					>
						Add Course
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if showDeleteConfirm}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="w-full max-w-md rounded-lg bg-white p-6">
				<div class="mb-4 flex items-center">
					<div class="mr-3 flex-shrink-0 rounded-full bg-red-100 p-2">
						<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900">Delete Course</h3>
				</div>

				<p class="mb-5 text-sm text-gray-500">
					Are you sure you want to delete the course "{courseToDelete?.name}"? This action cannot be
					undone.
				</p>

				<div class="flex justify-end space-x-3">
					<button
						type="button"
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-700"
						on:click|preventDefault={cancelDelete}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-md bg-red-600 px-4 py-2 text-white"
						on:click|preventDefault={deleteCourseHandler}
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Error Modal -->
	{#if showErrorModal}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
				<div class="mb-4 flex items-center">
					<div class="mr-3 flex-shrink-0 rounded-full bg-red-100 p-2">
						<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900">Error</h3>
				</div>

				<p class="mb-5 text-sm text-gray-500">{errorMessage}</p>

				<div class="flex justify-end">
					<button
						type="button"
						class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
						on:click={closeErrorModal}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Toast Notification -->
	{#if showToast}
		<div
			class="fixed right-4 bottom-4 z-50 transform transition-all duration-300"
			class:translate-y-0={showToast}
			class:translate-y-24={!showToast}
		>
			<div
				class="max-w-sm rounded-md px-4 py-3 shadow-lg"
				class:bg-green-800={toastType === 'success'}
				class:bg-red-800={toastType === 'error'}
			>
				<div class="flex items-center">
					{#if toastType === 'success'}
						<svg
							class="mr-2 h-6 w-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					{:else}
						<svg
							class="mr-2 h-6 w-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							></path>
						</svg>
					{/if}
					<p class="text-white">{toastMessage}</p>
				</div>
			</div>
		</div>
	{/if}
</div>
