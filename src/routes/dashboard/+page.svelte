<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import { toast } from 'svelte-sonner';
	
	let { data } = $props();

	// Get shared context
	const dashboardContext = getContext<any>("dashboard-state");
	
	// Derived KPI states
	let visitors = $derived(dashboardContext.visitors);
	let profiles = $derived(dashboardContext.profiles);
	
	let totalCount = $derived(visitors.length);
	let activeCount = $derived(visitors.filter((v: any) => v.status === 'checked_in').length);
	let checkoutCount = $derived(visitors.filter((v: any) => v.status === 'checked_out').length);
	let rejectedCount = $derived(visitors.filter((v: any) => v.verificationStatus === 'rejected').length);
	
	let adminBuildingCount = $derived(visitors.filter((v: any) => v.buildingId === 'off-1').length);
	let techComplexCount = $derived(visitors.filter((v: any) => v.buildingId === 'off-3').length);
	let studentCenterCount = $derived(visitors.filter((v: any) => v.buildingId === 'off-4').length);

	async function handleRefresh() {
		await dashboardContext.loadData();
		toast.success('Dashboard feeds refreshed.');
	}
</script>

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Header Title Block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Analytics Overview</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Campus visitor traffic & statistics</p>
		</div>
		<div class="flex items-center gap-2">
			<Button onclick={handleRefresh} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 cursor-pointer">
				<RefreshCwIcon class="size-3.5 pointer-events-none" />
				<span>Refresh</span>
			</Button>
		</div>
	</div>

	<!-- KPI Metric Cards Grid -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<Card.Root class="border-border/80 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-card">
			<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Total Registers</span>
			<div class="text-3xl font-black text-foreground mt-2">{totalCount}</div>
		</Card.Root>
		<Card.Root class="border-primary/20 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-primary/[0.03]">
			<span class="text-[10px] font-extrabold text-primary uppercase tracking-widest">Currently on Campus</span>
			<div class="text-3xl font-black text-primary flex items-center gap-2 mt-2">
				<span>{activeCount}</span>
				<span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
			</div>
		</Card.Root>
		<Card.Root class="border-border/80 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-card">
			<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Checked Out</span>
			<div class="text-3xl font-black text-foreground mt-2">{checkoutCount}</div>
		</Card.Root>
		<Card.Root class="border-border/80 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-card">
			<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Declined Passes</span>
			<div class="text-3xl font-black text-destructive mt-2">{rejectedCount}</div>
		</Card.Root>
	</div>

	<!-- Analytics Breakdown Panels -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Traffic by Building -->
		<Card.Root class="border-border/80 shadow-sm rounded-2xl">
			<Card.Header>
				<Card.Title class="text-base font-bold text-foreground">Traffic by Building complex</Card.Title>
				<Card.Description class="text-xs text-muted-foreground font-semibold">Volume of registered visitors across active campus buildings.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4 font-semibold text-xs">
				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-xs font-bold">
						<span>Administration Building</span>
						<span class="text-muted-foreground">{adminBuildingCount} ({Math.round((adminBuildingCount / (totalCount || 1)) * 100)}%)</span>
					</div>
					<div class="w-full bg-muted h-2 rounded-full overflow-hidden">
						<div class="bg-primary h-full rounded-full transition-all" style="width: {(adminBuildingCount / (totalCount || 1)) * 100}%"></div>
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-xs font-bold">
						<span>Technology Complex</span>
						<span class="text-muted-foreground">{techComplexCount} ({Math.round((techComplexCount / (totalCount || 1)) * 100)}%)</span>
					</div>
					<div class="w-full bg-muted h-2 rounded-full overflow-hidden">
						<div class="bg-primary h-full rounded-full transition-all" style="width: {(techComplexCount / (totalCount || 1)) * 100}%"></div>
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between text-xs font-bold">
						<span>Student Activity Center</span>
						<span class="text-muted-foreground">{studentCenterCount} ({Math.round((studentCenterCount / (totalCount || 1)) * 100)}%)</span>
					</div>
					<div class="w-full bg-muted h-2 rounded-full overflow-hidden">
						<div class="bg-primary h-full rounded-full transition-all" style="width: {(studentCenterCount / (totalCount || 1)) * 100}%"></div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Security Safety briefings -->
		<Card.Root class="border-border/80 shadow-sm rounded-2xl">
			<Card.Header>
				<Card.Title class="text-base font-bold text-foreground">Operational Safety Checklists</Card.Title>
				<Card.Description class="text-xs text-muted-foreground font-semibold">Digital control parameters and verify modes active status.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 text-xs font-semibold">
				<div class="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
					<span>Verify & Gate Approval Policy</span>
					<Badge class="bg-green-600/10 text-green-600 border-green-600/20 text-[10px] font-bold rounded-full">Auto-Approve Gate</Badge>
				</div>
				<div class="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
					<span>Office check-in confirmation</span>
					<span class="font-bold text-foreground">{visitors.filter((v: any) => v.roomCheckInTime).length} Active Onsite</span>
				</div>
				<div class="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
					<span>Security & Desk Staff profiles</span>
					<span class="font-bold text-foreground">{profiles.length} Accounts Active</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
