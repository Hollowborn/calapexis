<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { checkoutLocalVisitor } from '$lib/supabase';
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
	import Building2Icon from "@lucide/svelte/icons/building-2";

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

	let activeStaffTab = $state('checkin');

	// Directory Filters State
	let selectedDate = $state(new Date().toISOString().split('T')[0]); // Default to today
	let directorySearchQuery = $state('');

	// Checkout Confirmation AlertDialog state
	let isCheckoutDialogOpen = $state(false);
	let checkoutTargetVisitor = $state<any | null>(null);
	let isCheckingOut = $state(false);

	let officesList = $derived(data?.offices || []);
	let activeOffice = $derived(
		officesList.find(o => o.id === data.assignedOfficeId) || officesList[0]
	);

	// Derived visitor lists for staff desk
	let officeVisitors = $derived(
		data.role === 'admin' 
			? visitors 
			: visitors.filter((v: any) => v.officeId === data.assignedOfficeId || !v.officeId)
	);

	let activePassesCount = $derived(officeVisitors.filter((v: any) => v.status === 'checked_in').length);

	// Filtered logs for directory tab
	let filteredOfficeVisitors = $derived(
		officeVisitors.filter((v: any) => {
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

			if (selectedDate) {
				const checkInIso = v.checkInTime;
				if (!checkInIso) return false;
				const vDate = new Date(checkInIso).toISOString().split('T')[0];
				if (vDate !== selectedDate) return false;
			}

			return true;
		})
	);

	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function promptCheckout(visitor: any) {
		checkoutTargetVisitor = visitor;
		isCheckoutDialogOpen = true;
	}

	async function confirmCheckout() {
		if (!checkoutTargetVisitor) return;
		isCheckingOut = true;
		try {
			await checkoutLocalVisitor(checkoutTargetVisitor.id, data.assignedOfficeId, data.role === 'staff');
			toast.info(`Visitor ${checkoutTargetVisitor.fullName} checked out successfully.`);
			if (dashboardContext?.loadData) dashboardContext.loadData();
		} catch (e: any) {
			toast.error(e?.message || "Failed to check out visitor.");
		} finally {
			isCheckingOut = false;
			isCheckoutDialogOpen = false;
			checkoutTargetVisitor = null;
		}
	}
</script>

