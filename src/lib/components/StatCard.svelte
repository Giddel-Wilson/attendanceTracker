<script lang="ts">
	export let stat: {
		title: string;
		value: string;
		icon: string;
		change: string;
	};

	// Function to get icon path based on icon name
	function getIconPath(iconName: string): string {
		switch (iconName) {
			case 'book':
				return 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
			case 'users':
				return 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z';
			case 'chart-line':
				return 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z';
			case 'calendar':
				return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
			default:
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
		}
	}
</script>

<div class="overflow-hidden rounded-lg bg-white shadow">
	<div class="p-5">
		<div class="flex items-center">
			<div class="flex-shrink-0">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-md bg-indigo-50 text-indigo-600"
				>
					<svg
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d={getIconPath(stat.icon)}
						></path>
					</svg>
				</div>
			</div>
			<div class="ml-5 w-0 flex-1">
				<dt class="truncate text-sm font-medium text-gray-500">{stat.title}</dt>
				<dd class="mt-1">
					<div class="text-2xl font-semibold text-gray-900">{stat.value}</div>
					{#if stat.change}
						<p class="mt-1 text-xs text-gray-500">{stat.change}</p>
					{/if}
				</dd>
			</div>
		</div>
	</div>
</div>
