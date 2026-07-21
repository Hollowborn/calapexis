<script lang="ts">
	import type { Visitor } from '$lib/types';
	import { checkoutLocalVisitor, getLocalVisitors } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		activeOfficeId?: string;
		onUpdate?: () => void;
	}

	let { activeOfficeId = '', onUpdate }: Props = $props();

	let searchQuery = $state('');
	let lastCheckedOutVisitor: Visitor | null = $state(null);

	let allVisitors = $derived(getLocalVisitors());

	let filteredActiveVisitors = $derived(
		allVisitors.filter((v) => {
			const isCheckedIn = v.status === 'checked_in';
			const matchesOffice = !activeOfficeId || v.officeId === activeOfficeId;
			const query = searchQuery.trim().toLowerCase();
			if (!query) return isCheckedIn && matchesOffice;

			const matchesQuery =
				v.passCode.toLowerCase().includes(query) ||
				v.fullName.toLowerCase().includes(query) ||
				v.phone.toLowerCase().includes(query) ||
				(v.officeName && v.officeName.toLowerCase().includes(query));

			return isCheckedIn && matchesQuery;
		})
	);

	function handlePerformCheckout(id: string) {
		const updated = checkoutLocalVisitor(id);
		if (updated) {
			lastCheckedOutVisitor = updated;
			if (onUpdate) onUpdate();
		}
	}
</script>

<div class="flex flex-col gap-6 max-w-2xl mx-auto">
	<Card.Root class="shadow-sm border-border">
		<Card.Header class="pb-3">
			<Card.Title class="text-xl font-bold text-foreground">Assisted Visitor Check-Out</Card.Title>
			<Card.Description class="text-xs text-muted-foreground">
				Search by Pass Code (e.g. VP-8921), visitor name, or phone number to check out visitors upon exit.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="relative">
				<Input
					type="text"
					placeholder="Search Pass Code (VP-XXXX), Visitor Name, or Phone..."
					bind:value={searchQuery}
					class="w-full pl-9 pr-4 py-2 text-sm bg-background border-border"
				/>
				<svg
					class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>

			{#if lastCheckedOutVisitor}
				<div class="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between text-xs text-primary">
					<div class="flex items-center gap-2">
						<span class="font-bold">✓ Checked Out:</span>
						<span>{lastCheckedOutVisitor.fullName} ({lastCheckedOutVisitor.passCode})</span>
					</div>
					<span class="font-mono text-[10px] text-muted-foreground">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<div class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
					<span>Active Visitors ({filteredActiveVisitors.length})</span>
					{#if activeOfficeId}
						<span class="text-[10px] text-primary">Filtered for current department</span>
					{/if}
				</div>

				{#if filteredActiveVisitors.length > 0}
					<div class="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
						{#each filteredActiveVisitors as visitor (visitor.id)}
							<div class="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-xs">
								<div class="flex flex-col gap-0.5">
									<div class="flex items-center gap-2">
										<span class="font-mono font-bold text-primary">{visitor.passCode}</span>
										<span class="font-semibold text-foreground">{visitor.fullName}</span>
									</div>
									<div class="text-[11px] text-muted-foreground">
										{visitor.officeName || 'General Office'} • {visitor.purpose}
									</div>
								</div>

								<Button
									onclick={() => handlePerformCheckout(visitor.id)}
									variant="destructive"
									size="sm"
									class="text-xs font-semibold px-3 py-1"
								>
									Check Out
								</Button>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-8 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
						No active checked-in visitors match your search.
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
