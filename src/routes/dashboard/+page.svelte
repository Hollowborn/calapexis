<script lang="ts">
	import DashboardSidebar from "$lib/components/dashboard/dashboard-sidebar.svelte";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Visitor, Office, Room, Profile } from '$lib/types';
	import StaffCheckInForm from '$lib/components/staff/StaffCheckInForm.svelte';
	import StaffCheckoutSearch from '$lib/components/staff/StaffCheckoutSearch.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';

	// Database hooks
	import { 
		getLocalVisitors, 
		getLocalProfiles, 
		MOCK_OFFICES, 
		MOCK_ROOMS, 
		verifyVisitor, 
		checkoutLocalVisitor 
	} from '$lib/supabase';

	// Icons
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import UsersIcon from "@lucide/svelte/icons/users";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import ScanFaceIcon from "@lucide/svelte/icons/scan-face";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UserXIcon from "@lucide/svelte/icons/user-x";
	import SearchIcon from "@lucide/svelte/icons/search";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import BarChartIcon from '@lucide/svelte/icons/bar-chart-2';
	import ListIcon from '@lucide/svelte/icons/list';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import XIcon from '@lucide/svelte/icons/x';

	let { data } = $props();

	// Initialize default active view based on user roles
	let activeView = $state(
		data.role === 'admin'
			? 'analytics'
			: (data.role === 'security' ? 'security-desk' : 'staff-desk')
	);

	// Page state feeds
	let visitors: Visitor[] = $state([]);
	let profiles: any[] = $state([]);

	// Staff desk configuration state
	let activeOfficeId = $state(data.assignedOfficeId || 'off-1');
	let activeStaffTab = $state('checkin');

	// Scanner simulator states
	let scanInput = $state('');
	let scannedVisitor: Visitor | null = $state(null);

	
	// Security Rejection Dialog overlay state
	let isRejecting = $state(false);
	let isRefreshing = $state(false);
	let rejectingVisitorId = $state('');
	let rejectionReason = $state('');

	// Master Logbook Filter states
	let logSearch = $state('');
	let logOfficeFilter = $state('');

	// Accounts Provisioning Dialog modal states
	let isCreatingUser = $state(false);
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state('staff');
	let newOfficeId = $state('off-1');

	// Printable QR code modal states
	let activeQrOffice: Office | null = $state(null);

	// Submit hook states
	let resolveUser: (val?: any) => void;
	let rejectUser: (err: any) => void;

	$effect(() => {
		loadData();
		const interval = setInterval(loadData, 2000);
		return () => clearInterval(interval);
	});

	async function loadData() {
		visitors = await getLocalVisitors();
		profiles = (await getLocalProfiles()).map(({ password, ...p }) => p);
	}

	// Interactive action handlers
	async function handleRefresh() {
		isRefreshing = true;
		await loadData();
		
		isRefreshing = false;
		toast.success('Dashboard feeds refreshed.');
		
	}

	async function handleCheckout(id: string) {
		const updated = await checkoutLocalVisitor(id);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out successfully.`);
			await loadData();
			if (scannedVisitor && scannedVisitor.id === id) {
				scannedVisitor = { ...scannedVisitor, status: 'checked_out', checkOutTime: new Date().toISOString() };
			}
		}
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

	function exportCSV() {
		const headers = 'Pass Code,Name,Email,Phone,Purpose,Office,Check In,Check Out,Status,Verification\n';
		const rows = filteredLogs.map(v => {
			return `"${v.passCode}","${v.fullName}","${v.email}","${v.phone}","${v.purpose}","${v.officeName || 'General'}","${v.checkInTime}","${v.checkOutTime || ''}","${v.status}","${v.verificationStatus}"`;
		}).join('\n');

		const blob = new Blob([headers + rows], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `visitor_log_${new Date().toISOString().split('T')[0]}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		toast.success('Visitor log exported as CSV.');
	}

	const handleCreateUserEnhance: SubmitFunction = () => {
		const createPromise = new Promise((resolve, reject) => {
			resolveUser = resolve;
			rejectUser = reject;
		});

		toast.promise(createPromise, {
			loading: "Provisioning account...",
			success: "Account created successfully!",
			error: (err: any) => err.message || "Failed to create account."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveUser();
				isCreatingUser = false;
				newEmail = '';
				newPassword = '';
				newRole = 'staff';
				newOfficeId = 'off-1';
				await loadData();
				await update();
			} else if (result.type === "failure") {
				rejectUser(new Error((result.data as any)?.message || "Failed to create user."));
			} else {
				rejectUser(new Error("An unexpected error occurred."));
			}
		};
	};

	// Analytics calculations
	let totalCount = $derived(visitors.length);
	let activeCount = $derived(visitors.filter(v => v.status === 'checked_in').length);
	let checkoutCount = $derived(visitors.filter(v => v.status === 'checked_out').length);
	let rejectedCount = $derived(visitors.filter(v => v.verificationStatus === 'rejected').length);
	
	let registrarCount = $derived(visitors.filter(v => v.officeId === 'off-1').length);
	let cashierCount = $derived(visitors.filter(v => v.officeId === 'off-2').length);
	let ccsCount = $derived(visitors.filter(v => v.officeId === 'off-3').length);

	// Dynamic derived listings
	let liveMonitorList = $derived(
		visitors.filter(v => v.status === 'checked_in' && v.verificationStatus !== 'rejected')
	);

	let pendingVerificationQueue = $derived(
		visitors.filter(v => v.verificationStatus === 'pending')
	);

	let filteredLogs = $derived(
		visitors.filter(v => {
			const matchesSearch = v.fullName.toLowerCase().includes(logSearch.toLowerCase()) || 
				v.passCode.toLowerCase().includes(logSearch.toLowerCase()) ||
				v.purpose.toLowerCase().includes(logSearch.toLowerCase());
			const matchesOffice = !logOfficeFilter || v.officeId === logOfficeFilter;
			return matchesSearch && matchesOffice;
		})
	);

	let officeVisitors = $derived(visitors.filter((v) => v.officeId === activeOfficeId));
	let activeOffice = $derived(MOCK_OFFICES.find((o) => o.id === activeOfficeId));
	let activeOfficeCount = $derived(officeVisitors.filter((v) => v.status === 'checked_in').length);

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

	// View details maps
	const viewNames: Record<string, string> = {
		'analytics': 'Analytics Overview',
		'logs-master': 'Logbook Master',
		'security-desk': 'Security Desk Console',
		'staff-desk': 'Office Staff Desk',
		'user-accounts': 'User Accounts Manager',
		'office-config': 'Offices & Rooms Config'
	};

	const viewIcons: Record<string, any> = {
		'analytics': BarChartIcon,
		'logs-master': ListIcon,
		'security-desk': ShieldCheckIcon,
		'staff-desk': BuildingIcon,
		'user-accounts': UsersIcon,
		'office-config': SettingsIcon
	};

	const ActiveIcon = $derived(viewIcons[activeView] || LayoutDashboardIcon);
