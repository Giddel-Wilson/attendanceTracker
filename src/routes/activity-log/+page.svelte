<script lang="ts">
	import { onMount } from 'svelte';
	import { getRecentActivities } from '$lib/services/activityLogService';

	// State
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let activities = $state<any[]>([]);
	let totalCount = $state(0);
	let filterType = $state('All Activities');

	onMount(async () => {
		await loadActivities();
	});

	async function loadActivities() {
		try {
			isLoading = true;
			error = null;

			// Load only real data from database
			const { data, count } = await getRecentActivities(1, 50);

			activities = data || [];
			totalCount = count || 0;
		} catch (err) {
			console.error('Error loading activities:', err);
			error = err instanceof Error ? err.message : 'Failed to load activity data';
			activities = [];
		} finally {
			isLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();

		// Format date like "Sun, Oct 29, 2023"
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		// Format time like "10:15 AM"
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function getDaysAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return '';
		if (diffDays === 1) return '1 day ago';
		return `${diffDays} days ago`;
	}

	function getActivityColorClass(type: string): string {
		if (type.toLowerCase().includes('attendance')) return 'bg-blue-100';
		if (type.toLowerCase().includes('student')) return 'bg-green-100';
		if (type.toLowerCase().includes('report')) return 'bg-yellow-100';
		if (type.toLowerCase().includes('note')) return 'bg-gray-100';
		if (type.toLowerCase().includes('course')) return 'bg-purple-100';
		return 'bg-gray-100';
	}
</script>

<svelte:head>
	<title>Activity Log | Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-800">Activity Log</h1>
	<p class="text-gray-600">Track all actions and events in the system</p>

	<div class="mt-6">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<label class="text-sm font-medium text-gray-700">Filter by type</label>
				<div class="mt-1 w-64">
					<select
						bind:value={filterType}
						class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
					>
						<option>All Activities</option>
						<option>Attendance</option>
						<option>Students</option>
						<option>Courses</option>
						<option>Reports</option>
					</select>
				</div>
			</div>

			<div class="flex space-x-2">
				<button
					class="inline-flex items-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
					on:click={() => loadActivities()}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-2 h-4 w-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
					Filter
				</button>

				<button
					class="inline-flex items-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-2 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
						/>
					</svg>
					Export
				</button>
			</div>
		</div>

		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"
				></div>
				<span class="ml-2 text-gray-500">Loading activity data...</span>
			</div>
		{:else if error}
			<div class="rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg
							class="h-5 w-5 text-red-400"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error loading activity log</h3>
						<div class="mt-2 text-sm text-red-700">
							<p>{error}</p>
						</div>
					</div>
				</div>
			</div>
		{:else if activities.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-12"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900">No activity recorded yet</h3>
				<p class="mt-1 text-sm text-gray-500">Activities will appear here as you use the system.</p>
				<div class="mt-6">
					<a
						href="/courses"
						class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
					>
						Go to Courses
					</a>
				</div>
			</div>
		{:else}
			<div class="overflow-hidden bg-white shadow sm:rounded-md">
				<ul role="list" class="divide-y divide-gray-200">
					{#each activities as activity}
						<li class="hover:bg-gray-50">
							<div class="flex px-4 py-4">
								<div class="mr-4 flex-shrink-0">
									<div
										class="h-10 w-10 rounded-md {getActivityColorClass(
											activity.action_type || ''
										)} flex items-center justify-center"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-5 w-5 text-gray-700"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
											/>
										</svg>
									</div>
								</div>
								<div class="flex-1">
									<div class="flex items-center justify-between">
										<p class="text-sm font-medium text-gray-900">
											{activity.description || 'Unknown activity'}
										</p>
										<div class="ml-2 flex flex-shrink-0">
											{#if getDaysAgo(activity.created_at)}
												<p class="text-sm text-gray-500">{getDaysAgo(activity.created_at)}</p>
											{:else}
												<p class="text-sm text-gray-500">{formatTime(activity.created_at)}</p>
											{/if}
										</div>
									</div>
									<div class="mt-1 flex items-center">
										{#if activity.entity_type && activity.entity_id}
											<p class="text-sm text-gray-500">
												{activity.entity_type.toUpperCase()}
											</p>
										{/if}
										{#if activity.user_email}
											<p class="text-sm text-gray-500">
												by {activity.user_email}
											</p>
										{/if}
									</div>
									<p class="mt-1 text-xs text-gray-500">{formatDate(activity.created_at)}</p>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>