{#snippet statusBadge(visitor: any)}
	{#if visitor.status === 'checked_out'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
			Checked Out
		</span>
	{:else if visitor.verificationStatus === 'rejected'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
			Declined
		</span>
	{:else}
		<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
			Active Pass
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
				{#if activeOffice?.code}
					<Badge variant="secondary" class="font-mono text-xs font-black uppercase rounded-lg px-2.5 py-0.5">{activeOffice.code}</Badge>
				{/if}
				<h2 class="text-lg font-black text-foreground">{activeOffice?.name || 'Reception Counter'}</h2>
			</div>
			<div class="flex items-center gap-3 text-xs text-muted-foreground font-semibold flex-wrap">
				<span class="flex items-center gap-1">
					<Building2Icon class="size-3.5 text-primary pointer-events-none" />
					<strong class="text-foreground">{activeOffice?.name || 'Department Desk'}</strong>
				</span>
				<span>•</span>
				<span class="flex items-center gap-1">
					<UserIcon class="size-3.5 text-primary pointer-events-none" />
					Head: {activeOffice?.headPerson || 'Office Staff'}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-3 shrink-0">
			<Badge class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs py-1.5 px-3.5 rounded-xl border-emerald-500/30 gap-1.5">
				<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span>{activePassesCount} Active Passes</span>
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
				<span>Office Logs ({officeVisitors.length})</span>
			</Tabs.Trigger>
		</Tabs.List>

		<!-- TAB 1: Assisted Walk-In Check-In Form -->
		<Tabs.Content value="checkin">
			<StaffCheckInForm
				offices={data.offices}
				role={data.role}
				assignedOfficeId={data.assignedOfficeId}
				onSuccess={() => dashboardContext?.loadData()}
			/>
		</Tabs.Content>

		<!-- TAB 2: Quick Passcode / ID Scanner Checkout -->
		<Tabs.Content value="checkout">
			<StaffCheckoutSearch
				assignedOfficeId={data.assignedOfficeId}
				role={data.role}
				onUpdate={() => dashboardContext?.loadData()}
			/>
		</Tabs.Content>

		<!-- TAB 3: Filterable Department Visitors Directory -->
		<Tabs.Content value="directory" class="flex flex-col gap-4">
			<!-- Filter Toolbar -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
				<div class="flex items-center gap-3">
					<!-- Date Picker Filter -->
					<div class="flex items-center gap-2">
						<span class="text-xs font-bold text-muted-foreground">Filter Date:</span>
						<Input
							type="date"
							bind:value={selectedDate}
							class="h-9 w-40 text-xs font-bold rounded-xl"
						/>
						{#if selectedDate}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (selectedDate = '')}
								class="h-9 text-[11px] font-extrabold text-muted-foreground hover:text-foreground cursor-pointer"
							>
								Clear Date
							</Button>
						{/if}
					</div>
				</div>

				<!-- Search Input -->
				<div class="relative w-full sm:w-64">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="Search name, passcode..."
						bind:value={directorySearchQuery}
						class="pl-9 h-9 text-xs rounded-xl"
					/>
				</div>
			</div>

			<!-- Logbook Data Table -->
			<Card.Root class="border-border shadow-xs rounded-2xl bg-card overflow-hidden">
				<Card.Content class="p-0 overflow-x-auto">
					<Table.Root>
						<Table.Header class="bg-muted/30 text-[10px] uppercase font-black tracking-wider">
							<Table.Row class="border-b border-border/60">
								<Table.Head class="pl-5 py-3">Visitor Profile</Table.Head>
								<Table.Head>Pass Code</Table.Head>
								<Table.Head>Destination Office</Table.Head>
								<Table.Head>Check-In Time</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="pr-5 text-end">Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="text-xs font-semibold divide-y divide-border/40">
							{#each filteredOfficeVisitors as v}
								<Table.Row class="hover:bg-muted/30 transition-colors">
									<Table.Cell class="pl-5 py-3">
										<div class="flex items-center gap-3">
											<img src={v.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`} alt={v.fullName} class="size-9 rounded-full object-cover border border-border shrink-0" />
											<div>
												<div class="font-extrabold text-foreground">{v.fullName}</div>
												<div class="text-[10px] text-muted-foreground">{v.email || v.phone || 'Walk-In'}</div>
											</div>
										</div>
									</Table.Cell>
									<Table.Cell class="font-mono text-xs font-black text-primary">{v.passCode}</Table.Cell>
									<Table.Cell>{v.officeName || 'Department Desk'}</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col">
											<span class="font-mono font-extrabold text-foreground">{formatTime(v.checkInTime)}</span>
											<span class="text-[10px] text-muted-foreground">{formatDate(v.checkInTime)}</span>
										</div>
									</Table.Cell>
									<Table.Cell>
										{@render statusBadge(v)}
									</Table.Cell>
									<Table.Cell class="pr-5 text-end">
										{#if v.status === 'checked_in'}
											<Button
												onclick={() => promptCheckout(v)}
												variant="destructive"
												size="sm"
												class="h-8 text-xs font-bold rounded-xl cursor-pointer gap-1"
											>
												<LogOutIcon class="size-3.5 pointer-events-none" />
												<span>Check Out</span>
											</Button>
										{:else}
											<span class="text-[10px] text-muted-foreground font-mono">Archived</span>
										{/if}
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={6} class="text-center py-8 text-muted-foreground text-xs font-medium">
										No visitor logs match the selected filters.
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- CHECK OUT CONFIRMATION ALERT DIALOG -->
<AlertDialog.Root bind:open={isCheckoutDialogOpen}>
	<AlertDialog.Portal>
		<AlertDialog.Content class="z-[2600] max-w-sm border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<AlertDialog.Header>
				<AlertDialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<LogOutIcon class="size-5 text-destructive pointer-events-none" />
					<span>Confirm Visitor Check Out</span>
				</AlertDialog.Title>
				<AlertDialog.Description class="text-xs text-muted-foreground leading-relaxed">
					Are you sure you want to check out <strong class="text-foreground">{checkoutTargetVisitor?.fullName}</strong> ({checkoutTargetVisitor?.passCode})? This will mark their pass as completed.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer class="pt-2 border-t border-border/60">
				<AlertDialog.Cancel onclick={() => isCheckoutDialogOpen = false} class="text-xs font-semibold rounded-xl h-9 cursor-pointer">
					Cancel
				</AlertDialog.Cancel>
				<AlertDialog.Action onclick={confirmCheckout} disabled={isCheckingOut} class="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-extrabold rounded-xl h-9 cursor-pointer">
					{isCheckingOut ? 'Checking Out...' : 'Check Out Visitor'}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
