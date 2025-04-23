<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getStudentById } from '$lib/services/studentService';

	// Define Student type that matches our database schema
	type Student = {
		id: number;
		name: string;
		studentId: string;
		email: string;
		courses: string[];
		status: string;
	};

	// State variables
	let studentData = $state<Student | null>(null);
	let isLoading = $state(true);
	let isEditing = $state(false);
	let isSaving = $state(false);
	let activeTab = $state('info'); // Define the missing activeTab variable
	let showDeleteModal = $state(false); // State for delete confirmation modal

	// Create mutable copy for editing
	let editedStudent = $state<Student | null>(null);

	// Fetch student on mount
	onMount(async () => {
		try {
			const studentId = $page.params.id;
			isLoading = true;

			if (!studentId) {
				throw new Error('Student ID is required');
			}

			const data = await getStudentById(Number(studentId));
			studentData = data;

			// Create a separate copy for editing
			editedStudent = { ...data };
		} catch (err) {
			console.error('Error loading student:', err);
			alert('Failed to load student data');
		} finally {
			isLoading = false;
		}
	});

	function startEditing() {
		if (!studentData) return;
		editedStudent = { ...studentData };
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
	}

	async function saveChanges() {
		if (!studentData || !editedStudent) return;

		try {
			isSaving = true;

			const { error: updateError } = await supabase
				.from('students')
				.update({
					name: editedStudent.name,
					student_id: editedStudent.studentId,
					email: editedStudent.email,
					courses: editedStudent.courses || [],
					status: editedStudent.status
				})
				.eq('id', studentData.id);

			if (updateError) {
				throw updateError;
			}

			// Update local data
			studentData = { ...editedStudent };

			isEditing = false;
			alert('Student information updated successfully');
		} catch (err) {
			console.error('Error updating student:', err);
			alert('Failed to update student information');
		} finally {
			isSaving = false;
		}
	}

	function addCourse() {
		if (!editedStudent) return;
		const newCourse = window.prompt('Enter course code:');
		if (newCourse?.trim()) {
			editedStudent.courses = [...(editedStudent.courses || []), newCourse.trim()];
		}
	}

	function removeCourse(index: number) {
		if (!editedStudent) return;
		editedStudent.courses = editedStudent.courses.filter((_, i) => i !== index);
	}

	function confirmDeleteStudent() {
		showDeleteModal = true;
	}

	function cancelDelete() {
		showDeleteModal = false;
	}

	async function deleteStudent() {
		if (!studentData) return;

		try {
			isSaving = true;
			showDeleteModal = false; // Hide modal

			const { error: deleteError } = await supabase
				.from('students')
				.delete()
				.eq('id', studentData.id);

			if (deleteError) {
				throw deleteError;
			}

			alert('Student deleted successfully');
			goto('/students');
		} catch (err) {
			console.error('Error deleting student:', err);
			alert('Failed to delete student');
		} finally {
			isSaving = false;
		}
	}

	// Format matriculation year from student ID
	function getMatriculationYear(studentId: string): string {
		const match = studentId.match(/U?(\d{4})/);
		return match ? match[1] : 'Unknown';
	}

	// Function to switch tabs
	function setActiveTab(tab: string): void {
		activeTab = tab;
	}

	// Helper format function for dates
	function formatDate(date: string | Date): string {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Student Details - {studentData?.name || 'Loading...'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<div
				class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"
			></div>
		</div>
	{:else if !studentData}
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
					<h3 class="text-sm font-medium text-red-800">Student not found</h3>
					<p class="mt-2 text-sm text-red-700">
						Return to <a href="/students" class="underline">student list</a>.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Back button and header - Make responsive -->
		<div class="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
			<div class="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0">
				<a href="/students" class="inline-flex items-center text-indigo-600 hover:text-indigo-900">
					<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						></path>
					</svg>
					Back to Students
				</a>
				<h1 class="text-2xl font-bold text-gray-800 md:text-3xl">{studentData.name}</h1>
			</div>

			<div class="flex flex-wrap gap-2">
				{#if isEditing}
					<button
						class="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-center text-white hover:bg-indigo-700 disabled:opacity-50 md:flex-none"
						onclick={saveChanges}
						disabled={isSaving}
					>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</button>
					<button
						class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-gray-700 hover:bg-gray-50 md:flex-none"
						onclick={cancelEditing}
						disabled={isSaving}
					>
						Cancel
					</button>
				{:else}
					<button
						class="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-center text-white hover:bg-indigo-700 md:flex-none"
						onclick={startEditing}
					>
						Edit Student
					</button>
					<button
						class="flex-1 rounded-md bg-red-600 px-4 py-2 text-center text-white hover:bg-red-700 md:flex-none"
						onclick={confirmDeleteStudent} 
					>
						Delete Student
					</button>
				{/if}
			</div>
		</div>

		<!-- Tab navigation - Make responsive -->
		<div class="mb-4 border-b border-gray-200 overflow-x-auto">
			<nav class="-mb-px flex" aria-label="Tabs">
				<button
					class={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium sm:px-6 sm:py-4 ${activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
					onclick={() => setActiveTab('info')}
				>
					Student Information
				</button>
				<button
					class={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium sm:px-6 sm:py-4 ${activeTab === 'courses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
					onclick={() => setActiveTab('courses')}
				>
					Courses
				</button>
			</nav>
		</div>

		<!-- Content sections -->
		{#if activeTab === 'info'}
			<div class="overflow-hidden bg-white shadow sm:rounded-lg">
				<div class="px-4 py-5 sm:px-6">
					<h3 class="text-lg font-medium leading-6 text-gray-900">Student Information</h3>
					<p class="mt-1 max-w-2xl text-sm text-gray-500">Personal details</p>
				</div>

				<div class="border-t border-gray-200">
					<dl>
						<!-- Name -->
						<div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
							<dt class="text-sm font-medium text-gray-500">Full name</dt>
							<dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
								{#if isEditing && editedStudent}
									<input
										type="text"
										bind:value={editedStudent.name}
										class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									/>
								{:else}
									{studentData.name}
								{/if}
							</dd>
						</div>

						<!-- Student ID -->
						<div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
							<dt class="text-sm font-medium text-gray-500">Student ID</dt>
							<dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
								{#if isEditing && editedStudent}
									<input
										type="text"
										bind:value={editedStudent.studentId}
										class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									/>
								{:else}
									{studentData.studentId}
								{/if}
							</dd>
						</div>

						<!-- Email address -->
						<div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
							<dt class="text-sm font-medium text-gray-500">Email address</dt>
							<dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
								{#if isEditing && editedStudent}
									<input
										type="email"
										bind:value={editedStudent.email}
										class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									/>
								{:else}
									<a
										href="mailto:{studentData.email}"
										class="text-indigo-600 hover:text-indigo-900 break-all"
									>
										{studentData.email}
									</a>
								{/if}
							</dd>
						</div>

						<!-- Set/Year -->
						<div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
							<dt class="text-sm font-medium text-gray-500">Set/Year</dt>
							<dd class="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
								{getMatriculationYear(studentData.studentId)}
							</dd>
						</div>

						<!-- Status -->
						<div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
							<dt class="text-sm font-medium text-gray-500">Status</dt>
							<dd class="mt-1 text-sm sm:col-span-2 sm:mt-0">
								{#if isEditing && editedStudent}
									<select
										bind:value={editedStudent.status}
										class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									>
										<option value="active">Active</option>
										<option value="inactive">Inactive</option>
									</select>
								{:else}
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {studentData.status ===
										'active'
											? 'bg-green-100 text-green-800'
											: 'bg-gray-100 text-gray-800'}"
									>
										{studentData.status.charAt(0).toUpperCase() + studentData.status.slice(1)}
									</span>
								{/if}
							</dd>
						</div>
					</dl>
				</div>
			</div>
		{:else if activeTab === 'courses'}
			<div class="overflow-hidden bg-white shadow sm:rounded-lg">
				<div class="px-4 py-5 sm:px-6">
					<h3 class="text-lg font-medium leading-6 text-gray-900">Enrolled Courses</h3>
					<p class="mt-1 max-w-2xl text-sm text-gray-500">
						Courses this student is currently taking
					</p>
				</div>

				<div class="border-t border-gray-200">
					<div class="px-4 py-5 sm:p-6">
						{#if isEditing && editedStudent}
							<div class="mb-4">
								<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
									<h4 class="text-sm font-medium text-gray-700">Add or remove courses</h4>
									<button
										type="button"
										onclick={addCourse}
										class="inline-flex items-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
									>
										<svg
											class="mr-1 h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 6v6m0 0v6m0-6h6m-6 0H6"
											/>
										</svg>
										Add Course
									</button>
								</div>

								{#if editedStudent.courses.length === 0}
									<p class="text-sm italic text-gray-500">No courses assigned to this student</p>
								{:else}
									<div class="space-y-2">
										{#each editedStudent.courses as course, i}
											<div
												class="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
											>
												<span class="text-sm font-medium text-gray-700">{course}</span>
												<button
													type="button"
													onclick={() => removeCourse(i)}
													class="ml-2 rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-800"
												>
													<svg
														class="h-5 w-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
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
										{/each}
									</div>
								{/if}
							</div>
						{:else if studentData.courses.length === 0}
							<p class="text-sm italic text-gray-500">No courses assigned to this student</p>
						{:else}
							<ul class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
								{#each studentData.courses as course}
									<li class="rounded-md bg-gray-50 px-4 py-3">
										<h4 class="font-medium text-gray-900">{course}</h4>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if showDeleteModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-500 bg-opacity-75 p-4">
			<div class="relative w-full max-w-md rounded-lg bg-white shadow-xl sm:mx-auto">
				<div class="p-6">
					<!-- Modal Header -->
					<div class="mb-4 flex items-start">
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
						<div>
							<h3 class="text-lg font-medium text-gray-900">Delete Student</h3>
							<p class="mt-1 text-sm text-gray-500">
								Are you sure you want to delete {studentData.name}? This action cannot be undone.
							</p>
						</div>
					</div>

					<!-- Modal Actions -->
					<div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<button
							type="button"
							class="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
							onclick={cancelDelete}
						>
							Cancel
						</button>
						<button
							type="button"
							class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto sm:text-sm"
							onclick={deleteStudent}
							disabled={isSaving}
						>
							{isSaving ? 'Deleting...' : 'Delete Student'}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
