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

	async function deleteStudent() {
		if (!studentData) return;

		if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
			return;
		}

		try {
			isSaving = true;

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
		<!-- Back button and header -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center">
				<a href="/students" class="mr-4 text-indigo-600 hover:text-indigo-900">
					<svg class="inline h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						></path>
					</svg>
					Back to Students
				</a>
				<h1 class="text-3xl font-bold text-gray-800">{studentData.name}</h1>
			</div>

			<div class="flex space-x-3">
				{#if isEditing}
					<button
						class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
						onclick={saveChanges}
						disabled={isSaving}
					>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</button>
					<button
						class="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
						onclick={cancelEditing}
						disabled={isSaving}
					>
						Cancel
					</button>
				{:else}
					<button
						class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
						onclick={startEditing}
					>
						Edit Student
					</button>
					<button
						class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
						onclick={deleteStudent}
					>
						Delete Student
					</button>
				{/if}
			</div>
		</div>

		<!-- Tab navigation -->
		<div class="mb-4 border-b border-gray-200">
			<nav class="-mb-px flex" aria-label="Tabs">
				<button
					class={`border-b-2 px-6 py-4 ${activeTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
					onclick={() => setActiveTab('info')}
				>
					Student Information
				</button>
				<button
					class={`border-b-2 px-6 py-4 ${activeTab === 'courses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
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
					<h3 class="text-lg leading-6 font-medium text-gray-900">Student Information</h3>
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
										class="text-indigo-600 hover:text-indigo-900"
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
					<h3 class="text-lg leading-6 font-medium text-gray-900">Enrolled Courses</h3>
					<p class="mt-1 max-w-2xl text-sm text-gray-500">
						Courses this student is currently taking
					</p>
				</div>

				<div class="border-t border-gray-200">
					<div class="px-4 py-5 sm:p-6">
						{#if isEditing && editedStudent}
							<div class="mb-4">
								<div class="mb-2 flex items-center justify-between">
									<h4 class="text-sm font-medium text-gray-700">Add or remove courses</h4>
									<button
										type="button"
										onclick={addCourse}
										class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
									>
										<svg
											class="mr-1 -ml-0.5 h-4 w-4"
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
									<p class="text-sm text-gray-500 italic">No courses assigned to this student</p>
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
													class="text-red-600 hover:text-red-800"
												>
													<svg
														class="h-4 w-4"
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
							<p class="text-sm text-gray-500 italic">No courses assigned to this student</p>
						{:else}
							<ul class="space-y-3">
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
</div>
