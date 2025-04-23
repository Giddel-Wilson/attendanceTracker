<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	let { children } = $props();
	let sidebarOpen = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Array<any>>([]);
	let showResults = $state(false);
	let isLoading = $state(false);
	let recentSearches = $state<string[]>([]);
	let selectedResultIndex = $state(-1);

	// Data stores for search
	let allCourses = $state<any[]>([]);
	let allStudents = $state<any[]>([]);
	let allSessions = $state<any[]>([]);

	// Toggle sidebar on mobile
	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	// Load data for search on component mount
	onMount(async () => {
		try {
			// Fetch courses
			const { data: coursesData } = await supabase
				.from('courses')
				.select('id, name, code')
				.order('name');
			if (coursesData) allCourses = coursesData;

			// Fetch students
			const { data: studentsData } = await supabase
				.from('students')
				.select('id, name, email, student_id')
				.order('name');
			if (studentsData) allStudents = studentsData;

			// Fetch recent attendance sessions
			const { data: sessionsData } = await supabase
				.from('attendance_sessions')
				.select('id, date, course_id, present_students, total_students')
				.order('date', { ascending: false })
				.limit(50);
			if (sessionsData) allSessions = sessionsData;

			// Load recent searches from local storage
			const savedSearches = localStorage.getItem('recentSearches');
			if (savedSearches) {
				recentSearches = JSON.parse(savedSearches);
			}
		} catch (error) {
			console.error('Error loading search data:', error);
		}
	});

	// Handle search input changes with debounce
	let searchTimeout: any;
	function handleSearchInput() {
		clearTimeout(searchTimeout);

		if (searchQuery.trim().length < 2) {
			searchResults = getRecentOrPopular();
			return;
		}

		isLoading = true;
		searchTimeout = setTimeout(() => {
			performSearch();
			isLoading = false;
		}, 150); // Debounce for better performance
	}

	// When search input is focused
	function handleSearchFocus() {
		if (searchQuery.trim().length < 2) {
			searchResults = getRecentOrPopular();
		} else {
			performSearch();
		}
		showResults = true;
	}

	// Get recent searches or popular items
	function getRecentOrPopular() {
		const recent = recentSearches.map((term) => ({
			title: term,
			type: 'recent',
			url: '#',
			isRecent: true
		}));

		// Add popular courses
		const popularCourses = allCourses.slice(0, 3).map((course) => ({
			title: `${course.code} - ${course.name}`,
			type: 'course',
			url: `/courses/${course.id}`,
			data: course
		}));

		return [...recent, ...popularCourses];
	}

	// Perform the actual search across all data
	function performSearch() {
		const query = searchQuery.toLowerCase().trim();
		const results = [];

		// Search courses
		for (const course of allCourses) {
			if (results.length >= 10) break; // Limit results

			const courseTitle = `${course.code} - ${course.name}`.toLowerCase();
			if (courseTitle.includes(query)) {
				results.push({
					title: `${course.code} - ${course.name}`,
					type: 'course',
					url: `/courses/${course.id}`,
					data: course
				});
			}
		}

		// Search students
		for (const student of allStudents) {
			if (results.length >= 15) break; // Limit results

			if (
				student.name.toLowerCase().includes(query) ||
				(student.student_id && student.student_id.toLowerCase().includes(query))
			) {
				results.push({
					title: student.name,
					subtitle: student.student_id ? `ID: ${student.student_id}` : student.email,
					type: 'student',
					url: `/students/${student.id}`,
					data: student
				});
			}
		}

		// Search attendance sessions
		for (const session of allSessions) {
			if (results.length >= 20) break; // Limit total results

			const sessionDate = new Date(session.date).toLocaleDateString();
			if (sessionDate.toLowerCase().includes(query)) {
				// Try to find the course for this session
				const course = allCourses.find((c) => c.id === session.course_id);
				const courseCode = course ? course.code : 'Unknown Course';

				results.push({
					title: `${courseCode} Attendance - ${sessionDate}`,
					subtitle: `${session.present_students}/${session.total_students} students present`,
					type: 'attendance',
					url: `/attendance/history/${session.id}`,
					data: session
				});
			}
		}

		// // Add search actions
		// results.push({
		// 	title: `View all results for "${searchQuery}"`,
		// 	type: 'action',
		// 	url: `/search?q=${encodeURIComponent(searchQuery)}`,
		// 	isAction: true
		// });

		searchResults = results;
		showResults = true;
	}

	// Close search results when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const searchContainer = document.getElementById('search-container');
		if (searchContainer && !searchContainer.contains(event.target as Node)) {
			showResults = false;
			selectedResultIndex = -1;
		}
	}

	// Navigate to search result
	function navigateToResult(result: any) {
		if (result.isRecent) {
			// If it's a recent search item, just set the search query
			searchQuery = result.title;
			performSearch();
			return;
		}

		if (!result.isAction && searchQuery.trim()) {
			// Save this search to recent searches
			const newRecent = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(
				0,
				5
			);
			recentSearches = newRecent;
			localStorage.setItem('recentSearches', JSON.stringify(newRecent));
		}

		goto(result.url);
		searchQuery = '';
		showResults = false;
		selectedResultIndex = -1;
	}

	// Handle keyboard navigation in search results
	function handleKeydown(event: KeyboardEvent) {
		if (!showResults) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedResultIndex = Math.min(selectedResultIndex + 1, searchResults.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedResultIndex >= 0 && selectedResultIndex < searchResults.length) {
					navigateToResult(searchResults[selectedResultIndex]);
				} else if (searchQuery.trim() && searchResults.length > 0) {
					navigateToResult(searchResults[0]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				showResults = false;
				selectedResultIndex = -1;
				break;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="flex h-screen overflow-hidden bg-gray-50">
	<!-- Sidebar for desktop -->
	<div class="hidden md:flex">
		<Sidebar />
	</div>

	<!-- Mobile navigation overlay -->
	{#if sidebarOpen}
		<div
			class="bg-opacity-50 fixed inset-0 z-20 bg-black transition-opacity md:hidden"
			onclick={toggleSidebar}
			aria-hidden="true"
		></div>
	{/if}

	<!-- Mobile sidebar -->
	<div
		class="fixed inset-y-0 left-0 z-30 w-64 transform overflow-y-auto bg-indigo-700 transition duration-300 ease-in-out md:hidden {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<Sidebar onLinkClick={toggleSidebar} />
	</div>

	<!-- Main content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Top header -->
		<header class="bg-white shadow-sm">
			<div class="flex h-16 items-center justify-between px-4">
				<!-- Mobile hamburger -->
				<button
					class="text-gray-600 hover:text-gray-900 md:hidden"
					onclick={toggleSidebar}
					aria-label="Open sidebar"
				>
					<span class="sr-only">Open sidebar</span>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>

				<!-- Search bar -->
				<div class="flex flex-1 items-center px-4 md:px-0">
					<div class="w-full max-w-md md:block" id="search-container">
						<div class="relative">
							<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M8 4a4 4 0 100 8a4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								class="block w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
								type="text"
								placeholder="Search students, courses, attendance..."
								bind:value={searchQuery}
								oninput={handleSearchInput}
								onfocus={handleSearchFocus}
								aria-label="Search"
							/>

							{#if isLoading}
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"
									></div>
								</div>
							{/if}

							<!-- Enhanced search results dropdown -->
							{#if showResults}
								<div
									class="ring-opacity-5 absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black"
								>
									<ul class="max-h-80 overflow-y-auto py-1 text-sm" role="listbox">
										{#if searchResults.length === 0}
											<li class="px-4 py-2 text-center text-gray-500">No results found</li>
										{:else}
											{#each searchResults as result, index}
												<button
													class="w-full cursor-pointer px-3 py-2 text-left hover:bg-indigo-50 {selectedResultIndex ===
													index
														? 'bg-indigo-50'
														: ''}"
													onclick={() => navigateToResult(result)}
													role="option"
													aria-selected={selectedResultIndex === index}
												>
													{#if result.isRecent}
														<!-- Recent search -->
														<div class="flex items-center">
															<div
																class="mr-3 flex h-5 w-5 flex-shrink-0 items-center justify-center text-gray-400"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	class="h-4 w-4"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="2"
																		d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
																	/>
																</svg>
															</div>
															<span>{result.title}</span>
														</div>
													{:else if result.isAction}
														<!-- Action item (View all) -->
														<div class="flex items-center justify-between">
															<span class="font-medium text-indigo-600">{result.title}</span>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																class="h-4 w-4 text-indigo-600"
																fill="none"
																viewBox="0 0 24 24"
																stroke="currentColor"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M14 5l7 7m0 0l-7 7m7-7H3"
																/>
															</svg>
														</div>
													{:else}
														<!-- Regular search result -->
														<div class="flex items-center">
															<div
																class="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full {result.type ===
																'course'
																	? 'bg-blue-100'
																	: result.type === 'student'
																		? 'bg-green-100'
																		: result.type === 'attendance'
																			? 'bg-yellow-100'
																			: 'bg-gray-100'}"
															>
																<!-- ...existing icons... -->
															</div>
															<div class="min-w-0 flex-1">
																<div class="text-sm font-medium">{result.title}</div>
																{#if result.subtitle}
																	<p class="truncate text-xs text-gray-500">{result.subtitle}</p>
																{/if}
															</div>
														</div>
													{/if}
												</button>
											{/each}
										{/if}
									</ul>
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- User dropdown -->
				<div class="ml-4 flex items-center md:ml-6">
					<!-- <button
						class="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					>
						<span class="sr-only">View notifications</span>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/>
						</svg>
					</button> -->

					<div class="relative ml-3">
						<div>
							<button
								class="flex max-w-xs items-center rounded-full bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
							>
								<span class="sr-only">Open user menu</span>
								<img
									class="h-8 w-8 rounded-full"
									src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
									alt=""
								/>
							</button>
						</div>
					</div>
				</div>
			</div>
		</header>

		<!-- Main content area -->
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
</div>