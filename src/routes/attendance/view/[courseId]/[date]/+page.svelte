<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	// Define types for the data
	interface Student {
		id: number;
		name: string;
		studentId: string;
		attendance: {
			status: 'present' | 'absent' | 'excused' | 'unknown';
			notes: string;
		};
	}

	interface Course {
		id: number;
		name: string;
		code: string;
	}

	interface Session {
		id: number;
		date: string;
		present_students: number;
		total_students: number;
		notes: string;
		created_at: string;
		updated_at: string | null;
	}

	interface PageData {
		course: Course;
		session: Session;
		students: Student[];
	}

	// Access the data from the server
	export let data: PageData;

	// Destructure with default empty values to prevent errors
	const course = data?.course || { id: 0, name: '', code: '' };
	const session = data?.session || {
		id: 0,
		date: new Date().toISOString().split('T')[0],
		present_students: 0,
		total_students: 0,
		notes: '',
		created_at: new Date().toISOString(),
		updated_at: null
	};
	const students = data?.students || [];

	// Format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Calculate attendance stats
	const totalStudents = students.length;
	const presentStudents = students.filter((s) => s.attendance.status === 'present').length;
	const absentStudents = students.filter((s) => s.attendance.status === 'absent').length;
	const attendanceRate =
		totalStudents > 0 ? ((presentStudents / totalStudents) * 100).toFixed(1) : '0.0';

	function getStatusClass(status: string): string {
		switch (status) {
			case 'present':
				return 'bg-green-100 text-green-800';
			case 'absent':
				return 'bg-red-100 text-red-800';
			case 'excused':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<svelte:head>
	<title>Attendance Record - {course.name}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<div class="mb-2 flex items-center">
			<button
				on:click={() => goto('/attendance')}
				class="mr-2 text-indigo-600 hover:text-indigo-800"
				aria-label="Back to attendance dashboard"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>
			<span class="text-sm text-gray-500">Back to Attendance Dashboard</span>
		</div>

		<div class="flex flex-col justify-between md:flex-row md:items-center">
			<div>
				<div
					class="mb-1 inline-flex items-center rounded-md bg-indigo-100 px-2.5 py-0.5 text-sm font-medium text-indigo-800"
				>
					{course.code}
				</div>
				<h1 class="text-3xl font-bold text-gray-800">Attendance Record</h1>
				<p class="text-gray-600">{course.name} • {formatDate(session.date)}</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Attendance summary -->
		<div class="lg:col-span-1">
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
					<h3 class="text-lg leading-6 font-medium text-gray-900">Attendance Summary</h3>
				</div>
				<div class="px-4 py-5 sm:p-6">
					<dl class="grid grid-cols-1 gap-5">
						<div class="overflow-hidden rounded-lg bg-gray-50 px-4 py-5 sm:p-6">
							<dt class="truncate text-sm font-medium text-gray-500">Attendance Rate</dt>
							<dd class="mt-1 text-3xl font-semibold text-gray-900">{attendanceRate}%</dd>
						</div>
						<div class="overflow-hidden rounded-lg bg-gray-50 px-4 py-5 sm:p-6">
							<dt class="truncate text-sm font-medium text-gray-500">Present</dt>
							<dd class="mt-1 text-3xl font-semibold text-gray-900">
								{presentStudents}/{totalStudents}
							</dd>
						</div>
						<div class="overflow-hidden rounded-lg bg-gray-50 px-4 py-5 sm:p-6">
							<dt class="truncate text-sm font-medium text-gray-500">Absent</dt>
							<dd class="mt-1 text-3xl font-semibold text-gray-900">
								{absentStudents}/{totalStudents}
							</dd>
						</div>
					</dl>

					<div class="mt-6">
						<h4 class="text-sm font-medium text-gray-500">Notes</h4>
						<p class="mt-1 text-sm text-gray-900">{session.notes || 'No notes'}</p>
					</div>

					<div class="mt-6 border-t border-gray-200 pt-4 text-xs text-gray-500">
						<p>Recorded on {formatDate(session.created_at || session.date)}</p>
						{#if session.updated_at && session.updated_at !== session.created_at}
							<p class="mt-1">Last modified on {formatDate(session.updated_at)}</p>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Student list -->
		<div class="lg:col-span-2">
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
					<h3 class="text-lg leading-6 font-medium text-gray-900">Student Attendance</h3>
				</div>
				<ul class="divide-y divide-gray-200">
					{#each students as student (student.id)}
						<li class="flex flex-col px-4 py-4 sm:px-6">
							<div class="flex items-center justify-between">
								<div class="flex items-center">
									<div class="h-10 w-10 flex-shrink-0">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600"
										>
											{student.name
												.split(' ')
												.map((n) => n[0])
												.join('')}
										</div>
									</div>
									<div class="ml-4">
										<div class="text-sm font-medium text-gray-900">{student.name}</div>
										<div class="text-sm text-gray-500">{student.studentId}</div>
									</div>
								</div>
								<div>
									<span
										class="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium {getStatusClass(
											student.attendance.status
										)}"
									>
										{student.attendance.status === 'present'
											? 'Present'
											: student.attendance.status === 'absent'
												? 'Absent'
												: student.attendance.status === 'excused'
													? 'Excused'
													: 'Unknown'}
									</span>
								</div>
							</div>
							{#if student.attendance.notes}
								<div class="mt-2 flex">
									<p class="text-sm text-gray-500">Note: {student.attendance.notes}</p>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</div>
