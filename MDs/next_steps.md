# Project Roadmap & Next Steps

This document outlines planned feature enhancements, security integrations, and production readiness steps for the **University Digital Visitor Logbook & Interactive Map Application** (`calapexis`).

---

## 1. Supabase Authentication & Role-Based Access Control (RBAC)
- **Supabase Auth Integration**: Update [`src/routes/login/+page.svelte`](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/login/+page.svelte) to use live `supabase.auth.signInWithPassword()`.
- **SvelteKit Server Hooks (`src/hooks.server.ts`)**: Implement session validation using `@supabase/ssr` to protect `/admin` routes from unauthorized access.
- **Admin & Security Roles**: Add a `profiles` table with `role` attributes (`admin`, `security_officer`, `receptionist`) to grant granular permissions.

---

## 2. Real-Time Visitor Location & Building Checkpoint Tracking
- **Checkpoint Database Schema**: Extend `visitors` table with `current_room_id`, `current_building`, and `last_scanned_at` columns.
- **Location Checkpoint QR Scans**: Place unique QR codes outside campus buildings/rooms so visitors can scan them on their mobile phones to update their active location.
- **Live Security Map Heatmap**: Display live visitor density pins on the Leaflet map ([`LeafletMap.svelte`](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/lib/components/map/LeafletMap.svelte)) for real-time security tracking.

---

## 3. Supabase Realtime Subscriptions
- Connect live database listeners on the Admin Dashboard ([`src/routes/admin/+page.svelte`](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/admin/+page.svelte)) via `supabase.channel('public:visitors')`.
- Automatically update logbook records and active counts whenever a new visitor checks in or checks out without needing manual page refreshes.

---

## 4. Security Gate QR Code Scanner
- Integrate a client-side QR scanner library (`html5-qrcode` or `@zxing/library`) into the Admin portal.
- Allow gate security personnel to scan visitor mobile passes (`VP-XXXX`) for entry validation, location updates, and exit check-outs.

---

## 5. Visitor Pass Downloads & Audit Log Exports
- **Pass Export**: Add an "Export Digital Pass (PNG/PDF)" feature on the check-in confirmation view ([`src/routes/checkin/+page.svelte`](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/checkin/+page.svelte)).
- **Admin CSV Export**: Add a "Download Visitor Log (CSV)" button on the admin page for daily visitor reporting and university compliance audits.
