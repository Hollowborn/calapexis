# Implementation Plan: Campus Buildings & Rooms Database Schema Refactor

This document proposes a plan to refactor the database schema, models, backend mappers, and UI routes to transition from the "Office-centric" terminology to a unified "Building-centric" layout.

---

## Proposed Database Refactor ([schema.sql](file:///c:/Users/Charles/Programming/GitHub/calapexis/supabase/schema.sql))

We will overwrite the tables and foreign keys in our Supabase schema to simplify columns and resolve redundancies.

### 1. Refactor `public.offices` to `public.buildings`
* Rename the table `public.offices` $\rightarrow$ `public.buildings`.
* **Remove Column:** `building` (redundant, since the table represents the building landmark itself).
* **Refactor Column:** `floor TEXT` $\rightarrow$ `floors INTEGER NOT NULL DEFAULT 1` (denotes the total floor count of the building landmark).

```sql
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    floors INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    head_person TEXT,
    contact_email TEXT,
    x_coord NUMERIC,
    y_coord NUMERIC,
    color TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2. Update `public.rooms`
* Rename foreign key column `office_id` $\rightarrow$ `building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE`.
* **Remove Column:** `building` (redundant, resolved by the parent `building_id` reference).
* Column `floor TEXT` is retained to specify *which floor* of the parent building this specific room lies on.

```sql
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_name TEXT NOT NULL,
    floor TEXT NOT NULL,
    x_coord NUMERIC NOT NULL,
    y_coord NUMERIC NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 3. Update Profiles & Visitors FKs
* In `public.profiles` (Staff Accounts): 
  * Replace the parent reference `office_id` with **`room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL`**. This binds staff members directly to their specific desk or department room (like the Guidance Office) rather than the whole building, giving them precise access.
* In `public.visitors` (Visitor logbook):
  * Rename `office_id` $\rightarrow$ `building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL` (maintains building-level check-ins and maps).
  * Keep `room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL` (identifies the specific room/office being visited).
  * Rename `office_name` $\rightarrow$ `building_name TEXT`.
* Update SQL trigger function `public.handle_new_user()` to insert the metadata `room_id` value into the profiles `room_id` column.

---

## Proposed Frontend Code Changes

### 1. TypeScript Types ([types.ts](file:///c:/Users/Charles/Programming/GitHub/calapexis/src/lib/types.ts))
* Rename interface `Office` $\rightarrow$ `Building` and update properties (`floors: number`, no `building` property).
* Refactor `officeId` $\rightarrow$ `buildingId` inside `Room`.
* Refactor `officeId` $\rightarrow$ `roomId` inside `Profile` to bind user accounts to specific rooms/desks.

### 2. Supabase Integration Layer ([supabase.ts](file:///c:/Users/Charles/Programming/GitHub/calapexis/src/lib/supabase.ts))
* Rename database CRUD controllers:
  * `getLocalOffices()` $\rightarrow$ `getLocalBuildings()`
  * `addLocalOffice()` $\rightarrow$ `addLocalBuilding()`
  * `deleteLocalOffice()` $\rightarrow$ `deleteLocalBuilding()`
* Map properties between Postgres snake_case and TypeScript camelCase:
  * `building_id` $\rightarrow$ `buildingId` inside rooms.
  * `room_id` $\rightarrow$ `roomId` inside profiles.
  * `floors` $\rightarrow$ `floors` inside buildings.

### 3. Rename Admin Route
* Rename folder `src/routes/dashboard/admin/offices` $\rightarrow$ `src/routes/dashboard/admin/buildings`.
* Update forms, SvelteKit actions (`createBuilding`, `deleteBuilding`, `createRoom`, `deleteRoom`), and dropdown menus.

### 4. Cascade References
* Update user registration forms in `src/routes/dashboard/admin/users/` to list rooms and bind accounts to specific `roomId`s.
* Update visitors check-in forms and interactive map markers in `src/routes/map/` and `/checkin`.

---

## Verification Plan

### Automated Checks
* Validate TypeScript types and page compiles:
  ```bash
  npm run check
  ```

### Manual Verification
* Re-run SQL migrations inside Supabase SQL Editor.
* Navigate to the updated `/dashboard/admin/buildings` panel, add a building, set floors to `4`, upload an image, and verify the record registers.
* Verify room creation binds correctly inside the side Sheet.
