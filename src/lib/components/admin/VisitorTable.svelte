<script lang="ts">
	import type { Visitor } from '$lib/types';
	import { checkoutLocalVisitor } from '$lib/supabase';

	interface Props {
		visitors: Visitor[];
		onUpdate: () => void;
	}

	let { visitors = [], onUpdate }: Props = $props();

	function handleCheckout(id: string) {
		checkoutLocalVisitor(id);
		onUpdate();
	}

	// Simple hash function for dynamic OKLCH color selection
	function getColorVar(str: string): string {
		const chartVars = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % chartVars.length;
		return chartVars[index];
	}

	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<!-- Snippet for dynamically colored theme-aware badges using OKLCH -->
{#snippet officeBadge(officeName: string)}
	{@const colorVar = getColorVar(officeName)}
	<span
		class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors shadow-xs"
		style="background-color: oklch(from var({colorVar}) l c h / 0.15); border-color: oklch(from var({colorVar}) l c h / 0.3); color: var({colorVar});"
	>
		{officeName}
	</span>
{/snippet}

{#snippet statusBadge(status: string)}
	{#if status === 'checked_in'}
		<span
			class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
			style="background-color: oklch(from var(--chart-2) l c h / 0.15); border-color: oklch(from var(--chart-2) l c h / 0.3); color: var(--chart-2);"
		>
			<span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
			Active Visitor
		</span>
	{:else}
		<span
			class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-muted-foreground"
			style="background-color: oklch(from var(--muted) l c h / 0.3); border-color: var(--border);"
		>
			Checked Out
		</span>
	{/if}
{/snippet}

<div class="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
	<table class="w-full text-left text-xs text-foreground">
		<thead class="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
			<tr>
				<th class="px-4 py-3">Pass Code</th>
				<th class="px-4 py-3">Visitor Name</th>
				<th class="px-4 py-3">Contact</th>
				<th class="px-4 py-3">Destination Office</th>
				<th class="px-4 py-3">Purpose</th>
				<th class="px-4 py-3">Check-In</th>
				<th class="px-4 py-3">Check-Out</th>
				<th class="px-4 py-3">Status</th>
				<th class="px-4 py-3 text-right">Action</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border/60">
			{#each visitors as visitor (visitor.id)}
				<tr class="hover:bg-muted/40 transition-colors">
					<td class="px-4 py-3 font-mono text-xs font-bold text-primary">
						{visitor.passCode}
					</td>
					<td class="px-4 py-3 font-medium text-foreground">
						{visitor.fullName}
					</td>
					<td class="px-4 py-3 text-muted-foreground">
						<div>{visitor.email}</div>
						<div class="text-[10px]">{visitor.phone}</div>
					</td>
					<td class="px-4 py-3">
						{@render officeBadge(visitor.officeName || 'General')}
					</td>
					<td class="px-4 py-3 text-muted-foreground max-w-[150px] truncate" title={visitor.purpose}>
						{visitor.purpose}
					</td>
					<td class="px-4 py-3 font-mono text-muted-foreground">
						{formatTime(visitor.checkInTime)}
					</td>
					<td class="px-4 py-3 font-mono text-muted-foreground">
						{visitor.checkOutTime ? formatTime(visitor.checkOutTime) : '-'}
					</td>
					<td class="px-4 py-3">
						{@render statusBadge(visitor.status)}
					</td>
					<td class="px-4 py-3 text-right">
						{#if visitor.status === 'checked_in'}
							<button
								type="button"
								onclick={() => handleCheckout(visitor.id)}
								class="px-2.5 py-1 text-[11px] font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md transition-colors shadow-xs"
							>
								Check Out
							</button>
						{:else}
							<span class="text-[10px] text-muted-foreground italic">Completed</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
