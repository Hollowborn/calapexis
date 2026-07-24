<script lang="ts">
	import { getLocalVisitors, verifyVisitor, checkoutLocalVisitor, MOCK_OFFICES } from '$lib/supabase';
	import { enhance } from '$app/forms';
	import type { Visitor } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Field from '$lib/components/ui/field';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ScanFaceIcon from '@lucide/svelte/icons/scan-face';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import UserXIcon from '@lucide/svelte/icons/user-x';
	import SearchIcon from '@lucide/svelte/icons/search';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	let visitors: Visitor[] = $state([]);
	let activeTab = $state('live');
	
	// Scan Simulation States
	let scanInput = $state('');
	let scannedVisitor: Visitor | null = $state(null);
	let filterDate = $state(new Date().toISOString().split('T')[0]);
	let filterSearch = $state('');

	// Rejection Modal state
	let isRejecting = $state(false);
	let rejectingVisitorId = $state('');
	let rejectionReason = $state('');

	$effect(() => {
		loadData();
		// Poll data for real-time monitoring feel
		const interval = setInterval(loadData, 2000);
		return () => clearInterval(interval);
	});

	async function loadData() {
		visitors = await getLocalVisitors();
	}

	async function handleRefresh() {
		await loadData();
		toast.success('Security monitor data refreshed.');
	}

	async function handleApprove(id: string) {
		const updated = await verifyVisitor(id, 'approved');
		if (updated) {
			toast.success(`Visitor ${updated.fullName} approved and verified.`);
			await loadData();
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
			await loadData();
		}
	}

	async function handleCheckout(idOrPassCode: string) {
		const updated = await checkoutLocalVisitor(idOrPassCode);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out successfully.`);
			await loadData();
			if (scannedVisitor && (scannedVisitor.id === idOrPassCode || scannedVisitor.passCode === idOrPassCode)) {
				scannedVisitor = { ...scannedVisitor, status: 'checked_out', checkOutTime: new Date().toISOString() };
			}
		}
	}

	function handleSimulateScan(e: SubmitEvent) {
		e.preventDefault();
		if (!scanInput.trim()) return;

		const code = scanInput.trim().toUpperCase();
		const match = visitors.find(v => v.passCode.toUpperCase() === code || v.id === code);
		
		if (match) {
			scannedVisitor = match;
			if (match.status === 'checked_in') {
				toast.success(`Scan Validated: ${match.fullName} is registered to visit ${match.officeName}.`);
			} else {
				toast.info(`Scan Record: ${match.fullName} has checked out.`);
			}
		} else {
			scannedVisitor = null;
			toast.error('No visitor pass found with code: ' + code);
		}
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

	// Derived lists
	let liveMonitorList = $derived(
		visitors.filter(v => v.status === 'checked_in' && v.verificationStatus !== 'rejected')
	);

	let pendingVerificationQueue = $derived(
		visitors.filter(v => v.verificationStatus === 'pending')
	);

	let historicalLogs = $derived(
		visitors.filter(v => {
			const checkInDate = v.checkInTime.split('T')[0];
			const matchesDate = checkInDate === filterDate;
			const matchesSearch = v.fullName.toLowerCase().includes(filterSearch.toLowerCase()) ||
				v.passCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
				v.purpose.toLowerCase().includes(filterSearch.toLowerCase());
			return matchesDate && matchesSearch;
		})
	);

	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<!-- Snippets for dynamically colored theme-aware badges using OKLCH -->
{#snippet officeBadge(officeName: string)}
	{@const colorVar = getColorVar(officeName)}
	<Badge
		style="background-color: oklch(from var({colorVar}) l c h / 0.15); border-color: oklch(from var({colorVar}) l c h / 0.3); color: var({colorVar});"
		variant="outline"
		class="text-[11px] font-medium border transition-colors shadow-xs"
	>
		{officeName}
	</Badge>
{/snippet}

{#snippet statusBadge(visitor: Visitor)}
	{#if visitor.status === 'checked_out'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
			Checked Out
		</span>
	{:else if visitor.verificationStatus === 'rejected'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/30 text-red-500 border border-red-200">
			Declined / Rejected
		</span>
	{:else if visitor.roomCheckInTime}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/30 text-indigo-500 border border-indigo-200 animate-pulse">
			Inside {visitor.officeName?.split(' ')[0] || 'Office'}
		</span>
	{:else}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-200">
			On Campus
		</span>
	{/if}
{/snippet}

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<header class="border-b border-border bg-card sticky top-0 z-40 shadow-xs">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<div class="flex items-center gap-2 font-extrabold text-lg tracking-tight text-foreground">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
					S
				</div>
				<span>Calapexis Security Portal <span class="text-xs font-normal text-muted-foreground hidden sm:inline">| Gate Monitoring Desk</span></span>
			</div>

			<div class="flex items-center gap-3">
				<a href="/admin" class="text-xs font-medium text-muted-foreground hover:text-foreground">
					Admin Center
				</a>
				<a href="/staff" class="text-xs font-medium text-muted-foreground hover:text-foreground">
					Staff Desk
				</a>
				<a href="/" class="text-xs font-medium text-primary hover:underline mr-2">
					Public Portal
				</a>
				<form method="POST" action="/login?/logout" use:enhance>
					<Button type="submit" variant="ghost" size="sm" class="text-xs font-semibold text-destructive hover:bg-destructive/10 h-8 rounded-lg">
						Log Out
					</Button>
				</form>
			</div>
		</div>
	</header>

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 class="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
					<ShieldCheckIcon class="size-5 text-primary pointer-events-none" />
					Campus Gate Guard Interface
				</h1>
				<p class="text-xs text-muted-foreground">Live monitor of checked-in campus visitors, pass validations, and identity check procedures.</p>
			</div>

			<Button onclick={handleRefresh} variant="outline" size="sm" class="text-xs font-medium gap-1.5 w-fit">
				<RefreshCwIcon class="size-3.5 pointer-events-none" />
				<span>Refresh Feeds</span>
			</Button>
		</div>

		<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="w-full">
			<Tabs.List class="grid w-full grid-cols-3 max-w-md mx-auto mb-6 bg-muted">
				<Tabs.Trigger value="live" class="text-xs font-semibold">
					Live Monitor ({liveMonitorList.length})
				</Tabs.Trigger>
				<Tabs.Trigger value="scan" class="text-xs font-semibold">
					Pass Scanner
				</Tabs.Trigger>
				<Tabs.Trigger value="logs" class="text-xs font-semibold">
					Gate Logbook
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Live Monitor Tab -->
			<Tabs.Content value="live" class="flex flex-col gap-6">
				{#if pendingVerificationQueue.length > 0}
					<div class="flex flex-col gap-3">
						<h2 class="text-sm font-bold text-amber-600 flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
							Pending Guard Verification ({pendingVerificationQueue.length})
						</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each pendingVerificationQueue as visitor}
								<Card.Root class="border-amber-400 bg-amber-500/5 shadow-md">
									<Card.Content class="p-4 flex flex-col gap-3">
										<div class="flex items-center gap-3">
											{#if visitor.photoUrl}
												<img src={visitor.photoUrl} alt="Selfie" class="w-12 h-12 rounded-full object-cover border border-amber-300" />
											{:else}
												<div class="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-xs text-amber-700 font-bold">Photo</div>
											{/if}
											<div>
												<div class="font-bold text-sm text-foreground">{visitor.fullName}</div>
												<div class="text-[10px] text-muted-foreground">{visitor.phone}</div>
												<div class="text-xs font-mono font-bold text-primary">{visitor.passCode}</div>
											</div>
										</div>

										<div class="text-xs bg-card p-2.5 rounded-lg border border-border flex flex-col gap-1">
											<div><span class="text-muted-foreground">Office:</span> <span class="font-semibold">{visitor.officeName}</span></div>
											<div><span class="text-muted-foreground">Purpose:</span> <span class="font-medium text-foreground">{visitor.purpose}</span></div>
										</div>

										<div class="flex gap-2">
											<Button onclick={() => handleApprove(visitor.id)} class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
												<UserCheckIcon class="size-3.5 pointer-events-none" />
												<span>Verify</span>
											</Button>
											<Button onclick={() => triggerReject(visitor.id)} variant="destructive" class="flex-1 font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
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

				<div class="flex flex-col gap-3">
					<h2 class="text-base font-bold text-foreground">Visitors Currently On Campus</h2>
					{#if liveMonitorList.length === 0}
						<Card.Root class="p-8 text-center text-muted-foreground text-xs">
							No active visitors currently on campus.
						</Card.Root>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each liveMonitorList as visitor}
								<Card.Root class="shadow-sm border-border hover:shadow-md transition-shadow">
									<Card.Content class="p-4 flex flex-col gap-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												{#if visitor.photoUrl}
													<img src={visitor.photoUrl} alt="Selfie" class="w-10 h-10 rounded-full object-cover border border-primary/40" />
												{:else}
													<div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs">Pic</div>
												{/if}
												<div>
													<div class="font-bold text-sm text-foreground">{visitor.fullName}</div>
													<div class="text-[10px] text-muted-foreground">{visitor.email}</div>
												</div>
											</div>
											
											{@render statusBadge(visitor)}
										</div>

										<div class="grid grid-cols-2 gap-2 text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border">
											<div>
												<span class="text-muted-foreground block text-[9px] uppercase font-semibold">Pass Code</span>
												<span class="font-mono font-bold text-primary">{visitor.passCode}</span>
											</div>
											<div>
												<span class="text-muted-foreground block text-[9px] uppercase font-semibold">Gate Entry</span>
												<span class="font-mono text-foreground font-semibold">{formatTime(visitor.checkInTime)}</span>
											</div>
											<div class="col-span-2">
												<span class="text-muted-foreground block text-[9px] uppercase font-semibold">Destination Office</span>
												<span>{@render officeBadge(visitor.officeName || 'General')}</span>
											</div>
											{#if visitor.roomCheckInTime}
												<div class="col-span-2 text-[10px] text-indigo-500 font-bold flex items-center gap-1 bg-indigo-500/5 p-1 rounded border border-indigo-200">
													<ScanFaceIcon class="size-3.5 pointer-events-none" />
													<span>Checked In inside Office at {formatTime(visitor.roomCheckInTime)}</span>
												</div>
											{/if}
										</div>

										<div class="flex gap-2">
											{#if visitor.verificationStatus === 'pending'}
												<Button onclick={() => handleApprove(visitor.id)} class="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded-lg">
													Verify Entry
												</Button>
											{/if}
											<Button onclick={() => triggerReject(visitor.id)} variant="outline" class="flex-1 border-destructive text-destructive hover:bg-destructive/10 text-xs font-semibold py-1.5 rounded-lg">
												Decline / Reject Pass
											</Button>
											<Button onclick={() => handleCheckout(visitor.id)} class="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
												<LogOutIcon class="size-3.5 pointer-events-none" />
												<span>Check Out</span>
											</Button>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</div>
			</Tabs.Content>

			<!-- Pass Scanner Simulation Tab -->
			<Tabs.Content value="scan">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
					<!-- Scanner Simulation Control -->
					<Card.Root class="border-border shadow-md">
						<Card.Header>
							<Card.Title class="text-lg font-bold text-foreground flex items-center gap-2">
								<QrCodeIcon class="size-5 text-primary pointer-events-none" />
								Scan Gate Pass QR Code
							</Card.Title>
							<Card.Description class="text-xs text-muted-foreground">Simulate barcode scanner sweeps at the campus entry/exit gates.</Card.Description>
						</Card.Header>
						<Card.Content>
							<form onsubmit={handleSimulateScan} class="flex flex-col gap-4">
								<Field.FieldGroup class="flex flex-col gap-4">
									<Field.Field>
										<Field.FieldLabel for="scannerInput">Scan Input / Pass Code</Field.FieldLabel>
										<div class="flex gap-2">
											<Input
												id="scannerInput"
												type="text"
												placeholder="e.g. VP-8921"
												bind:value={scanInput}
												required
												class="font-mono text-sm tracking-widest"
											/>
											<Button type="submit" class="bg-primary text-primary-foreground font-bold text-xs py-2 px-4 shadow-md">
												Scan Code
											</Button>
										</div>
										<span class="text-[10px] text-muted-foreground">Enter a visitor pass code (like VP-8921 or vis-1001) to simulate gate scanning.</span>
									</Field.Field>
								</Field.FieldGroup>

								<div class="border-t border-border pt-4">
									<div class="text-xs font-bold mb-2">Simulate Quick Scans:</div>
									<div class="flex flex-wrap gap-2">
										{#each visitors.filter(v => v.status === 'checked_in') as vis}
											<Button onclick={() => { scanInput = vis.passCode; handleSimulateScan(new SubmitEvent('submit')); }} variant="outline" size="sm" class="text-xs font-mono">
												Scan {vis.passCode}
											</Button>
										{/each}
									</div>
								</div>
							</form>
						</Card.Content>
					</Card.Root>

					<!-- Scanner Display Screen -->
					<Card.Root class="border-border shadow-md bg-card">
						<Card.Content class="p-6 flex flex-col gap-4 items-center justify-center min-h-[300px]">
							{#if scannedVisitor}
								<!-- Scanned Record Details Card -->
								<div class="w-full flex flex-col gap-4 items-center text-center">
									{#if scannedVisitor.photoUrl}
										<img src={scannedVisitor.photoUrl} alt="Selfie" class="w-24 h-24 rounded-full object-cover border-4 border-primary shadow-lg" />
									{:else}
										<div class="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-xs">No Selfie</div>
									{/if}

									<div class="space-y-1">
										<div class="font-black text-xl text-foreground">{scannedVisitor.fullName}</div>
										<div class="text-sm font-mono font-bold text-primary">{scannedVisitor.passCode}</div>
									</div>

									<div class="w-full grid grid-cols-2 gap-2 text-left text-xs bg-muted/40 p-3 rounded-xl border border-border">
										<div><span class="text-muted-foreground text-[10px]">Destination:</span><div class="font-bold">{scannedVisitor.officeName}</div></div>
										<div><span class="text-muted-foreground text-[10px]">Status:</span><div>{@render statusBadge(scannedVisitor)}</div></div>
										<div><span class="text-muted-foreground text-[10px]">Gate Entry:</span><div class="font-mono">{formatTime(scannedVisitor.checkInTime)}</div></div>
										<div>
											<span class="text-muted-foreground text-[10px]">Gate Exit:</span>
											<div class="font-mono">{scannedVisitor.checkOutTime ? formatTime(scannedVisitor.checkOutTime) : 'Active On Campus'}</div>
										</div>
									</div>

									{#if scannedVisitor.status === 'checked_in'}
										<Button onclick={() => handleCheckout(scannedVisitor!.id)} class="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md">
											<LogOutIcon class="size-4 pointer-events-none" />
											<span>Validate & Gate Check-Out</span>
										</Button>
									{:else}
										<div class="text-xs text-muted-foreground font-semibold flex items-center gap-1">
											<CheckCircleIcon class="size-4 text-green-500 pointer-events-none" />
											<span>Visitor has successfully exited the campus.</span>
										</div>
									{/if}
								</div>
							{:else}
								<!-- Idle Screen -->
								<div class="text-center text-muted-foreground space-y-2 py-10">
									<QrCodeIcon class="size-12 mx-auto text-primary/30 animate-pulse pointer-events-none" />
									<div class="font-bold text-sm text-foreground">Waiting for Pass Scan</div>
									<p class="text-xs max-w-xs mx-auto">Please select a quick pass simulation code or type one in to display visitor record details.</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>

			<!-- Logs Tab -->
			<Tabs.Content value="logs" class="flex flex-col gap-4">
				<!-- Search Filter Bar -->
				<div class="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border shadow-xs">
					<div class="flex-1 w-full flex items-center gap-2">
						<SearchIcon class="size-4 text-muted-foreground pointer-events-none" />
						<Input
							type="text"
							placeholder="Search by visitor name, pass code, or purpose..."
							bind:value={filterSearch}
							class="w-full border-none shadow-none focus-visible:ring-0"
						/>
					</div>

					<div class="flex items-center gap-2 w-full sm:w-auto">
						<CalendarIcon class="size-4 text-muted-foreground pointer-events-none" />
						<Input
							type="date"
							bind:value={filterDate}
							class="w-full sm:w-40 border-none shadow-none focus-visible:ring-0 font-semibold"
						/>
					</div>
				</div>

				<!-- Table of Logs -->
				<div class="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
					<table class="w-full text-left text-xs text-foreground">
						<thead class="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
							<tr>
								<th class="px-4 py-3">Selfie</th>
								<th class="px-4 py-3">Pass Code</th>
								<th class="px-4 py-3">Visitor Name</th>
								<th class="px-4 py-3">Office Destination</th>
								<th class="px-4 py-3">Purpose</th>
								<th class="px-4 py-3">Entry</th>
								<th class="px-4 py-3">Exit</th>
								<th class="px-4 py-3">Verification</th>
								<th class="px-4 py-3 text-right">Gate Action</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/60">
							{#each historicalLogs as visitor}
								<tr class="hover:bg-muted/40 transition-colors">
									<td class="px-4 py-3">
										{#if visitor.photoUrl}
											<img src={visitor.photoUrl} alt="Selfie" class="w-8 h-8 rounded-full object-cover border border-border" />
										{:else}
											<div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px]">No</div>
										{/if}
									</td>
									<td class="px-4 py-3 font-mono font-bold text-primary">
										{visitor.passCode}
									</td>
									<td class="px-4 py-3 font-semibold">
										{visitor.fullName}
									</td>
									<td class="px-4 py-3">
										{@render officeBadge(visitor.officeName || 'General')}
									</td>
									<td class="px-4 py-3 text-muted-foreground max-w-[120px] truncate" title={visitor.purpose}>
										{visitor.purpose}
									</td>
									<td class="px-4 py-3 font-mono text-muted-foreground">
										{formatTime(visitor.checkInTime)}
									</td>
									<td class="px-4 py-3 font-mono text-muted-foreground">
										{visitor.checkOutTime ? formatTime(visitor.checkOutTime) : 'On Campus'}
									</td>
									<td class="px-4 py-3">
										{#if visitor.verificationStatus === 'approved'}
											<Badge variant="outline" class="border-green-500 text-green-500 text-[10px] font-bold">Approved</Badge>
										{:else if visitor.verificationStatus === 'rejected'}
											<Badge variant="outline" class="border-red-500 text-red-500 text-[10px] font-bold">Rejected</Badge>
										{:else}
											<Badge variant="outline" class="border-amber-500 text-amber-500 text-[10px] font-bold">Pending</Badge>
										{/if}
									</td>
									<td class="px-4 py-3 text-right">
										{#if visitor.status === 'checked_in'}
											<Button
												onclick={() => handleCheckout(visitor.id)}
												variant="destructive"
												size="sm"
												class="text-[11px] font-bold h-7 px-2.5 rounded-md"
											>
												Check Out
											</Button>
										{:else}
											<span class="text-[10px] text-muted-foreground italic">Exited</span>
										{/if}
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="9" class="text-center py-10 text-muted-foreground text-xs">
										No logs found for this date.
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</main>

	<!-- Rejection Dialog Overlay -->
	<Dialog.Root bind:open={isRejecting}>
		<Dialog.Content class="max-w-sm border-destructive/40 shadow-2xl">
			<Dialog.Header>
				<Dialog.Title class="text-destructive">Decline Visitor Entry Pass</Dialog.Title>
				<Dialog.Description>Explain why this visitor pass is being rejected.</Dialog.Description>
			</Dialog.Header>

			<Field.FieldGroup class="flex flex-col gap-4 py-2">
				<Field.Field>
					<Field.FieldLabel for="reasonText">Reason for Rejection *</Field.FieldLabel>
					<textarea
						id="reasonText"
						bind:value={rejectionReason}
						placeholder="e.g. Blurry photo snapshot, invalid purpose statement, or unrecognized destination head"
						class="w-full h-24 rounded-lg border border-input bg-background p-2.5 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
						required
					></textarea>
				</Field.Field>
			</Field.FieldGroup>

			<Dialog.Footer class="flex gap-2 sm:justify-start">
				<Button onclick={() => (isRejecting = false)} variant="outline" class="flex-1 text-xs">
					Cancel
				</Button>
				<Button onclick={handleConfirmReject} variant="destructive" class="flex-1 text-xs font-bold">
					Decline Pass
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
