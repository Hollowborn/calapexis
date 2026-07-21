# Tech Stack Reference Guide

## Overview
This document outlines the technical stack, architecture, and core conventions for the **University Visitor Logbook & Interactive Map Navigation Application** (`calapexis`). The system transforms traditional paper logbooks into a digital visitor management system paired with interactive Leaflet-powered campus map and office floor plan navigation.

---

## 1. Core Framework & UI Layer
- **Framework**: [Svelte 5](https://svelte.dev) + [SvelteKit 2](https://svelte.dev/docs/kit)
  - Uses Svelte 5 Runes (`$state`, `$derived`, `$props`, `$effect`) for reactive state management.
  - Event handlers use HTML-standard `onclick`, `oninput`, etc. (avoid legacy Svelte 3/4 `on:click` directives).
- **UI Component Library**: [shadcn-svelte](https://shadcn-svelte.com) (powered by `bits-ui` and `@lucide/svelte` icons)
  - **Select Component Convention**: Always include a `type` attribute (`single` or `multiple`). Do not use `Select.Value`; use a `span` element with custom styling to display selected values.
  - **Popover Trigger Convention**: Do NOT use `asChild` or `let:builder` on `Popover.Trigger` or similar trigger elements. Place inner components (e.g. `<Button>`) directly inside the trigger wrapper.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
  - Integrated with modern CSS variables, dark/light theme support, and OKLCH dynamic color styling.
- **Interactive Map**: [Leaflet JS](https://leafletjs.com) (`leaflet`, `@types/leaflet`)
  - Custom pixel-coordinate `L.CRS.Simple` mapping bound to static image assets (`/campusMap-adjusted.png` in `/static`).
  - Interactive room markers, office overlays, and waypoint routing polylines.
- **Language**: TypeScript (`^6.0.3`)

---

## 2. Database & Backend Services
- **Database & Auth**: [Supabase](https://supabase.com) (`@supabase/supabase-js`)
  - **Tables**:
    - `visitors`: Logbook records (`id`, `full_name`, `email`, `phone`, `purpose_of_visit`, `destination_office_id`, `destination_room_id`, `check_in_time`, `check_out_time`, `status`).
    - `offices`: Office entities (`id`, `name`, `code`, `building`, `floor`, `description`).
    - `rooms`: Rooms inside offices (`id`, `office_id`, `room_number`, `room_name`, `coordinates_x`, `coordinates_y`).
    - `map_nodes`: Leaflet coordinate waypoints for pathfinding/routing to rooms (`id`, `office_id`, `x`, `y`, `connections_json`).
  - **Real-Time Subscriptions**: Live visitor check-in log updates for admin dashboards.

---

## 3. Core Feature Architecture
1. **Digital Visitor Logbook (Check-in / Check-out)**
   - Self-service visitor check-in form with destination selection.
   - Digital visitor pass generation with QR code.
   - Dual check-out support: Self-serve visitor pass link/QR scan OR admin reception desk check-out.
   - Admin Data Table with dynamic, theme-aware status badges (utilizing Svelte snippets and OKLCH color hashing).
2. **Leaflet JS Interactive University & Office Navigation**
   - Leaflet map viewer initialized with `/campusMap-adjusted.png` image overlay using `L.CRS.Simple`.
   - Custom markers for offices, search filter, and polyline route guidance from entry gates/reception to destination rooms.
3. **Admin & Reception Dashboard**
   - Protected SvelteKit route (`/admin`) for monitoring active campus visitors, managing offices/rooms, and exporting visit logs.

---

## 4. Key Svelte 5 & Project Rules
1. **Event Handling**: Always use `onclick` instead of `on:click` on all components.
2. **Data Table Badges**: Render badges in data tables using Svelte snippets with OKLCH dynamic color cycling based on string hash values.
3. **Component Wrappers**: Do not pass `asChild` to `Popover.Trigger` or trigger wrappers.
4. **Documentation**: All new `.md` files (excluding `GEMINI.md`) reside in the `/MDs` directory.