</script>

<!-- Snippets for dynamically colored theme-aware badges using OKLCH -->
{#snippet officeBadge(officeName: string)}
	{@const colorVar = getColorVar(officeName)}
	<Badge
		style="background-color: oklch(from var({colorVar}) l c h / 0.12); border-color: oklch(from var({colorVar}) l c h / 0.25); color: var({colorVar});"
		variant="outline"
		class="text-[11px] font-bold border transition-colors shadow-xs rounded-full px-2.5"
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

<Sidebar.Provider style="--sidebar-width: 350px;">
	<DashboardSidebar bind:activeView role={data.role} email={data.email} />
	
	<Sidebar.Inset class="bg-background">
		<!-- Header Banner -->
		<header class="bg-background/80 backdrop-blur-md sticky top-0 flex shrink-0 items-center gap-2 border-b border-border/60 p-4 z-40">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/dashboard">Calapexis Portal</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page class="font-semibold text-foreground">{viewNames[activeView] || 'Overview'}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			<div class="ms-auto flex items-center gap-2">
				<ThemeToggle />
			</div>
		</header>

		<!-- Main Workspace Content Area -->
		<div class="flex flex-grow flex-col gap-6 p-6 md:p-8">
			<!-- Header Title Block (Redesigned Borderless Section) -->
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
				<div class="flex items-center gap-3">
					<div class="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
						<ActiveIcon class="size-5 pointer-events-none" />
					</div>
					<div>
						<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">{viewNames[activeView] || 'Workspace'}</h1>
						<p class="text-xs text-muted-foreground leading-relaxed">Calapexis Single-Route Operations Center Portal.</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button onclick={handleRefresh} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80">
					{#if isRefreshing}
						<RefreshCwIcon class="size-3.5 pointer-events-none animate-spin" />
						<span>Refreshing...</span>
					{:else}
						<RefreshCwIcon class="size-3.5 pointer-events-none" />
						<span>Refresh</span>
					{/if}
					</Button>
				</div>
			</div>

			<!-- Dynamic View Content Placements -->
			{#if activeView === 'analytics'}
				<div class="flex flex-col gap-6">
					<!-- KPI Metric Cards Grid -->
					<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
						<Card.Root class="border-border/80 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-card">
							<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Total Registers</span>
							<div class="text-3xl font-black text-foreground mt-2">{totalCount}</div>
						</Card.Root>
						<Card.Root class="border-primary/20 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-primary/[0.03]">
							<span class="text-[10px] font-extrabold text-primary uppercase tracking-widest">Currently on Campus</span>
							<div class="text-3xl font-black text-primary flex items-center gap-2 mt-2">
								<span>{activeCount}</span>
								<span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
							</div>
						</Card.Root>
						<Card.Root class="border-border/80 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-card">
							<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Checked Out</span>
							<div class="text-3xl font-black text-foreground mt-2">{checkoutCount}</div>
						</Card.Root>
						<Card.Root class="border-border/80 shadow-xs flex flex-col justify-between p-5 rounded-2xl bg-card">
							<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Declined Passes</span>
							<div class="text-3xl font-black text-destructive mt-2">{rejectedCount}</div>
						</Card.Root>
					</div>

					<!-- Analytics Breakdown Panels -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Traffic by Office -->
						<Card.Root class="border-border/80 shadow-sm rounded-2xl">
							<Card.Header>
								<Card.Title class="text-base font-bold text-foreground">Traffic by Campus Office</Card.Title>
								<Card.Description class="text-xs text-muted-foreground">Volume of registered visitors across active department desks.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-col gap-4">
								<div class="flex flex-col gap-1.5">
									<div class="flex justify-between text-xs font-bold">
										<span>Registrar & Admissions</span>
										<span class="text-muted-foreground">{registrarCount} ({Math.round((registrarCount / (totalCount || 1)) * 100)}%)</span>
									</div>
									<div class="w-full bg-muted h-2 rounded-full overflow-hidden">
										<div class="bg-primary h-full rounded-full transition-all" style="width: {(registrarCount / (totalCount || 1)) * 100}%"></div>
									</div>
								</div>

								<div class="flex flex-col gap-1.5">
									<div class="flex justify-between text-xs font-bold">
										<span>Cashier & Finance</span>
										<span class="text-muted-foreground">{cashierCount} ({Math.round((cashierCount / (totalCount || 1)) * 100)}%)</span>
									</div>
									<div class="w-full bg-muted h-2 rounded-full overflow-hidden">
										<div class="bg-primary h-full rounded-full transition-all" style="width: {(cashierCount / (totalCount || 1)) * 100}%"></div>
									</div>
								</div>

								<div class="flex flex-col gap-1.5">
									<div class="flex justify-between text-xs font-bold">
										<span>Computer Studies (CCS)</span>
										<span class="text-muted-foreground">{ccsCount} ({Math.round((ccsCount / (totalCount || 1)) * 100)}%)</span>
									</div>
									<div class="w-full bg-muted h-2 rounded-full overflow-hidden">
										<div class="bg-primary h-full rounded-full transition-all" style="width: {(ccsCount / (totalCount || 1)) * 100}%"></div>
									</div>
								</div>
							</Card.Content>
						</Card.Root>

						<!-- Security Safety briefings -->
						<Card.Root class="border-border/80 shadow-sm rounded-2xl">
							<Card.Header>
								<Card.Title class="text-base font-bold text-foreground">Operational Safety Checklists</Card.Title>
								<Card.Description class="text-xs text-muted-foreground">Digital control parameters and verify modes active status.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-col gap-3 text-xs font-medium">
								<div class="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
									<span>Verify & Gate Approval Policy</span>
									<Badge class="bg-green-600/10 text-green-600 border-green-600/20 text-[10px] font-bold">Auto-Approve Gate</Badge>
								</div>
								<div class="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
									<span>Office check-in confirmation</span>
									<span class="font-bold text-foreground">{visitors.filter(v => v.roomCheckInTime).length} Active Onsite</span>
								</div>
								<div class="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
									<span>Security & Desk Staff profiles</span>
									<span class="font-bold text-foreground">{profiles.length} Accounts Active</span>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				</div>

			{:else}
				<!-- View Specific Workspaces -->
				{#if activeView === 'logs-master'}
					<div class="flex flex-col gap-4">
						<!-- Filters row -->
						<div class="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
							<div class="flex-1 w-full flex items-center gap-2 px-2">
								<SearchIcon class="size-4 text-muted-foreground pointer-events-none" />
								<Input
									type="text"
									placeholder="Search by visitor name, pass code, or purpose..."
									bind:value={logSearch}
									class="w-full border-none shadow-none focus-visible:ring-0 text-sm bg-transparent"
								/>
							</div>

							<div class="w-full sm:w-60">
								<Select.Root type="single" bind:value={logOfficeFilter}>
									<Select.Trigger class="h-9 w-full rounded-xl">
										<span class="text-xs font-semibold text-foreground">
											{MOCK_OFFICES.find(o => o.id === logOfficeFilter)?.name || 'Filter by Office'}
										</span>
									</Select.Trigger>
									<Select.Content class="rounded-xl">
										<Select.Group>
											<Select.Item value="" label="All Offices">All Offices</Select.Item>
											{#each MOCK_OFFICES as office}
												<Select.Item value={office.id} label={office.name}>
													{office.name}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>

							<Button onclick={exportCSV} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer">
								<DownloadIcon class="size-3.5 pointer-events-none" />
								<span>Export CSV</span>
							</Button>

							<Button onclick={() => window.print()} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer">
								<PrinterIcon class="size-3.5 pointer-events-none" />
								<span>Print PDF</span>
							</Button>
						</div>

						<!-- Print-Only Heading -->
						<div class="hidden print:block text-center space-y-1 mb-6">
							<h1 class="text-xl font-bold tracking-tight text-black">Calapexis Visitor Compliance Logbook</h1>
							<p class="text-xs text-zinc-600">Generated on {new Date().toLocaleString()} • Classified Official Campus Document</p>
						</div>

						<!-- Table master logs -->
						<div class="w-full overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
							<table class="w-full text-left text-xs border-collapse">
								<thead>
									<tr class="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-extrabold border-b border-border">
										<th class="px-6 py-3.5">Pass Code</th>
										<th class="px-6 py-3.5">Visitor Name</th>
										<th class="px-6 py-3.5">Destination Office</th>
										<th class="px-6 py-3.5">Purpose of Visit</th>
										<th class="px-6 py-3.5">Checked In</th>
										<th class="px-6 py-3.5">Checked Out</th>
										<th class="px-6 py-3.5">Status</th>
										<th class="px-6 py-3.5 text-right">Actions</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border/60">
									{#each filteredLogs as visitor}
										<tr class="hover:bg-muted/30 transition-colors">
											<td class="px-6 py-4 font-mono font-black text-primary">
												{visitor.passCode}
											</td>
											<td class="px-6 py-4">
												<div class="font-bold text-foreground text-sm">{visitor.fullName}</div>
												<div class="text-[10px] text-muted-foreground font-semibold mt-0.5">{visitor.email} • {visitor.phone}</div>
											</td>
											<td class="px-6 py-4">
												{@render officeBadge(visitor.officeName || 'General')}
											</td>
											<td class="px-6 py-4 text-muted-foreground max-w-[150px] truncate" title={visitor.purpose}>
												{visitor.purpose}
											</td>
											<td class="px-6 py-4 text-muted-foreground">
												<div class="font-mono text-foreground font-semibold">{formatTime(visitor.checkInTime)}</div>
												<div class="text-[9px] mt-0.5">{formatDate(visitor.checkInTime)}</div>
											</td>
											<td class="px-6 py-4 text-muted-foreground font-mono">
												{#if visitor.checkOutTime}
													<div class="text-foreground font-semibold">{formatTime(visitor.checkOutTime)}</div>
													<div class="text-[9px] mt-0.5 font-sans">{formatDate(visitor.checkOutTime)}</div>
												{:else}
													<span class="text-muted-foreground/60 italic font-sans">-</span>
												{/if}
											</td>
											<td class="px-6 py-4">
												{@render statusBadge(visitor)}
											</td>
											<td class="px-6 py-4 text-right">
												{#if visitor.status === 'checked_in'}
													<Button
														onclick={() => handleCheckout(visitor.id)}
														variant="destructive"
														size="sm"
														class="text-[11px] font-bold h-8 px-3 rounded-xl cursor-pointer"
													>
														Check Out
													</Button>
												{:else}
													<span class="text-[10px] text-muted-foreground/60 italic font-semibold">Exited</span>
												{/if}
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="8" class="text-center py-12 text-muted-foreground text-xs font-semibold">
												No visitor logs match the current filters.
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>

				{:else if activeView === 'security-desk'}
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
												<Card.Content class="p-4 flex flex-col gap-4">
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

													<div class="text-xs bg-card p-3 rounded-xl border border-border/80 flex flex-col gap-1.5 font-medium">
														<div><span class="text-muted-foreground font-semibold">Office:</span> <span class="font-bold text-foreground">{visitor.officeName}</span></div>
														<div><span class="text-muted-foreground font-semibold">Purpose:</span> <span class="text-foreground">{visitor.purpose}</span></div>
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
												<Card.Content class="p-4 flex flex-col gap-3.5">
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
															<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider mb-0.5">Destination Office</span>
															{@render officeBadge(visitor.officeName || 'General')}
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
									<Card.Description class="text-xs text-muted-foreground">Simulate barcode scanner sweeps at the campus gates.</Card.Description>
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

										<div class="border-t border-border/60 pt-4 mt-2">
											<div class="text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">Simulate Quick Scans:</div>
											<div class="flex flex-wrap gap-2">
												{#each visitors.filter(v => v.status === 'checked_in') as vis}
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
										<div class="w-full flex flex-col gap-4 items-center text-center">
											{#if scannedVisitor.photoUrl}
												<img src={scannedVisitor.photoUrl} alt="Selfie" class="w-24 h-24 rounded-full object-cover border-4 border-primary/20 shadow-md" />
											{:else}
												<div class="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">No Selfie</div>
											{/if}

											<div class="space-y-0.5">
												<div class="font-black text-lg text-foreground leading-tight">{scannedVisitor.fullName}</div>
												<div class="text-sm font-mono font-bold text-primary">{scannedVisitor.passCode}</div>
											</div>

											<div class="w-full grid grid-cols-2 gap-2 text-left text-xs bg-card p-3 rounded-xl border border-border/80 font-medium">
												<div><span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Destination</span><div class="font-bold truncate">{scannedVisitor.officeName}</div></div>
												<div><span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Status</span><div>{@render statusBadge(scannedVisitor)}</div></div>
												<div><span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Gate Entry</span><div class="font-mono">{formatTime(scannedVisitor.checkInTime)}</div></div>
												<div>
													<span class="text-muted-foreground text-[10px] block uppercase font-bold tracking-wider">Gate Exit</span>
													<div class="font-mono">{scannedVisitor.checkOutTime ? formatTime(scannedVisitor.checkOutTime) : 'On Campus'}</div>
												</div>
											</div>

											{#if scannedVisitor.status === 'checked_in'}
												<Button onclick={() => handleCheckout(scannedVisitor!.id)} class="w-full bg-destructive hover:bg-destructive/95 text-destructive-foreground font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
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
										<div class="text-center text-muted-foreground space-y-2 py-10">
											<QrCodeIcon class="size-11 mx-auto text-primary/30 animate-pulse pointer-events-none" />
											<div class="font-extrabold text-xs text-foreground uppercase tracking-widest">Waiting for Pass scan</div>
											<p class="text-xs max-w-[200px] mx-auto text-muted-foreground/80 leading-relaxed font-medium">Please enter a pass code or click a simulation button above.</p>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						</div>
					</div>

				{:else if activeView === 'staff-desk'}
					<div class="flex flex-col gap-6">
						<!-- Office Department Banner -->
						<div class="p-5 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
							<div class="flex flex-col gap-1">
								<div class="flex items-center gap-2">
									<Badge variant="secondary" class="font-mono text-xs font-black uppercase rounded-lg px-2 py-0.5">{activeOffice?.code}</Badge>
									<h1 class="text-lg font-bold text-foreground">{activeOffice?.name}</h1>
								</div>
								<p class="text-xs text-muted-foreground font-semibold">{activeOffice?.building} • {activeOffice?.floor} • Head: {activeOffice?.headPerson}</p>
							</div>

							<!-- Department Selector for Admin / General Desk users -->
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-2.5">
									<span class="text-xs font-bold uppercase text-muted-foreground tracking-wide hidden md:inline">Current Department:</span>
									{#if data.assignedOfficeId}
										<Badge class="bg-primary text-primary-foreground font-black text-xs py-1.5 px-3.5 rounded-xl shadow-xs">
											{MOCK_OFFICES.find(o => o.id === data.assignedOfficeId)?.name}
										</Badge>
									{:else}
										<Select.Root type="single" bind:value={activeOfficeId}>
											<Select.Trigger class="h-9 min-w-56 rounded-xl">
												<span class="text-xs font-semibold text-foreground">
													{MOCK_OFFICES.find(o => o.id === activeOfficeId)?.name || 'Select Department'}
												</span>
											</Select.Trigger>
											<Select.Content class="rounded-xl">
												<Select.Group>
													{#each MOCK_OFFICES as office}
														<Select.Item value={office.id} label={office.name}>
															{office.name} ({office.code})
														</Select.Item>
													{/each}
												</Select.Group>
											</Select.Content>
										</Select.Root>
									{/if}
								</div>
								<Badge variant="outline" class="border-primary text-primary font-bold text-xs py-1.5 px-3 rounded-xl bg-primary/[0.02]">
									{activeOfficeCount} Active Visitors
								</Badge>
							</div>
						</div>

						<!-- Svelte sub-tabs inside Staff view -->
						<Tabs.Root value={activeStaffTab} onValueChange={(val) => (activeStaffTab = val)} class="w-full">
							<Tabs.List class="grid w-full grid-cols-3 max-w-md mx-auto mb-6 bg-muted rounded-xl">
								<Tabs.Trigger value="checkin" class="text-xs font-extrabold rounded-lg">
									Assisted Entry
								</Tabs.Trigger>
								<Tabs.Trigger value="checkout" class="text-xs font-extrabold rounded-lg">
									Quick Check-Out
								</Tabs.Trigger>
								<Tabs.Trigger value="directory" class="text-xs font-extrabold rounded-lg">
									Office Log ({officeVisitors.length})
								</Tabs.Trigger>
							</Tabs.List>

							<Tabs.Content value="checkin">
								<StaffCheckInForm
									offices={MOCK_OFFICES}
									rooms={MOCK_ROOMS}
									{activeOfficeId}
									onSuccess={loadData}
								/>
							</Tabs.Content>

							<Tabs.Content value="checkout">
								<StaffCheckoutSearch
									{activeOfficeId}
									onUpdate={loadData}
								/>
							</Tabs.Content>

							<Tabs.Content value="directory" class="flex flex-col gap-4">
								<div class="flex items-center justify-between">
									<h2 class="text-sm font-bold text-foreground uppercase tracking-wider">Office visitors logs for {activeOffice?.name}</h2>
									<span class="text-xs text-muted-foreground font-semibold">Total: {officeVisitors.length} logs</span>
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
											{#each officeVisitors as visitor}
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
																class="text-[10px] font-bold h-7 px-3 rounded-lg cursor-pointer"
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

				{:else if activeView === 'user-accounts'}
					<div class="flex flex-col gap-6">
						<Card.Root class="border-border/80 shadow-sm rounded-2xl bg-card">
							<Card.Header class="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<Card.Title class="text-base font-bold text-foreground">User accounts & Portals Provisioning</Card.Title>
									<Card.Description class="text-xs text-muted-foreground">Monitor system access profiles and bind staff to departments.</Card.Description>
								</div>
								<Button onclick={() => (isCreatingUser = true)} class="text-xs font-bold gap-2 rounded-xl h-9 cursor-pointer">
									<UsersIcon class="size-4 pointer-events-none" />
									<span>Provision User Account</span>
								</Button>
							</Card.Header>

							<Card.Content class="p-0">
								<div class="overflow-x-auto">
									<table class="w-full text-left text-xs border-collapse">
										<thead>
											<tr class="border-b border-border bg-muted/50 text-muted-foreground font-extrabold uppercase text-[10px] tracking-wider">
												<th class="px-6 py-3.5">Account Username (Email)</th>
												<th class="px-6 py-3.5">Access Role</th>
												<th class="px-6 py-3.5">Assigned Department</th>
												<th class="px-6 py-3.5">Created Date</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-border/60">
											{#each profiles as profile}
												<tr class="hover:bg-muted/30 transition-colors font-medium">
													<td class="px-6 py-4 font-bold text-foreground font-mono text-sm">{profile.email}</td>
													<td class="px-6 py-4">
														{#if profile.role === 'admin'}
															<Badge class="bg-red-500/10 text-red-600 hover:bg-red-500/10 border-red-500/20 text-[10px] font-bold rounded-full">Admin</Badge>
														{:else if profile.role === 'security'}
															<Badge class="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px] font-bold rounded-full">Security</Badge>
														{:else}
															<Badge class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold rounded-full">Staff</Badge>
														{/if}
													</td>
													<td class="px-6 py-4 text-muted-foreground font-semibold">
														{#if profile.role === 'staff' && profile.officeId}
															{MOCK_OFFICES.find(o => o.id === profile.officeId)?.name || profile.officeId}
														{:else}
															<span class="italic text-muted-foreground/60 text-[10px] font-medium">Global Access</span>
														{/if}
													</td>
													<td class="px-6 py-4 text-muted-foreground font-mono font-semibold">
														{new Date(profile.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
													</td>
												</tr>
											{:else}
												<tr>
													<td colspan="4" class="text-center py-12 text-muted-foreground text-xs font-semibold">
														No active access accounts found.
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</Card.Content>
						</Card.Root>
					</div>

				{:else if activeView === 'office-config'}
					<div class="flex flex-col gap-4">
						<div class="flex items-center justify-between">
							<h2 class="text-sm font-extrabold text-foreground uppercase tracking-wider">Campus Departments & QR Code Setup</h2>
							<span class="text-xs text-muted-foreground font-semibold">Generating room check-in sheets.</span>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each MOCK_OFFICES as office}
								<Card.Root class="border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
									<Card.Header class="pb-3 border-b border-border/40 bg-muted/20">
										<div class="flex items-center justify-between">
											<Badge variant="secondary" class="font-mono font-black text-xs px-2 py-0.5 rounded-lg">{office.code}</Badge>
											<span class="text-[11px] text-muted-foreground font-semibold">{office.building}</span>
										</div>
										<Card.Title class="text-base font-extrabold text-foreground pt-1.5 leading-tight">{office.name}</Card.Title>
										<Card.Description class="text-xs leading-relaxed text-muted-foreground font-medium">{office.description}</Card.Description>
									</Card.Header>
									<Card.Content class="py-4 text-xs flex flex-col gap-2 text-muted-foreground font-medium">
										<div><span class="font-bold text-foreground">Floor Location:</span> {office.floor}</div>
										<div><span class="font-bold text-foreground">Department Head:</span> {office.headPerson || 'N/A'}</div>
										<div><span class="font-bold text-foreground">Contact Email:</span> {office.contactEmail || 'N/A'}</div>
									</Card.Content>
									<Card.Footer class="pt-3 border-t border-border/40 flex gap-2">
										<Button onclick={() => (activeQrOffice = office)} variant="outline" size="sm" class="w-full text-xs font-bold gap-1.5 rounded-xl h-9 cursor-pointer">
											<QrCodeIcon class="size-4 pointer-events-none" />
											<span>Generate Door QR Sign</span>
										</Button>
									</Card.Footer>
								</Card.Root>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<!-- Rejection Dialog Overlay -->
<Dialog.Root bind:open={isRejecting}>
	<Dialog.Content class="max-w-md border-destructive/40 shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-destructive font-black">Decline Visitor Entry Pass</Dialog.Title>
			<Dialog.Description class="text-xs">Provide a reason for declining verification on this entry pass.</Dialog.Description>
		</Dialog.Header>

		<Field.FieldGroup class="flex flex-col gap-4 py-2">
			<Field.Field>
				<Field.FieldLabel for="reasonText" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Reason for Rejection *</Field.FieldLabel>
				<textarea
					id="reasonText"
					bind:value={rejectionReason}
					placeholder="e.g. Blurry photo snapshot, invalid purpose statement, or unrecognized destination head"
					class="w-full h-24 rounded-xl border border-border bg-background p-3 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-destructive/20 focus-visible:border-destructive transition-all"
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

<!-- Account Provisioning Dialog Modal -->
<Dialog.Root bind:open={isCreatingUser}>
	<Dialog.Content class="max-w-md border-border shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="font-black text-lg">Provision User Account</Dialog.Title>
			<Dialog.Description class="text-xs">Create credentials and assign system roles.</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="/admin?/createUser" use:enhance={handleCreateUserEnhance} class="flex flex-col gap-4 py-2">
			<Field.FieldGroup class="flex flex-col gap-4">
				<Field.Field>
					<Field.FieldLabel for="new-email" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Username (Email)</Field.FieldLabel>
					<Input
						id="new-email"
						name="email"
						type="text"
						placeholder="e.g. registrar_staff"
						bind:value={newEmail}
						required
						class="rounded-xl h-10"
					/>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel for="new-password" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Password</Field.FieldLabel>
					<Input
						id="new-password"
						name="password"
						type="password"
						placeholder="Minimum 6 characters"
						bind:value={newPassword}
						required
						class="rounded-xl h-10"
					/>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">User Role</Field.FieldLabel>
					<input type="hidden" name="role" value={newRole} />
					<div class="grid grid-cols-2 gap-1.5 bg-muted p-1 rounded-xl text-xs font-bold">
						<button
							type="button"
							onclick={() => { newRole = 'staff'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Office Staff
						</button>
						<button
							type="button"
							onclick={() => { newRole = 'security'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'security' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Security Guard
						</button>
					</div>
				</Field.Field>

				{#if newRole === 'staff'}
					<Field.Field>
						<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bound Department Office</Field.FieldLabel>
						<input type="hidden" name="officeId" value={newOfficeId} />
						<Select.Root type="single" bind:value={newOfficeId}>
							<Select.Trigger class="w-full h-10 rounded-xl">
								<span class="text-xs font-semibold text-foreground">
									{MOCK_OFFICES.find(o => o.id === newOfficeId)?.name || 'Select Department'}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl">
								<Select.Group>
									{#each MOCK_OFFICES as office}
										<Select.Item value={office.id} label={office.name}>
											{office.name} ({office.code})
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}
			</Field.FieldGroup>

			<Dialog.Footer class="pt-4 border-t border-border flex gap-2">
				<Button type="button" onclick={() => (isCreatingUser = false)} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 cursor-pointer">
					Cancel
				</Button>
				<Button type="submit" class="flex-1 text-xs font-extrabold rounded-xl h-10 cursor-pointer">
					Create Account
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Printable Office QR Code Modal -->
<Dialog.Root
	open={!!activeQrOffice}
	onOpenChange={(open) => {
		if (!open) activeQrOffice = null;
	}}
>
	<Dialog.Content class="max-w-sm border-primary/20 shadow-2xl rounded-2xl text-center">
		<Dialog.Header>
			<Dialog.Title class="text-left font-black">Office Door QR Code</Dialog.Title>
			<Dialog.Description class="text-left text-xs">
				{#if activeQrOffice}{activeQrOffice.name}{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if activeQrOffice}
			<div class="py-4 flex flex-col gap-4 items-center">
				<!-- Simulated QR code container -->
				<div class="p-4 bg-white rounded-2xl shadow-inner border border-border/80 flex items-center justify-center size-52">
					<svg class="size-40 text-black" fill="currentColor" viewBox="0 0 24 24">
						<path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8zM14 17h2v2h-2v-2zm3-3h2v2h-2v-2zm-3 6h2v2h-2v-2zm3-3h2v2h-2v-2z"/>
					</svg>
				</div>

				<div class="text-center space-y-1">
					<Badge class="bg-primary text-primary-foreground font-black font-mono text-[10px] tracking-wider uppercase rounded-full">
						{activeQrOffice.code} DOOR QR CODE
					</Badge>
					<p class="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto font-medium">
						Visitors scan this code with their digital passes to automatically confirm arrival or check-out of this department.
					</p>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="border-t border-border/60 pt-3">
			<Button onclick={() => window.print()} class="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs py-2.5 rounded-xl gap-2 shadow-sm cursor-pointer">
				<PrinterIcon class="size-4 pointer-events-none" />
				<span>Print Door QR Sign</span>
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
