<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
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

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

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
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Security Gate Monitor</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Guard verification control console</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Live Feed & Pending verification (Col 1 & 2) -->
		<div class="lg:col-span-2 flex flex-col gap-6">
			<!-- Pending Verification Queue -->
			{#if pendingVerificationQueue.length > 0}
				<div class="flex flex-col gap-3">
					<h2 class="text-sm font-extrabold text-amber-600 flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
						Pending Guard Gate Verifications ({pendingVerificationQueue.length})
					</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each pendingVerificationQueue as visitor}
							<Card.Root class="border-amber-400/40 bg-amber-500/[0.02] shadow-sm rounded-2xl">
								<Card.Content class="p-4 flex flex-col gap-4 font-semibold text-xs">
									<div class="flex items-center gap-3">
										{#if visitor.photoUrl}
											<img src={visitor.photoUrl} alt="Selfie" class="w-12 h-12 rounded-full object-cover border border-amber-300 shadow-xs" />
										{:else}
											<div class="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider">Photo</div>
										{/if}
										<div>
											<div class="font-bold text-sm text-foreground">{visitor.fullName}</div>
											<div class="text-[10px] text-muted-foreground">{visitor.phone}</div>
											<div class="text-xs font-mono font-black text-primary mt-0.5">{visitor.passCode}</div>
										</div>
									</div>

									<div class="text-xs bg-card p-3 rounded-xl border border-border/80 flex flex-col gap-1.5 font-semibold">
										<div><span class="text-muted-foreground">Building Destination:</span> <span class="font-bold text-foreground">{visitor.buildingName}</span></div>
										{#if visitor.roomNumber}
											<div><span class="text-muted-foreground">Office/Room:</span> <span class="font-bold text-foreground">{visitor.roomNumber}</span></div>
										{/if}
										<div><span class="text-muted-foreground">Purpose:</span> <span class="text-foreground">{visitor.purpose}</span></div>
									</div>

									<div class="flex gap-2">
										<Button onclick={() => handleApprove(visitor.id)} class="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
											<UserCheckIcon class="size-3.5 pointer-events-none" />
											<span>Verify</span>
										</Button>
										<Button onclick={() => triggerReject(visitor.id)} variant="destructive" class="flex-1 font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
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

			<!-- Visitors active onsite -->
			<div class="flex flex-col gap-3">
				<h2 class="text-sm font-extrabold text-foreground uppercase tracking-wider">Active Visitors On Campus ({liveMonitorList.length})</h2>
				{#if liveMonitorList.length === 0}
					<Card.Root class="p-10 text-center border-dashed border-border text-muted-foreground text-xs font-semibold rounded-2xl bg-card">
						No active verified visitors currently on campus.
					</Card.Root>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each liveMonitorList as visitor}
							<Card.Root class="shadow-xs border-border/80 hover:shadow-md transition-all rounded-2xl bg-card">
								<Card.Content class="p-4 flex flex-col gap-3.5 font-semibold text-xs">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2.5">
											{#if visitor.photoUrl}
												<img src={visitor.photoUrl} alt="Selfie" class="w-10 h-10 rounded-full object-cover border border-primary/30" />
											{:else}
												<div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">Pic</div>
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
										{#if visitor.roomCheckInTime}
											<div class="col-span-2 text-[10px] text-indigo-500 font-bold flex items-center gap-1.5 bg-indigo-500/[0.04] p-2 rounded-xl border border-indigo-200/30 mt-1">
												<ScanFaceIcon class="size-3.5 pointer-events-none animate-pulse text-indigo-500/80" />
												<span>Checked In inside Office at {formatTime(visitor.roomCheckInTime)}</span>
											</div>
										{/if}
									</div>

									<div class="flex gap-2">
										<Button onclick={() => triggerReject(visitor.id)} variant="outline" class="flex-1 border-destructive/60 hover:bg-destructive/10 text-destructive text-xs font-bold py-2 rounded-xl cursor-pointer">
											Reject Pass
										</Button>
										<Button onclick={() => handleCheckout(visitor.id)} class="flex-1 bg-destructive hover:bg-destructive/95 text-destructive-foreground text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
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
		</div>

		<!-- Pass Scanner Control Desk (Col 3) -->
		<div class="flex flex-col gap-6">
			<Card.Root class="border-border/80 shadow-md rounded-2xl bg-card">
				<Card.Header>
					<Card.Title class="text-base font-bold text-foreground flex items-center gap-2">
						<QrCodeIcon class="size-4 text-primary pointer-events-none" />
						Scan Gate Pass QR
					</Card.Title>
					<Card.Description class="text-xs text-muted-foreground font-semibold">Simulate barcode scanner sweeps at the campus gates.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<form onsubmit={handleSimulateScan} class="flex flex-col gap-4">
						<Field.FieldGroup class="flex flex-col gap-3">
							<Field.Field>
								<Field.FieldLabel for="scan-input" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Pass Code / Scan Input</Field.FieldLabel>
								<div class="flex gap-2 mt-1">
									<Input
										id="scan-input"
										type="text"
										placeholder="e.g. VP-8921"
										bind:value={scanInput}
										required
										class="font-mono text-sm tracking-widest h-10 rounded-xl"
									/>
									<Button type="submit" class="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs px-4 h-10 rounded-xl cursor-pointer">
										Scan
									</Button>
								</div>
							</Field.Field>
						</Field.FieldGroup>

						<div class="border-t border-border/60 pt-4 mt-2 font-semibold">
							<div class="text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Simulate Quick Scans:</div>
							<div class="flex flex-wrap gap-2">
								{#each visitors.filter((v: any) => v.status === 'checked_in') as vis}
									<Button onclick={() => { scanInput = vis.passCode; handleSimulateScan(new SubmitEvent('submit')); }} variant="outline" size="sm" class="text-xs font-mono rounded-lg h-7 border-border/85 cursor-pointer">
										Scan {vis.passCode}
									</Button>
								{/each}
							</div>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Scanner Terminal Screen -->
			<Card.Root class="border-border/80 shadow-md rounded-2xl overflow-hidden bg-muted/[0.15]">
				<Card.Content class="p-6 flex flex-col gap-4 items-center justify-center min-h-[300px]">
					{#if scannedVisitor}
						<div class="w-full flex flex-col gap-4 items-center text-center font-semibold">
							{#if scannedVisitor.photoUrl}
								<img src={scannedVisitor.photoUrl} alt="Selfie" class="w-24 h-24 rounded-full object-cover border-4 border-primary/20 shadow-md" />
							{:else}
								<div class="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">No Selfie</div>
							{/if}

							<div class="space-y-0.5">
								<div class="font-black text-lg text-foreground leading-tight">{scannedVisitor.fullName}</div>
								<div class="text-sm font-mono font-bold text-primary">{scannedVisitor.passCode}</div>
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
								<div class="text-xs text-muted-foreground font-bold flex items-center gap-1.5 p-2 rounded-xl bg-green-500/[0.04] border border-green-200/30">
									<CheckCircleIcon class="size-4 text-green-600 pointer-events-none" />
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
