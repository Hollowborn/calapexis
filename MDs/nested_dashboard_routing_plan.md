# Architectural Plan: Nested Dashboard Routing

This plan outlines the restructuring of the single-route `/dashboard` console into clean, nested SvelteKit routes sharing a common sidebar layout. Svelte 5's context system will be used to distribute state and data updates cleanly.

## 1. Directory Structure Layout

```
src/routes/dashboard/
├── +layout.server.ts           <-- (NEW) Load session role, email, office bindings
├── +layout.svelte              <-- (NEW) Mounts App Sidebar and sets Svelte 5 DashboardState context
├── +page.svelte                <-- (MODIFY) Strip out non-overview elements, leave Analytics Charts
├── logs/
│   └── +page.svelte            <-- (NEW) Logbook Master database grid & PDF/CSV buttons
├── security/
│   └── +page.svelte            <-- (NEW) Security gate console, queue, scanners simulator
├── staff/
│   └── +page.svelte            <-- (NEW) Staff manual walk-in check-in desk
└── admin/
    ├── users/
    │   └── +page.svelte        <-- (NEW) Admin accounts manager, user provisioning form
    └── offices/
        └── +page.svelte        <-- (NEW) Offices & rooms mapper, printable QR passes list
```

---

## 2. Layout & Context Configuration

### Layout Server Logic (`+layout.server.ts`)
Validates user sessions on load and redirects unauthorized traffic back to `/login`:
```ts
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	if (!session || !["admin", "security", "staff"].includes(session.role)) {
		throw redirect(303, `/login?error=unauthorized_dashboard&redirect=${encodeURIComponent(url.pathname)}`);
	}
	return {
		role: session.role,
		email: locals.sessionRole === "admin" ? "admin@university.edu" : (locals.sessionRole === "security" ? "security@university.edu" : "staff@university.edu"),
		assignedOfficeId: session.officeId || null
	};
};
```

### Shared State Context (`+layout.svelte`)
Defines a class-based reactive state using Svelte 5 runes (`$state`, `$derived`) to poll databases and share data with all sub-pages:
```svelte
<script lang="ts">
	import { setContext } from "svelte";
	import { getLocalVisitors, getLocalProfiles } from "$lib/supabase";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import DashboardSidebar from "$lib/components/dashboard/dashboard-sidebar.svelte";
	import { page } from "$app/state";

	let { data, children } = $props();

	class DashboardState {
		visitors = $state<any[]>([]);
		profiles = $state<any[]>([]);
		loading = $state(false);

		async loadData() {
			this.loading = true;
			try {
				this.visitors = await getLocalVisitors();
				this.profiles = await getLocalProfiles();
			} catch (e) {
				console.error(e);
			} finally {
				this.loading = false;
			}
		}
	}

	const dashboardState = new DashboardState();
	setContext("dashboard-state", dashboardState);

	$effect(() => {
		dashboardState.loadData();
		const interval = setInterval(() => dashboardState.loadData(), 2000);
		return () => clearInterval(interval);
	});
</script>

<Sidebar.Provider style="--sidebar-width: 350px;">
	<DashboardSidebar role={data.role} email={data.email} />
	<Sidebar.Inset class="bg-background">
		<header class="bg-background/80 backdrop-blur-md sticky top-0 flex shrink-0 items-center gap-2 border-b border-border/60 p-4 z-40">
			<Sidebar.Trigger class="-ms-1" />
			<!-- Header Title / Breadcrumbs -->
		</header>
		
		<main class="flex-grow p-6 md:p-8">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
```

### Sidebar Navigation Refactoring (`dashboard-sidebar.svelte`)
Substitutes custom bindable click state triggers with native `page.url.pathname` router listeners:
```svelte
<script lang="ts">
	import { page } from "$app/state";
	
	// Route mapping coordinates
	const routeMap: Record<string, string> = {
		'analytics': '/dashboard',
		'logs-master': '/dashboard/logs',
		'security-desk': '/dashboard/security',
		'staff-desk': '/dashboard/staff',
		'user-accounts': '/dashboard/admin/users',
		'office-config': '/dashboard/admin/offices'
	};

	const activeView = $derived(
		Object.keys(routeMap).find(id => page.url.pathname === routeMap[id]) || 'analytics'
	);
</script>

<!-- Render anchor tags instead of state-trigger buttons -->
<a href={routeMap[item.id]} class="...">
	<span>{item.title}</span>
</a>
```

---

## 3. Sub-pages Context Loading Pattern

Each nested page retrieves database records directly from layout context:
```svelte
<script lang="ts">
	import { getContext } from "svelte";
	
	const state = getContext<any>("dashboard-state");
	
	// Derived state binds automatically to class-based updates
	let activeVisitors = $derived(state.visitors.filter((v: any) => v.status === 'checked_in'));
</script>
```
