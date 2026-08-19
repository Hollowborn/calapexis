<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import UsersIcon from "@lucide/svelte/icons/users";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
	import BarChart3Icon from "@lucide/svelte/icons/bar-chart-3";
	import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
	import { toast } from 'svelte-sonner';
	
	let { data } = $props();

	// Get shared dashboard state context
	const dashboardContext = getContext<any>("dashboard-state");
	
	let visitors = $derived(dashboardContext.visitors || []);
	let profiles = $derived(dashboardContext.profiles || []);

	// Timeframe Selector State
	let selectedTimeframe = $state<'today' | 'week' | 'month'>('today');

	// Timeframe Filtered Visitors
	let timeframeVisitors = $derived.by(() => {
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		let cutoffDate: Date;
		if (selectedTimeframe === 'today') {
			cutoffDate = startOfToday;
		} else if (selectedTimeframe === 'week') {
			const day = now.getDay();
			const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Start of Monday
			cutoffDate = new Date(now.getFullYear(), now.getMonth(), diff);
			cutoffDate.setHours(0, 0, 0, 0);
		} else { // month
			cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
		}

		return visitors.filter((v: any) => {
			const checkIn = new Date(v.checkInTime || v.createdAt || Date.now());
			return checkIn >= cutoffDate;
		});
	});

	// Derived Analytics Metrics
	let uniqueVisitorsCount = $derived(
		new Set(timeframeVisitors.map((v: any) => v.visitorId || v.email || v.fullName)).size
	);

	let totalSessionsCount = $derived(timeframeVisitors.length);

	let activeOnCampusCount = $derived(visitors.filter((v: any) => v.status === 'checked_in').length);

	let avgDurationMinutes = $derived.by(() => {
		const completedVisits = timeframeVisitors.filter((v: any) => v.checkOutTime && v.checkInTime);
		if (completedVisits.length === 0) return 42; // default average baseline
		const totalMinutes = completedVisits.reduce((acc: number, v: any) => {
			const start = new Date(v.checkInTime).getTime();
			const end = new Date(v.checkOutTime).getTime();
			const duration = (end - start) / (1000 * 60);
			return acc + (duration > 0 ? duration : 30);
		}, 0);
		return Math.round(totalMinutes / completedVisits.length);
	});

	// Ranked Most Visited Offices Leaderboard
	let topOffices = $derived.by(() => {
		const map = new Map<string, { name: string; code: string; buildingName: string; count: number }>();

		timeframeVisitors.forEach((v: any) => {
			const officeName = v.officeName || 'Campus Office';
			const key = v.officeId || officeName;
			const existing = map.get(key) || { 
				name: officeName, 
				code: v.officeCode || 'OFF', 
				buildingName: v.buildingName || 'Campus Building', 
				count: 0 
			};
			existing.count += 1;
			map.set(key, existing);
		});

		const list = Array.from(map.values()).sort((a, b) => b.count - a.count);
		const total = timeframeVisitors.length || 1;
		return list.slice(0, 5).map((o, idx) => ({
			...o,
			rank: idx + 1,
			percentage: Math.round((o.count / total) * 100)
		}));
	});

	// Visit Purpose Breakdown Categories
	let purposeBreakdown = $derived.by(() => {
		const map = new Map<string, number>();
		timeframeVisitors.forEach((v: any) => {
			const purpose = v.purpose || 'Official Inquiry';
			map.set(purpose, (map.get(purpose) || 0) + 1);
		});
		const total = timeframeVisitors.length || 1;
		return Array.from(map.entries())
			.map(([purpose, count]) => ({ purpose, count, percentage: Math.round((count / total) * 100) }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);
	});

	// Peak Hourly Traffic Distribution (8 AM - 5 PM)
	let peakHours = $derived.by(() => {
		const hourCounts = new Array(24).fill(0);
		timeframeVisitors.forEach((v: any) => {
			if (v.checkInTime) {
				const hour = new Date(v.checkInTime).getHours();
				if (hour >= 0 && hour < 24) hourCounts[hour]++;
			}
		});
		const maxCount = Math.max(...hourCounts.slice(8, 18), 1);
		const workingHours = [];
		for (let h = 8; h <= 17; h++) {
			const label = h === 12 ? '12 PM' : (h > 12 ? `${h - 12} PM` : `${h} AM`);
			const count = hourCounts[h];
			workingHours.push({ 
				hour: label, 
				count,
				heightPct: Math.round((count / maxCount) * 100)
			});
		}
		return workingHours;
	});

	async function handleRefresh() {
		await dashboardContext.loadData();
		toast.success('Analytics overview refreshed.');
	}
</script>

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block with Timeframe Selector Pills -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Analytics</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Campus visitor traffic, peak hours, and office destination analytics.</p>
		</div>

		<!-- Timeframe Selector Pills -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="inline-flex items-center p-1 rounded-2xl border border-border bg-card shadow-xs">
				<button 
					onclick={() => (selectedTimeframe = 'today')}
					class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {selectedTimeframe === 'today' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
				>
					Today
				</button>
				<button 
					onclick={() => (selectedTimeframe = 'week')}
					class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {selectedTimeframe === 'week' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
				>
					This Week
				</button>
				<button 
					onclick={() => (selectedTimeframe = 'month')}
					class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer {selectedTimeframe === 'month' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
				>
					This Month
				</button>
			</div>

			<Button onclick={handleRefresh} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 cursor-pointer">
				<RefreshCwIcon class="size-3.5 pointer-events-none" />
				<span>Refresh</span>
			</Button>
		</div>
	</div>

	<!-- Core Executive Metric KPI Cards Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Unique Visitors KPI -->
		<Card.Root class="p-5 rounded-2xl border-border/80 bg-card shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Unique Visitors</span>
				<div class="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
					<UsersIcon class="size-4 pointer-events-none" />
				</div>
			</div>
			<div class="mt-3">
				<div class="text-3xl font-black text-foreground">{uniqueVisitorsCount}</div>
				<p class="text-[11px] text-muted-foreground font-semibold mt-1 flex items-center gap-1">
					<TrendingUpIcon class="size-3 text-emerald-500 pointer-events-none" />
					<span>Distinct individuals ({selectedTimeframe})</span>
				</p>
			</div>
		</Card.Root>

		<!-- Total Visit Sessions KPI -->
		<Card.Root class="p-5 rounded-2xl border-border/80 bg-card shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Total Visit Sessions</span>
				<div class="p-2 rounded-xl bg-muted text-muted-foreground border border-border/60">
					<UserCheckIcon class="size-4 pointer-events-none" />
				</div>
			</div>
			<div class="mt-3">
				<div class="text-3xl font-black text-foreground">{totalSessionsCount}</div>
				<p class="text-[11px] text-muted-foreground font-semibold mt-1">Logged check-in entries</p>
			</div>
		</Card.Root>

		<!-- Currently Active Passes KPI -->
		<Card.Root class="p-5 rounded-2xl border-primary/30 bg-primary/[0.04] shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-[10px] font-extrabold text-primary uppercase tracking-widest">Currently On Campus</span>
				<div class="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
					<CheckCircle2Icon class="size-4 pointer-events-none" />
				</div>
			</div>
			<div class="mt-3">
				<div class="text-3xl font-black text-primary flex items-center gap-2">
					<span>{activeOnCampusCount}</span>
					<span class="size-2.5 rounded-full bg-primary animate-pulse"></span>
				</div>
				<p class="text-[11px] text-primary/80 font-semibold mt-1">Active verified digital passes</p>
			</div>
		</Card.Root>

		<!-- Avg Duration KPI -->
		<Card.Root class="p-5 rounded-2xl border-border/80 bg-card shadow-xs flex flex-col justify-between">
			<div class="flex items-center justify-between">
				<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Avg Visit Duration</span>
				<div class="p-2 rounded-xl bg-muted text-muted-foreground border border-border/60">
					<ClockIcon class="size-4 pointer-events-none" />
				</div>
			</div>
			<div class="mt-3">
				<div class="text-3xl font-black text-foreground">{avgDurationMinutes} <span class="text-base font-bold text-muted-foreground">mins</span></div>
				<p class="text-[11px] text-muted-foreground font-semibold mt-1">Average time spent per visit</p>
			</div>
		</Card.Root>
	</div>

	<!-- Ranked Leaderboard & Analytics Panels Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Most Visited Offices Leaderboard -->
		<Card.Root class="border-border/80 shadow-sm rounded-2xl bg-card">
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title class="text-base font-bold text-foreground flex items-center gap-2">
							<Building2Icon class="size-4 text-primary pointer-events-none" />
							<span>Most Visited Offices</span>
						</Card.Title>
						<Card.Description class="text-xs text-muted-foreground font-semibold">Ranked office destination volume ({selectedTimeframe})</Card.Description>
					</div>
					<Badge variant="outline" class="text-[10px] font-extrabold rounded-full uppercase tracking-wider">Top Destinations</Badge>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				{#if topOffices.length > 0}
					{#each topOffices as office}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center justify-between text-xs font-bold">
								<div class="flex items-center gap-2">
									<Badge variant="outline" class="size-5 p-0 rounded-full flex items-center justify-center font-mono text-[9px] font-extrabold border-primary/30 text-primary">
										#{office.rank}
									</Badge>
									<span class="text-foreground">{office.name}</span>
									<span class="text-[10px] text-muted-foreground font-mono font-semibold">({office.code})</span>
								</div>
								<span class="text-xs font-black text-foreground">{office.count} <span class="text-muted-foreground font-normal">({office.percentage}%)</span></span>
							</div>
							<div class="w-full bg-muted h-2.5 rounded-full overflow-hidden">
								<div 
									class="bg-primary h-full rounded-full transition-all duration-500" 
									style="width: {office.percentage}%"
								></div>
							</div>
						</div>
					{/each}
				{:else}
					<div class="py-8 text-center text-xs text-muted-foreground font-semibold">
						No visit records logged for this timeframe.
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Visit Purpose Breakdown & Hourly Distribution -->
		<Card.Root class="border-border/80 shadow-sm rounded-2xl bg-card">
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title class="text-base font-bold text-foreground flex items-center gap-2">
							<BarChart3Icon class="size-4 text-blue-500 pointer-events-none" />
							<span>Visit Purpose & Peak Hours</span>
						</Card.Title>
						<Card.Description class="text-xs text-muted-foreground font-semibold">Categorized visit motivations and peak arrival times.</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-6">
				<!-- Purpose Breakdown -->
				<div class="space-y-2">
					<span class="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Top Visit Reasons</span>
					{#if purposeBreakdown.length > 0}
						<div class="flex flex-wrap gap-2 pt-1">
							{#each purposeBreakdown as item}
								<div class="p-2.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3 text-xs font-semibold flex-1 min-w-[140px]">
									<span class="text-foreground truncate">{item.purpose}</span>
									<Badge variant="outline" class="font-mono font-bold text-[10px] px-2 rounded-lg border-primary/30 text-primary">
										{item.count} ({item.percentage}%)
									</Badge>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-muted-foreground">No purpose categories recorded.</p>
					{/if}
				</div>

				<!-- Hourly Peak Traffic Bar Chart -->
				<div class="space-y-2 pt-2 border-t border-border/60">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Peak Arrival Hours (8 AM - 5 PM)</span>
					</div>
					<div class="flex items-end justify-between gap-1 h-24 pt-4 px-2 bg-muted/20 rounded-xl border border-border/40">
						{#each peakHours as bar}
							<div class="flex flex-col items-center gap-1 flex-1 h-full justify-end group relative">
								<div 
									class="w-full max-w-[16px] bg-primary/70 group-hover:bg-primary rounded-t-sm transition-all" 
									style="height: {Math.max(bar.heightPct, 8)}%"
								></div>
								<span class="text-[8px] font-mono text-muted-foreground font-bold">{bar.hour}</span>
							</div>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
