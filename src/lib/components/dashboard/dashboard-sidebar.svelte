<script lang="ts">
	import type { ComponentProps } from "svelte";
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UsersIcon from "@lucide/svelte/icons/users";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import RouteIcon from "@lucide/svelte/icons/route";
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

	import NavUser from "./nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import { page } from "$app/state";
	import BrandLogo from "$lib/components/brand-logo.svelte";

	let {
		ref = $bindable(null),
		role = "staff",
		email = "",
		name = "",
		avatar = "",
		officeId = "",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		role: string;
		email: string;
		name?: string;
		avatar?: string;
		officeId?: string;
	} = $props();

	const sidebar = useSidebar();

	// Primary operational navigation items
	const allOperations = [
		{
			id: "analytics",
			title: "Analytics",
			url: "/dashboard",
			icon: LayoutDashboardIcon,
			roles: ["admin", "staff"],
		},
		{
			id: "logs-master",
			title: "Logbook Master",
			url: "/dashboard/logs",
			icon: BookOpenIcon,
			roles: ["admin", "security", "staff"],
		},
		{
			id: "security-desk",
			title: "Security Desk",
			url: "/dashboard/security",
			icon: ShieldCheckIcon,
			roles: ["admin", "security"],
		},
		{
			id: "staff-desk",
			title: "Staff Desk",
			url: "/dashboard/staff",
			icon: UserCheckIcon,
			roles: ["admin", "staff"],
		},
	];

	// Campus administrative management items (Admin Only)
	const allAdmin = [
		{
			id: "user-accounts",
			title: "User Accounts",
			url: "/dashboard/admin/users",
			icon: UsersIcon,
			roles: ["admin"],
		},
		{
			id: "offices-config",
			title: "Check-In Offices",
			url: "/dashboard/admin/offices",
			icon: Building2Icon,
			roles: ["admin"],
		},
		{
			id: "office-config",
			title: "Buildings & Rooms",
			url: "/dashboard/admin/buildings",
			icon: LayersIcon,
			roles: ["admin"],
		},
		{
			id: "map-edges",
			title: "Map Edges & Paths",
			url: "/dashboard/admin/edges",
			icon: RouteIcon,
			roles: ["admin"],
		},
	];

	const visibleOperations = $derived(
		allOperations.filter((item) => item.roles.includes(role)),
	);

	const visibleAdmin = $derived(
		allAdmin.filter((item) => item.roles.includes(role)),
	);

	const userProfile = $derived({
		name:
			name ||
			(role === "admin"
				? "Administrator"
				: role === "security"
					? "Security Personnel"
					: "Office Staff"),
		email: email || "user@calapexis.local",
		avatar: avatar || "",
		role: role,
		officeId: officeId,
	});
</script>

<Sidebar.Root
	bind:ref
	collapsible="icon"
	class="border-r border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden"
	{...restProps}
>
	<!-- Sidebar Brand Header -->
	<Sidebar.Header class="border-b border-sidebar-border/80 bg-sidebar/50 p-3 group-data-[collapsible=icon]:p-2">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					class="hover:bg-sidebar-accent/50 rounded-xl transition-colors group-data-[collapsible=icon]:!p-0"
				>
					{#snippet child({ props })}
						<a
							href="/dashboard"
							{...props}
						>
							<div
								class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-xl shadow-md font-mono font-black text-sm shrink-0"
							>
								<BrandLogo class='ml-0.5 mt-0.5' />
							</div>
							<div
								class="grid flex-1 text-start leading-tight min-w-0 group-data-[collapsible=icon]:hidden"
							>
								<span
									class="truncate font-black text-sm text-foreground tracking-tight"
									>Calapexis</span
								>
								<span
									class="truncate text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
								>
									{role} Console
								</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<!-- Sidebar Navigation Content -->
	<Sidebar.Content class="overflow-y-auto px-3.5 py-3 space-y-4 group-data-[collapsible=icon]:px-2">
		<!-- Section 1: Core Operations -->
		<Sidebar.Group class="p-0">
			<Sidebar.GroupLabel
				class="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/80 px-2 mb-1 group-data-[collapsible=icon]:hidden"
			>
				Operations
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="gap-1.5">
					{#each visibleOperations as item (item.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={page.url.pathname === item.url}
								tooltipContentProps={{ hidden: false }}
								class="rounded-xl px-2.5 py-2 font-semibold text-xs transition-all {page
									.url.pathname === item.url
									? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
									: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'}"
							>
								{#snippet tooltipContent()}
									{item.title}
								{/snippet}
								{#snippet child({ props })}
									<a
										href={item.url}
										{...props}
										onclick={() =>
											sidebar.setOpenMobile(false)}
									>
										<item.icon
											class="size-4 shrink-0 {page.url
												.pathname === item.url
												? 'text-primary'
												: 'text-muted-foreground'}"
										/>
										<span class="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<!-- Section 2: Campus Administration (Admin Role Only) -->
		{#if visibleAdmin.length > 0}
			<Sidebar.Group class="p-0">
				<Sidebar.GroupLabel
					class="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/80 px-2 mb-1 group-data-[collapsible=icon]:hidden"
				>
					Management
				</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu class="gap-1.5">
						{#each visibleAdmin as item (item.id)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={page.url.pathname === item.url}
									tooltipContentProps={{ hidden: false }}
									class="rounded-xl px-2.5 py-2 font-semibold text-xs transition-all {page
										.url.pathname === item.url
										? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-xs'
										: 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'}"
								>
									{#snippet tooltipContent()}
										{item.title}
									{/snippet}
									{#snippet child({ props })}
										<a
											href={item.url}
											{...props}
											onclick={() =>
												sidebar.setOpenMobile(false)}
										>
											<item.icon
												class="size-4 shrink-0 {page.url
													.pathname === item.url
													? 'text-primary'
													: 'text-muted-foreground'}"
											/>
											<span class="truncate group-data-[collapsible=icon]:hidden"
												>{item.title}</span
											>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}

		<!-- Section 3: External Utilities (Pinned Bottom) -->
		<Sidebar.Group
			class="mt-auto p-0 pt-3 border-t border-sidebar-border/60"
		>
			<Sidebar.GroupLabel
				class="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground/80 px-2 mb-1 group-data-[collapsible=icon]:hidden"
			>
				Quick Access
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="gap-1.5">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContentProps={{ hidden: false }}
							class="rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-all"
						>
							{#snippet tooltipContent()}
								Visitor Kiosk
							{/snippet}
							{#snippet child({ props })}
								<a
									href="/v"
									target="_blank"
									rel="noreferrer"
									{...props}
								>
									<ExternalLinkIcon
										class="size-4 shrink-0 text-muted-foreground"
									/>
									<span class="truncate group-data-[collapsible=icon]:hidden"
										>Visitor Kiosk Portal</span
									>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<!-- Sidebar Footer User Profile -->
	<Sidebar.Footer class="border-t border-sidebar-border/80 bg-sidebar/50 p-3 group-data-[collapsible=icon]:p-2">
		<NavUser user={userProfile} />
	</Sidebar.Footer>
</Sidebar.Root>
