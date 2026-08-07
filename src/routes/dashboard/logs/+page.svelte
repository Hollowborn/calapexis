<script lang="ts">
	import { getContext } from 'svelte';
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import { createColumnHelper } from "@tanstack/table-core";
	import type { Visitor } from '$lib/types';
	import { checkoutLocalVisitor } from '$lib/supabase';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ZoomInIcon from '@lucide/svelte/icons/zoom-in';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

	let selectedDate = $state('');
	let isPhotoModalOpen = $state(false);
	let selectedVisitorPhoto = $state<any | null>(null);

	function openVisitorPhotoModal(visitor: any) {
		selectedVisitorPhoto = visitor;
		isPhotoModalOpen = true;
	}

	$effect(() => {
		if (data?.selectedDate) {
			selectedDate = data.selectedDate;
		}
	});

	let filteredVisitors = $derived.by(() => {
		if (data?.serverLogs) return data.serverLogs;
		if (selectedDate) {
			return visitors.filter((v: any) => {
				if (!v.checkInTime) return false;
				const dateStr = new Date(v.checkInTime).toISOString().split('T')[0];
				return dateStr === selectedDate;
			});
		}
		return visitors;
	});

	// Setup TanStack Columns
	const columnHelper = createColumnHelper<Visitor>();
	
	const columns = [
		// 1. Selection column
		columnHelper.display({
			id: "select",
			header: ({ table }) => renderSnippet(selectAllCheckbox, { table }),
			cell: ({ row }) => renderSnippet(selectRowCheckbox, { row })
		}),

		// 2. Pass Code (monospace format)
		columnHelper.accessor("passCode", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Pass Code" }),
			cell: ({ getValue }) => renderSnippet(passCodeCell, { code: getValue() })
		}),

		// 3. Visitor Name details
		columnHelper.accessor("fullName", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Visitor Name" }),
			cell: ({ row }) => renderSnippet(visitorNameCell, { visitor: row.original })
		}),

		// 4. Destination Building (oklch custom badge)
		columnHelper.accessor("buildingName", {
			header: "Destination Building",
			cell: ({ getValue }) => renderSnippet(buildingBadge, { name: getValue() || 'General' })
		}),

		// 5. Purpose (truncated)
		columnHelper.accessor("purpose", {
			header: "Purpose of Visit",
			cell: ({ getValue }) => renderSnippet(purposeCell, { purpose: getValue() })
		}),

		// 6. Checked In Timestamp
		columnHelper.accessor("checkInTime", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Checked In" }),
			cell: ({ getValue }) => renderSnippet(timestampCell, { time: getValue() })
		}),

		// 7. Checked Out Timestamp
		columnHelper.accessor("checkOutTime", {
			header: "Checked Out",
			cell: ({ getValue }) => renderSnippet(timestampCell, { time: getValue() || '' })
		}),

		// 8. Status Badge
		columnHelper.accessor("status", {
			header: "Status",
			cell: ({ row }) => renderSnippet(statusBadge, { visitor: row.original })
		}),

		// 9. Actions Column
		columnHelper.display({
			id: "actions",
			header: () => renderSnippet(actionsHeader),
			cell: ({ row }) => renderSnippet(rowActions, { visitor: row.original })
		})
	];

	// Formatting Helpers
	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// CSV Exporter Action
	function exportCSV() {
		const headers = 'Pass Code,Name,Email,Phone,Purpose,Building,Check In,Check Out,Status,Verification\n';
		const rows = (filteredVisitors as any[]).map(v => {
			return `"${v.passCode}","${v.fullName}","${v.email}","${v.phone}","${v.purpose}","${v.buildingName || 'General'}","${v.checkInTime}","${v.checkOutTime || ''}","${v.status}","${v.verificationStatus}"`;
		}).join('\n');

		const blob = new Blob([headers + rows], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `visitor_log_${selectedDate || new Date().toISOString().split('T')[0]}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		toast.success('Visitor log exported as CSV.');
	}
</script>

<!-- Checkbox Snippets -->
{#snippet selectAllCheckbox({ table }: { table: any })}
	<input
		type="checkbox"
		checked={table.getIsAllPageRowsSelected()}
		indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
		onchange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
		class="rounded border-border bg-background text-primary focus:ring-primary size-4 cursor-pointer transition-all"
	/>
{/snippet}

{#snippet selectRowCheckbox({ row }: { row: any })}
	<input
		type="checkbox"
		checked={row.getIsSelected()}
		onchange={(e) => row.toggleSelected(e.currentTarget.checked)}
		class="rounded border-border bg-background text-primary focus:ring-primary size-4 cursor-pointer transition-all"
		aria-label="Select row"
	/>
{/snippet}

<!-- Column Cell Snippets -->
{#snippet passCodeCell({ code }: { code: string })}
	<span class="font-mono font-black text-xs text-primary">{code}</span>
{/snippet}

{#snippet visitorNameCell({ visitor }: { visitor: Visitor })}
	<div class="flex items-center gap-3 py-1">
		<button
			type="button"
			onclick={() => openVisitorPhotoModal(visitor)}
			class="relative group cursor-pointer focus:outline-hidden shrink-0"
			title="Click to view enlarged photo"
		>
			<img
				src={visitor.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(visitor.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=256`}
				alt={visitor.fullName}
				class="size-9 rounded-full object-cover border-2 border-border group-hover:border-primary transition-all group-hover:scale-105 shadow-xs"
			/>
			<div class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
				<ZoomInIcon class="size-3.5" />
			</div>
		</button>
		<div class="flex flex-col">
			<span class="font-bold text-xs text-foreground">{visitor.fullName}</span>
			<span class="text-[10px] text-muted-foreground">{visitor.email || visitor.phone || 'No Contact Data'}</span>
		</div>
	</div>
{/snippet}

{#snippet buildingBadge({ name }: { name: string })}
	<Badge variant="outline" class="text-[11px] font-bold border rounded-full px-2.5">
		{name}
	</Badge>
{/snippet}

{#snippet purposeCell({ purpose }: { purpose: string })}
	<span class="text-xs text-muted-foreground truncate max-w-[180px] inline-block" title={purpose}>
		{purpose || 'Campus Access'}
	</span>
{/snippet}

{#snippet timestampCell({ time }: { time: string })}
	{#if time}
		<div class="flex flex-col">
			<span class="font-mono font-bold text-xs text-foreground">{formatTime(time)}</span>
			<span class="text-[10px] text-muted-foreground">{formatDate(time)}</span>
		</div>
	{:else}
		<span class="text-xs text-muted-foreground/60 italic">-</span>
	{/if}
{/snippet}

{#snippet statusBadge({ visitor }: { visitor: Visitor })}
	{#if visitor.status === 'preliminary'}
		<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
			<span class="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
			<span>Preliminary Pre-Pass</span>
		</span>
	{:else if visitor.status === 'checked_out'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
			Checked Out
		</span>
	{:else if visitor.verificationStatus === 'rejected'}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/30 text-red-600 border border-red-200">
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

{#snippet actionsHeader()}
	<span class="text-right block w-full pr-4 text-xs font-bold text-muted-foreground">Actions</span>
{/snippet}

{#snippet rowActions({ visitor }: { visitor: any })}
	<div class="text-right pr-2">
		{#if visitor.status === 'checked_in'}
			<Button
				variant="ghost"
				size="sm"
				onclick={async () => {
					const updated = await checkoutLocalVisitor(visitor.id);
					if (updated) {
						toast.info(`Visitor ${updated.fullName} checked out successfully.`);
						await dashboardContext.loadData();
					}
				}}
				class="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
			>
				Check out
			</Button>
		{:else}
			<span class="text-[10px] font-semibold text-muted-foreground/60 italic">-</span>
		{/if}
	</div>
{/snippet}

<!-- Dynamic Bulk Selections Toolbar Snippet -->
{#snippet bulkActionsSnippet({ selectedRows }: { selectedRows: any[] })}
	<Button
		variant="outline"
		size="sm"
		onclick={async () => {
			const checkedInRows = selectedRows.filter((r: any) => r.status === 'checked_in');
			if (checkedInRows.length === 0) {
				toast.info("No active visitors among selected rows.");
				return;
			}
			const promises = checkedInRows.map((r: any) => checkoutLocalVisitor(r.id));
			await Promise.all(promises);
			toast.success(`Bulk checked out ${checkedInRows.length} active visitors.`);
			await dashboardContext.loadData();
		}}
		class="h-8 text-xs font-bold gap-1 rounded-lg border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
	>
		Bulk Checkout
	</Button>
{/snippet}

<!-- Table page view layout wrapper -->
<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Logbook Master</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Historical database log spreadsheets</p>
		</div>
	</div>

	<!-- Print-Only Heading -->
	<div class="hidden print:block text-center space-y-1 mb-6 font-semibold">
		<h1 class="text-xl font-bold tracking-tight text-black">Calapexis Visitor Compliance Logbook</h1>
		<p class="text-xs text-zinc-600">Generated on {new Date().toLocaleString()} • Classified Official Campus Document</p>
	</div>

	<!-- Custom Toolbar snippet with Calendar Date Filter -->
	{#snippet customToolbarSnippet()}
		<div class="flex items-center gap-2">
			<CalendarIcon class="size-4 text-muted-foreground shrink-0 pointer-events-none" />
			<span class="text-xs font-bold text-muted-foreground shrink-0">Filter Date:</span>
			<Input
				type="date"
				bind:value={selectedDate}
				class="h-9 w-36 text-xs font-bold rounded-xl"
			/>
			{#if selectedDate}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => (selectedDate = '')}
					class="h-9 text-[11px] font-extrabold text-muted-foreground hover:text-foreground cursor-pointer px-2"
				>
					Clear Date
				</Button>
			{/if}
		</div>

		<Button onclick={exportCSV} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer ml-auto sm:ml-0">
			<DownloadIcon class="size-3.5" />
			<span>Export CSV</span>
		</Button>

		<Button onclick={() => window.print()} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer">
			<PrinterIcon class="size-3.5" />
			<span>Print PDF</span>
		</Button>
	{/snippet}

	<!-- Mount custom DataTable component -->
	<DataTable.Root
		data={filteredVisitors}
		columns={columns as any}
		searchColumn="fullName"
		searchPlaceholder="Filter logs by visitor name..."
		bulkActions={bulkActionsSnippet}
		customToolbar={customToolbarSnippet}
	/>
</div>

<!-- ENLARGED VISITOR PHOTO DIALOG MODAL -->
<Dialog.Root bind:open={isPhotoModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-sm border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-6">
			{#if selectedVisitorPhoto}
				<Dialog.Header class="pb-3 border-b border-border/60">
					<div class="flex items-center justify-between">
						<Badge variant="outline" class="border-primary text-primary font-mono text-[10px] font-black rounded-full px-2.5">
							{selectedVisitorPhoto.passCode || 'VISITOR PASS'}
						</Badge>
						<span class="text-[10px] text-muted-foreground font-mono">
							{selectedVisitorPhoto.checkInTime ? new Date(selectedVisitorPhoto.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
						</span>
					</div>
					<Dialog.Title class="text-lg font-black text-foreground pt-1">{selectedVisitorPhoto.fullName}</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground font-semibold">
						{selectedVisitorPhoto.email || selectedVisitorPhoto.phone || 'Walk-in Campus Visitor'}
					</Dialog.Description>
				</Dialog.Header>

				<div class="py-4 flex flex-col items-center gap-4">
					<!-- Enlarged Image Container with Frame & Glassmorphism Badge -->
					<div class="relative w-full max-w-[240px] aspect-square rounded-2xl overflow-hidden border-2 border-primary/40 shadow-xl bg-black/90">
						<img
							src={selectedVisitorPhoto.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedVisitorPhoto.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=512`}
							alt={selectedVisitorPhoto.fullName}
							class="w-full h-full object-cover"
						/>
						<div class="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-background/80 backdrop-blur-md border border-border/60 text-center flex items-center justify-center gap-1.5">
							<ShieldCheckIcon class="size-3.5 text-primary shrink-0" />
							<span class="text-[10px] font-bold text-foreground truncate">Verification Snapshot</span>
						</div>
					</div>

					<!-- Details Grid -->
					<div class="grid grid-cols-2 gap-2 text-xs w-full bg-muted/40 p-3 rounded-2xl border border-border/60">
						<div>
							<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Destination:</span>
							<div class="font-extrabold text-foreground truncate">{selectedVisitorPhoto.buildingName || selectedVisitorPhoto.officeName || 'General Campus'}</div>
						</div>
						<div>
							<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status:</span>
							<div class="font-extrabold text-foreground capitalize">{selectedVisitorPhoto.status || 'Active'}</div>
						</div>
						<div class="col-span-2 pt-1 border-t border-border/40">
							<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Purpose:</span>
							<div class="font-medium text-foreground truncate">{selectedVisitorPhoto.purpose || 'Campus Access'}</div>
						</div>
					</div>
				</div>

				<Dialog.Footer class="pt-2 border-t border-border/60">
					<Dialog.Close class="w-full">
						<Button variant="outline" class="w-full text-xs font-bold rounded-xl h-9 cursor-pointer border-border">
							Close Preview
						</Button>
					</Dialog.Close>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
