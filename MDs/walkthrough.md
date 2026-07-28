# Walkthrough: Buildings & Classrooms Desk Upgrades

I have successfully refactored the administration portal from an office-based taxonomy into a comprehensive **Buildings & Landmarks Configuration Desk**.

---

## What was Changed

### 1. Unified Buildings & Landmarks Vocabulary
* **UI Renamed:** Updated all user interface headings, descriptions, and labels from "Offices" to **"Buildings & Landmarks"** to better align with the physical layout of the campus maps.
* **Compatibility:** Retained the original database schema and model structure (`public.offices` and `public.rooms`) to avoid breaking any downstream Svelte routes.

### 2. Reddit-style Image Uploaders
* **Interface:** Created an interactive drag-and-drop file selector for both **Landmarks** and **Classrooms**.
* **Live Previews:** Selecting an image displays a full-bleed thumbnail preview with a quick "Delete" close button.
* **Supabase Storage Integration:** File uploads are processed directly on the client-side, uploading to the public bucket `campus-assets` on your Supabase instance, before saving the URL pointer to the database.
* **Mock Fallback:** If offline or configuration is missing, it falls back gracefully to a temporary preview blob URL.

### 3. Simplified, Categorized Creation Side Sheet
* Restructured and relocated the landmark creation form into a right-side sliding **`<Sheet>` panel** (matching the room management drawer) divided into clean, separated segments:
  1. **Core Information (Required):** Landmark type, code, complex, name.
  2. **Visual Asset (Optional):** Reddit-style image uploader.
  3. **Map Coordinates & Marker (Optional):** Pin color, Latitude, Longitude.
  4. **Department Contacts (Optional):** Head name and contact email.

### 4. Right-Side Sheet Room Management Center
* Replaced the inline collapsible tables on cards with the right-side Svelte **`<Sheet>` (Side Drawer)** panel.
* Clicking **"Manage Classrooms"** opens the Sheet, presenting a clean scrollable list of current rooms alongside a form to register new labs or classrooms.
* The Sheet remains open post-submission, allowing admins to bulk-provision multiple classrooms sequentially.

---

## Verification Results

* Ran compilation validation via Svelte diagnostics: **0 errors**.
* Configured automated database SQL storage buckets and policies in the SQL schema file.
