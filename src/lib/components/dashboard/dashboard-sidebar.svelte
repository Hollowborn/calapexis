<script lang="ts">
	import type { ComponentProps } from "svelte";
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import UsersIcon from "@lucide/svelte/icons/users";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import CommandIcon from "@lucide/svelte/icons/command";

	import NavUser from "./nav-user.svelte";
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { page } from "$app/state";

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

	// Route mapping coordinates
	const routeMap: Record<string, string> = {
		analytics: "/dashboard",
		"logs-master": "/dashboard/logs",
		"security-desk": "/dashboard/security",
		"staff-desk": "/dashboard/staff",
		"user-accounts": "/dashboard/admin/users",
		"offices-config": "/dashboard/admin/offices",
		"office-config": "/dashboard/admin/buildings",
		"map-edges": "/dashboard/admin/edges",
	};

	const activeView = $derived(
		Object.keys(routeMap).find(
			(id) => page.url.pathname === routeMap[id],
		) || "analytics",
	);

	// Sidebar Menu Groups containing access policies based on credentials role
	const allGroups = [
		{
			id: "overview",
			title: "Overview",
			icon: LayoutDashboardIcon,
			items: [
				{
					id: "analytics",
					title: "Analytics",
					roles: ["admin"],
					description: "Campus visitor traffic & statistics",
				},
				{
					id: "logs-master",
					title: "Logbook Master",
					roles: ["admin", "security", "staff"],
					description: "Historical database log spreadsheets",
				},
			],
		},
		{
			id: "desks",
			title: "Visitor Desks",
			icon: UsersIcon,
			items: [
				{
					id: "security-desk",
					title: "Security Desk",
					roles: ["admin", "security"],
					description: "Guard verification control console",
				},
				{
					id: "staff-desk",
					title: "Staff Desk",
					roles: ["admin", "staff"],
					description: "Department manual walk-in check-in desk",
				},
			],
		},
		{
			id: "admin",
			title: "System Admin",
			icon: SettingsIcon,
			items: [
				{
					id: "user-accounts",
					title: "User Accounts",
					roles: ["admin"],
					description: "Provision security and staff portals access",
				},
				{
					id: "offices-config",
					title: "Check-In Offices",
					roles: ["admin"],
					description:
						"Designate official reception counters and desks",
				},
				{
					id: "office-config",
					title: "Buildings & Rooms",
					roles: ["admin"],
					description:
						"Manage campus layouts and printable QR passes",
				},
				{
					id: "map-edges",
					title: "Map Edges & Paths",
					roles: ["admin"],
					description:
						"Configure campus navigation pathways & curves",
				},
			],
		},
	];

	// Filter visible menus dynamically using Svelte 5 derived states
	const visibleGroups = $derived(
		allGroups
			.map((group) => ({
				...group,
				items: group.items.filter((item) => item.roles.includes(role)),
			}))
			.filter((group) => group.items.length > 0),
	);

	let activeGroup = $state<any>(null);

	// Align activeGroup when routing paths or authentication roles change
	$effect(() => {
		const matchingGroup = visibleGroups.find((group) =>
			group.items.some((item) => routeMap[item.id] === page.url.pathname),
		);
		if (matchingGroup) {
			activeGroup = matchingGroup;
		} else if (
			visibleGroups.length > 0 &&
			!visibleGroups.some((g) => g.id === activeGroup?.id)
		) {
			activeGroup = visibleGroups[0];
		}
	});

	const activeGroupItems = $derived(activeGroup?.items || []);
	const sidebar = useSidebar();

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
		officeId: officeId
	});
</script>

<Sidebar.Root
	bind:ref
	collapsible="icon"
	class="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row print:hidden"
	{...restProps}
>
	<!-- Primary Icon Rail Sidebar (Renders inline submenus below corresponding menus on mobile) -->
	<Sidebar.Root
		collapsible="none"
		class="w-full md:!w-[calc(var(--sidebar-width-icon)_+_1px)] border-e bg-sidebar text-sidebar-foreground"
	>
		<Sidebar.Header class="border-b border-sidebar-border bg-sidebar/30">
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton size="lg" class="md:h-8 md:p-0">
						{#snippet child({ props })}
							<a
								href="/dashboard"
								{...props}
								class="flex items-center justify-center"
							>
								<div
									class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-md font-mono font-black text-sm"
								>
									<img src="favicon.png" />
								</div>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Header>

		<Sidebar.Content class="bg-sidebar/10 overflow-y-auto">
			<Sidebar.Group>
				<Sidebar.GroupContent class="px-1.5 md:px-0">
					<Sidebar.Menu class="gap-2">
						{#each visibleGroups as group (group.id)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									tooltipContentProps={{ hidden: false }}
									onclick={() => {
										activeGroup = group;
										sidebar.setOpen(true);
									}}
									isActive={activeGroup?.id === group.id}
									class="px-2.5 md:px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors font-bold"
								>
									{#snippet tooltipContent()}
										{group.title}
									{/snippet}
									<group.icon
										class="size-5 pointer-events-none"
									/>
									<span>{group.title}</span>
								</Sidebar.MenuButton>

								<!-- Nested Submenus appearing directly below corresponding menu on Mobile view -->
								<div
									class="flex flex-col gap-1 pl-6 py-1 md:hidden"
								>
									{#each group.items as item (item.id)}
										<a
											href={routeMap[item.id]}
											onclick={() =>
												sidebar.setOpenMobile(false)}
											class="text-start flex flex-col items-start gap-0.5 p-2 text-xs transition-all cursor-pointer {activeView ===
											item.id
												? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold border-s-2 border-primary'
												: 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
										>
											<span
												class="font-bold text-foreground text-xs"
												>{item.title}</span
											>
											<span
												class="text-[10px] text-muted-foreground line-clamp-1 leading-tight"
												>{item.description}</span
											>
										</a>
									{/each}
								</div>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>

		<Sidebar.Footer class="border-t border-sidebar-border bg-sidebar/30">
			<NavUser user={userProfile} />
		</Sidebar.Footer>
	</Sidebar.Root>

	<!-- Secondary Detailed Sub-Navigation Sidebar -->
	<Sidebar.Root
		collapsible="none"
		class="hidden flex-1 md:flex bg-card border-r border-border"
	>
		<Sidebar.Header class="gap-3.5 border-b border-border p-4 bg-muted/20">
			<div class="flex w-full items-center justify-between">
				<div class="text-foreground text-sm font-bold tracking-tight">
					{activeGroup?.title || "Navigation"}
				</div>
			</div>
		</Sidebar.Header>

		<Sidebar.Content>
			<Sidebar.Group class="px-0 py-0">
				<Sidebar.GroupContent>
					<div class="flex flex-col gap-1 p-3">
						{#each activeGroupItems as item (item.id)}
							<a
								href={routeMap[item.id]}
								class="text-start flex flex-col items-start gap-1 p-3.5 text-xs leading-tight transition-all cursor-pointer border-l-2 {activeView ===
								item.id
									? 'bg-sidebar-accent border-primary text-sidebar-accent-foreground font-bold shadow-xs'
									: 'border-transparent text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
							>
								<span class="font-bold text-foreground"
									>{item.title}</span
								>
								<span
									class="text-[10px] text-muted-foreground line-clamp-2"
								>
									{item.description}
								</span>
							</a>
							<Separator />
						{/each}
					</div>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>
	</Sidebar.Root>
</Sidebar.Root>
