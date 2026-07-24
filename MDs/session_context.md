# Session Context: Calapexis Visitor Logbook & Navigation

This document preserves the architecture, directory changes, operational flows, and credentials for **Calapexis** to restore context for subsequent development sessions.

---

## 📁 Directory & Route Map

The route structure inside `src/routes/` is organized as follows:
- **`/login`** ([login/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/login)): The unified portal entrance. Uses SvelteKit server load handlers and forms with `toast.promise` notifications. Excludes selector tabs in production, with a collapsible Dev Quick Fill assistant in local development.
- **`/login-1`** ([login-1/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/login-1)): The legacy simple credential input page.
- **`/admin`** ([admin/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/admin)): The System Admin dashboard featuring traffic analytics, master logs, CSV exports, office configurations, and the **Accounts Provisioning Panel**.
- **`/security`** ([security/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/security)): The Security Guard desk with live active visitor grids, approval/rejection queues, scanner simulation inputs, and historical audits. Modals use the Svelte `Dialog` component.
- **`/staff`** ([staff/](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/routes/staff)): The Office Staff portal. Locked to the staff's assigned department if they have a bound `officeId`. Shows check-ins and check-outs for their specific department.

---

## 🔑 Portals Access & Secure Session Pipeline

All privileged portals are guarded server-side by [hooks.server.ts](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/hooks.server.ts).
- **Cookies**: Browser stores `session_role` and `session_office_id` in secure `httpOnly` state.
- **event.locals.session**: Parsed once per request in hooks and cached for request-lifecycle validation in all `+page.server.ts` loaders.

### Active Mock Accounts:
| User / Username | Mock Password | Access Role | Bound Department / Office | Permitted Access |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin123` | `admin` | *Global* | All pages |
| `security` | `security123` | `security` | *Global* | `/security`, `/staff` |
| `staff` | `staff123` | `staff` | `off-1` (Registrar) | `/staff` (Locked to Registrar) |

---

## 💾 Supabase Database Configuration & Live Queries

The database integrations query a live Supabase server. Helper functions in [src/lib/supabase.ts](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/lib/supabase.ts) are fully asynchronous and handle bidirectional field mappers between database `snake_case` fields and Svelte/TS `camelCase` parameters:
- `getLocalVisitors()`: Queries `visitors` table ordered by `check_in_time`.
- `addLocalVisitor(v)`: Inserts checking details and pass codes into `visitors`.
- `verifyVisitor(id, status, reason)`: Performs updates on security pass verifications.
- `updateOfficeCheckIn(id, checkIn)`: Modifies scanning arrival confirmations.
- `checkoutLocalVisitor(code)`: Updates checked out visitor timestamps.
- `getLocalProfiles()` & `addLocalProfile(...)`: Manages credential bindings on `profiles` table.

A robust offline memory store fallback is integrated within these helpers to ensure the local development environment remains fully functional if Supabase URL env configurations are missing or offline.

---

## 🎨 UI Component Design Standards

- **Dialog Modals**: Custom overlays are replaced with official `* as Dialog` modules from `$lib/components/ui/dialog` declaring `Dialog.Title` and `Dialog.Description` for accessibility.
- **Form Layout**: Form inputs are wrapped in `Field.FieldGroup` + `Field.Field` with `flex flex-col gap-4`.
- **Select Trigger**: `Select.Root` elements always declare `type="single"` and render selection values inside static `span` tags.
- **Event Handling**: Native Svelte 5 handlers (`onclick`, `onsubmit`, `onchange`) are utilized in place of `on:click`.
