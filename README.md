# Class Attendance Tracker

A modern, full-featured classroom attendance management system designed for educators to efficiently track student attendance across multiple courses, generate comprehensive reports, and identify attendance patterns.

![Class Attendance Tracker](https://via.placeholder.com/1200x600?text=Class+Attendance+Tracker)

## Features

### Student Management

- Comprehensive student profiles with contact information
- Bulk import/export via CSV
- Student status tracking (active, inactive)
- Enrollment in multiple courses
- Individual attendance history and statistics

### Course Management

- Create and manage multiple courses
- Track course schedules and sessions
- Assign students to courses
- Course-specific attendance metrics
- Semester/term organization

### Attendance Tracking

- Quick attendance recording for entire classes
- Multiple attendance statuses (present, absent, late, excused)
- Real-time attendance rate calculations
- Historical attendance records
- Notes and comments for specific attendance events

### Reporting & Analytics

- Comprehensive attendance reports by course, student, or date range
- Visual analytics with charts and graphs
- Exportable reports in CSV format
- Low attendance alerts and thresholds
- Attendance trends and patterns identification

### User Interface

- Responsive design works on desktop and mobile
- Modern, clean interface with Tailwind CSS
- Real-time search across students, courses and records
- Dark/light mode theming
- Customizable display options

## Technology Stack

### Frontend

- **SvelteKit 5** - Modern, reactive UI framework with server and client components
- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **Chart.js** - Interactive data visualization
- **TypeScript** - Static typing for improved code quality and developer experience

### Backend

- **Supabase** - Open-source Firebase alternative with:
  - **PostgreSQL** - Powerful relational database
  - **Authentication** - User management and security
  - **Row Level Security** - Data protection policies
  - **Real-time subscriptions** - Live data updates
  - **REST API** - Simple data access

### Development Tools

- **Vite** - Fast, modern frontend build tool
- **Vitest** - Unit testing framework
- **ESLint** - Code quality and style enforcement
- **Prettier** - Code formatting

## Database Schema

The application uses the following core tables:

- **students** - Student information and metadata
- **courses** - Course details, schedules, and metadata
- **attendance_sessions** - Record of class meetings
- **attendance_records** - Individual student attendance entries
- **activity_logs** - System-wide event tracking

## Implementation

### Architecture

The application follows a modern client-server architecture with SvelteKit handling both server-side and client-side rendering for optimal performance. Supabase provides backend services including database, authentication, and storage.

### Key Design Patterns

- **Reactive Stores** - Svelte stores for state management
- **Service Modules** - Encapsulated data access layers
- **Component Composition** - Reusable UI components
- **Row-Level Security** - Database-level security policies

### Responsive Design

The interface is fully responsive with tailored experiences for:

- Desktop workstations
- Tablets
- Mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (free tier available)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/classAttendanceTracker.git
cd classAttendanceTracker
```

2. Install dependencies

```bash
npm install
# or
pnpm install
```

3. Set up environment variables (copy from .env.example)

```bash
cp .env.example .env
```

4. Update the .env file with your Supabase credentials

5. Run the database setup scripts (available in `/db` directory) in your Supabase SQL editor

6. Start the development server

```bash
npm run dev
```

7. Open http://localhost:5173 in your browser

## Usage Guide

### Taking Attendance

1. Navigate to the Attendance page
2. Click "Take Attendance"
3. Select a course and date
4. Mark students as present, absent, late, or excused
5. Add optional notes
6. Save the attendance record

### Generating Reports

1. Navigate to the Reports page
2. Select report type, date range, and other filters
3. Generate the report
4. View visualizations and data tables
5. Export to CSV if needed

### Importing Students

1. Go to the Students page
2. Click "Import Spreadsheet"
3. Select a CSV file with student data
4. Review and confirm the import

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Svelte](https://svelte.dev/)
- [SvelteKit](https://kit.svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.io/)
- [Chart.js](https://www.chartjs.org/)
