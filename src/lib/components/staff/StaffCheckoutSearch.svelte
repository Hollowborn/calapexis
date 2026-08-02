<script lang="ts">
	import type { Visitor } from '$lib/types';
	import { checkoutLocalVisitor, getLocalVisitors } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	interface Props {
		assignedOfficeId?: string | null;
		role?: string;
		onUpdate?: () => void;
	}

	let { assignedOfficeId = null, role = 'staff', onUpdate }: Props = $props();

	let searchQuery = $state('');
	let lastCheckedOutVisitor: Visitor | null = $state(null);

	let allVisitors = $state<Visitor[]>([]);

	async function loadAll() {
		allVisitors = await getLocalVisitors(role === 'staff');
	}

	$effect(() => {
		loadAll();
		const interval = setInterval(loadAll, 2000);
		return () => clearInterval(interval);
	});

	let filteredActiveVisitors = $derived(
		allVisitors.filter((v) => {
			const isCheckedIn = v.status === 'checked_in';
			const matchesOffice = role === 'admin' || !assignedOfficeId || v.officeId === assignedOfficeId;
			const query = searchQuery.trim().toLowerCase();
			if (!query) return isCheckedIn && matchesOffice;

			const matchesQuery =
				v.passCode.toLowerCase().includes(query) ||
				v.fullName.toLowerCase().includes(query) ||
				(v.phone && v.phone.toLowerCase().includes(query)) ||
				(v.officeName && v.officeName.toLowerCase().includes(query));

			return isCheckedIn && matchesOffice && matchesQuery;
		})
	);

	async function handlePerformCheckout(id: string) {
		try {
			const updated = await checkoutLocalVisitor(id, assignedOfficeId, role === 'staff');
			if (updated) {
				lastCheckedOutVisitor = updated;
				toast.info(`Visitor ${updated.fullName} checked out successfully.`, {
					description: `Pass Code: ${updated.passCode}`
				});
				await loadAll();
				if (onUpdate) onUpdate();
			} else {
				toast.error("Check-Out Failed", {
					description: "Visitor pass code not found or already checked out."
				});
			}
		} catch (err: any) {
			toast.error("Check-Out Error", {
				description: err.message || "Failed to complete visitor check-out."
			});
		}
	}
</script>

<div class="flex flex-col gap-6 max-w-2xl mx-auto">
	<Card.Root class="shadow-sm border-border">
		<Card.Header class="pb-3">
			<Card.Title class="text-xl font-bold text-foreground">Assisted Visitor Check-Out</Card.Title>
			<Card.Description class="text-xs text-muted-foreground font-semibold">
				Search by Pass Code (e.g. VP-8921), visitor name, or phone number to check out visitors upon exit.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="relative">
				<Input
					type="text"
					placeholder="Search Pass Code (VP-XXXX), Visitor Name, or Phone..."
					bind:value={searchQuery}
					class="w-full pl-9 pr-4 py-2 text-xs bg-background border-border rounded-xl h-10"
				/>
				<SearchIcon class="absolute left-3 top-3 size-4 text-muted-foreground" />
			</div>

			{#if lastCheckedOutVisitor}
				<div class="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between text-xs text-primary">
					<div class="flex items-center gap-2">
						<CheckCircleIcon class="size-4 text-primary" />
						<span class="font-bold">Checked Out:</span>
						<span>{lastCheckedOutVisitor.fullName} ({lastCheckedOutVisitor.passCode})</span>
					</div>
					<span class="font-mono text-[10px] text-muted-foreground">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<div class="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
					<span>Active Visitors ({filteredActiveVisitors.length})</span>
					{#if assignedOfficeId}
						<span class="text-[10px] text-primary">Filtered for managed office</span>
					{/if}
				</div>

				{#if filteredActiveVisitors.length > 0}
					<div class="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
						{#each filteredActiveVisitors as visitor (visitor.id)}
							<div class="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-xs font-semibold">
								<div class="flex flex-col gap-0.5">
									<div class="flex items-center gap-2">
										<span class="font-mono font-bold text-primary">{visitor.passCode}</span>
										<span class="font-semibold text-foreground">{visitor.fullName}</span>
									</div>
									<div class="text-[11px] text-muted-foreground">
										{visitor.buildingName || 'General'} • {visitor.roomNumber || ''} • {visitor.purpose}
									</div>
								</div>

								<Button
									onclick={() => handlePerformCheckout(visitor.id)}
									variant="destructive"
									size="sm"
									class="text-xs font-semibold px-3 py-1 gap-1.5 rounded-xl cursor-pointer"
								>
									<LogOutIcon class="size-3.5" />
									<span>Check Out</span>
								</Button>
							</div>
						{/each}
					</div>
				{:else}
					<div class="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
						No active checked-in visitors match your search.
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
