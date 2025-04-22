<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { getCourses, type Course as ImportedCourse } from '$lib/services/courseService';
	import {
		Chart,
		BarController,
		BarElement,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend
	} from 'chart.js';

	// Register Chart.js components
	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

	// Use imported Course type for consistency
	type Course = ImportedCourse;

	type StudentAttendance = {
		id: number;
		name: string;
		studentId: string;
		attendanceRate: number;
		presentCount: number;
		totalCount: number;
	};

	type CourseAttendance = {
		id: number;
		code: string;
		name: string;
		attendanceRate: number;
		sessionCount: number;
		students: StudentAttendance[];
		dateRanges: {
			date: string;
			rate: number;
		}[];
	};

	// State
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let courses = $state<Course[]>([]);
	let selectedCourse = $state<string>('');
	let startDate = $state<string>('');
	let endDate = $state<string>('');
	let courseReports = $state<CourseAttendance[]>([]);
	let lowAttendanceStudents = $state<StudentAttendance[]>([]);
	let attendanceChart = $state<any>(null);
	let chartCanvas = $state<HTMLCanvasElement | null>(null);
	let noAttendanceData = $state(false);

	onMount(async () => {
		try {
			isLoading = true;

			// Load course data
			const courseData = await getCourses();

			// Only include active and completed courses
			courses = courseData.filter((c) => c.status !== 'inactive' && c.status !== 'deleted');

			if (courses.length > 0) {
				selectedCourse = courses[0].code;
			}

			// Set default date range - last 30 days
			const end = new Date();
			const start = new Date();
			start.setDate(start.getDate() - 30);

			endDate = end.toISOString().split('T')[0];
			startDate = start.toISOString().split('T')[0];

			// Generate reports
			await generateReports();
		} catch (err) {
			console.error('Error loading report data:', err);
			error = err instanceof Error ? err.message : 'Failed to load report data';
		} finally {
			isLoading = false;
		}
	});

	// Generate reports based on selected parameters
	async function generateReports(): Promise<void> {
		try {
			isLoading = true;
			error = null;
			noAttendanceData = false;

			if (!selectedCourse) return;

			const course = courses.find((c) => c.code === selectedCourse);
			if (!course) return;

			// Check if table exists first to avoid errors
			try {
				const { count, error: tableCheckError } = await supabase
					.from('attendance_sessions')
					.select('*', { count: 'exact', head: true });

				if (tableCheckError) {
					if (tableCheckError.code === '42P01') {
						error =
							'The attendance tables do not exist in your database yet. Please set them up first.';
					} else {
						error = tableCheckError.message;
					}
					isLoading = false;
					return;
				}
			} catch (err) {
				console.error('Error checking if tables exist:', err);
				error = 'There was a problem connecting to the database.';
				isLoading = false;
				return;
			}

			// Get attendance sessions for this course
			const { data: sessions, error: sessionsError } = await supabase
				.from('attendance_sessions')
				.select('*')
				.eq('course_id', course.id)
				.gte('date', startDate)
				.lte('date', endDate)
				.order('date');

			if (sessionsError) {
				console.error('Error fetching sessions:', sessionsError);
				error = `Failed to fetch attendance sessions: ${sessionsError.message}`;
				isLoading = false;
				return;
			}

			if (!sessions || sessions.length === 0) {
				// No attendance data for this period
				noAttendanceData = true;
				courseReports = [
					{
						id: course.id,
						code: course.code,
						name: course.name,
						attendanceRate: 0,
						sessionCount: 0,
						students: [],
						dateRanges: []
					}
				];
				isLoading = false;
				return;
			}

			// Get all attendance records for these sessions
			const sessionIds = sessions.map((s) => s.id);

			const { data: records, error: recordsError } = await supabase
				.from('attendance_records')
				.select(
					`
          id,
          session_id,
          student_id,
          status
        `
				)
				.in('session_id', sessionIds);

			if (recordsError) {
				error = `Failed to fetch attendance records: ${recordsError.message}`;
				isLoading = false;
				return;
			}

			// Get enrolled students for this course
			const { data: students, error: studentsError } = await supabase.from('students').select('*');

			if (studentsError) {
				error = `Failed to fetch students: ${studentsError.message}`;
				isLoading = false;
				return;
			}

			// Filter to students enrolled in this course
			const enrolledStudents = students.filter(
				(s) => s.courses && Array.isArray(s.courses) && s.courses.includes(selectedCourse)
			);

			if (enrolledStudents.length === 0) {
				noAttendanceData = true;
				courseReports = [
					{
						id: course.id,
						code: course.code,
						name: course.name,
						attendanceRate: 0,
						sessionCount: sessions.length,
						students: [],
						dateRanges: []
					}
				];
				isLoading = false;
				return;
			}

			// Calculate attendance by student
			const studentMap: Map<number, StudentAttendance> = new Map();

			enrolledStudents.forEach((student) => {
				studentMap.set(student.id, {
					id: student.id,
					name: student.name || 'Unknown Student',
					studentId: student.student_id || 'No ID',
					attendanceRate: 0,
					presentCount: 0,
					totalCount: 0
				});
			});

			// Process attendance records
			if (records) {
				records.forEach((record) => {
					const studentId = record.student_id;
					if (studentMap.has(studentId)) {
						const studentData = studentMap.get(studentId)!;
						studentData.totalCount++;
						if (record.status === 'present') {
							studentData.presentCount++;
						}
					}
				});
			}

			// Calculate rates
			studentMap.forEach((student) => {
				if (student.totalCount > 0) {
					student.attendanceRate = (student.presentCount / student.totalCount) * 100;
				}
			});

			// Create date-based rates for chart
			const dateRates = sessions.map((session) => {
				return {
					date: new Date(session.date).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric'
					}),
					rate:
						session.total_students > 0
							? (session.present_students / session.total_students) * 100
							: 0
				};
			});

			// Overall course attendance rate
			let totalPresent = 0;
			let totalStudents = 0;

			sessions.forEach((session) => {
				totalPresent += session.present_students || 0;
				totalStudents += session.total_students || 0;
			});

			const overallRate = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

			// Compile report
			courseReports = [
				{
					id: course.id,
					code: course.code,
					name: course.name,
					attendanceRate: overallRate,
					sessionCount: sessions.length,
					students: Array.from(studentMap.values()).sort(
						(a, b) => b.attendanceRate - a.attendanceRate
					),
					dateRanges: dateRates
				}
			];

			// Find students with low attendance (<70%)
			lowAttendanceStudents = Array.from(studentMap.values())
				.filter((student) => student.totalCount > 0 && student.attendanceRate < 70)
				.sort((a, b) => a.attendanceRate - b.attendanceRate);

			// Draw chart
			setTimeout(() => {
				if (chartCanvas) {
					drawAttendanceChart();
				}
			}, 100);
		} catch (err) {
			console.error('Error generating reports:', err);
			error = err instanceof Error ? err.message : 'Failed to generate reports';
		} finally {
			isLoading = false;
		}
	}

	// Draw attendance chart
	function drawAttendanceChart(): void {
		if (!chartCanvas || courseReports.length === 0) return;

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		// Destroy existing chart
		if (attendanceChart) {
			attendanceChart.destroy();
		}

		const report = courseReports[0];

		// Create chart
		attendanceChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: report.dateRanges.map((d) => d.date),
				datasets: [
					{
						label: 'Attendance Rate (%)',
						data: report.dateRanges.map((d) => d.rate),
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
	}

	// Format percentage
	function formatPercentage(value: number): string {
		return value.toFixed(1) + '%';
	}

	// Export report as CSV
	function exportReportToCsv(): void {
		if (courseReports.length === 0) {
			alert('No data to export');
			return;
		}

		const report = courseReports[0];

		// Create CSV content
		let csvContent = `Course Attendance Report: ${report.code} - ${report.name}\n`;
		csvContent += `Date Range: ${startDate} to ${endDate}\n`;
		csvContent += `Sessions: ${report.sessionCount}\n`;
		csvContent += `Overall Attendance Rate: ${formatPercentage(report.attendanceRate)}\n\n`;

		// Student data
		csvContent += 'Student ID,Student Name,Attendance Rate,Present Sessions,Total Sessions\n';

		report.students.forEach((student) => {
			csvContent += `${student.studentId},${student.name},${formatPercentage(student.attendanceRate)},${student.presentCount},${student.totalCount}\n`;
		});

		// Create download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute(
			'download',
			`attendance_report_${report.code}_${startDate}_to_${endDate}.csv`
		);
		link.style.display = 'none';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// Apply changes and regenerate reports
	function applyChanges(): void {
		generateReports();
	}
</script>

<svelte:head>
	<title>Attendance Reports - Class Attendance Tracker</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="mb-6 flex flex-col justify-between md:flex-row md:items-center">
		<h1 class="text-3xl font-bold text-gray-800">Attendance Reports</h1>
		<div class="mt-4 flex space-x-3 md:mt-0">
			<button
				class="flex items-center rounded-md border bg-white px-4 py-2 text-gray-700 shadow-sm hover:bg-gray-50"
				onclick={() => history.back()}
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back
			</button>
			<button
				class="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
				onclick={exportReportToCsv}
			>
				<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				Export Report
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div>
				<label for="course" class="mb-1 block text-sm font-medium text-gray-700">Course</label>
				<select
					id="course"
					bind:value={selectedCourse}
					class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				>
					{#each courses as course}
						<option value={course.code}>{course.code} - {course.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="startDate" class="mb-1 block text-sm font-medium text-gray-700"
					>Start Date</label
				>
				<input
					type="date"
					id="startDate"
					bind:value={startDate}
					class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>

			<div>
				<label for="endDate" class="mb-1 block text-sm font-medium text-gray-700">End Date</label>
				<input
					type="date"
					id="endDate"
					bind:value={endDate}
					class="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
				/>
			</div>

			<div class="flex items-end">
				<button
					type="button"
					class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					onclick={applyChanges}
				>
					Apply Filters
				</button>
			</div>
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
					<h3 class="text-sm font-medium text-red-800">Error</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>

					<!-- Add database setup instructions when tables don't exist -->
					{#if error.includes('tables') || error.includes('does not exist')}
						<div class="mt-3 rounded-md bg-red-100 p-3">
							<h4 class="text-sm font-medium text-red-800">Database Setup Required</h4>
							<p class="mt-1 text-sm text-red-700">
								You need to create attendance tables in your database:
							</p>
							<ol class="mt-2 list-decimal pl-5 text-sm text-red-700">
								<li>Go to your Supabase dashboard</li>
								<li>Open the SQL Editor</li>
								<li>Create a new query</li>
								<li>Copy and paste the SQL below</li>
								<li>Run the query</li>
								<li>Refresh this page</li>
							</ol>
							<pre class="mt-3 max-h-64 overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_students INTEGER DEFAULT 0,
    present_students INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_id ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);

-- Set up RLS policies
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to attendance_sessions" 
    ON public.attendance_sessions FOR SELECT USING (true);
    
CREATE POLICY "Allow public insert to attendance_sessions" 
    ON public.attendance_sessions FOR INSERT WITH CHECK (true);
    
CREATE POLICY "Allow public update to attendance_sessions" 
    ON public.attendance_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public access to attendance_records" 
    ON public.attendance_records FOR SELECT USING (true);
    
CREATE POLICY "Allow public insert to attendance_records" 
    ON public.attendance_records FOR INSERT WITH CHECK (true);
    
CREATE POLICY "Allow public update to attendance_records" 
    ON public.attendance_records FOR UPDATE USING (true);</pre>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else if noAttendanceData || (courseReports.length > 0 && courseReports[0].students.length === 0)}
		<div class="rounded-lg bg-white py-8 text-center shadow">
			<p class="text-gray-500">
				No attendance data available for the selected course and date range.
			</p>
			<p class="mt-2 text-sm text-gray-400">
				Try selecting a different course or expanding the date range.
			</p>
			{#if selectedCourse}
				<a
					href="/attendance/take/{courses.find((c) => c.code === selectedCourse)?.id}"
					class="mt-4 inline-flex items-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
				>
					<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					Take attendance for this course
				</a>
			{/if}
		</div>
	{:else if courseReports.length > 0}
		<!-- Course Report -->
		{#each courseReports as report}
			<div class="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
				<!-- Report Summary -->
				<div class="lg:col-span-1">
					<div class="overflow-hidden rounded-lg bg-white shadow">
						<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
							<h2 class="text-lg leading-6 font-medium text-gray-900">Report Summary</h2>
						</div>
						<div class="px-4 py-5 sm:p-6">
							<dl class="grid grid-cols-1 gap-5">
								<div class="overflow-hidden rounded-lg bg-gray-50 px-4 py-5 sm:p-6">
									<dt class="truncate text-sm font-medium text-gray-500">
										Overall Attendance Rate
									</dt>
									<dd class="mt-1 text-3xl font-semibold text-gray-900">
										{formatPercentage(report.attendanceRate)}
									</dd>
								</div>
								<div class="overflow-hidden rounded-lg bg-gray-50 px-4 py-5 sm:p-6">
									<dt class="truncate text-sm font-medium text-gray-500">Total Sessions</dt>
									<dd class="mt-1 text-3xl font-semibold text-gray-900">{report.sessionCount}</dd>
								</div>
								<div class="overflow-hidden rounded-lg bg-gray-50 px-4 py-5 sm:p-6">
									<dt class="truncate text-sm font-medium text-gray-500">Total Students</dt>
									<dd class="mt-1 text-3xl font-semibold text-gray-900">
										{report.students.length}
									</dd>
								</div>
							</dl>
						</div>
					</div>
				</div>

				<!-- Attendance Chart -->
				<div class="lg:col-span-2">
					<div class="overflow-hidden rounded-lg bg-white shadow">
						<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
							<h2 class="text-lg leading-6 font-medium text-gray-900">Attendance Trends</h2>
						</div>
						<div class="px-4 py-5 sm:p-6">
							<div class="h-64">
								<canvas bind:this={chartCanvas}></canvas>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Student Attendance Table -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 px-4 py-5 sm:px-6">
					<h2 class="text-lg leading-6 font-medium text-gray-900">Student Attendance</h2>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Student</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Total Sessions</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Present</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>Attendance %</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each report.students as student}
								<tr>
									<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
										{student.name}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
										{student.totalCount}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
										{student.presentCount}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											<span class="text-sm text-gray-900"
												>{formatPercentage(student.attendanceRate)}</span
											>
											<div class="ml-2 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
												<div
													class="h-full bg-green-500"
													style={`width: ${Math.min(student.attendanceRate, 100)}%`}
												></div>
											</div>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/each}

		<!-- Low Attendance Alert -->
		{#if lowAttendanceStudents.length > 0}
			<div class="mt-6 overflow-hidden rounded-lg bg-yellow-50 shadow">
				<div class="border-b border-yellow-200 px-4 py-5 sm:px-6">
					<h2 class="text-lg leading-6 font-medium text-yellow-800">
						Students Requiring Attention
					</h2>
					<p class="mt-1 text-sm text-yellow-600">
						The following students have attendance rates below 70% and may require intervention.
					</p>
				</div>
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-yellow-200">
						<thead class="bg-yellow-50">
							<tr>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-yellow-700 uppercase"
									>Student</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-yellow-700 uppercase"
									>ID</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-yellow-700 uppercase"
									>Attendance Rate</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-yellow-200 bg-yellow-50">
							{#each lowAttendanceStudents as student}
								<tr>
									<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-yellow-900">
										{student.name}
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-yellow-700">
										{student.studentId}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											<span class="text-sm font-bold text-yellow-900"
												>{formatPercentage(student.attendanceRate)}</span
											>
											<div class="ml-2 h-2 w-32 overflow-hidden rounded-full bg-yellow-200">
												<div
													class="h-full bg-red-500"
													style={`width: ${Math.min(student.attendanceRate, 100)}%`}
												></div>
											</div>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
