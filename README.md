# Calapexis

Institutional Visitor Management and Interactive Campus Wayfinding System for Bohol Island State University (BISU) Calape Campus.

---

## Overview

**Calapexis** is a unified digital visitor logbook and interactive campus navigation platform. Designed to modernize manual paper logbooks, Calapexis streamlines visitor registration, automates pass verification, and provides real-time waypoint routing across university buildings, offices, and rooms.

The platform includes a self-service visitor kiosk, interactive Leaflet wayfinding, role-restricted operational consoles for campus security and department staff, and comprehensive audit logging with DOCX and PDF compliance exports.

---

## Key Capabilities

### 1. Visitor Registration & Digital Passes
- **Self-Service Kiosk (`/v`)**: Public web kiosk interface for visitor registration, host selection, and destination routing.
- **Digital Visitor Pass**: Generates unique alphanumeric passcodes and scannable QR codes for identity verification.
- **Dual Check-Out Support**: Visitors can check out via pass URL or QR scan; reception and security desks can perform assisted check-out.

### 2. Interactive Campus Navigation
- **Leaflet Wayfinding Engine**: Custom pixel-coordinate mapping (`L.CRS.Simple`) tailored to institutional campus layouts.
- **Pathfinding & Node Graph**: Visualizes walking paths, building entrances, floor levels, and destination rooms.
- **Quick Location Search**: Keyboard-accessible global search (`Ctrl + K`) for instant lookup of buildings, offices, and personnel.

### 3. Role-Based Consoles (`/dashboard`)
Access permissions are strictly enforced through Supabase Auth and database Row Level Security (RLS):

- **Administrator**:
  - Global visitor analytics and throughput metrics.
  - Campus infrastructure management (buildings, floor plans, rooms, offices).
  - Map network editor (waypoint nodes and path edges).
  - User account provisioning and role assignments (`admin`, `security`, `staff`).
- **Security Desk**:
  - Live visitor radar showing current occupants across campus landmarks.
  - Gate pass verification and immediate check-out capabilities.
  - Incident tracking and security log access.
- **Staff Desk**:
  - Department-level visitor tracking.
  - Appointment verification and room-level check-ins.

### 4. Auditing & Reporting
- **Master Logbook**: Centralized audit log with date, destination, status, and verification filters.
- **Document Export Engine**: Generates institutional-grade DOCX audit reports (`docxtemplater`) formatted with official headers, as well as printable PDF summaries (`html2pdf.js`).

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [SvelteKit 2](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev) (Runes architecture) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com), [shadcn-svelte](https://shadcn-svelte.com), Bits UI |
| **Icons** | Lucide Icons (`@lucide/svelte`) |
| **Mapping Engine** | [Leaflet](https://leafletjs.com) (`leaflet`, `@types/leaflet`) with custom CRS |
| **Database & Auth** | [Supabase](https://supabase.com) (PostgreSQL, Realtime subscriptions, Auth, Storage) |
| **Reporting & Export** | `docxtemplater`, `pizzip`, `html2pdf.js` |
| **QR Scanning** | `html5-qrcode` |
| **Language** | TypeScript |

---

## Project Structure

```text
calapexis/
├── src/
│   ├── app.html              # HTML shell and metadata
│   ├── lib/
│   │   ├── components/       # UI components (shadcn-svelte, navigation, modals)
│   │   │   ├── dashboard/    # Sidebar, data tables, role consoles
│   │   │   ├── map/          # Leaflet map viewers, path overlays
│   │   │   └── ui/           # Primitives (buttons, dialogs, dropdowns)
│   │   ├── supabase.ts       # Database client, schemas, fallback store
│   │   └── types.ts          # Core TypeScript interfaces and schemas
│   └── routes/
│       ├── +page.svelte      # Public landing page with Command Palette (Ctrl+K)
│       ├── login/            # Authentication portal
│       ├── v/                # Public visitor registration kiosk & navigation
│       └── dashboard/        # Role-based administration dashboard
│           ├── admin/        # Admin management (users, buildings, edges)
│           ├── logs/         # Master logbook & export tools
│           ├── security/     # Security desk & campus radar
│           └── staff/        # Department staff desk
├── static/                   # Static assets, campus map overlays, brand logos
└── MDs/                      # Architecture notes, plans, and diagrams
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** (or pnpm / yarn)
- **Supabase Project**: Hosted Supabase instance or local Supabase CLI

### Environment Setup

Create a `.env` file in the project root:

```env
PUBLIC_SUPABASE_URL="https://<your-project-id>.supabase.co"
PUBLIC_SUPABASE_PUBLISHABLE_KEY="<your-publishable-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-secret-key>"
```

> **Note**: If Supabase credentials are not supplied, Calapexis provides an in-memory fallback store populated with sample mock data for development and testing.

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Hollowborn/calapexis.git
   cd calapexis
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the local development server:
   ```sh
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with hot module reloading. |
| `npm run build` | Builds the optimized production application. |
| `npm run preview` | Previews the local production build. |
| `npm run check` | Runs SvelteKit type synchronization and `svelte-check` diagnostics. |
| `npm run check:watch` | Runs diagnostics in watch mode during development. |

---

## User Roles & Access Matrix

| Role | Default Landing | Permitted Capabilities |
| :--- | :--- | :--- |
| **Visitor** | `/v` | Self check-in, pass retrieval, campus wayfinding map. |
| **Staff** | `/dashboard/staff` | Office visitor queue, check-in validation, logbook view. |
| **Security** | `/dashboard/security` | Real-time map radar, gate verification, checkout processing. |
| **Admin** | `/dashboard` | System metrics, user accounts, campus infrastructure, full audit trail. |

---

## License

This project is developed for Bohol Island State University (BISU) Calape Campus. All rights reserved.
