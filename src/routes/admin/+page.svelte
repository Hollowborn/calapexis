<script lang="ts">
	import { getLocalVisitors } from '$lib/supabase';
	import type { Visitor } from '$lib/types';
	import VisitorTable from '$lib/components/admin/VisitorTable.svelte';

	let visitors: Visitor[] = $state([]);

	$effect(() => {
		loadVisitors();
	});

	function loadVisitors() {
		visitors = getLocalVisitors();
	}

	let totalVisitors = $derived(visitors.length);
	let activeVisitors = $derived(visitors.filter((v) => v.status === 'checked_in').length);
	let completedCheckouts = $derived(visitors.filter((v) => v.status === 'checked_out').length);
</script>

<div class="space-y-6">
	<!-- Admin Dashboard Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Visitor Logbook Administration</h1>
			<p class="text-xs text-muted-foreground">Monitor live campus visitor entries, track check-ins, and manage checkout records.</p>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadVisitors}
				class="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
			>
				<svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
				<span>Refresh Logs</span>
			</button>
		</div>
	</div>

	<!-- Analytics Metrics Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
		<div class="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
			<div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Visitors Today</div>
			<div class="text-3xl font-black text-foreground">{totalVisitors}</div>
		</div>

		<div class="p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-xs space-y-1">
			<div class="text-[11px] font-semibold text-primary uppercase tracking-wider">Active Campus Visitors</div>
			<div class="text-3xl font-black text-primary flex items-center gap-2">
				<span>{activeVisitors}</span>
				<span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
			</div>
		</div>

		<div class="p-4 rounded-xl border border-border bg-card shadow-xs space-y-1">
			<div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Check-Outs</div>
			<div class="text-3xl font-black text-foreground">{completedCheckouts}</div>
		</div>
	</div>

	<!-- Visitor Logbook Data Table -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-bold text-foreground">Real-Time Visitor Logbook</h2>
			<span class="text-xs text-muted-foreground">Showing {visitors.length} entries</span>
		</div>

		<VisitorTable {visitors} onUpdate={loadVisitors} />
	</div>
</div>
