/**
 * Utility functions for handling CSV data
 */

/**
 * Parses CSV content into array of objects
 * @param csvContent Raw CSV content as string
 * @param requiredHeaders Array of headers that must be present
 * @returns Array of objects with properties matching CSV headers
 */
export function parseCSV(csvContent: string, requiredHeaders: string[] = []) {
	const lines = csvContent.split('\n');
	if (lines.length < 2) throw new Error('CSV must contain at least a header row and one data row');

	// Parse headers
	const headers = lines[0].split(',').map((h) => h.trim());

	// Validate required headers
	const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
	if (missingHeaders.length > 0) {
		throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
	}

	// Parse data rows
	const data = [];

	for (let i = 1; i < lines.length; i++) {
		if (!lines[i].trim()) continue;

		// Handle quoted values with commas inside
		const row: Record<string, string> = {};
		let fieldValue = '';
		let inQuotes = false;
		let currentField = 0;

		for (let j = 0; j < lines[i].length; j++) {
			const char = lines[i][j];

			if (char === '"' && (j === 0 || lines[i][j - 1] !== '\\')) {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				// End of field
				if (currentField < headers.length) {
					row[headers[currentField]] = fieldValue.replace(/""/g, '"');
					fieldValue = '';
					currentField++;
				}
			} else {
				fieldValue += char;
			}
		}

		// Add the last field
		if (currentField < headers.length) {
			row[headers[currentField]] = fieldValue.replace(/""/g, '"');
		}

		data.push(row);
	}

	return data;
}

/**
 * Create a CSV string from an array of objects
 * @param data Array of objects to convert to CSV
 * @param headers Array of headers to include (and their order)
 * @returns CSV content as string
 */
export function createCSV(data: any[], headers: string[]) {
	// Create header row
	let csvContent = headers.join(',') + '\n';

	// Add data rows
	data.forEach((item) => {
		const row = headers.map((header) => {
			const value = String(item[header] ?? '');

			// Escape commas and quotes
			if (value.includes(',') || value.includes('"')) {
				return `"${value.replace(/"/g, '""')}"`;
			}
			return value;
		});

		csvContent += row.join(',') + '\n';
	});

	return csvContent;
}

/**
 * Download data as a CSV file
 * @param csvContent CSV content as string
 * @param filename Filename for the download
 */
export function downloadCSV(csvContent: string, filename: string) {
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.display = 'none';
	document.body.appendChild(link);

	link.click();

	// Clean up
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Format Mat No. according to required pattern
 * @param matNo The Mat No. to format
 * @returns Formatted Mat No.
 */
export function formatMatNo(matNo: string): string {
	// Remove any whitespace
	matNo = matNo.trim();

	// Check if already correctly formatted
	if (matNo.match(/^U\d{4}\/\d{7}$/)) {
		return matNo;
	}

	// Try to correct common format issues
	// 1. Missing 'U' prefix
	// 2. Wrong separator or no separator
	const corrected = matNo.replace(/^U?(\d{4})[\s\/\\-]?(\d{7})$/, 'U$1/$2');

	return corrected;
}

/**
 * Create a sample CSV template for student import
 * @returns CSV content as string for a template
 */
export function createSampleTemplate(): string {
	const headers = ['Name', 'Mat No.', 'Email', 'Courses'];
	const sampleData = [
		{
			Name: 'John Doe',
			'Mat No.': 'U2020/5570099',
			Email: 'john.doe@example.com',
			Courses: 'CS101;CS202'
		},
		{
			Name: 'Jane Smith',
			'Mat No.': 'U2021/5570045',
			Email: 'jane.smith@example.com',
			Courses: 'CS101;CS301;CS310'
		}
	];

	return createCSV(sampleData, headers);
}
