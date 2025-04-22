<script lang="ts">
	import { onMount } from 'svelte';

	// State
	let activeTab = $state('general');
	let isSaving = $state(false);
	let saveSuccess = $state(false);

	// General settings
	let institutionName = $state('University of Technology');
	let academicYear = $state('2023-2024');
	let semesterStartDate = $state('2023-09-01'); // Changed from termStartDate
	let semesterEndDate = $state('2023-12-15'); // Changed from termEndDate
	let defaultAttendanceThreshold = $state(80);

	// Notification settings
	let emailNotifications = $state(true);
	let lowAttendanceAlerts = $state(true);
	let weeklyReportEmails = $state(true);
	let remindersBefore = $state(60); // minutes

	// Display settings
	let theme = $state('light');
	let dateFormat = $state('MM/DD/YYYY');
	let itemsPerPage = $state(10);

	// Appearance settings
	let primaryColor = $state('#4f46e5'); // Indigo-600
	let accentColor = $state('#10b981'); // Emerald-500

	// Save settings
	function saveSettings() {
		isSaving = true;

		// Simulate API call
		setTimeout(() => {
			isSaving = false;
			saveSuccess = true;

			// Hide success message after 3 seconds
			setTimeout(() => {
				saveSuccess = false;
			}, 3000);
		}, 800);
	}

	// Reset settings
	function resetSettings() {
		if (confirm('Are you sure you want to reset all settings to default values?')) {
			// Reset to defaults
			if (activeTab === 'general') {
				institutionName = 'University of Technology';
				academicYear = '2023-2024';
				semesterStartDate = '2023-09-01';
				semesterEndDate = '2023-12-15';
				defaultAttendanceThreshold = 80;
			} else if (activeTab === 'notifications') {
				emailNotifications = true;
				lowAttendanceAlerts = true;
				weeklyReportEmails = true;
				remindersBefore = 60;
			} else if (activeTab === 'display') {
				theme = 'light';
				dateFormat = 'MM/DD/YYYY';
				itemsPerPage = 10;
			} else if (activeTab === 'appearance') {
				primaryColor = '#4f46e5';
				accentColor = '#10b981';
			}
		}
	}

	onMount(() => {
		// Load saved settings (simulated)
	});
</script>

