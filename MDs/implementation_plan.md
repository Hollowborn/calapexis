# Implementation Plan: Campus Buildings & Rooms Configuration Desk

This plan details proposed architectural and visual upgrades to the Campus landmarks administration portal at [offices/+page.svelte](file:///c:/Users/Charles/Programming/GitHub/calapexis/src/routes/dashboard/admin/offices/+page.svelte).

---

## Architectural Critique & Layout Improvements

### 1. Architectural Terminology: "Offices" vs. "Buildings / Landmarks"
* **Critique:** The current entity name `Office` is confusing because an office is historically a *room* (e.g., "Registrar Office") housed inside a *building* (e.g., "Administration Building"). Currently, the database schema treats `offices` as parent landmarks containing `rooms`, which creates cognitive friction.
* **Proposal:** We should update the user interface copy, forms, and headers to refer to **"Buildings & Landmarks"** instead of "Offices." For example:
  * "Offices Config" $\rightarrow$ **"Campus Buildings & Landmarks"**
  * "Add Campus Office" $\rightarrow$ **"Add Building / Landmark"**
  * We will keep the underlying database tables (`public.offices` and `public.rooms`) and TypeScript models unchanged to ensure backward compatibility and prevent breaking references elsewhere in the app.

### 2. Reddit-style Image Upload Integration
* **Critique:** Admins currently have to manually paste public image URL links (like `/assets/cs/office.jpg`), which is extremely user-unfriendly and error-prone.
* **Proposal:** Implement an interactive drag-and-drop file uploader inside the creation modal:
  * Selecting an image displays a live preview card with an "x" close button to remove it (matching Reddit's posting interface).
  * On submit, the SvelteKit action (or client-side handler) uploads the file to a Supabase storage bucket named `campus-assets`.
  * The resulting public URL is saved to the database.
  * If no image is uploaded, it falls back to a clean placeholder building illustration.

### 3. Simplified, Categorized Form Layout
* **Critique:** The current creation modal has a dense grid of inputs without visual hierarchy. Required and optional parameters are mixed together.
* **Proposal:** Restructure the form into distinct, separated sections:
  1. **Core Information (Required):** Title, Code, Landmark Type (Building, Gate, Landmark).
  2. **Location Parameters (Optional):** Latitude, Longitude, Pin Marker Color.
  3. **Visual Representation (Optional):** Image upload drag area.
  4. **Contact Information (Optional):** Head of Department, Contact Email.

### 4. Right-Side Sheet Room Management Center
* **Critique:** Managing classrooms and labs within a building is currently done using inline collapsible panels or floating dialogs, which either cramp the fields or break focus context.
* **Proposal:** Use the shadcn-svelte **`<Sheet>` (Side Drawer)** component as a dedicated room management center for each building:
  * **Unified Room Panel:** Clicking a building card's "Manage Rooms" button opens a right-side Sheet slide-out.
  * **Interactive Listings:** The top of the Sheet displays a scrollable list of current rooms registered inside that building, with floor/room badges and direct trash delete buttons.
  * **Reddit-Style Room Form:** The bottom of the Sheet houses a dedicated "Provision Room" form. This allows admins to type details, upload room photos, and add multiple rooms sequentially. The Sheet remains open, appending new rooms to the scrollable list above immediately upon submission.

---

## Proposed Changes

### [Component Name] Campus Configuration Desk

#### [MODIFY] [offices/+page.svelte](file:///c:/Users/Charles/Programming/GitHub/calapexis/src/routes/dashboard/admin/offices/+page.svelte)
* Rename all UI headings and placeholders to "Buildings & Landmarks."
* Rebuild the building creation dialog as a right-side Sheet panel with the simplified categorized sections and Reddit-style image selector.
* Replace expandable inline templates with a dedicated Svelte `<Sheet>` component for unified building room management.

#### [MODIFY] [offices/+page.server.ts](file:///c:/Users/Charles/Programming/GitHub/calapexis/src/routes/dashboard/admin/offices/+page.server.ts)
* Update SvelteKit actions to handle `multipart/form-data` uploads.
* Add helper functions to upload files to Supabase Storage bucket `campus-assets`.

---

## Verification Plan

### Automated Tests
* Validate component compilation:
  ```bash
  npm run check
  ```

### Manual Verification
* Deploy the updated build locally.
* Create a building, upload a JPEG/PNG photo, and verify it successfully displays in the gallery cards.
* Expand the building card, add a computer lab room, and verify it links correctly in the database.
