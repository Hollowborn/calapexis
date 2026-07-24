# Session Context: Calapexis Visitor Logbook & Navigation

This document preserves the architecture, directory changes, operational flows, and credentials for **Calapexis** to restore context for subsequent development sessions.

---

## 📁 Updated Directory & Route Map

The route structure inside `src/routes/` has been reorganized as follows:
- **`/login`** ([login/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/login)): The main portal entrance. Features the split card layout (formerly `login-04`) with SvelteKit server load handlers, secure cookies, and a premium static background.
- **`/login-1`** ([login-1/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/login-1)): The legacy simple credential input page (formerly `login`).
- **`/admin`** ([admin/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/admin)): The System Admin dashboard featuring traffic analytics, master logs, CSV exports, and office configurations.
- **`/security`** ([security/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/security)): The Security Guard desk with live active visitor grids, approval/rejection queues, scanner simulation inputs, and historical audits.
- **`/staff`** ([staff/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/staff)): The Office Staff portal for department-level assisted registration, printed office door QR generation, and quick occupancy checks.
- **`/checkin`** & **`/v`**: Public visitor registration wizard steps (First/Middle/Last names and webcam selfies are required).
- **`/map`**: Leaflet pixel map pathfinder guides.

---

## 🔑 Portals Access & Mock Credentials

All privileged portals are guarded server-side by [hooks.server.ts](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/hooks.server.ts). Access checks are based on the `session_role` cookie:

| Role Selector | Mock Username | Mock Password | Portal URL | Permitted Route Access |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `/admin` | `/admin`, `/security`, `/staff`, `/` |
| **Security** | `security` | `security123` | `/security` | `/security`, `/staff`, `/` |
| **Staff** | `staff` | `staff123` | `/staff` | `/staff`, `/` |

---

## 💾 Supabase Database Schema

The SQL migrations script resides at [supabase/schema.sql](file:///C:/Users/Charles/Programming/GitHub/calapexis/supabase/schema.sql) and contains definitions for:
1. `profiles`: Ties auth users to roles (`admin`, `security`, `staff`).
2. `offices` & `rooms`: Campus navigation targets.
3. `visitors`: Structured names (`first_name`, `middle_name`, `last_name`), live snapshot photos, gate times, office check-in states, and verification fields.
4. Row-Level Security (RLS) policies allowing public inserts but restricting list views to authenticated staff roles.
5. Trigger function `public.handle_new_user()` to auto-create profile rows upon signups.

---

## 🎨 UI Component Design Standards

All files adhere strictly to `.agents/skills/shadcn-svelte/rules`:
- **Form Layout**: Form inputs are wrapped in `Field.FieldGroup` + `Field.Field` with `flex flex-col gap-4` layouts instead of raw `space-y-*` or `grid` styles.
- **Select Trigger**: `Select.Root` elements always declare `type="single"`. Trigger contents avoid `Select.Value` and render selections inside static `span` tags.
- **Trigger Wrappers**: Popover and Select trigger wrappers do not use `asChild` or `let:builder`.
- **Event Handling**: Native handlers (`onclick`, `onsubmit`, `onchange`) are utilized in place of `on:click`.
- **Data Table Badges**: Theme-aware table cells leverage Svelte snippets with inline OKLCH color cycling styling calculated from string hashes.
