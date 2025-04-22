<script lang="ts">
	import type { Course } from '$lib/services/courseService';

	// Required props
	export let course: Course;
	export let onDelete: () => void;

	// Functions with better null checking
	function getInitials(name: string | undefined | null): string {
		if (!name) return '??';

		try {
			// Safely handle string operations
			return (
				name
					.split(' ')
					.map((part) => (part && part.length > 0 ? part.charAt(0) : ''))
					.filter(Boolean)
					.join('')
					.toUpperCase() || '??'
			);
		} catch (error) {
			// Fall back to a safe value if any error occurs
			console.warn('Error generating initials:', error);
			return '??';
		}
	}

	function formatDate(dateString: string | undefined | null): string {
		if (!dateString) return 'N/A';

		const date = new Date(dateString);
		if (isNaN(date.getTime())) return 'N/A';

		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusClass(status: string | undefined | null): string {
		if (!status) return 'bg-gray-100 text-gray-800';

		switch (status.toLowerCase()) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'completed':
				return 'bg-blue-100 text-blue-800';
			case 'upcoming':
				return 'bg-yellow-100 text-yellow-800';
			case 'inactive':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<!-- Card wrapper with null safety throughout the template -->
<div class="overflow-hidden rounded-lg bg-white shadow flex flex-col justify-between">
	<div class="px-4 py-5 sm:p-6 ">
		<div class="flex items-center">
			<div class="flex-shrink-0">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700"
				>
					{getInitials(course?.name)}
				</div>
			</div>
			<div class="ml-5 w-0 flex-1">
				<dl>
					<dt class="truncate text-sm font-medium text-gray-500">
						{course?.code || 'No Code'}
					</dt>
					<dd class="mt-1 text-lg font-semibold text-gray-900">
						{course?.name || 'Unnamed Course'}
					</dd>
				</dl>
			</div>
		</div>
		<div class="mt-4">
			<p class="line-clamp-2 text-sm text-gray-500">
				{course?.description || 'No description available'}
			</p>
		</div>
		<div class="mt-4 flex items-center justify-between">
			<div>
				<span
					class="inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium {getStatusClass(
						course?.status
					)}"
				>
					{course?.status
						? course.status.charAt(0).toUpperCase() + course.status.slice(1)
						: 'Unknown'}
				</span>
			</div>
			<!-- <a
				href="/courses/{course?.id}"
				class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
			>
				View Details
			</a> -->
		</div>
	</div>
	
	<div class="flex items-center justify-between bg-gray-50 px-4 py-2 ">
		<a
			href="/courses/{course?.id}"
			class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
		>
			View Details
		</a>
		<button
			class="text-sm font-medium text-red-600 hover:text-red-500"
			on:click|preventDefault|stopPropagation={() => onDelete()}
		>
			Delete
		</button>
	</div>
</div>
