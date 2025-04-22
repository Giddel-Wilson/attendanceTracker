<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { getStudents } from '$lib/services/studentService';

	// Updated type to remove fields not in database
	type Student = {
		id: number;
		name: string;
		studentId: string;
		email: string;
		courses: string[];
		status: string;
	};

	// State with proper typing - removing attendance
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let students = $state<Student[]>([]);
	let filteredStudents = $state<Student[]>([]);
	let searchQuery = $state('');
	let selectedSet = $state('all'); // Changed from selectedStatus to selectedSet
	let selectedCourse = $state('all');
	let currentPage = $state(1);
	let totalPages = $state(1);
	const studentsPerPage = 10;

	// Pagination calculated properties
	$effect(() => {
		updateCurrentPageStudents();
	});

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

	let currentPageStudents = $state<Student[]>([]);

	// Apply filters to students list - update to use set instead of status
	function applyFilters(): void {
		let filtered = [...students];

		// Filter by set (year) instead of status
		if (selectedSet !== 'all') {
			filtered = filtered.filter((student) => {
				// Extract year from studentId
				const idMatch = student.studentId.match(/U?(\d{4})/);
				const yearPrefix = idMatch ? idMatch[1] : '';
				return yearPrefix === selectedSet;
			});
		}

		// Filter by course - correctly checks if student is enrolled in the selected course
		if (selectedCourse !== 'all') {
			filtered = filtered.filter((student) => student.courses.includes(selectedCourse));
		}

		// Filter by search query - unchanged
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

	// Reset filters - update to use selectedSet instead of selectedStatus
	function resetFilters(): void {
		searchQuery = '';
		selectedSet = 'all'; // Changed from selectedStatus to selectedSet
		selectedCourse = 'all';
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

	// Extract available courses from student data
	let availableCourses = $state<string[]>([]);

	onMount(async () => {
		try {
			isLoading = true;
			error = null;

			console.log('Fetching students data...');

			// Fetch students from the database (no mock data)
			const data = await getStudents();
			console.log('Students data received:', data);

			students = data || [];
			filteredStudents = [...students];

			// Only process courses if there are students
			if (students.length > 0) {
				// Extract available courses from student data
				const allCourses = new Set<string>();
				students.forEach((student) => {
					if (student.courses && Array.isArray(student.courses)) {
						student.courses.forEach((course) => allCourses.add(course));
					}
				});

				availableCourses = Array.from(allCourses);
			} else {
				availableCourses = [];
			}

			updateTotalPages();
			updateCurrentPageStudents();
		} catch (e) {
			console.error('Failed to load students:', e);
			error = e instanceof Error ? e.message : 'Failed to load student data';
		} finally {
			isLoading = false;
		}
	});

	// Function to ensure database table exists
	async function ensureStudentsTableExists(): Promise<boolean> {
		try {
			// Just check if students table exists
			const { error } = await supabase.from('students').select('count');

			if (error) {
				console.error('Error checking if students table exists:', error);
				alert(
					'The students table does not exist in your database. Please create it in the Supabase dashboard first.'
				);
				return false;
			}

			return true;
		} catch (error) {
			console.error('Error ensuring students table exists:', error);
			return false;
		}
	}

	// Simpler CSV import function to correctly handle courses
	function importSpreadsheet(): void {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.csv';

		input.onchange = async (e: Event) => {
			try {
				const target = e.target as HTMLInputElement;
				if (!target.files || !target.files[0]) return;

				isLoading = true;
				const file = target.files[0];

				// Read file as text
				const text = await file.text();
				console.log('Raw CSV data:', text.substring(0, 200) + '...');

				// Split into lines and parse
				const lines = text.trim().split('\n');
				const headers = lines[0].split(',').map((h) => h.trim());

				console.log('Headers:', headers);

				// Get column indices
				const nameIdx = headers.indexOf('Name');
				const idIdx = headers.indexOf('ID');
				const emailIdx = headers.indexOf('Email');
				const coursesIdx = headers.indexOf('Courses');

				if (nameIdx === -1 || idIdx === -1 || emailIdx === -1 || coursesIdx === -1) {
					alert(`Missing required headers. Found: ${headers.join(', ')}`);
					isLoading = false;
					return;
				}

				const importedStudents = [];

				for (let i = 1; i < lines.length; i++) {
					const line = lines[i].trim();
					if (!line) continue;

					// Manually parse each line to handle courses correctly
					const values = line.split(',');

					// Get the course string - handle the case where it might span multiple commas
					let courseString = values[coursesIdx];

					// Log raw course string for debugging
					console.log(`Row ${i} raw courses: "${courseString}"`);

					// Split courses by semicolon and trim each course
					const courses = courseString
						.split(';')
						.map((c) => c.trim())
						.filter(Boolean);

					console.log(`Row ${i} parsed courses:`, courses);

					// Create student record
					const student = {
						name: values[nameIdx].trim(),
						student_id: values[idIdx].trim(),
						email: values[emailIdx].trim(),
						courses: courses, // This should be an array of course strings
						status: 'active'
					};

					console.log(`Student ${i}:`, student);
					importedStudents.push(student);
				}

				if (importedStudents.length === 0) {
					alert('No student data found in the CSV');
					isLoading = false;
					return;
				}

				// Log what we're sending to Supabase
				console.log(`Inserting ${importedStudents.length} students:`, importedStudents);

				// Insert into Supabase
				const { data, error } = await supabase.from('students').insert(importedStudents).select();

				if (error) {
					console.error('Error importing students:', error);
					alert(`Import failed: ${error.message}`);
				} else {
					console.log('Import successful, returned data:', data);
					alert(`Successfully imported ${importedStudents.length} students!`);

					// Refresh the list - Fix assignment issue
					const fetchedStudents = await getStudents(); // Renamed from newData
					students = fetchedStudents || []; // This should now work
					filteredStudents = [...students];

					// Update UI
					updateTotalPages();
					updateCurrentPageStudents();
				}
			} catch (err) {
				console.error('Import error:', err);
				alert(`Error: ${err.message || 'Unknown error'}`);
			} finally {
				isLoading = false;
			}
		};

		input.click();
	}

	// Modified exportStudentData function to handle empty student list
	function exportStudentData(): void {
		if (filteredStudents.length === 0) {
			alert('No student data to export');
			return;
		}

		// Create CSV content
		const headers = ['Name', 'ID', 'Email', 'Courses'];
		let csvContent = headers.join(',') + '\n';

		filteredStudents.forEach((student) => {
			const coursesStr = student.courses.join(';');
			csvContent += `${student.name},${student.studentId},${student.email},${coursesStr}\n`;
		});

		// Create download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'students_export.csv');
		link.style.display = 'none';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Add delete student function
	async function deleteStudent(id: number): Promise<void> {
		if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
			return;
		}

		try {
			isLoading = true;

			// Delete the student from Supabase
			const { error } = await supabase.from('students').delete().eq('id', id);

			if (error) {
				throw new Error(`Failed to delete student: ${error.message}`);
			}

			// Remove the student from the local lists
			students = students.filter((s) => s.id !== id);
			filteredStudents = filteredStudents.filter((s) => s.id !== id);

			// Update pagination
			updateTotalPages();
			updateCurrentPageStudents();

			// Success notification
			alert('Student deleted successfully');
		} catch (err) {
			console.error('Error deleting student:', err);
			alert(err instanceof Error ? err.message : 'Failed to delete student');
		} finally {
			isLoading = false;
		}
	}

	// CSV Parser that handles quoted fields properly
	function parseCSV(text: string): string[][] {
		const result: string[][] = [];
		let row: string[] = [];
		let insideQuote = false;
		let field = '';

		// Process character by character
		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const nextChar = i < text.length - 1 ? text[i + 1] : '';

			if (char === '"') {
				if (insideQuote && nextChar === '"') {
					// Double quotes inside quotes - add a single quote
					field += '"';
					i++; // Skip the next quote
				} else {
					// Toggle inside/outside quotes
					insideQuote = !insideQuote;
				}
			} else if (char === ',' && !insideQuote) {
				// Field end - add to row
				row.push(field);
				field = '';
			} else if ((char === '\r' || char === '\n') && !insideQuote) {
				// Row end
				if (field || row.length > 0) {
					row.push(field);
					result.push(row);
					row = [];
					field = '';
				}

				// Skip the \n if we just saw a \r
				if (char === '\r' && nextChar === '\n') {
					i++;
				}
			} else {
				field += char;
			}
		}

		// Add the last field and row if any
		if (field || row.length > 0) {
			row.push(field);
			result.push(row);
		}

		return result;
	}
</script>

<svelte:head>
	<title>Students - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6 flex flex-col justify-between md:flex-row md:items-center">
		<h1 class="text-3xl font-bold text-gray-800">Students</h1>
		<div class="mt-4 flex space-x-3 md:mt-0">
			<button
				class="flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				onclick={importSpreadsheet}
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
					></path>
				</svg>
				Import Spreadsheet
			</button>
			<button
				class="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
				onclick={exportStudentData}
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					></path>
				</svg>
				Export Student Data
			</button>
		</div>
	</div>

	<!-- Filters - removed attendance filter -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div class="lg:col-span-2">
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

			<div>
				<label for="course" class="mb-1 block text-sm font-medium text-gray-700">Course</label>
				<select
					id="course"
					bind:value={selectedCourse}
					onchange={() => applyFilters()}
					class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					<option value="all">All Courses</option>
					{#each availableCourses as course}
						<option value={course}>{course}</option>
					{/each}
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
					<h3 class="text-sm font-medium text-red-800">Failed to load students</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>
					<p class="mt-2 text-sm text-red-700">Please check browser console for more details.</p>
				</div>
			</div>
		</div>
	{:else if filteredStudents.length === 0}
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
				Try importing students using the Import Spreadsheet button.
			</p>
		</div>
	{:else}
		<div class="ring-opacity-5 overflow-hidden shadow ring-1 ring-black sm:rounded-lg">
			<table class="min-w-full divide-y divide-gray-300">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
							>Name</th
						>
						<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">ID</th
						>
						<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
							>Email</th
						>
						<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
							>Courses</th
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
									{#each student.courses as course}
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
									>View</a
								>
								<span class="mx-2 text-gray-300">|</span>
								<button
									class="text-red-600 hover:text-red-900"
									onclick={() => deleteStudent(student.id)}
									type="button"
								>
									Delete
								</button>
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
</div>
