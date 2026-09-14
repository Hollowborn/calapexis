<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { checkoutLocalVisitor } from '$lib/supabase';
	import StaffCheckInModal from '$lib/components/staff/StaffCheckInModal.svelte';

	// Lucide Icons
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UserPlusIcon from "@lucide/svelte/icons/user-plus";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import SearchIcon from "@lucide/svelte/icons/search";
	import SchoolIcon from "@lucide/svelte/icons/school";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import UserIcon from "@lucide/svelte/icons/user";
	import HistoryIcon from "@lucide/svelte/icons/history";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext?.visitors || []);

	let officesList = $derived(data?.offices || []);
	let activeOffice = $derived(
		officesList.find((o: any) => o.id === data.assignedOfficeId) || officesList[0]
	);

	// Assisted Check-In Modal state
	let isAssistModalOpen = $state(false);
	let selectedPrefillVisitor = $state<any | null>(null);

	// Search queries for both panels
	let searchPreviousVisitorQuery = $state('');
	let searchActiveVisitorQuery = $state('');

	// Checkout Confirmation AlertDialog state
	let isCheckoutDialogOpen = $state(false);
	let checkoutTargetVisitor = $state<any | null>(null);
	let isCheckingOut = $state(false);

	// Derived active visitors for staff desk
	let officeVisitors = $derived(
		data.role === 'admin' 
			? visitors 
			: visitors.filter((v: any) => v.officeId === data.assignedOfficeId || !v.officeId)
	);

	let activeCheckedInVisitors = $derived(
		officeVisitors.filter((v: any) => v.status === 'checked_in')
	);

	let activePassesCount = $derived(activeCheckedInVisitors.length);

	// Filtered active visitors for right panel
	let filteredActiveVisitors = $derived(
		activeCheckedInVisitors.filter((v: any) => {
			if (!searchActiveVisitorQuery.trim()) return true;
			const q = searchActiveVisitorQuery.toLowerCase().trim();
			return (
				v.fullName?.toLowerCase().includes(q) ||
				v.passCode?.toLowerCase().includes(q) ||
				v.purpose?.toLowerCase().includes(q) ||
				v.email?.toLowerCase().includes(q) ||
				v.phone?.toLowerCase().includes(q)
			);
		})
	);

	// Previous visitors from database load
	let recentVisitorsList = $derived(data?.recentOfficeVisitors || []);

	// Filtered previous visitors for left panel
	let filteredPreviousVisitors = $derived(
		recentVisitorsList.filter((v: any) => {
			if (!searchPreviousVisitorQuery.trim()) return true;
			const q = searchPreviousVisitorQuery.toLowerCase().trim();
			return (
				v.fullName?.toLowerCase().includes(q) ||
				v.email?.toLowerCase().includes(q) ||
				v.phone?.toLowerCase().includes(q) ||
				v.lastPurpose?.toLowerCase().includes(q)
			);
		})
	);

	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	function handleOpenNewWalkIn() {
		selectedPrefillVisitor = null;
		isAssistModalOpen = true;
	}

	function handleQuickReEntry(visitor: any) {
		selectedPrefillVisitor = visitor;
		isAssistModalOpen = true;
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

<div class="flex flex-col gap-4 p-4 md:p-6 h-[calc(100vh-4.5rem)] overflow-hidden">
	<!-- 1. COMPACT TOP HEADER & DESK BANNER BAR -->
	<div class="p-3.5 md:p-4 rounded-2xl bg-card border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs shrink-0">
		<div class="flex items-center gap-3 min-w-0">
			<div class="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
				<SchoolIcon class="size-5 pointer-events-none" />
			</div>
			<div class="min-w-0">
				<div class="flex items-center gap-2 flex-wrap">
					{#if activeOffice?.code}
						<Badge variant="secondary" class="font-mono text-[10px] font-black uppercase rounded-lg px-2 py-0.5">{activeOffice.code}</Badge>
					{/if}
					<h1 class="text-base md:text-lg font-black text-foreground truncate tracking-tight">{activeOffice?.name || 'Staff Desk Console'}</h1>
				</div>
				<div class="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold truncate mt-0.5">
					<span class="flex items-center gap-1">
						<Building2Icon class="size-3 text-primary pointer-events-none shrink-0" />
						<span class="truncate">{activeOffice?.name || 'Department Desk'}</span>
					</span>
					<span>•</span>
					<span class="flex items-center gap-1">
						<UserIcon class="size-3 text-primary pointer-events-none shrink-0" />
						<span class="truncate">Head: {activeOffice?.headPerson || 'Staff Officer'}</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Action Buttons & Badges -->
		<div class="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
			<Badge class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs py-1.5 px-3 rounded-xl border-emerald-500/30 gap-1.5">
				<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
				<span>{activePassesCount} Active Passes</span>
			</Badge>

			<Button
				onclick={handleOpenNewWalkIn}
				class="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl h-9 px-3.5 gap-1.5 cursor-pointer shadow-xs"
			>
				<UserPlusIcon class="size-4 pointer-events-none" />
				<span>+ New Walk-In Visitor</span>
			</Button>

			<Button
				href="/dashboard/logs"
				variant="outline"
				class="text-xs font-bold rounded-xl h-9 px-3 gap-1.5 border-border hover:bg-muted cursor-pointer"
			>
				<FileTextIcon class="size-3.5 text-muted-foreground pointer-events-none" />
				<span>Office Logs</span>
				<ArrowUpRightIcon class="size-3 text-muted-foreground pointer-events-none" />
			</Button>
		</div>
	</div>

	<!-- 2. MAIN 2-COLUMN SINGLE-SCREEN CONSOLE -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
		<!-- LEFT PANEL: Assisted Walk-In Entry & Previous Visitors Directory (5 Cols) -->
		<Card.Root class="lg:col-span-5 flex flex-col rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden min-h-0">
			<!-- Panel Header -->
			<Card.Header class="p-3.5 border-b border-border/60 bg-muted/20 pb-3 shrink-0">
				<div class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<div class="p-1.5 rounded-lg bg-primary/10 text-primary">
							<HistoryIcon class="size-4 pointer-events-none" />
						</div>
						<div>
							<Card.Title class="text-xs font-black uppercase tracking-wider text-foreground">Previous Visitors Directory</Card.Title>
							<Card.Description class="text-[10px] text-muted-foreground font-semibold">1-click auto-fill for returning visitors</Card.Description>
						</div>
					</div>
					<Badge variant="outline" class="font-mono text-[9px] px-1.5">{filteredPreviousVisitors.length}</Badge>
				</div>

				<!-- Search Previous Visitors -->
				<div class="relative mt-2.5">
					<SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="Search past visitor name, email, phone..."
						bind:value={searchPreviousVisitorQuery}
						class="pl-8 h-8 text-xs font-semibold rounded-xl bg-background border-border"
					/>
				</div>
			</Card.Header>

			<!-- Scrollable Previous Visitors List -->
			<Card.Content class="p-0 flex-1 overflow-y-auto divide-y divide-border/40">
				{#if filteredPreviousVisitors.length > 0}
					{#each filteredPreviousVisitors as visitor (visitor.id)}
						<div class="p-3 flex items-center justify-between gap-2.5 hover:bg-muted/30 transition-colors">
							<div class="flex items-center gap-2.5 min-w-0 flex-1">
								<img
									src={visitor.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(visitor.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`}
									alt={visitor.fullName}
									class="size-9 rounded-full object-cover border border-border/80 shrink-0"
								/>
								<div class="min-w-0 flex-1">
									<div class="font-extrabold text-xs text-foreground truncate">{visitor.fullName}</div>
									<div class="text-[10px] text-muted-foreground font-semibold truncate">
										{visitor.email || visitor.phone || 'Walk-In Record'}
									</div>
									{#if visitor.lastPurpose || visitor.lastVisitTime}
										<div class="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 mt-0.5">
											{#if visitor.lastVisitTime}
												<span class="font-mono">{formatDate(visitor.lastVisitTime)}</span>
											{/if}
											{#if visitor.lastPurpose}
												<span>•</span>
												<span class="truncate italic max-w-[140px]">{visitor.lastPurpose}</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>

							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={() => handleQuickReEntry(visitor)}
								class="h-7 px-2.5 text-[11px] font-extrabold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
								title="Quick Check-In this visitor"
							>
								<SparklesIcon class="size-3 pointer-events-none" />
								<span>Re-Entry</span>
							</Button>
						</div>
					{/each}
				{:else}
					<div class="p-8 text-center flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
						<HistoryIcon class="size-8 text-muted-foreground/40" />
						<span class="text-xs font-semibold">No past visitor records found.</span>
						<Button
							onclick={handleOpenNewWalkIn}
							variant="outline"
							size="sm"
							class="text-xs font-bold rounded-xl mt-1 cursor-pointer"
						>
							Register New Visitor
						</Button>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- RIGHT PANEL: Active Office Passes & Quick Check-Out (7 Cols) -->
		<Card.Root class="lg:col-span-7 flex flex-col rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden min-h-0">
			<!-- Panel Header -->
			<Card.Header class="p-3.5 border-b border-border/60 bg-muted/20 pb-3 shrink-0">
				<div class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-2">
						<div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
							<UserCheckIcon class="size-4 pointer-events-none" />
						</div>
						<div>
							<Card.Title class="text-xs font-black uppercase tracking-wider text-foreground">Active Passes & Quick Check-Out</Card.Title>
							<Card.Description class="text-[10px] text-muted-foreground font-semibold">Currently checked-in visitors for this office</Card.Description>
						</div>
					</div>
					<Badge class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded-lg border border-emerald-500/30">
						{filteredActiveVisitors.length} Present
					</Badge>
				</div>

				<!-- Search Active Passes -->
				<div class="relative mt-2.5">
					<SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="Search by Pass Code (VP-XXXX), Visitor Name, Purpose..."
						bind:value={searchActiveVisitorQuery}
						class="pl-8 h-8 text-xs font-semibold rounded-xl bg-background border-border"
					/>
				</div>
			</Card.Header>

			<!-- Scrollable Active Passes List -->
			<Card.Content class="p-0 flex-1 overflow-y-auto divide-y divide-border/40">
				{#if filteredActiveVisitors.length > 0}
					{#each filteredActiveVisitors as visitor (visitor.id)}
						<div class="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<img
									src={visitor.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(visitor.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`}
									alt={visitor.fullName}
									class="size-10 rounded-full object-cover border border-border shrink-0"
								/>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2 flex-wrap">
										<Badge variant="outline" class="font-mono text-[10px] font-black border-primary/40 text-primary px-1.5 py-0">
											{visitor.passCode}
										</Badge>
										<span class="font-extrabold text-xs text-foreground truncate">{visitor.fullName}</span>
									</div>
									<div class="text-[11px] text-muted-foreground font-semibold truncate mt-0.5">
										{visitor.purpose || 'Department Visit'}
									</div>
									<div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
										<span class="flex items-center gap-1 font-mono">
											<ClockIcon class="size-3 pointer-events-none text-muted-foreground/70" />
											<span>In: {formatTime(visitor.checkInTime)}</span>
										</span>
										{#if visitor.phone}
											<span>•</span>
											<span class="font-mono">{visitor.phone}</span>
										{/if}
									</div>
								</div>
							</div>

							<Button
								type="button"
								variant="destructive"
								size="sm"
								onclick={() => promptCheckout(visitor)}
								class="h-8 px-3 text-xs font-extrabold rounded-xl gap-1.5 cursor-pointer shrink-0 shadow-2xs"
							>
								<LogOutIcon class="size-3.5 pointer-events-none" />
								<span>Check Out</span>
							</Button>
						</div>
					{/each}
				{:else}
					<div class="p-8 text-center flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
						<UserCheckIcon class="size-8 text-muted-foreground/40" />
						<span class="text-xs font-semibold">No active checked-in visitors match your search.</span>
						<span class="text-[11px] text-muted-foreground/80">All visitors to this desk have checked out.</span>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>

<!-- ASSISTED VISITOR CHECK-IN DIALOG MODAL -->
<StaffCheckInModal
	bind:open={isAssistModalOpen}
	offices={data.offices}
	role={data.role}
	assignedOfficeId={data.assignedOfficeId}
	prefillVisitor={selectedPrefillVisitor}
	onSuccess={() => {
		if (dashboardContext?.loadData) dashboardContext.loadData();
	}}
/>

<!-- CHECK OUT CONFIRMATION ALERT DIALOG -->
<AlertDialog.Root bind:open={isCheckoutDialogOpen}>
	<AlertDialog.Portal>
		<AlertDialog.Content class="z-[2800] max-w-sm border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<AlertDialog.Header>
				<AlertDialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<LogOutIcon class="size-5 text-destructive pointer-events-none" />
					<span>Confirm Visitor Check Out</span>
				</AlertDialog.Title>
				<AlertDialog.Description class="text-xs text-muted-foreground leading-relaxed">
					Are you sure you want to check out <strong class="text-foreground">{checkoutTargetVisitor?.fullName}</strong> ({checkoutTargetVisitor?.passCode})? This will complete their visit at this desk.
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
