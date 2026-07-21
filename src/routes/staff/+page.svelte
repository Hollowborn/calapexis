<script lang="ts">
	import { MOCK_OFFICES, getLocalVisitors } from '$lib/supabase';
	import type { Visitor } from '$lib/types';
	import StaffCheckInForm from '$lib/components/staff/StaffCheckInForm.svelte';
	import StaffCheckoutSearch from '$lib/components/staff/StaffCheckoutSearch.svelte';
	import VisitorTable from '$lib/components/admin/VisitorTable.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import UsersIcon from '@lucide/svelte/icons/users';

	let activeOfficeId = $state('off-1'); // Default to Registrar Office
	let activeTab = $state('checkin');
	let visitors: Visitor[] = $state([]);

	$effect(() => {
		loadData();
	});

	function loadData() {
		visitors = getLocalVisitors();
	}

	function handleRefreshClick() {
		loadData();
		toast.info('Staff logbook data refreshed.');
	}

	let activeOffice = $derived(MOCK_OFFICES.find((o) => o.id === activeOfficeId));
	let officeVisitors = $derived(visitors.filter((v) => v.officeId === activeOfficeId));
	let activeOfficeCount = $derived(officeVisitors.filter((v) => v.status === 'checked_in').length);
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<!-- Dedicated Staff Navigation Header Layout -->
	<header class="border-b border-border bg-card sticky top-0 z-40 shadow-xs">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<a href="/staff" class="flex items-center gap-2 font-extrabold text-lg tracking-tight text-foreground">
					<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
						C
					</div>
					<span>Calapexis Staff Desk <span class="text-xs font-normal text-muted-foreground hidden sm:inline">| Office Assisted Portal</span></span>
				</a>
			</div>

			<!-- Staff Office Selector Dropdown -->
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2">
					<span class="text-xs font-medium text-muted-foreground hidden md:inline">Department:</span>
					<select
						bind:value={activeOfficeId}
						class="h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
					>
						{#each MOCK_OFFICES as office}
							<option value={office.id}>{office.name} ({office.code})</option>
						{/each}
					</select>
				</div>

				<Badge variant="outline" class="hidden lg:flex border-primary text-primary font-semibold text-xs">
					{activeOfficeCount} Active Visitors
				</Badge>

				<a href="/" class="text-xs font-medium text-muted-foreground hover:text-foreground underline">
					Public Site →
				</a>
			</div>
		</div>
	</header>

	<!-- Main Staff Portal Body -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
		<!-- Active Office Department Banner -->
		<div class="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
			<div class="flex flex-col gap-0.5">
				<div class="flex items-center gap-2">
					<span class="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-bold">{activeOffice?.code}</span>
					<h1 class="text-lg font-bold text-foreground">{activeOffice?.name}</h1>
				</div>
				<p class="text-xs text-muted-foreground">{activeOffice?.building} • {activeOffice?.floor} • Head: {activeOffice?.headPerson}</p>
			</div>

			<div class="flex items-center gap-2 text-xs">
				<Button onclick={handleRefreshClick} variant="outline" size="sm" class="text-xs font-medium gap-1.5">
					<RefreshCwIcon class="size-3.5" />
					<span>Refresh Data</span>
				</Button>
			</div>
		</div>

		<!-- Tabbed Interface for Staff Assisted Workflow -->
		<Tabs.Root value={activeTab} onValueChange={(val) => (activeTab = val)} class="w-full">
			<Tabs.List class="grid w-full grid-cols-3 max-w-md mx-auto mb-6 bg-muted">
				<Tabs.Trigger value="checkin" class="text-xs font-semibold">
					Assisted Check-In
				</Tabs.Trigger>
				<Tabs.Trigger value="checkout" class="text-xs font-semibold">
					Quick Check-Out
				</Tabs.Trigger>
				<Tabs.Trigger value="directory" class="text-xs font-semibold">
					Office Log ({officeVisitors.length})
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="checkin">
				<StaffCheckInForm
					offices={MOCK_OFFICES}
					rooms={[]}
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
					<h2 class="text-base font-bold text-foreground">Recent Visitors for {activeOffice?.name}</h2>
					<span class="text-xs text-muted-foreground">Total: {officeVisitors.length} entries</span>
				</div>

				<VisitorTable visitors={officeVisitors} onUpdate={loadData} />
			</Tabs.Content>
		</Tabs.Root>
	</main>
</div>
