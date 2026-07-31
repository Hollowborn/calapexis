# Calapexis Project Context & State

This file serves as the source of truth for the Calapexis project state, database schemas, environment setups, and coding conventions.

---

## 🛠️ Technology Stack & Architecture
- **Framework**: SvelteKit (Svelte 5)
- **Styling**: Tailwind CSS & Lucide Icons (using Svelte 5 compatible packages)
- **UI Toolkit**: shadcn-svelte components
- **Backend/Database**: Supabase (Auth, PostgreSQL database, and Storage)

---

## 📦 Supabase Integration & elevated server client
To query Supabase, the project uses [src/lib/supabase.ts](file:///C:/Users/Charles/Programming/GitHub/calapexis/src/lib/supabase.ts):
- **Client-Side**: Uses the standard anonymous client initialized with `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Server-Side**: Uses the custom `getDbClient()` helper:
  - If `SUPABASE_SERVICE_ROLE_KEY` is configured in the environment, it initializes a client using the elevated service role key to bypass database RLS policies safely.
  - SvelteKit server loaders/actions enforce role verification before triggering database updates.

### Required `.env` Variables:
```env
PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_secret_key
```

---

## 💾 Database Schema & Storage Bucket State

### Storage Bucket: `campus-assets`
- Handles building landmark and room photos.
- **RLS Policies**:
  - `SELECT`: Public access.
  - `INSERT` / `UPDATE` / `DELETE`: Authenticated users where `public.get_user_role(auth.uid()) = 'admin'`.

### Custom Database Functions:
```sql
-- Role resolver that runs as owner (bypasses RLS to avoid circular recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Table Schema Mappings:
- **`buildings`**: `id` (UUID), `name` (TEXT), `code` (TEXT UNIQUE), `floors` (INT), `image_url` (TEXT), coordinates, color.
- **`rooms`**: `id` (UUID), `building_id` (UUID, ON DELETE CASCADE), `room_number` (TEXT), `room_name` (TEXT), `image_url` (TEXT), floor, coordinates.
- **`profiles`**: `id` (UUID references auth.users), `email` (TEXT), `role` (admin/security/staff), `room_id` (UUID references rooms).
- **`visitors`**: `id` (UUID), `full_name`, `email`, `phone`, `purpose`, `building_id`, `room_id`, `check_in_time`, `check_out_time`, `status` (checked_in/checked_out/expired), `verification_status` (pending/approved/rejected), `pass_code` (unique).

---

## 🗺️ Key Routes & Layouts
- **`/login`**: Password login using Supabase Auth. Dynamically auto-provisions a matching database row in `public.profiles` if missing on first login.
- **`/dashboard`**: Unified portal that renders a nested collapsible double sidebar (modeled after `sidebar-09` template).
  - Uses reactive `activeView = $state(...)` to swap viewports instantly.
  - Automatically filters sidebar groups based on user roles (`admin` sees all 6 views; `staff` and `security` see restricted operational options).
- **`/prototypes`**: Interactive gallery of 7 distinct dashboard layout wireframes.

---

## 📐 Project Conventions & Coding Rules

### 1. File Locations
- All new `.md` files (excluding `GEMINI.md`) must be placed in the `/MDs` directory.

### 2. Svelte 5 / shadcn-svelte Rules
- **Event Handling**: Use Svelte 5 `onclick` rather than legacy `on:click` directives on all elements.
- **Select Components**:
  - Always include a `type` attribute (either `single` or `multiple`).
  - Do NOT use `Select.Value`; instead, use a `span` element with appropriate styling to display values.
- **Popover / Dialog Triggers**:
  - Do NOT use `asChild` or `let:builder` with `Popover.Trigger`, `Dialog.Trigger`, or `DropdownMenu.Trigger`. Place the inner component (e.g. `<Button>`) directly inside.
- **Dynamic Table Badges**:
  - Define Svelte snippets for cells inside page views.
  - Cycle through background color variables (`oklch(from var(--variable-name) l c h / alpha)`) using a hash code on the string value (like a program or room name) to guarantee visual consistency.
