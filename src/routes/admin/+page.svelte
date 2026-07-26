<script lang="ts">
	import { getLocalVisitors, MOCK_OFFICES, MOCK_ROOMS, checkoutLocalVisitor, getLocalProfiles } from '$lib/supabase';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Visitor, Office, Room } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toast } from 'svelte-sonner';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BarChartIcon from '@lucide/svelte/icons/bar-chart-2';
	import ListIcon from '@lucide/svelte/icons/list';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import XIcon from '@lucide/svelte/icons/x';
	import UsersIcon from '@lucide/svelte/icons/users';
	import * as Field from '$lib/components/ui/field';

	let { data } = $props();
	let visitors: Visitor[] = $state([]);
	let activeTab = $state('dashboard');
	
	// User accounts states
	let profiles: any[] = $state([]);
	let isCreatingUser = $state(false);
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state('staff');
	let newOfficeId = $state('off-1');

	let resolveUser: (val?: any) => void;
	let rejectUser: (err: any) => void;

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
				loadProfiles();
				await update();
			} else if (result.type === "failure") {
				rejectUser(new Error((result.data as any)?.message || "Failed to create user."));
			} else {
				rejectUser(new Error("An unexpected error occurred."));
			}
		};
	};

	async function loadProfiles() {
		profiles = (await getLocalProfiles()).map(({ password, ...p }) => p);
	}

	// Filter and Search States
	let logSearch = $state('');
	let logOfficeFilter = $state('');
	
	// QR Code Display State
	let activeQrOffice: Office | null = $state(null);

	$effect(() => {
		loadData();
		loadProfiles();
		const interval = setInterval(() => {
			loadData();
			loadProfiles();
		}, 2000);
		return () => clearInterval(interval);
	});

	async function loadData() {
		visitors = await getLocalVisitors();
	}

	async function handleRefresh() {
		await loadData();
		toast.success('Admin logs refreshed.');
	}

	async function handleCheckout(id: string) {
		const updated = await checkoutLocalVisitor(id);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out by admin.`);
			await loadData();
		}
	}

	function exportCSV() {
		// Create CSV string
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

	// Analytics calculations
	let totalCount = $derived(visitors.length);
	let activeCount = $derived(visitors.filter(v => v.status === 'checked_in').length);
	let checkoutCount = $derived(visitors.filter(v => v.status === 'checked_out').length);
	let rejectedCount = $derived(visitors.filter(v => v.verificationStatus === 'rejected').length);
	
	let registrarCount = $derived(visitors.filter(v => v.officeId === 'off-1').length);
	let cashierCount = $derived(visitors.filter(v => v.officeId === 'off-2').length);
	let ccsCount = $derived(visitors.filter(v => v.officeId === 'off-3').length);

	// Derived filtered logs
	let filteredLogs = $derived(
		visitors.filter(v => {
			const matchesSearch = v.fullName.toLowerCase().includes(logSearch.toLowerCase()) || 
				v.passCode.toLowerCase().includes(logSearch.toLowerCase()) ||
				v.purpose.toLowerCase().includes(logSearch.toLowerCase());
			const matchesOffice = !logOfficeFilter || v.officeId === logOfficeFilter;
			return matchesSearch && matchesOffice;
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

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<header class="border-b border-border bg-card sticky top-0 z-40 shadow-xs">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<div class="flex items-center gap-2 font-extrabold text-lg tracking-tight text-foreground">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
					A
				</div>
				<span>Calapexis Admin Center <span class="text-xs font-normal text-muted-foreground hidden sm:inline">| University Dashboard</span></span>
			</div>

			<div class="flex items-center gap-3">
				<a href="/security" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
					<ShieldCheckIcon class="size-3.5" />
					<span>Security Desk</span>
				</a>
				<a href="/staff" class="text-xs font-medium text-muted-foreground hover:text-foreground">
					Staff Portal
				</a>
				<a href="/" class="text-xs font-medium text-muted-foreground hover:text-foreground mr-2">
					Public Site
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
				<h1 class="text-2xl font-bold tracking-tight text-foreground">Campus Administration Hub</h1>
				<p class="text-xs text-muted-foreground">Manage office locations, configure routing nodes, track analytics, and export visitor pass compliance reports.</p>
			</div>

			<div class="flex items-center gap-2">
				<Button onclick={handleRefresh} variant="outline" size="sm" class="text-xs font-medium gap-1.5 w-fit">
					<RefreshCwIcon class="size-3.5 pointer-events-none" />
					<span>Refresh</span>
				</Button>
				<Button onclick={exportCSV} class="bg-primary text-primary-foreground text-xs font-bold py-2 px-3 shadow-md flex items-center gap-1.5">
					<DownloadIcon class="size-3.5 pointer-events-none" />
					<span>Export CSV Logbook</span>
				</Button>
			</div>
		</div>

		<!-- Top Row KPI metrics cards -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card.Root class="p-4 border-border shadow-xs flex flex-col gap-1 bg-card">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Registers</span>
				<div class="text-2xl font-black text-foreground">{totalCount}</div>
			</Card.Root>
			<Card.Root class="p-4 border-primary/30 shadow-xs flex flex-col gap-1 bg-primary/5">
				<span class="text-[10px] font-bold text-primary uppercase tracking-wider">Currently on Campus</span>
				<div class="text-2xl font-black text-primary flex items-center gap-1.5">
					<span>{activeCount}</span>
					<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
				</div>
			</Card.Root>
			<Card.Root class="p-4 border-border shadow-xs flex flex-col gap-1 bg-card">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Checked Out</span>
				<div class="text-2xl font-black text-foreground">{checkoutCount}</div>
			</Card.Root>
			<Card.Root class="p-4 border-border shadow-xs flex flex-col gap-1 bg-card">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Declined Passes</span>
				<div class="text-2xl font-black text-destructive">{rejectedCount}</div>
			</Card.Root>
		</div>

		<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="w-full">
			<Tabs.List class="grid w-full grid-cols-4 max-w-lg mx-auto mb-6 bg-muted">
				<Tabs.Trigger value="dashboard" class="text-xs font-semibold flex items-center gap-1">
					<BarChartIcon class="size-3.5 pointer-events-none" />
					<span>Analytics</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="logs" class="text-xs font-semibold flex items-center gap-1">
					<ListIcon class="size-3.5 pointer-events-none" />
					<span>Logbook Master</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="offices" class="text-xs font-semibold flex items-center gap-1">
					<BuildingIcon class="size-3.5 pointer-events-none" />
					<span>Office Config</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="accounts" class="text-xs font-semibold flex items-center gap-1">
					<UsersIcon class="size-3.5 pointer-events-none" />
					<span>Accounts</span>
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Analytics & Dashboard -->
			<Tabs.Content value="dashboard" class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Visit distribution card -->
				<Card.Root class="border-border shadow-sm">
					<Card.Header>
						<Card.Title class="text-base font-bold text-foreground">Traffic by Campus Office</Card.Title>
						<Card.Description class="text-xs text-muted-foreground">Number of visitors registered per department.</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3">
						<div class="flex flex-col gap-1">
							<div class="flex justify-between text-xs font-semibold">
								<span>Registrar & Admissions</span>
								<span>{registrarCount}</span>
							</div>
							<div class="w-full bg-muted h-3 rounded-full overflow-hidden">
								<div class="bg-primary h-full rounded-full" style="width: {(registrarCount / (totalCount || 1)) * 100}%"></div>
							</div>
						</div>

						<div class="flex flex-col gap-1">
							<div class="flex justify-between text-xs font-semibold">
								<span>Cashier & Finance</span>
								<span>{cashierCount}</span>
							</div>
							<div class="w-full bg-muted h-3 rounded-full overflow-hidden">
								<div class="bg-primary h-full rounded-full" style="width: {(cashierCount / (totalCount || 1)) * 100}%"></div>
							</div>
						</div>

						<div class="flex flex-col gap-1">
							<div class="flex justify-between text-xs font-semibold">
								<span>Computer Studies (CCS)</span>
								<span>{ccsCount}</span>
							</div>
							<div class="w-full bg-muted h-3 rounded-full overflow-hidden">
								<div class="bg-primary h-full rounded-full" style="width: {(ccsCount / (totalCount || 1)) * 100}%"></div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Security and Safety Checklist -->
				<Card.Root class="border-border shadow-sm">
					<Card.Header>
						<Card.Title class="text-base font-bold text-foreground">Campus Security Briefing</Card.Title>
						<Card.Description class="text-xs text-muted-foreground">Operational checklist and gate control statistics.</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3 text-xs">
						<div class="flex items-center justify-between p-2 rounded bg-muted/40">
							<span class="font-medium">Auto-Approve Registration Mode</span>
							<Badge class="bg-green-500 text-white text-[10px]">Active</Badge>
						</div>
						<div class="flex items-center justify-between p-2 rounded bg-muted/40">
							<span class="font-medium">Total In-Office Check-ins Checked</span>
							<span class="font-bold text-foreground">{visitors.filter(v => v.roomCheckInTime).length} active</span>
						</div>
						<div class="flex items-center justify-between p-2 rounded bg-muted/40">
							<span class="font-medium">Total Registered Staff Accounts</span>
							<span class="font-bold text-foreground">15 Accounts</span>
						</div>
						<div class="pt-2 border-t border-border/60">
							<a href="/security" class="block text-center w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg transition-colors">
								Launch Live Gate Monitoring Grid
							</a>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Logs Master -->
			<Tabs.Content value="logs" class="flex flex-col gap-4">
				<div class="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border shadow-xs">
					<div class="flex-1 w-full flex items-center gap-2">
						<SearchIcon class="size-4 text-muted-foreground pointer-events-none" />
						<Input
							type="text"
							placeholder="Search by visitor name, pass code, or purpose..."
							bind:value={logSearch}
							class="w-full border-none shadow-none focus-visible:ring-0"
						/>
					</div>

					<div class="w-full sm:w-52">
						<Select.Root type="single" bind:value={logOfficeFilter}>
							<Select.Trigger class="h-9 w-full">
								<span class="text-xs font-semibold">
									{MOCK_OFFICES.find(o => o.id === logOfficeFilter)?.name || 'Filter by Office'}
								</span>
							</Select.Trigger>
							<Select.Content>
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
				</div>

				<div class="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
					<table class="w-full text-left text-xs text-foreground font-sans">
						<thead class="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b border-border">
							<tr>
								<th class="px-4 py-3">Pass Code</th>
								<th class="px-4 py-3">Visitor Name</th>
								<th class="px-4 py-3">Destination Office</th>
								<th class="px-4 py-3">Purpose of Visit</th>
								<th class="px-4 py-3">Checked In</th>
								<th class="px-4 py-3">Checked Out</th>
								<th class="px-4 py-3">Status</th>
								<th class="px-4 py-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/60">
							{#each filteredLogs as visitor}
								<tr class="hover:bg-muted/40 transition-colors">
									<td class="px-4 py-3 font-mono font-bold text-primary">
										{visitor.passCode}
									</td>
									<td class="px-4 py-3 font-semibold">
										{visitor.fullName}
										<div class="text-[10px] text-muted-foreground font-normal">{visitor.email} • {visitor.phone}</div>
									</td>
									<td class="px-4 py-3">
										{@render officeBadge(visitor.officeName || 'General')}
									</td>
									<td class="px-4 py-3 text-muted-foreground max-w-[150px] truncate" title={visitor.purpose}>
										{visitor.purpose}
									</td>
									<td class="px-4 py-3 text-muted-foreground">
										<div class="font-mono">{formatTime(visitor.checkInTime)}</div>
										<div class="text-[9px]">{formatDate(visitor.checkInTime)}</div>
									</td>
									<td class="px-4 py-3 text-muted-foreground font-mono">
										{visitor.checkOutTime ? formatTime(visitor.checkOutTime) : '-'}
										{#if visitor.checkOutTime}
											<div class="text-[9px] font-sans">{formatDate(visitor.checkOutTime)}</div>
										{/if}
									</td>
									<td class="px-4 py-3">
										{@render statusBadge(visitor)}
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
									<td colspan="8" class="text-center py-10 text-muted-foreground text-xs">
										No visitor logs match the filters.
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Tabs.Content>

			<!-- Office Settings Config -->
			<Tabs.Content value="offices" class="flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-bold text-foreground">Campus Departments & QR Code Setup</h2>
					<span class="text-xs text-muted-foreground">Generating room check-in sheets.</span>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each MOCK_OFFICES as office}
						<Card.Root class="border-border shadow-xs">
							<Card.Header class="pb-2">
								<div class="flex items-center justify-between">
									<Badge variant="secondary" class="font-mono font-bold text-xs">{office.code}</Badge>
									<span class="text-xs text-muted-foreground">{office.building}</span>
								</div>
								<Card.Title class="text-base font-extrabold text-foreground pt-1">{office.name}</Card.Title>
								<Card.Description class="text-xs leading-relaxed">{office.description}</Card.Description>
							</Card.Header>
							<Card.Content class="py-2 text-xs flex flex-col gap-1.5 text-muted-foreground">
								<div><span class="font-semibold text-foreground">Floor Location:</span> {office.floor}</div>
								<div><span class="font-semibold text-foreground">Department Head:</span> {office.headPerson || 'N/A'}</div>
								<div><span class="font-semibold text-foreground">Contact Email:</span> {office.contactEmail || 'N/A'}</div>
							</Card.Content>
							<Card.Footer class="pt-2 border-t border-border/50 flex gap-2">
								<Button onclick={() => (activeQrOffice = office)} variant="outline" size="sm" class="flex-1 text-xs gap-1">
									<QrCodeIcon class="size-4 pointer-events-none" />
									<span>Generate Office QR Code</span>
								</Button>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>
			</Tabs.Content>

			<!-- Staff/User Accounts Management -->
			<Tabs.Content value="accounts" class="flex flex-col gap-6">
				<Card.Root class="border-border shadow-xs">
					<Card.Header class="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<Card.Title class="text-lg font-bold text-foreground">User accounts & Portals Provisioning</Card.Title>
							<Card.Description class="text-xs text-muted-foreground">Monitor system access profiles and bind staff to departments.</Card.Description>
						</div>
						<Button onclick={() => (isCreatingUser = true)} class="text-xs font-bold gap-2">
							<UsersIcon class="size-4 pointer-events-none" />
							<span>Provision New User</span>
						</Button>
					</Card.Header>

					<Card.Content class="p-0">
						<div class="overflow-x-auto">
							<table class="w-full text-left text-xs border-collapse">
								<thead>
									<tr class="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
										<th class="px-6 py-3">Account Username (Email)</th>
										<th class="px-6 py-3">Access Role</th>
										<th class="px-6 py-3">Assigned Department</th>
										<th class="px-6 py-3">Created Date</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									{#each profiles as profile}
										<tr class="hover:bg-muted/30 transition-colors">
											<td class="px-6 py-4 font-semibold text-foreground font-mono">{profile.email}</td>
											<td class="px-6 py-4">
												{#if profile.role === 'admin'}
													<Badge class="bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20 text-[10px] font-bold">Admin</Badge>
												{:else if profile.role === 'security'}
													<Badge class="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px] font-bold">Security</Badge>
												{:else}
													<Badge class="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold">Staff</Badge>
												{/if}
											</td>
											<td class="px-6 py-4 text-muted-foreground">
												{#if profile.role === 'staff' && profile.officeId}
													{MOCK_OFFICES.find(o => o.id === profile.officeId)?.name || profile.officeId}
												{:else}
													<span class="italic text-muted-foreground/60 text-[10px]">Global Access</span>
												{/if}
											</td>
											<td class="px-6 py-4 text-muted-foreground font-mono">
												{new Date(profile.createdAt || Date.now()).toLocaleDateString()}
											</td>
										</tr>
									{:else}
										<tr>
											<td colspan="4" class="text-center py-10 text-muted-foreground text-xs">
												No active accounts found.
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</main>

	<!-- Account Provisioning Dialog Modal -->
	<Dialog.Root bind:open={isCreatingUser}>
		<Dialog.Content class="max-w-md border-border shadow-2xl">
			<Dialog.Header>
				<Dialog.Title>Provision User Account</Dialog.Title>
				<Dialog.Description>Create credentials and assign system roles.</Dialog.Description>
			</Dialog.Header>

			<form method="POST" action="?/createUser" use:enhance={handleCreateUserEnhance} class="flex flex-col gap-4 py-2">
				<Field.FieldGroup class="flex flex-col gap-4">
					<Field.Field>
						<Field.FieldLabel for="new-email">Username (Email)</Field.FieldLabel>
						<Input
							id="new-email"
							name="email"
							type="text"
							placeholder="e.g. registrar_staff"
							bind:value={newEmail}
							required
						/>
					</Field.Field>

					<Field.Field>
						<Field.FieldLabel for="new-password">Password</Field.FieldLabel>
						<Input
							id="new-password"
							name="password"
							type="password"
							placeholder="Minimum 6 characters"
							bind:value={newPassword}
							required
						/>
					</Field.Field>

					<Field.Field>
						<Field.FieldLabel>User Role</Field.FieldLabel>
						<input type="hidden" name="role" value={newRole} />
						<div class="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl text-xs font-semibold">
							<button
								type="button"
								onclick={() => { newRole = 'staff'; }}
								class="py-1.5 rounded-lg transition-all text-center {newRole === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
							>
								Office Staff
							</button>
							<button
								type="button"
								onclick={() => { newRole = 'security'; }}
								class="py-1.5 rounded-lg transition-all text-center {newRole === 'security' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
							>
								Security Guard
							</button>
						</div>
					</Field.Field>

					{#if newRole === 'staff'}
						<Field.Field>
							<Field.FieldLabel>Bound Department Office</Field.FieldLabel>
							<input type="hidden" name="officeId" value={newOfficeId} />
							<Select.Root type="single" bind:value={newOfficeId}>
								<Select.Trigger class="w-full h-10">
									<span class="text-xs font-semibold">
										{MOCK_OFFICES.find(o => o.id === newOfficeId)?.name || 'Select Department'}
									</span>
								</Select.Trigger>
								<Select.Content>
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
					<Button type="button" onclick={() => (isCreatingUser = false)} variant="outline" class="flex-1 text-xs">
						Cancel
					</Button>
					<Button type="submit" class="flex-1 text-xs font-bold shadow-md">
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
		<Dialog.Content class="max-w-sm border-primary/40 shadow-2xl text-center">
			<Dialog.Header>
				<Dialog.Title class="text-left">Office Door QR Code</Dialog.Title>
				<Dialog.Description class="text-left">
					{#if activeQrOffice}{activeQrOffice.name}{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if activeQrOffice}
				<div class="py-4 flex flex-col gap-4 items-center">
					<!-- Simulated QR code container -->
					<div class="p-4 bg-white rounded-2xl shadow-inner border border-border flex items-center justify-center size-52">
						<svg class="size-40 text-black" fill="currentColor" viewBox="0 0 24 24">
							<!-- Abstract QR pattern -->
							<path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8zM14 17h2v2h-2v-2zm3-3h2v2h-2v-2zm-3 6h2v2h-2v-2zm3-3h2v2h-2v-2z"/>
						</svg>
					</div>

					<div class="text-center space-y-1">
						<Badge class="bg-primary text-primary-foreground font-bold font-mono text-[10px] tracking-wider uppercase">
							{activeQrOffice.code} DOOR QR CODE
						</Badge>
						<p class="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
							Visitors scan this code with their digital passes to automatically confirm arrival or check-out of this department.
						</p>
					</div>
				</div>
			{/if}

			<Dialog.Footer class="border-t border-border/60 pt-3">
				<Button onclick={() => window.print()} class="w-full bg-primary text-primary-foreground font-bold text-xs py-2 rounded-lg gap-2 shadow-md">
					<PrinterIcon class="size-4 pointer-events-none" />
					<span>Print Door QR Sign</span>
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
