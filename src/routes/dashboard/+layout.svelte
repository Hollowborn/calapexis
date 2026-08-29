<script lang="ts">
	import { setContext } from "svelte";
	import { navigating, page } from "$app/stores";
	import { getLocalVisitors, getLocalProfiles } from "$lib/supabase";
	import type { Visitor, Profile } from "$lib/types";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import DashboardSidebar from "$lib/components/dashboard/dashboard-sidebar.svelte";
	import DashboardSkeleton from "$lib/components/dashboard/dashboard-skeleton.svelte";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import { toast } from "svelte-sonner";
	import AnimatedThemeToggler from "$lib/components/magic/animated-theme-toggler/animated-theme-toggler.svelte";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";

	let { data, children } = $props();

	// Context State Manager Class for Svelte 5
	class DashboardState {
		visitors = $state<Visitor[]>([]);
		profiles = $state<Profile[]>([]);
		loading = $state(true);

		async loadData() {
			try {
				const isSecurityRoute = $page.url.pathname === '/dashboard/security';
				const [loadedVisitors, loadedProfiles] = await Promise.all([
					getLocalVisitors(isSecurityRoute),
					getLocalProfiles()
				]);
				this.visitors = loadedVisitors;
				this.profiles = loadedProfiles;
			} catch (e) {
				console.error("Failed to load dashboard sync feeds:", e);
			} finally {
				this.loading = false;
			}
		}
	}

	const dashboardState = new DashboardState();
	setContext("dashboard-state", dashboardState);

	// Fetch data initially on mount and setup polling every 2 seconds
	$effect(() => {
		dashboardState.loadData();
		const interval = setInterval(() => dashboardState.loadData(), 2000);
		
		// Check for login query params or error messages
		const loginParam = $page.url.searchParams.get("login");
		if (loginParam === "google_success" || loginParam === "success") {
			toast.promise(
				new Promise((resolve) => setTimeout(() => resolve(data.name || "User"), 350)),
				{
					loading: "Establishing secure portal session...",
					success: (userName) => `Welcome back, ${userName}! Login successful.`,
					error: "Failed to establish portal session."
				}
			);
		}

		const errorParam = $page.url.searchParams.get("error");
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
		"/dashboard/admin/offices": "Check-In Offices & Desks",
		"/dashboard/admin/buildings": "Buildings & Rooms Layout",
		"/dashboard/admin/edges": "Map Edges & Paths Layout"
	};

	let pageLabel = $derived(routeLabels[$page.url.pathname] || "Overview");
</script>

<Sidebar.Provider style="--sidebar-width: 350px;">
	<!-- Mount the dashboard sidebar -->
	<DashboardSidebar role={data.role} email={data.email} name={data.name} avatar={data.avatar} officeId={data.officeId || undefined} />
	
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
						{#if dashboardState.loading || $navigating}
							<Breadcrumb.Page class="font-semibold text-foreground flex items-center gap-1.5">
								<LoaderCircleIcon class="size-3.5 animate-spin text-primary" />
								<span>Loading...</span>
							</Breadcrumb.Page>
						{:else}
							<Breadcrumb.Page class="font-semibold text-foreground">{pageLabel}</Breadcrumb.Page>
						{/if}
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			
			<div class="ms-auto flex items-center gap-2">
				<AnimatedThemeToggler />
			</div>
		</header>

		<!-- Sub-route Workspace Render Slot -->
		<div class="flex-grow flex flex-col">
			{#if dashboardState.loading || $navigating}
				<DashboardSkeleton />
			{:else}
				{@render children()}
			{/if}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
