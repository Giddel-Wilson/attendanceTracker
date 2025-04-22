<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';

	// Activity types with proper structure
	type Activity = {
		id: number;
		type: string;
		title: string;
		details: string;
		time: string;
		timestamp: string;
		action: string;
	};

	let activities = $state<Activity[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Format time since
	function formatTimeSince(dateString: string): string {
		const now = new Date();
		const date = new Date(dateString);
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 60) {
			return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		} else if (diffDays < 7) {
			return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		} else if (diffDays < 14) {
			return '1 week ago';
		} else {
			return `${Math.floor(diffDays / 7)} weeks ago`;
		}
	}

	// Get activity color class
	function getActivityColorClass(action: string): string {
		switch (action.toLowerCase()) {
			case 'attendance_taken':
				return 'bg-green-100';
			case 'course_created':
			case 'course_updated':
				return 'bg-blue-100';
			case 'student_added':
			case 'student_updated':
				return 'bg-purple-100';
			case 'report_generated':
				return 'bg-yellow-100';
			default:
				return 'bg-gray-100';
		}
	}

	// Get activity icon based on type
	function getActivityIcon(type: string): string {
		switch (type.toLowerCase()) {
			case 'attendance':
				return `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        `;
			case 'course':
				return `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        `;
			case 'student':
				return `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        `;
			case 'report':
				return `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        `;
			default:
				return `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        `;
		}
	}

	// Load activities from the database
	async function loadActivities(): Promise<void> {
		try {
			isLoading = true;
			error = null;

			// Get the latest 5 activities from the database
			const { data, error: fetchError } = await supabase
				.from('activity_logs')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(5);

			if (fetchError) throw fetchError;

			// Transform data into activity format
			activities = data.map((record) => ({
				id: record.id,
				type: record.entity_type || 'system',
				title: getActivityTitle(record.action_type, record.description),
				details: record.description || '',
				time: formatTimeSince(record.created_at),
				timestamp: record.created_at,
				action: record.action_type || 'action'
			}));
		} catch (err) {
			console.error('Error loading activities:', err);
			error = err instanceof Error ? err.message : 'Failed to load activities';
			activities = [];
		} finally {
			isLoading = false;
		}
	}

	// Generate a readable title from activity type and description
	function getActivityTitle(actionType: string, description: string): string {
		if (description && description.length > 0) {
			const firstSentence = description.split('.')[0];
			return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
		}

		switch (actionType?.toLowerCase()) {
			case 'attendance_taken':
				return 'Attendance taken';
			case 'course_created':
				return 'New course created';
			case 'course_updated':
				return 'Course details updated';
			case 'student_added':
				return 'New student added';
			case 'student_updated':
				return 'Student information updated';
			case 'report_generated':
				return 'Report generated';
			default:
				return 'System activity';
		}
	}

	onMount(() => {
		loadActivities();
	});
</script>

{#if isLoading}
	<div class="flex justify-center py-4">
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600"
		></div>
	</div>
{:else if error}
	<div class="py-4 text-center">
		<p class="text-sm text-gray-500">Failed to load activity data</p>
	</div>
{:else if activities.length === 0}
	<div class="py-8 text-center">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="mx-auto h-8 w-8 text-gray-300"
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
		<p class="mt-2 text-sm text-gray-500">No recent activity</p>
	</div>
{:else}
	<div class="pt-2">
		{#each activities as activity (activity.id)}
			<div
				class="flex items-start space-x-3 py-4 {activity !== activities[activities.length - 1]
					? 'border-b border-gray-100'
					: ''}"
			>
				<div class="flex-shrink-0">
					{#if activity.action === 'attendance_taken'}
						<div class="rounded-full bg-green-100 p-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-green-600"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					{:else}
						<div class="rounded-full bg-gray-100 p-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 text-gray-500"
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
					{/if}
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium">{activity.title}</p>
					<p class="mt-1 line-clamp-1 text-xs text-gray-500">{activity.details}</p>
					<p class="mt-1 text-xs text-gray-400">{activity.time}</p>
				</div>
			</div>
		{/each}
		<!-- <div class="mt-2 text-center">
      <a href="/activity" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">View all activity</a>
    </div> -->
	</div>
{/if}
