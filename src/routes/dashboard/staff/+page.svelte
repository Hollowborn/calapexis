<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, MOCK_ROOMS, checkoutLocalVisitor } from '$lib/supabase';
	import StaffCheckInForm from '$lib/components/staff/StaffCheckInForm.svelte';
	import StaffCheckoutSearch from '$lib/components/staff/StaffCheckoutSearch.svelte';

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

	// Staff desk configuration state (roomId)
	let activeRoomId = $state('rm-101');
	let activeStaffTab = $state('checkin');

	$effect(() => {
		if (data.assignedRoomId) {
			activeRoomId = data.assignedRoomId;
		}
	});

	// Dynamic derived listings
	let roomVisitors = $derived(visitors.filter((v: any) => v.roomId === activeRoomId));
	let activeRoom = $derived(MOCK_ROOMS.find((r) => r.id === activeRoomId));
	let activeBuilding = $derived(activeRoom ? MOCK_BUILDINGS.find((b) => b.id === activeRoom.buildingId) : null);
	let activeRoomCount = $derived(roomVisitors.filter((v: any) => v.status === 'checked_in').length);

	// Helpers
	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	async function handleCheckout(id: string) {
		const updated = await checkoutLocalVisitor(id);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out successfully.`);
			await dashboardContext.loadData();
		}
	}
</script>

{#snippet statusBadge(visitor: any)}
	{#if visitor.status === 'checked_out'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
			Checked Out
		</span>
	{:else if visitor.verificationStatus === 'rejected'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/30 text-red-500 border border-red-200">
			Declined
		</span>
	{:else if visitor.roomCheckInTime}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/30 text-indigo-500 border border-indigo-200 animate-pulse">
			In Office
		</span>
	{:else}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-200">
			On Campus
		</span>
	{/if}
{/snippet}

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Staff Desk Console</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Department manual walk-in check-in desk</p>
		</div>
	</div>

	<!-- Room Office Department Banner -->
	<div class="p-5 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2 flex-wrap">
				<Badge variant="secondary" class="font-mono text-xs font-black uppercase rounded-lg px-2 py-0.5">{activeRoom?.roomNumber}</Badge>
				<h1 class="text-lg font-bold text-foreground">{activeRoom?.roomName}</h1>
			</div>
			<p class="text-xs text-muted-foreground font-semibold">
				{#if activeBuilding}
					{activeBuilding.name} ({activeBuilding.code}) • {activeRoom?.floor} • Head: {activeBuilding.headPerson || 'N/A'}
				{/if}
			</p>
		</div>

		<!-- Desk Selector for Admin / General users -->
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2.5">
				<span class="text-xs font-bold uppercase text-muted-foreground tracking-wide hidden md:inline">Current Office/Room:</span>
				{#if data.assignedRoomId}
					<Badge class="bg-primary text-primary-foreground font-black text-xs py-1.5 px-3.5 rounded-xl shadow-xs">
						{MOCK_ROOMS.find(r => r.id === data.assignedRoomId)?.roomNumber} - {MOCK_ROOMS.find(r => r.id === data.assignedRoomId)?.roomName}
					</Badge>
				{:else}
					<Select.Root
						type="single"
						value={activeRoomId}
						onValueChange={(val) => activeRoomId = val}
					>
						<Select.Trigger class="h-9 min-w-56 rounded-xl hover:bg-muted/30 cursor-pointer">
							<span class="text-xs font-semibold text-foreground">
								{MOCK_ROOMS.find(r => r.id === activeRoomId)?.roomNumber} - {MOCK_ROOMS.find(r => r.id === activeRoomId)?.roomName || 'Select Desk/Room'}
							</span>
						</Select.Trigger>
						<Select.Content class="rounded-xl border border-border bg-card">
							<Select.Group class="max-h-60 overflow-y-auto">
								{#each MOCK_ROOMS as room}
									<Select.Item value={room.id} label={`${room.roomNumber} - ${room.roomName}`}>
										{room.roomNumber} - {room.roomName} ({MOCK_BUILDINGS.find(b => b.id === room.buildingId)?.code || ''})
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				{/if}
			</div>
			<Badge variant="outline" class="border-primary text-primary font-bold text-xs py-1.5 px-3 rounded-xl bg-primary/[0.02]">
				{activeRoomCount} Active Visitors
			</Badge>
		</div>
	</div>

	<!-- Svelte sub-tabs inside Staff view -->
	<Tabs.Root value={activeStaffTab} onValueChange={(val) => (activeStaffTab = val)} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3 max-w-md mx-auto mb-6 bg-muted rounded-xl">
			<Tabs.Trigger value="checkin" class="text-xs font-extrabold rounded-lg cursor-pointer">
				Assisted Entry
			</Tabs.Trigger>
			<Tabs.Trigger value="checkout" class="text-xs font-extrabold rounded-lg cursor-pointer">
				Quick Check-Out
			</Tabs.Trigger>
			<Tabs.Trigger value="directory" class="text-xs font-extrabold rounded-lg cursor-pointer">
				Office Log ({roomVisitors.length})
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="checkin">
			<StaffCheckInForm
				buildings={MOCK_BUILDINGS}
				rooms={MOCK_ROOMS}
				{activeRoomId}
				onSuccess={async () => await dashboardContext.loadData()}
			/>
		</Tabs.Content>

		<Tabs.Content value="checkout">
			<StaffCheckoutSearch
				{activeRoomId}
				onUpdate={async () => await dashboardContext.loadData()}
			/>
		</Tabs.Content>

		<Tabs.Content value="directory" class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-bold text-foreground uppercase tracking-wider">Office visitors logs for {activeRoom?.roomName}</h2>
				<span class="text-xs text-muted-foreground font-semibold">Total: {roomVisitors.length} logs</span>
			</div>

			<div class="w-full overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
				<table class="w-full text-left text-xs border-collapse">
					<thead>
						<tr class="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-extrabold border-b border-border">
							<th class="px-6 py-3.5">Pass Code</th>
							<th class="px-6 py-3.5">Visitor Name</th>
							<th class="px-6 py-3.5">Purpose</th>
							<th class="px-6 py-3.5">Assigned Host / Room</th>
							<th class="px-6 py-3.5">Entry Time</th>
							<th class="px-6 py-3.5">Status</th>
							<th class="px-6 py-3.5 text-right">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each roomVisitors as visitor}
							<tr class="hover:bg-muted/30 transition-colors font-medium">
								<td class="px-6 py-4 font-mono font-black text-primary">{visitor.passCode}</td>
								<td class="px-6 py-4">
									<div class="font-bold text-foreground text-sm">{visitor.fullName}</div>
									<div class="text-[10px] text-muted-foreground font-semibold mt-0.5">{visitor.email} • {visitor.phone}</div>
								</td>
								<td class="px-6 py-4 text-muted-foreground max-w-[150px] truncate">{visitor.purpose}</td>
								<td class="px-6 py-4">
									<div class="font-semibold text-foreground">{visitor.hostPerson || 'Office Head'}</div>
									{#if visitor.roomNumber}
										<div class="text-[10px] text-muted-foreground font-semibold mt-0.5">{visitor.roomNumber}</div>
									{/if}
								</td>
								<td class="px-6 py-4 text-muted-foreground">
									<div class="font-mono text-foreground font-semibold">{formatTime(visitor.checkInTime)}</div>
									<div class="text-[9px] mt-0.5">{formatDate(visitor.checkInTime)}</div>
								</td>
								<td class="px-6 py-4">{@render statusBadge(visitor)}</td>
								<td class="px-6 py-4 text-right">
									{#if visitor.status === 'checked_in'}
										<Button
											onclick={() => handleCheckout(visitor.id)}
											variant="destructive"
											size="sm"
											class="text-[10px] font-bold h-7 px-3 rounded-lg cursor-pointer animate-pulse"
										>
											Check Out
										</Button>
									{:else}
										<span class="text-[10px] text-muted-foreground italic font-semibold">Exited</span>
									{/if}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="text-center py-12 text-muted-foreground text-xs font-semibold">
									No visitor logs registered under this department office.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
