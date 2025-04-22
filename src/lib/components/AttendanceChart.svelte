<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { supabase } from '$lib/supabase';

	// Register all Chart.js components
	Chart.register(...registerables);

	// Props
	const { selectedCourseId = null } = $props<{
		selectedCourseId?: number | null;
	}>();

	// State variables
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let noData = $state(false);
	let chart: Chart | null = null;
	let chartEl: HTMLCanvasElement | null = null;

	// Initialize chart ONCE when component and canvas are ready
	onMount(() => {
		console.log('Component mounted');

		// We need to wait for Svelte to finish rendering the DOM
		// Adding a longer delay to ensure the canvas is fully mounted
		const timer = setTimeout(() => {
			console.log('Checking for canvas after timeout');
			console.log('chartEl available?', !!chartEl);

			if (chartEl) {
				console.log('Canvas dimensions:', chartEl.width, chartEl.height);
				// Create chart would go here
			} else {
				console.error('Canvas still not available after timeout');
				error = 'Could not initialize chart: canvas element not available';
				isLoading = false;
			}
		}, 1000); // Increase timeout to ensure DOM is ready

		return () => {
			clearTimeout(timer);
			if (chart) {
				chart.destroy();
			}
		};
	});

	// ONLY update when course selection changes
	$effect(() => {
		console.log(`Course selection effect triggered: ${selectedCourseId}`);
		// Only update if not the initial load and if we have a canvas
		if (!isLoading && chartEl && chart) {
			console.log('Course changed, updating chart');
			// Update chart would go here
		}
	});
</script>

<div class="flex h-full w-full items-center justify-center">
	<div class="p-4 text-center">
		<p>Using SimpleAttendanceChart instead. Please check the browser console for details.</p>
	</div>
</div>
