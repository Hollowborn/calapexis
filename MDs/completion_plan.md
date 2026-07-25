# Roadmap for Calapexis Completion & UX Polish

This roadmap outlines the precise steps, architectural changes, and UX enhancements necessary to transition Calapexis from its current state to a fully completed, production-ready website.

## 1. Redirecting Standalone Portal Routes to /dashboard
To ensure clean role-based access control (RBAC) and avoid code duplication:
- Standalone routes `/admin`, `/security`, and `/staff` will issue a server-side redirect (303) directly to `/dashboard`.
- Redirection mapping:
  - `/admin` -> `/dashboard` (opens Analytics view)
  - `/security` -> `/dashboard` (opens Security Desk Console)
  - `/staff` -> `/dashboard` (opens Staff Desk Console)

## 2. Theme Switching (Light/Dark Mode Integration)
Integrate Svelte's `mode-watcher` library to persist dark/light theme options inside localStorage and support custom theme configurations across the entire site.
- **Action Plan**:
  - Add `<ModeWatcher />` component at the root layout of the site.
  - Create a reusable `$lib/components/theme-toggle.svelte` component.
  - Embed the theme toggle button in page headers (Landing page, Check-in page, Map page, and Unified Dashboard header).

## 3. Print-to-PDF / Report Layout for Exporting Logs
Instead of just CSV, provide a beautifully formatted PDF/Print report:
- **Action Plan**:
  - Create a print-specific stylesheet via CSS `@media print` rules in `src/app.css` to format report tables on a white background, remove standard header/sidebar panels, hide actions buttons, and resize tables for letter paper size.
  - Add a "Print Report" action to the Logbook Master dashboard view to trigger `window.print()`, allowing the user to save it directly as a styled PDF.

## 4. Map Boundaries & Navigation Path
Configure custom boundaries for LeafletMap using local settings and align pathfinding routes to match the primary theme color.
- **Action Plan**:
  - Expose a clear map boundaries setup block at the top of the `<script>` block in `LeafletMap.svelte` where boundaries can easily be configured.
  - Recolor the directional waypoint route polyline using the primary theme color variable (`oklch(0.491 0.27 292.581)`).

## 5. Dynamic Toasts & Event Feedback
Polish all action buttons and form feedback using `svelte-sonner` toast alerts:
- Toasts for login, logout, check-in, check-out, provisioning, and simulation scans.
