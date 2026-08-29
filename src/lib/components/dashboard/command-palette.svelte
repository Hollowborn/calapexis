<script lang="ts">
	import * as Command from "$lib/components/ui/command/index.js";
	import { goto } from "$app/navigation";
	import { getLocalVisitors } from "$lib/supabase";
	import type { Visitor } from "$lib/types";

	// Icons
	import SearchIcon from "@lucide/svelte/icons/search";
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UsersIcon from "@lucide/svelte/icons/users";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import NetworkIcon from "@lucide/svelte/icons/network";
	import DoorClosedIcon from "@lucide/svelte/icons/door-closed";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";

	let {
		open = $bindable(false),
		role = "staff",
		officeId = ""
	}: {
		open: boolean;
		role?: string;
		officeId?: string;
	} = $props();

	let visitors = $state<Visitor[]>([]);

	$effect(() => {
		if (open) {
			loadRecentVisitors();
		}
	});

	async function loadRecentVisitors() {
		try {
			visitors = await getLocalVisitors();
		} catch (e) {
			console.error("Command palette visitor load error:", e);
		}
	}

	let filteredVisitors = $derived.by(() => {
		if (role === "staff" && officeId) {
			return visitors.filter((v) => v.officeId === officeId);
		}
		return visitors;
	});

	function handleSelectRoute(path: string) {
		open = false;
		goto(path);
	}
</script>

<Command.Dialog bind:open title="Global Command Palette">
	<Command.Input placeholder="Type a command or search visitor pass codes..." />
	<Command.List class="max-h-[350px] overflow-y-auto">
		<Command.Empty class="py-6 text-center text-xs text-muted-foreground">
			No matching navigation routes or visitor passes found.
		</Command.Empty>

		<!-- Portal Views -->
		<Command.Group heading="Navigation Portals">
			{#if role === "admin"}
				<Command.Item onSelect={() => handleSelectRoute("/dashboard")} class="cursor-pointer">
					<LayoutDashboardIcon class="size-4 mr-2 text-primary shrink-0" />
					<span>Analytics Overview</span>
				</Command.Item>
			{/if}

			<Command.Item onSelect={() => handleSelectRoute("/dashboard/logs")} class="cursor-pointer">
				<BookOpenIcon class="size-4 mr-2 text-primary shrink-0" />
				<span>Logbook Master Records</span>
			</Command.Item>

			{#if role === "admin" || role === "security"}
				<Command.Item onSelect={() => handleSelectRoute("/dashboard/security")} class="cursor-pointer">
					<ShieldCheckIcon class="size-4 mr-2 text-blue-500 shrink-0" />
					<span>Security Gate Console</span>
				</Command.Item>
			{/if}

			{#if role === "admin" || role === "staff"}
				<Command.Item onSelect={() => handleSelectRoute("/dashboard/staff")} class="cursor-pointer">
					<UserCheckIcon class="size-4 mr-2 text-emerald-500 shrink-0" />
					<span>Staff Desk Console</span>
				</Command.Item>
			{/if}

			{#if role === "admin"}
				<Command.Item onSelect={() => handleSelectRoute("/dashboard/admin/users")} class="cursor-pointer">
					<UsersIcon class="size-4 mr-2 text-purple-500 shrink-0" />
					<span>System User Accounts</span>
				</Command.Item>

				<Command.Item onSelect={() => handleSelectRoute("/dashboard/admin/offices")} class="cursor-pointer">
					<DoorClosedIcon class="size-4 mr-2 text-amber-500 shrink-0" />
					<span>Check-In Offices & Desks</span>
				</Command.Item>

				<Command.Item onSelect={() => handleSelectRoute("/dashboard/admin/buildings")} class="cursor-pointer">
					<Building2Icon class="size-4 mr-2 text-indigo-500 shrink-0" />
					<span>Buildings & Rooms Layout</span>
				</Command.Item>

				<Command.Item onSelect={() => handleSelectRoute("/dashboard/admin/edges")} class="cursor-pointer">
					<NetworkIcon class="size-4 mr-2 text-rose-500 shrink-0" />
					<span>Map Edges & Pathways</span>
				</Command.Item>
			{/if}
		</Command.Group>

		<Command.Separator />

		<!-- Active Visitor Passes Quick Search -->
		{#if filteredVisitors.length > 0}
			<Command.Group heading="Recent Visitor Passes">
				{#each filteredVisitors.slice(0, 5) as v (v.id)}
					<Command.Item
						onSelect={() => {
							open = false;
							goto(`/dashboard/logs?search=${encodeURIComponent(v.passCode || v.fullName)}`);
						}}
						class="cursor-pointer flex items-center justify-between"
					>
						<div class="flex items-center gap-2">
							<QrCodeIcon class="size-4 text-emerald-500 shrink-0" />
							<span class="font-extrabold text-xs">{v.fullName}</span>
							<span class="text-[10px] text-muted-foreground font-mono">({v.passCode})</span>
						</div>
						<span class="text-[10px] font-bold text-muted-foreground">{v.officeName || "Main Gate"}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		<Command.Separator />

		<!-- System Quick Actions -->
		<Command.Group heading="Quick Actions">
			<Command.Item
				onSelect={() => {
					open = false;
					window.open("/v", "_blank");
				}}
				class="cursor-pointer"
			>
				<SparklesIcon class="size-4 mr-2 text-amber-500 shrink-0" />
				<span>Open Visitor Map</span>
			</Command.Item>
		</Command.Group>
	</Command.List>
</Command.Dialog>
