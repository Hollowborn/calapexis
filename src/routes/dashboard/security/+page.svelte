<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, verifyVisitor, checkoutLocalVisitor } from '$lib/supabase';
	
	// Icons
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import ScanFaceIcon from "@lucide/svelte/icons/scan-face";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UserXIcon from "@lucide/svelte/icons/user-x";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import ListIcon from "@lucide/svelte/icons/list";
	import LayoutGridIcon from "@lucide/svelte/icons/layout-grid";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import RadioIcon from "@lucide/svelte/icons/radio";
	import SearchIcon from "@lucide/svelte/icons/search";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

	// Tab and display mode states
	let activeTab = $state<'visitors' | 'map'>('visitors');
	let visitorViewMode = $state<'table' | 'grid'>('table');
	let searchQuery = $state('');

	// Local states for scanner simulator
	let scanInput = $state('');
	let scannedVisitor: any = $state(null);

	// Security Rejection Dialog overlay state
	let isRejecting = $state(false);
	let rejectingVisitorId = $state('');
	let rejectionReason = $state('');

	// Dynamic derived listings
	let liveMonitorList = $derived(
		visitors.filter((v: any) => v.status === 'checked_in' && v.verificationStatus !== 'rejected')
	);

	let filteredLiveMonitorList = $derived(
		liveMonitorList.filter((v: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase().trim();
			return (
				v.fullName.toLowerCase().includes(q) ||
				v.passCode.toLowerCase().includes(q) ||
				(v.buildingName && v.buildingName.toLowerCase().includes(q)) ||
				(v.email && v.email.toLowerCase().includes(q))
			);
		})
	);

	let pendingVerificationQueue = $derived(
		visitors.filter((v: any) => v.verificationStatus === 'pending')
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

	// Interactive Handlers
	async function handleCheckout(id: string) {
		const updated = await checkoutLocalVisitor(id);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out successfully.`);
			await dashboardContext.loadData();
			if (scannedVisitor && scannedVisitor.id === id) {
				scannedVisitor = { ...scannedVisitor, status: 'checked_out', checkOutTime: new Date().toISOString() };
			}
		}
	}

	async function handleApprove(id: string) {
		const updated = await verifyVisitor(id, 'approved');
		if (updated) {
			toast.success(`Visitor ${updated.fullName} approved and verified.`);
			await dashboardContext.loadData();
		}
	}

	function triggerReject(id: string) {
		rejectingVisitorId = id;
		rejectionReason = '';
		isRejecting = true;
	}

	async function handleConfirmReject() {
		if (!rejectionReason.trim()) {
			toast.error('Please enter a rejection reason.');
			return;
		}
		const updated = await verifyVisitor(rejectingVisitorId, 'rejected', rejectionReason);
		if (updated) {
			toast.error(`Visitor ${updated.fullName} pass has been declined.`);
			isRejecting = false;
			await dashboardContext.loadData();
		}
	}

	function handleSimulateScan(e: SubmitEvent) {
		e.preventDefault();
		if (!scanInput.trim()) return;

		const code = scanInput.trim().toUpperCase();
		const match = visitors.find((v: any) => v.passCode.toUpperCase() === code || v.id === code);
		
		if (match) {
			scannedVisitor = match;
			if (match.status === 'checked_in') {
				toast.success(`Scan Validated: ${match.fullName} is registered to visit ${match.buildingName || 'General Building'}.`);
			} else {
				toast.info(`Scan Record: ${match.fullName} has checked out.`);
			}
		} else {
			scannedVisitor = null;
			toast.error('No visitor pass found with code: ' + code);
		}
	}
</script>

<!-- Snippets for dynamically colored theme-aware badges using OKLCH -->
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
	<!-- Page Header & Gate Status Console Bar -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<ShieldCheckIcon class="size-6 pointer-events-none" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Security Gate Console</h1>
					<Badge class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase border-emerald-500/30 px-2.5 gap-1">
						<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
						Gate 1 Secure
					</Badge>
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Real-time gate pass verification, active visitor monitoring, and campus access control.</p>
			</div>
		</div>

		<!-- Status Pills Bar -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold flex items-center gap-2">
				<ActivityIcon class="size-3.5 text-emerald-500 pointer-events-none" />
				<span class="text-muted-foreground">Onsite:</span>
				<span class="font-black text-foreground">{liveMonitorList.length}</span>
			</div>
			<div class="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold flex items-center gap-2">
				<RadioIcon class="size-3.5 text-amber-500 pointer-events-none animate-pulse" />
				<span class="text-muted-foreground">Pending:</span>
				<span class="font-black text-amber-600 dark:text-amber-400">{pendingVerificationQueue.length}</span>
			</div>
		</div>
	</div>

	<!-- Main Grid: Feed Console (Col 1 & 2) vs Scanner Control (Col 3) -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Main Column: Tabs for Active Visitors vs Live Map -->
		<div class="lg:col-span-2 flex flex-col gap-6">
			<!-- Pending Verification Alert Banner -->
			{#if pendingVerificationQueue.length > 0}
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h2 class="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
							<AlertTriangleIcon class="size-4 pointer-events-none" />
							<span>Pending Gate Verifications ({pendingVerificationQueue.length})</span>
						</h2>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each pendingVerificationQueue as visitor}
							<Card.Root class="border-amber-500/30 bg-amber-500/[0.03] shadow-xs rounded-2xl">
								<Card.Content class="p-4 flex flex-col gap-4 font-semibold text-xs">
									<div class="flex items-center gap-3">
										{#if visitor.photoUrl}
											<img src={visitor.photoUrl} alt="Selfie" class="size-12 rounded-full object-cover border-2 border-amber-400/60 shadow-xs" />
										{:else}
											<div class="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-black uppercase">Photo</div>
										{/if}
										<div>
											<div class="font-black text-sm text-foreground">{visitor.fullName}</div>
											<div class="text-[10px] text-muted-foreground">{visitor.phone}</div>
											<div class="text-xs font-mono font-black text-primary mt-0.5">{visitor.passCode}</div>
										</div>
									</div>

									<div class="text-xs bg-card p-3 rounded-xl border border-border/80 flex flex-col gap-1.5 font-semibold">
										<div><span class="text-muted-foreground">Destination:</span> <span class="font-bold text-foreground">{visitor.buildingName}</span></div>
										{#if visitor.roomNumber}
											<div><span class="text-muted-foreground">Office/Room:</span> <span class="font-bold text-foreground">{visitor.roomNumber}</span></div>
										{/if}
										<div><span class="text-muted-foreground">Purpose:</span> <span class="text-foreground">{visitor.purpose}</span></div>
									</div>

									<div class="flex gap-2">
										<Button onclick={() => handleApprove(visitor.id)} class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer h-9">
											<UserCheckIcon class="size-3.5 pointer-events-none" />
											<span>Approve</span>
										</Button>
										<Button onclick={() => triggerReject(visitor.id)} variant="destructive" class="flex-1 font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer h-9">
											<UserXIcon class="size-3.5 pointer-events-none" />
											<span>Decline</span>
										</Button>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Primary Tabs: Active Visitors vs Live Map -->
			<Tabs.Root value={activeTab} onValueChange={(val) => activeTab = val as 'visitors' | 'map'} class="w-full flex flex-col gap-4">
				<div class="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/60">
					<Tabs.List class="bg-muted/60 p-1 rounded-xl">
						<Tabs.Trigger value="visitors" class="text-xs font-bold px-4 py-1.5 rounded-lg gap-2 cursor-pointer">
							<ListIcon class="size-3.5 pointer-events-none" />
							<span>Active Visitors ({liveMonitorList.length})</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="map" class="text-xs font-bold px-4 py-1.5 rounded-lg gap-2 cursor-pointer">
							<MapPinIcon class="size-3.5 pointer-events-none" />
							<span>Live Map Feed</span>
						</Tabs.Trigger>
					</Tabs.List>

					{#if activeTab === 'visitors'}
						<div class="flex items-center gap-2 w-full sm:w-auto">
							<!-- Search Input -->
							<div class="relative flex-grow sm:w-56">
								<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
								<Input 
									type="text" 
									placeholder="Search name or pass..." 
									bind:value={searchQuery} 
									class="pl-9 h-8 text-xs rounded-xl"
								/>
							</div>

							<!-- View Mode Toggle -->
							<div class="flex items-center p-0.5 rounded-xl border border-border bg-muted/40">
								<Button 
									variant={visitorViewMode === 'table' ? 'secondary' : 'ghost'} 
									size="icon" 
									onclick={() => visitorViewMode = 'table'} 
									class="size-7 rounded-lg cursor-pointer"
								>
									<ListIcon class="size-3.5 pointer-events-none" />
								</Button>
								<Button 
									variant={visitorViewMode === 'grid' ? 'secondary' : 'ghost'} 
									size="icon" 
									onclick={() => visitorViewMode = 'grid'} 
									class="size-7 rounded-lg cursor-pointer"
								>
									<LayoutGridIcon class="size-3.5 pointer-events-none" />
								</Button>
							</div>
						</div>
					{/if}
				</div>

				<!-- TAB CONTENT 1: Visitors Monitor (Table / Grid) -->
				<Tabs.Content value="visitors" class="mt-0">
					{#if filteredLiveMonitorList.length === 0}
						<Card.Root class="p-12 text-center border-dashed border-border text-muted-foreground text-xs font-semibold rounded-2xl bg-card">
							{#if searchQuery.trim()}
								No active visitors match your search term "{searchQuery}".
							{:else}
								No active verified visitors currently on campus.
							{/if}
						</Card.Root>
					{:else if visitorViewMode === 'table'}
						<!-- Table View -->
						<div class="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
							<Table.Root>
								<Table.Header class="bg-muted/30">
									<Table.Row>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Visitor Profile</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Pass Code</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Destination</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Gate Entry</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Status</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider text-right">Actions</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each filteredLiveMonitorList as visitor (visitor.id)}
										<Table.Row class="hover:bg-muted/20 transition-colors">
											<Table.Cell class="font-semibold text-xs py-3">
												<div class="flex items-center gap-3">
													{#if visitor.photoUrl}
														<img src={visitor.photoUrl} alt="Selfie" class="size-9 rounded-full object-cover border border-primary/20 shrink-0" />
													{:else}
														<div class="size-9 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">Pic</div>
													{/if}
													<div>
														<div class="font-extrabold text-foreground">{visitor.fullName}</div>
														<div class="text-[10px] text-muted-foreground">{visitor.email || visitor.phone}</div>
													</div>
												</div>
											</Table.Cell>

											<Table.Cell class="py-3">
												<span class="font-mono font-black text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
													{visitor.passCode}
												</span>
											</Table.Cell>

											<Table.Cell class="py-3">
												<div class="flex flex-col gap-0.5">
													{@render buildingBadge(visitor.buildingName || 'General')}
													{#if visitor.roomNumber}
														<span class="text-[10px] text-muted-foreground font-bold pl-1">Room: {visitor.roomNumber}</span>
													{/if}
												</div>
											</Table.Cell>

											<Table.Cell class="py-3 font-mono text-xs font-bold text-foreground">
												{formatTime(visitor.checkInTime)}
											</Table.Cell>

											<Table.Cell class="py-3">
												{@render statusBadge(visitor)}
											</Table.Cell>

											<Table.Cell class="py-3 text-right">
												<div class="flex items-center justify-end gap-1.5">
													<Button 
														onclick={() => triggerReject(visitor.id)} 
														variant="ghost" 
														size="sm" 
														class="text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl h-8 cursor-pointer"
													>
														Reject
													</Button>
													<Button 
														onclick={() => handleCheckout(visitor.id)} 
														variant="destructive" 
														size="sm" 
														class="text-xs font-bold rounded-xl h-8 gap-1 shadow-xs cursor-pointer"
													>
														<LogOutIcon class="size-3.5 pointer-events-none" />
														<span>Check Out</span>
													</Button>
												</div>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{:else}
						<!-- Grid Cards View -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each filteredLiveMonitorList as visitor (visitor.id)}
								<Card.Root class="shadow-xs border-border/80 hover:shadow-md transition-all rounded-2xl bg-card">
									<Card.Content class="p-4 flex flex-col gap-3.5 font-semibold text-xs">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2.5">
												{#if visitor.photoUrl}
													<img src={visitor.photoUrl} alt="Selfie" class="size-10 rounded-full object-cover border border-primary/30" />
												{:else}
													<div class="size-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">Pic</div>
												{/if}
												<div>
													<div class="font-bold text-sm text-foreground">{visitor.fullName}</div>
													<div class="text-[10px] text-muted-foreground leading-none mt-0.5">{visitor.email}</div>
												</div>
											</div>
											{@render statusBadge(visitor)}
										</div>

										<div class="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-3 rounded-xl border border-border/80">
											<div>
												<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Pass Code</span>
												<span class="font-mono font-black text-primary text-xs">{visitor.passCode}</span>
											</div>
											<div>
												<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Gate Entry</span>
												<span class="font-mono text-foreground font-bold">{formatTime(visitor.checkInTime)}</span>
											</div>
											<div class="col-span-2 mt-1">
												<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider mb-0.5">Destination Building</span>
												{@render buildingBadge(visitor.buildingName || 'General')}
												{#if visitor.roomNumber}
													<span class="text-[10px] text-muted-foreground font-bold block mt-1">Office: {visitor.roomNumber}</span>
												{/if}
											</div>
										</div>

										<div class="flex gap-2">
											<Button onclick={() => triggerReject(visitor.id)} variant="outline" class="flex-1 border-destructive/60 hover:bg-destructive/10 text-destructive text-xs font-bold py-2 rounded-xl cursor-pointer h-9">
												Reject Pass
											</Button>
											<Button onclick={() => handleCheckout(visitor.id)} class="flex-1 bg-destructive hover:bg-destructive/95 text-destructive-foreground text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer h-9">
												<LogOutIcon class="size-3.5 pointer-events-none" />
												<span>Check Out</span>
											</Button>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</Tabs.Content>

				<!-- TAB CONTENT 2: Live Map View Canvas UI Placeholder -->
				<Tabs.Content value="map" class="mt-0">
					<Card.Root class="border-border/80 shadow-md rounded-2xl overflow-hidden bg-card flex flex-col">
						<!-- Map Control Top Bar -->
						<div class="p-4 border-b border-border/60 bg-muted/30 flex items-center justify-between flex-wrap gap-3">
							<div class="flex items-center gap-2">
								<Badge class="bg-primary text-primary-foreground font-mono font-extrabold text-[10px] gap-1">
									<RadioIcon class="size-3 pointer-events-none animate-pulse" />
									<span>LIVE MAP RADAR</span>
								</Badge>
								<span class="text-xs text-muted-foreground font-semibold">Real-time visitor location tracking feed</span>
							</div>
							
							<div class="flex items-center gap-2">
								<Button variant="outline" size="sm" class="text-xs font-bold rounded-xl h-8 border-border/80">
									<LayersIcon class="size-3.5 pointer-events-none" />
									<span>Building Overlay</span>
								</Button>
							</div>
						</div>

						<!-- Map Display Canvas Area -->
						<div class="relative w-full h-[450px] bg-slate-950 dark:bg-zinc-950 flex items-center justify-center overflow-hidden select-none">
							<!-- Grid Background Pattern -->
							<div class="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>

							<!-- Simulated Building Nodes on Map -->
							{#each MOCK_BUILDINGS as b, i}
								{@const leftPos = `${20 + (i * 22) % 65}%`}
								{@const topPos = `${25 + (i * 30) % 55}%`}
								{@const activeCount = liveMonitorList.filter((v: any) => v.buildingName === b.name).length}

								<div 
									class="absolute p-3 rounded-2xl border backdrop-blur-md transition-all shadow-xl flex flex-col items-center gap-1 group cursor-pointer hover:scale-105"
									style="left: {leftPos}; top: {topPos}; background-color: rgba(15, 23, 42, 0.85); border-color: {b.color || '#3b82f6'}; shadow-color: {b.color || '#3b82f6'};"
								>
									<div class="flex items-center gap-1.5">
										<span class="size-2.5 rounded-full animate-ping" style="background-color: {b.color || '#3b82f6'};"></span>
										<span class="font-mono font-black text-xs text-white">{b.code}</span>
									</div>
									<span class="text-[10px] text-slate-300 font-bold max-w-[100px] truncate">{b.name}</span>
									{#if activeCount > 0}
										<Badge class="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[9px] font-bold px-2 py-0">
											{activeCount} Onsite
										</Badge>
									{/if}
								</div>
							{/each}

							<!-- Map Center Indicator Overlay -->
							<div class="absolute bottom-4 left-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs font-semibold backdrop-blur-md flex flex-col gap-1">
								<div class="font-black uppercase tracking-wider text-[10px] text-primary flex items-center gap-1.5">
									<MapPinIcon class="size-3.5 pointer-events-none" />
									<span>Campus Gate 1 Coordinates</span>
								</div>
								<div class="font-mono text-[11px] text-slate-400">LAT: 9.8942° N | LON: 123.8821° E</div>
							</div>
						</div>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<!-- Pass Scanner Control Desk (Col 3) -->
		<div class="flex flex-col gap-6">
			<Card.Root class="border-border/80 shadow-md rounded-2xl bg-card">
				<Card.Header>
					<Card.Title class="text-base font-black text-foreground flex items-center gap-2">
						<QrCodeIcon class="size-4 text-primary pointer-events-none" />
						Scan Gate Pass QR
					</Card.Title>
					<Card.Description class="text-xs text-muted-foreground font-semibold">Simulate barcode scanner sweeps at the campus gate terminals.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<form onsubmit={handleSimulateScan} class="flex flex-col gap-4">
						<Field.FieldGroup class="flex flex-col gap-3">
							<Field.Field>
								<Field.FieldLabel for="scan-input" class="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Pass Code / Scan Input</Field.FieldLabel>
								<div class="flex gap-2 mt-1">
									<Input
										id="scan-input"
										type="text"
										placeholder="e.g. VP-8921"
										bind:value={scanInput}
										required
										class="font-mono text-sm tracking-widest h-10 rounded-xl"
									/>
									<Button type="submit" class="bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs px-4 h-10 rounded-xl cursor-pointer">
										Scan
									</Button>
								</div>
							</Field.Field>
						</Field.FieldGroup>

						<div class="border-t border-border/60 pt-4 mt-2 font-semibold">
							<div class="text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Simulate Quick Scans:</div>
							<div class="flex flex-wrap gap-2">
								{#each visitors.filter((v: any) => v.status === 'checked_in') as vis}
									<Button onclick={() => { scanInput = vis.passCode; handleSimulateScan(new SubmitEvent('submit')); }} variant="outline" size="sm" class="text-xs font-mono rounded-xl h-8 border-border/85 cursor-pointer">
										Scan {vis.passCode}
									</Button>
								{/each}
							</div>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Scanner Terminal Screen Output -->
			<Card.Root class="border-border/80 shadow-md rounded-2xl overflow-hidden bg-muted/[0.15]">
				<Card.Content class="p-6 flex flex-col gap-4 items-center justify-center min-h-[300px]">
					{#if scannedVisitor}
						<div class="w-full flex flex-col gap-4 items-center text-center font-semibold">
							{#if scannedVisitor.photoUrl}
								<img src={scannedVisitor.photoUrl} alt="Selfie" class="size-24 rounded-full object-cover border-4 border-primary/20 shadow-md" />
							{:else}
								<div class="size-24 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">No Selfie</div>
							{/if}

							<div class="space-y-0.5">
								<div class="font-black text-lg text-foreground leading-tight">{scannedVisitor.fullName}</div>
								<div class="text-sm font-mono font-black text-primary">{scannedVisitor.passCode}</div>
							</div>

							<div class="w-full grid grid-cols-2 gap-2 text-left text-xs bg-card p-3 rounded-xl border border-border/80 font-semibold">
								<div><span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Destination</span><div class="font-bold truncate">{scannedVisitor.buildingName}</div></div>
								<div><span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Status</span><div>{@render statusBadge(scannedVisitor)}</div></div>
								<div><span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Gate Entry</span><div class="font-mono">{formatTime(scannedVisitor.checkInTime)}</div></div>
								<div>
									<span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Gate Exit</span>
									<div class="font-mono">{scannedVisitor.checkOutTime ? formatTime(scannedVisitor.checkOutTime) : 'On Campus'}</div>
								</div>
							</div>

							{#if scannedVisitor.status === 'checked_in'}
								<Button onclick={() => handleCheckout(scannedVisitor!.id)} class="w-full bg-destructive hover:bg-destructive/95 text-destructive-foreground font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer h-10">
									<LogOutIcon class="size-4 pointer-events-none" />
									<span>Validate Exit Check-Out</span>
								</Button>
							{:else}
								<div class="text-xs text-muted-foreground font-bold flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/[0.04] border border-emerald-200/30">
									<CheckCircleIcon class="size-4 text-emerald-600 pointer-events-none" />
									<span>Pass validation complete. Visitor has exited.</span>
								</div>
							{/if}
						</div>
					{:else}
						<div class="text-center text-muted-foreground space-y-2 py-10 font-semibold">
							<QrCodeIcon class="size-11 mx-auto text-primary/30 animate-pulse pointer-events-none" />
							<div class="font-extrabold text-xs text-foreground uppercase tracking-widest">Waiting for Pass scan</div>
							<p class="text-xs max-w-[200px] mx-auto text-muted-foreground/80 leading-relaxed font-semibold">Please enter a pass code or click a simulation button above.</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<!-- Rejection Dialog Overlay -->
<Dialog.Root bind:open={isRejecting}>
	<Dialog.Content class="max-w-md border-destructive/40 shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-destructive font-black text-left">Decline Visitor Entry Pass</Dialog.Title>
			<Dialog.Description class="text-xs text-left font-semibold text-muted-foreground">Provide a reason for declining verification on this entry pass.</Dialog.Description>
		</Dialog.Header>

		<Field.FieldGroup class="flex flex-col gap-4 py-2">
			<Field.Field>
				<Field.FieldLabel for="reasonText" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Reason for Rejection *</Field.FieldLabel>
				<textarea
					id="reasonText"
					bind:value={rejectionReason}
					placeholder="e.g. Blurry photo snapshot, invalid purpose statement, or unrecognized destination head"
					class="w-full h-24 rounded-xl border border-border bg-background p-3 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-destructive/20 focus-visible:border-destructive transition-all font-semibold"
					required
				></textarea>
			</Field.Field>
		</Field.FieldGroup>

		<Dialog.Footer class="flex gap-2 pt-3 border-t border-border/60">
			<Button onclick={() => (isRejecting = false)} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 cursor-pointer">
				Cancel
			</Button>
			<Button onclick={handleConfirmReject} variant="destructive" class="flex-1 text-xs font-extrabold rounded-xl h-10 cursor-pointer">
				Decline Pass
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
