<script lang="ts">
	import { setContext } from "svelte";
	import { page } from "$app/state";
	import { getLocalVisitors, getLocalProfiles } from "$lib/supabase";
	import type { Visitor, Profile } from "$lib/types";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import DashboardSidebar from "$lib/components/dashboard/dashboard-sidebar.svelte";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import { toast } from "svelte-sonner";
  import AnimatedThemeToggler from "$lib/components/magic/animated-theme-toggler/animated-theme-toggler.svelte";

	let { data, children } = $props();

	// Context State Manager Class for Svelte 5
	class DashboardState {
		visitors = $state<Visitor[]>([]);
		profiles = $state<Profile[]>([]);
		loading = $state(false);

		async loadData() {
			try {
				const [loadedVisitors, loadedProfiles] = await Promise.all([
					getLocalVisitors(),
					getLocalProfiles()
				]);
				this.visitors = loadedVisitors;
				this.profiles = loadedProfiles;
			} catch (e) {
				console.error("Failed to load dashboard sync feeds:", e);
			}
		}
	}

	const dashboardState = new DashboardState();
	setContext("dashboard-state", dashboardState);

	// Fetch data initially on mount and setup polling every 2 seconds
	$effect(() => {
		dashboardState.loadData();
		const interval = setInterval(() => dashboardState.loadData(), 2000);
		
		// Check for unauthorized access messages inside query params
		const errorParam = page.url.searchParams.get("error");
		if (errorParam === "unauthorized_role") {
			toast.error("Access Denied", {
				description: "You do not have the required permissions to view that console."
			});
		}

		return () => clearInterval(interval);
	});

	// Active route names mapping for breadcrumbs
	const routeLabels: Record<string, string> = {
		"/dashboard": "Analytics Overview",
		"/dashboard/logs": "Logbook Master Records",
		"/dashboard/security": "Security Gate Console",
		"/dashboard/staff": "Staff Desk Console",
		"/dashboard/admin/users": "System User Accounts",
		"/dashboard/admin/buildings": "Offices & Rooms Config"
	};

	let pageLabel = $derived(routeLabels[page.url.pathname] || "Overview");
</script>

<Sidebar.Provider style="--sidebar-width: 350px;">
	<!-- Mount the dashboard sidebar -->
	<DashboardSidebar role={data.role} email={data.email} />
	
	<Sidebar.Inset class="bg-background flex flex-col min-h-screen">
		<!-- Header Banner -->
		<header class="bg-background/80 backdrop-blur-md sticky top-0 flex shrink-0 items-center gap-2 border-b border-border/60 p-4 z-40">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/dashboard">Calapexis Portal</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page class="font-semibold text-foreground">{pageLabel}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			
			<div class="ms-auto flex items-center gap-2">
				<AnimatedThemeToggler />
			</div>
		</header>

		<!-- Sub-route Workspace Render Slot -->
		<div class="flex-grow flex flex-col">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
