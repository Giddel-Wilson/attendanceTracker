<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { supabase } from '$lib/supabase';

	// Props using runes syntax
	const { selectedCourseId = null } = $props<{
		selectedCourseId?: number | null;
	}>();

	// References
	let canvas: HTMLCanvasElement;
	let loadingDiv: HTMLDivElement;
	let errorDiv: HTMLDivElement;
	let noDataDiv: HTMLDivElement;
	let chartCreated = $state(false);
	let chartError = $state<string | null>(null);
	let chart: Chart | null = null;

	// Fetch real attendance data
	async function fetchAttendanceData() {
		try {
			console.log(`Fetching attendance data for course: ${selectedCourseId}`);

			// Calculate date range (last 30 days)
			const endDate = new Date();
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 29);

			const formattedStartDate = startDate.toISOString().split('T')[0];
			const formattedEndDate = endDate.toISOString().split('T')[0];

			// Build query for attendance data
			let query = supabase
				.from('attendance_sessions')
				.select('*')
				.gte('date', formattedStartDate)
				.lte('date', formattedEndDate);

			// Add course filter if selected
			if (selectedCourseId !== null) {
				query = query.eq('course_id', selectedCourseId);
			}

			// Order by date
			query = query.order('date', { ascending: true });

			// Execute query
			const { data: sessions, error: queryError } = await query;

			if (queryError) throw queryError;

			console.log(`Retrieved ${sessions?.length || 0} attendance records`);

			// Generate labels for all 30 days
			const labels = [];
			const attendanceRates = [];

			for (let i = 0; i < 30; i++) {
				const currentDate = new Date(startDate);
				currentDate.setDate(currentDate.getDate() + i);
				labels.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
				attendanceRates.push(0); // Default to 0% attendance
			}

			// If no data, return empty chart structure
			if (!sessions || sessions.length === 0) {
				return { labels, rates: attendanceRates, hasData: false };
			}

			// Process real attendance data
			const dateMap = new Map();
			sessions.forEach((session) => {
				const date = session.date;
				if (!dateMap.has(date)) {
					dateMap.set(date, {
						totalStudents: 0,
						presentStudents: 0
					});
				}

				const stats = dateMap.get(date);
				stats.totalStudents += session.total_students || 0;
				stats.presentStudents += session.present_students || 0;
			});

			// Update attendance rates with real data
			let hasNonZeroData = false;
			for (let i = 0; i < 30; i++) {
				const currentDate = new Date(startDate);
				currentDate.setDate(currentDate.getDate() + i);
				const dateString = currentDate.toISOString().split('T')[0];

				if (dateMap.has(dateString)) {
					const stats = dateMap.get(dateString);
					if (stats.totalStudents > 0) {
						const rate = (stats.presentStudents / stats.totalStudents) * 100;
						attendanceRates[i] = parseFloat(rate.toFixed(1));
						if (rate > 0) hasNonZeroData = true;
					}
				}
			}

			return { labels, rates: attendanceRates, hasData: hasNonZeroData };
		} catch (err) {
			console.error('Error fetching attendance data:', err);
			throw err;
		}
	}

	// Create or update chart with real data
	async function createOrUpdateChart() {
		try {
			console.log('Creating/updating chart...');

			// Show loading, hide other states
			if (loadingDiv) loadingDiv.style.display = 'flex';
			if (errorDiv) errorDiv.style.display = 'none';
			if (noDataDiv) noDataDiv.style.display = 'none';

			if (!canvas) {
				console.error('Canvas element not found');
				chartError = 'Canvas element not found';
				if (errorDiv) errorDiv.style.display = 'flex';
				if (loadingDiv) loadingDiv.style.display = 'none';
				return;
			}

			// Get context
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				throw new Error('Failed to get canvas context');
			}

			// Fetch real data
			const data = await fetchAttendanceData();

			// Destroy existing chart if it exists
			if (chart) {
				chart.destroy();
				chart = null;
			}

			// Check if we have any meaningful data
			if (!data.hasData) {
				console.log('No attendance data found');
				if (noDataDiv) noDataDiv.style.display = 'flex';
				if (loadingDiv) loadingDiv.style.display = 'none';
				return;
			}

			// Create chart with real data
			chart = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: data.labels,
					datasets: [
						{
							label: 'Attendance Rate (%)',
							data: data.rates,
							backgroundColor: 'rgba(79, 70, 229, 0.7)',
							borderColor: 'rgba(79, 70, 229, 1)',
							borderWidth: 1
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							max: 100,
							ticks: {
								callback: function (value) {
									return value + '%';
								}
							}
						}
					}
				}
			});

			console.log('Chart created successfully with real data');
			chartCreated = true;

			// Hide loading indicator
			if (loadingDiv) {
				loadingDiv.style.display = 'none';
			}
		} catch (err) {
			console.error('Error creating chart:', err);
			chartError = err instanceof Error ? err.message : 'Error creating chart';

			if (errorDiv) {
				errorDiv.style.display = 'flex';
			}
			if (loadingDiv) {
				loadingDiv.style.display = 'none';
			}
		}
	}

	// Initialize chart when component mounts
	onMount(() => {
		// Use requestAnimationFrame for better timing
		requestAnimationFrame(() => {
			createOrUpdateChart();
		});

		// Clean up on unmount
		return () => {
			if (chart) {
				chart.destroy();
			}
		};
	});

	// Update chart when selectedCourseId changes
	$effect(() => {
		console.log(`Course selection changed to: ${selectedCourseId}`);
		if (canvas) {
			createOrUpdateChart();
		}
	});
</script>

<div class="relative h-full w-full" style="min-height: 300px;">
	<!-- ALWAYS have the canvas in the DOM -->
	<canvas
		bind:this={canvas}
		width="400"
		height="300"
		style="width: 100%; height: 100%; display: block;"
	></canvas>

	<!-- Loading overlay -->
	<div
		bind:this={loadingDiv}
		class="bg-opacity-80 absolute inset-0 flex items-center justify-center bg-white"
	>
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600"
		></div>
	</div>

	<!-- No Data overlay -->
	<div
		bind:this={noDataDiv}
		class="bg-opacity-90 absolute inset-0 flex flex-col items-center justify-center bg-white"
		style="display: none;"
	>
		<div class="mb-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-12 w-12 text-gray-300"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1"
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
				/>
			</svg>
		</div>
		<div class="font-medium text-gray-500">No attendance records found</div>
		<div class="mt-2 text-sm text-gray-400">
			{selectedCourseId === null
				? 'No attendance has been recorded yet'
				: 'Try selecting a different course'}
		</div>
	</div>

	<!-- Error overlay -->
	<div
		bind:this={errorDiv}
		class="bg-opacity-90 absolute inset-0 flex flex-col items-center justify-center bg-white"
		style="display: none;"
	>
		<div class="font-medium text-red-500">Chart Error</div>
		{#if chartError}
			<div class="mt-2 text-sm text-gray-600">{chartError}</div>
		{/if}
	</div>
</div>