<svelte:head>
	<title>Settings - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-800">Settings</h1>
		<p class="text-gray-600">Configure system preferences and options</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
		<!-- Settings Navigation -->
		<div class="space-y-1 lg:col-span-1">
			<nav class="overflow-hidden rounded-lg bg-white shadow">
				<button
					class="flex w-full items-center px-4 py-3 text-left text-sm font-medium {activeTab ===
					'general'
						? 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'text-gray-700 hover:bg-gray-50'}"
					on:click={() => (activeTab = 'general')}
				>
					<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					General
				</button>

				<button
					class="flex w-full items-center px-4 py-3 text-left text-sm font-medium {activeTab ===
					'notifications'
						? 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'text-gray-700 hover:bg-gray-50'}"
					on:click={() => (activeTab = 'notifications')}
				>
					<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
						/>
					</svg>
					Notifications
				</button>

				<button
					class="flex w-full items-center px-4 py-3 text-left text-sm font-medium {activeTab ===
					'display'
						? 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'text-gray-700 hover:bg-gray-50'}"
					on:click={() => (activeTab = 'display')}
				>
					<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
					Display
				</button>

				<button
					class="flex w-full items-center px-4 py-3 text-left text-sm font-medium {activeTab ===
					'appearance'
						? 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'text-gray-700 hover:bg-gray-50'}"
					on:click={() => (activeTab = 'appearance')}
				>
					<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
						/>
					</svg>
					Appearance
				</button>

				<button
					class="flex w-full items-center px-4 py-3 text-left text-sm font-medium {activeTab ===
					'account'
						? 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-700'
						: 'text-gray-700 hover:bg-gray-50'}"
					on:click={() => (activeTab = 'account')}
				>
					<svg class="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					Account
				</button>
			</nav>
		</div>

		<!-- Settings Content -->
		<div class="overflow-hidden rounded-lg bg-white shadow lg:col-span-3">
			<div class="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900">
					{#if activeTab === 'general'}
						General Settings
					{:else if activeTab === 'notifications'}
						Notification Preferences
					{:else if activeTab === 'display'}
						Display Options
					{:else if activeTab === 'appearance'}
						Appearance Customization
					{:else if activeTab === 'account'}
						Account Settings
					{/if}
				</h3>
			</div>

			<div class="px-4 py-5 sm:p-6">
				{#if activeTab === 'general'}
					<div class="space-y-6">
						<div>
							<label for="institution-name" class="block text-sm font-medium text-gray-700"
								>Institution Name</label
							>
							<input
								type="text"
								name="institution-name"
								id="institution-name"
								bind:value={institutionName}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							/>
						</div>

						<div>
							<label for="academic-year" class="block text-sm font-medium text-gray-700"
								>Academic Year</label
							>
							<input
								type="text"
								name="academic-year"
								id="academic-year"
								bind:value={academicYear}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							/>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="semester-start" class="block text-sm font-medium text-gray-700"
									>Semester Start Date</label
								>
								<!-- Changed from Term -->
								<input
									type="date"
									name="semester-start"
									id="semester-start"
									bind:value={semesterStartDate}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								/>
							</div>

							<div>
								<label for="semester-end" class="block text-sm font-medium text-gray-700"
									>Semester End Date</label
								>
								<!-- Changed from Term -->
								<input
									type="date"
									name="semester-end"
									id="semester-end"
									bind:value={semesterEndDate}
									class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								/>
							</div>
						</div>

						<div>
							<label for="attendance-threshold" class="block text-sm font-medium text-gray-700">
								Default Attendance Threshold (%)
							</label>
							<input
								type="number"
								name="attendance-threshold"
								id="attendance-threshold"
								bind:value={defaultAttendanceThreshold}
								min="0"
								max="100"
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							/>
							<p class="mt-1 text-xs text-gray-500">
								Students below this threshold will be flagged for attention.
							</p>
						</div>
					</div>
				{:else if activeTab === 'notifications'}
					<div class="space-y-6">
						<div class="flex items-start">
							<div class="flex h-5 items-center">
								<input
									id="email-notifications"
									type="checkbox"
									bind:checked={emailNotifications}
									class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
								/>
							</div>
							<div class="ml-3 text-sm">
								<label for="email-notifications" class="font-medium text-gray-700"
									>Email Notifications</label
								>
								<p class="text-gray-500">Receive email notifications for important events.</p>
							</div>
						</div>

						<div class="flex items-start">
							<div class="flex h-5 items-center">
								<input
									id="low-attendance"
									type="checkbox"
									bind:checked={lowAttendanceAlerts}
									class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
								/>
							</div>
							<div class="ml-3 text-sm">
								<label for="low-attendance" class="font-medium text-gray-700"
									>Low Attendance Alerts</label
								>
								<p class="text-gray-500">
									Get notified when students fall below attendance threshold.
								</p>
							</div>
						</div>

						<div class="flex items-start">
							<div class="flex h-5 items-center">
								<input
									id="weekly-reports"
									type="checkbox"
									bind:checked={weeklyReportEmails}
									class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
								/>
							</div>
							<div class="ml-3 text-sm">
								<label for="weekly-reports" class="font-medium text-gray-700"
									>Weekly Report Emails</label
								>
								<p class="text-gray-500">Receive weekly attendance summary reports.</p>
							</div>
						</div>

						<div>
							<label for="reminders-before" class="block text-sm font-medium text-gray-700">
								Send Class Reminders Before (minutes)
							</label>
							<select
								id="reminders-before"
								bind:value={remindersBefore}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							>
								<option value="15">15 minutes</option>
								<option value="30">30 minutes</option>
								<option value="60">1 hour</option>
								<option value="120">2 hours</option>
								<option value="1440">1 day</option>
							</select>
						</div>
					</div>
				{:else if activeTab === 'display'}
					<div class="space-y-6">
						<div>
							<label for="theme" class="block text-sm font-medium text-gray-700">Theme</label>
							<select
								id="theme"
								bind:value={theme}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="system">System Default</option>
							</select>
						</div>

						<div>
							<label for="date-format" class="block text-sm font-medium text-gray-700"
								>Date Format</label
							>
							<select
								id="date-format"
								bind:value={dateFormat}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							>
								<option value="MM/DD/YYYY">MM/DD/YYYY</option>
								<option value="DD/MM/YYYY">DD/MM/YYYY</option>
								<option value="YYYY-MM-DD">YYYY-MM-DD</option>
							</select>
						</div>

						<div>
							<label for="items-per-page" class="block text-sm font-medium text-gray-700"
								>Items Per Page</label
							>
							<select
								id="items-per-page"
								bind:value={itemsPerPage}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							>
								<option value="10">10</option>
								<option value="20">20</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
						</div>
					</div>
				{:else if activeTab === 'appearance'}
					<div class="space-y-6">
						<div>
							<label for="primary-color" class="block text-sm font-medium text-gray-700"
								>Primary Color</label
							>
							<div class="mt-1 flex items-center">
								<input
									type="color"
									id="primary-color"
									bind:value={primaryColor}
									class="h-10 w-16 border-0 p-0"
								/>
								<input
									type="text"
									bind:value={primaryColor}
									class="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								/>
							</div>
						</div>

						<div>
							<label for="accent-color" class="block text-sm font-medium text-gray-700"
								>Accent Color</label
							>
							<div class="mt-1 flex items-center">
								<input
									type="color"
									id="accent-color"
									bind:value={accentColor}
									class="h-10 w-16 border-0 p-0"
								/>
								<input
									type="text"
									bind:value={accentColor}
									class="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700">Preview</label>
							<div class="mt-2 rounded-lg border border-gray-200 p-4">
								<div class="mb-4 flex items-center justify-between">
									<h4 class="text-lg font-bold" style="color: {primaryColor}">Sample Header</h4>
									<button
										class="rounded px-3 py-1 text-white"
										style="background-color: {primaryColor}"
									>
										Primary Button
									</button>
								</div>
								<div class="rounded-lg p-3" style="background-color: {accentColor + '20'}">
									<p class="text-sm" style="color: {accentColor}">
										This is a sample text with accent color.
									</p>
								</div>
							</div>
						</div>
					</div>
				{:else if activeTab === 'account'}
					<div class="space-y-6">
						<div class="flex items-center">
							<div class="h-12 w-12 flex-shrink-0">
								<img
									class="h-12 w-12 rounded-full"
									src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
									alt=""
								/>
							</div>
							<div class="ml-4 flex-1">
								<p class="text-sm font-medium text-gray-900">John Doe</p>
								<p class="text-sm text-gray-500">john.doe@example.com</p>
							</div>
							<button
								class="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
							>
								Change Photo
							</button>
						</div>

						<div class="border-t border-gray-200 pt-6">
							<h4 class="mb-3 text-sm font-medium text-gray-900">Account Information</h4>
							<div class="space-y-4">
								<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div>
										<label for="first-name" class="block text-sm font-medium text-gray-700"
											>First Name</label
										>
										<input
											type="text"
											name="first-name"
											id="first-name"
											value="John"
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
										/>
									</div>

									<div>
										<label for="last-name" class="block text-sm font-medium text-gray-700"
											>Last Name</label
										>
										<input
											type="text"
											name="last-name"
											id="last-name"
											value="Doe"
											class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
										/>
									</div>
								</div>

								<div>
									<label for="email" class="block text-sm font-medium text-gray-700"
										>Email Address</label
									>
									<input
										type="email"
										name="email"
										id="email"
										value="john.doe@example.com"
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
									/>
								</div>
							</div>
						</div>

						<div class="border-t border-gray-200 pt-6">
							<h4 class="mb-3 text-sm font-medium text-gray-900">Security</h4>
							<div class="space-y-4">
								<button
									class="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
								>
									Change Password
								</button>

								<button
									class="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
								>
									Two-Factor Authentication
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>

			{#if activeTab !== 'account'}
				<div class="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
					{#if saveSuccess}
						<div class="mb-4 rounded-md bg-green-50 p-4">
							<div class="flex">
								<div class="flex-shrink-0">
									<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-green-800">Settings saved successfully</p>
								</div>
							</div>
						</div>
					{/if}

					<div class="flex justify-between">
						<button
							type="button"
							on:click={resetSettings}
							class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
						>
							Reset to Default
						</button>
						<button
							type="button"
							on:click={saveSettings}
							disabled={isSaving}
							class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
						>
							{#if isSaving}
								<svg
									class="mr-2 h-4 w-4 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Saving...
							{:else}
								Save Settings
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
