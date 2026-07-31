<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, MOCK_ROOMS, checkoutLocalVisitor } from '$lib/supabase';
	import StaffCheckInForm from '$lib/components/staff/StaffCheckInForm.svelte';
	import StaffCheckoutSearch from '$lib/components/staff/StaffCheckoutSearch.svelte';

	// Icons
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import SearchIcon from "@lucide/svelte/icons/search";
	import FilterIcon from "@lucide/svelte/icons/filter";
	import SchoolIcon from "@lucide/svelte/icons/school";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import UserIcon from "@lucide/svelte/icons/user";

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

	// Staff desk configuration state (roomId)
	let activeRoomId = $state('rm-101');
	let activeStaffTab = $state('checkin');

	// Directory Filters State
	let selectedDate = $state(new Date().toISOString().split('T')[0]); // Default to today: YYYY-MM-DD
	let directorySearchQuery = $state('');
	let isDatePickerOpen = $state(false);

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

	// Filtered logs for directory tab
	let filteredRoomVisitors = $derived(
		roomVisitors.filter((v: any) => {
			// Search query filter
			if (directorySearchQuery.trim()) {
				const q = directorySearchQuery.toLowerCase().trim();
				const matchesSearch = (
					v.fullName.toLowerCase().includes(q) ||
					v.passCode.toLowerCase().includes(q) ||
					(v.purpose && v.purpose.toLowerCase().includes(q)) ||
					(v.email && v.email.toLowerCase().includes(q))
				);
				if (!matchesSearch) return false;
			}

			// Calendar Date filter
			if (selectedDate) {
				const checkInIso = v.checkInTime;
				if (!checkInIso) return false;
				const vDate = new Date(checkInIso).toISOString().split('T')[0];
				if (vDate !== selectedDate) return false;
			}

			return true;
		})
	);

	// Helpers
	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function getColorVar(str: string): string {
		const chartVars = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % chartVars.length;
		return chartVars[index];
	}

	async function handleCheckout(id: string) {
		const updated = await checkoutLocalVisitor(id);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out successfully.`);
			await dashboardContext.loadData();
		}
	}
</script>

{#snippet buildingBadge(buildingName: string)}
	{@const colorVar = getColorVar(buildingName)}
	<Badge
		style="background-color: oklch(from var({colorVar}) l c h / 0.12); border-color: oklch(from var({colorVar}) l c h / 0.25); color: var({colorVar});"
		variant="outline"
		class="text-[11px] font-bold border transition-colors shadow-xs rounded-full px-2.5"
	>
		{buildingName}
	</Badge>
{/snippet}

{#snippet statusBadge(visitor: any)}
	{#if visitor.status === 'checked_out'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
			Checked Out
		</span>
	{:else if visitor.verificationStatus === 'rejected'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
			Declined
		</span>
	{:else if visitor.roomCheckInTime}
		<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 animate-pulse">
			In Office
		</span>
	{:else}
		<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
			On Campus
		</span>
	{/if}
{/snippet}

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<SchoolIcon class="size-6 pointer-events-none" />
			</div>
			<div>
				<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Staff Desk Console</h1>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Department office visitor reception, assisted walk-in entry, and logbook management.</p>
			</div>
		</div>
	</div>

	<!-- Room Office Department Banner Card -->
	<div class="p-5 rounded-2xl bg-card border border-border/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
		<div class="flex flex-col gap-1.5">
			<div class="flex items-center gap-2 flex-wrap">
				<Badge variant="secondary" class="font-mono text-xs font-black uppercase rounded-lg px-2.5 py-0.5">{activeRoom?.roomNumber}</Badge>
				<h2 class="text-lg font-black text-foreground">{activeRoom?.roomName}</h2>
			</div>
			<div class="flex items-center gap-3 text-xs text-muted-foreground font-semibold flex-wrap">
				{#if activeBuilding}
					<span class="flex items-center gap-1">
						<SchoolIcon class="size-3.5 text-primary pointer-events-none" />
						<strong class="text-foreground">{activeBuilding.name}</strong> ({activeBuilding.code})
					</span>
					<span>•</span>
					<span class="flex items-center gap-1">
						<LayersIcon class="size-3.5 text-primary pointer-events-none" />
						{activeRoom?.floor} Floor
					</span>
					<span>•</span>
					<span class="flex items-center gap-1">
						<UserIcon class="size-3.5 text-primary pointer-events-none" />
						Head: {activeBuilding.headPerson || 'Office Staff'}
					</span>
				{/if}
			</div>
		</div>

		<!-- Desk Selector & Occupancy Counter -->
		<div class="flex items-center gap-3 flex-wrap">
			<div class="flex items-center gap-2">
				<span class="text-xs font-extrabold uppercase text-muted-foreground tracking-wider hidden sm:inline">Active Office:</span>
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
						<Select.Trigger class="h-10 min-w-60 rounded-xl hover:bg-muted/30 cursor-pointer">
							<span class="text-xs font-semibold text-foreground">
								{MOCK_ROOMS.find(r => r.id === activeRoomId)?.roomNumber} - {MOCK_ROOMS.find(r => r.id === activeRoomId)?.roomName || 'Select Office Desk'}
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
			
			<Badge class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs py-1.5 px-3.5 rounded-xl border-emerald-500/30 gap-1.5">
				<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span>{activeRoomCount} Currently In Office</span>
			</Badge>
		</div>
	</div>

	<!-- Primary Staff Tabs: Check-In / Quick Check-Out / Logbook Directory -->
	<Tabs.Root value={activeStaffTab} onValueChange={(val) => (activeStaffTab = val)} class="w-full">
		<Tabs.List class="grid w-full grid-cols-3 max-w-lg mx-auto mb-6 bg-muted/60 p-1 rounded-xl">
			<Tabs.Trigger value="checkin" class="text-xs font-extrabold rounded-lg gap-1.5 cursor-pointer">
				<UserCheckIcon class="size-3.5 pointer-events-none" />
				<span>Assisted Entry</span>
			</Tabs.Trigger>
			<Tabs.Trigger value="checkout" class="text-xs font-extrabold rounded-lg gap-1.5 cursor-pointer">
				<LogOutIcon class="size-3.5 pointer-events-none" />
				<span>Quick Check-Out</span>
			</Tabs.Trigger>
			<Tabs.Trigger value="directory" class="text-xs font-extrabold rounded-lg gap-1.5 cursor-pointer">
				<CalendarIcon class="size-3.5 pointer-events-none" />
				<span>Office Logs ({roomVisitors.length})</span>
			</Tabs.Trigger>
		</Tabs.List>

		<!-- TAB 1: Assisted Walk-In Check-In Form -->
		<Tabs.Content value="checkin">
			<StaffCheckInForm
				buildings={MOCK_BUILDINGS}
				rooms={MOCK_ROOMS}
				{activeRoomId}
				onSuccess={async () => await dashboardContext.loadData()}
			/>
		</Tabs.Content>

		<!-- TAB 2: Quick Check-Out Search -->
		<Tabs.Content value="checkout">
			<StaffCheckoutSearch
				{activeRoomId}
				onUpdate={async () => await dashboardContext.loadData()}
			/>
		</Tabs.Content>

		<!-- TAB 3: Date-Filtered Office Logs Directory -->
		<Tabs.Content value="directory" class="flex flex-col gap-6">
			<!-- Date Filter & Search Control Header Bar -->
			<div class="p-4 rounded-2xl bg-card border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
				<div class="flex items-center gap-3 flex-wrap">
					<!-- DatePicker Popover Filter -->
					<Popover.Root bind:open={isDatePickerOpen}>
						<Popover.Trigger>
							<Button variant="outline" size="sm" class="h-9 font-mono text-xs font-extrabold gap-2 rounded-xl border-border/80 cursor-pointer">
								<CalendarIcon class="size-3.5 pointer-events-none text-primary" />
								<span>{selectedDate ? formatDate(selectedDate) : 'All Log Dates'}</span>
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-auto p-4 rounded-2xl border border-border bg-card shadow-xl flex flex-col gap-3">
							<div class="flex items-center justify-between border-b border-border/60 pb-2">
								<span class="text-xs font-black uppercase text-foreground tracking-wider">Filter Logs by Date</span>
								{#if selectedDate}
									<Button 
										variant="ghost" 
										size="sm" 
										onclick={() => { selectedDate = ''; isDatePickerOpen = false; }} 
										class="text-[10px] font-bold text-muted-foreground hover:text-foreground h-6 px-2 cursor-pointer"
									>
										Show All Dates
									</Button>
								{/if}
							</div>

							<div class="flex flex-col gap-2">
								<label for="log-date-picker" class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wide">Select Target Date</label>
								<input 
									type="date" 
									id="log-date-picker" 
									bind:value={selectedDate} 
									onchange={() => isDatePickerOpen = false} 
									class="h-9 px-3 rounded-xl border border-border bg-background text-xs font-mono font-bold cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20"
								/>
							</div>

							<div class="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
								<Button 
									variant="secondary" 
									size="sm" 
									onclick={() => { selectedDate = new Date().toISOString().split('T')[0]; isDatePickerOpen = false; }}
									class="text-[11px] font-extrabold rounded-lg h-7 w-full cursor-pointer"
								>
									Jump to Today
								</Button>
							</div>
						</Popover.Content>
					</Popover.Root>

					<!-- Active Filter Date Badge -->
					{#if selectedDate}
						<Badge variant="secondary" class="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg gap-1.5">
							<span>Logs for {formatDate(selectedDate)}</span>
							<button onclick={() => selectedDate = ''} class="hover:text-destructive text-muted-foreground cursor-pointer">×</button>
						</Badge>
					{/if}
				</div>

				<!-- Search Filter Input -->
				<div class="relative w-full md:w-64">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input 
						type="text" 
						placeholder="Search name, code, purpose..." 
						bind:value={directorySearchQuery} 
						class="pl-9 h-9 text-xs rounded-xl"
					/>
				</div>
			</div>

			<!-- Summary Metrics Row -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
					<div class="flex flex-col">
						<span class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Total Filtered Logs</span>
						<span class="text-xl font-black text-foreground">{filteredRoomVisitors.length}</span>
					</div>
					<FilterIcon class="size-5 text-muted-foreground/40 pointer-events-none" />
				</div>

				<div class="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
					<div class="flex flex-col">
						<span class="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Active In Office</span>
						<span class="text-xl font-black text-emerald-600 dark:text-emerald-400">
							{filteredRoomVisitors.filter((v: any) => v.status === 'checked_in').length}
						</span>
					</div>
					<UserCheckIcon class="size-5 text-emerald-500/50 pointer-events-none" />
				</div>

				<div class="p-4 rounded-2xl border border-border bg-card flex items-center justify-between">
					<div class="flex flex-col">
						<span class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Completed Exits</span>
						<span class="text-xl font-black text-foreground">
							{filteredRoomVisitors.filter((v: any) => v.status === 'checked_out').length}
						</span>
					</div>
					<LogOutIcon class="size-5 text-muted-foreground/40 pointer-events-none" />
				</div>
			</div>

			<!-- Shadcn Data Table for Office Logbook -->
			<div class="w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
				<Table.Root>
					<Table.Header class="bg-muted/30">
						<Table.Row>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5">Pass Code</Table.Head>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5">Visitor Profile</Table.Head>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5">Purpose</Table.Head>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5">Host Officer</Table.Head>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5">Check-In Time</Table.Head>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5">Status</Table.Head>
							<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider py-3.5 text-right">Action</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRoomVisitors as visitor (visitor.id)}
							<Table.Row class="hover:bg-muted/20 transition-colors font-semibold text-xs">
								<Table.Cell class="py-3.5">
									<span class="font-mono font-black text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
										{visitor.passCode}
									</span>
								</Table.Cell>

								<Table.Cell class="py-3.5">
									<div class="font-black text-foreground text-sm">{visitor.fullName}</div>
									<div class="text-[10px] text-muted-foreground font-semibold mt-0.5">{visitor.email} • {visitor.phone}</div>
								</Table.Cell>

								<Table.Cell class="py-3.5 text-muted-foreground max-w-[160px] truncate">
									{visitor.purpose}
								</Table.Cell>

								<Table.Cell class="py-3.5">
									<div class="font-bold text-foreground">{visitor.hostPerson || 'Office Staff'}</div>
									{#if visitor.roomNumber}
										<div class="text-[10px] text-muted-foreground font-semibold mt-0.5">{visitor.roomNumber}</div>
									{/if}
								</Table.Cell>

								<Table.Cell class="py-3.5 text-muted-foreground">
									<div class="font-mono text-foreground font-bold">{formatTime(visitor.checkInTime)}</div>
									<div class="text-[10px] mt-0.5 font-semibold text-muted-foreground/80">{formatDate(visitor.checkInTime)}</div>
								</Table.Cell>

								<Table.Cell class="py-3.5">
									{@render statusBadge(visitor)}
								</Table.Cell>

								<Table.Cell class="py-3.5 text-right">
									{#if visitor.status === 'checked_in'}
										<Button
											onclick={() => handleCheckout(visitor.id)}
											variant="destructive"
											size="sm"
											class="text-[10px] font-extrabold h-7 px-3 rounded-lg cursor-pointer shadow-xs"
										>
											Mark Room Exit
										</Button>
									{:else}
										<span class="text-[10px] text-muted-foreground italic font-bold">Exited</span>
									{/if}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="text-center py-12 text-muted-foreground text-xs font-semibold">
									No visitor logs found for {selectedDate ? formatDate(selectedDate) : 'this office'}.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
