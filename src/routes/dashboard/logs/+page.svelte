<script lang="ts">
	import { getContext } from 'svelte';
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import { createColumnHelper } from "@tanstack/table-core";
	import type { Visitor } from '$lib/types';
	import { checkoutLocalVisitor } from '$lib/supabase';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import PrinterIcon from '@lucide/svelte/icons/printer';

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

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

		// 4. Destination Office (oklch custom badge)
		columnHelper.accessor("officeName", {
			header: "Destination Office",
			cell: ({ getValue }) => renderSnippet(officeBadge, { name: getValue() || 'General' })
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
			cell: ({ getValue }) => renderSnippet(timestampCell, { time: getValue() })
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

	// Format Date Helper
	function formatDate(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// CSV Exporter Action
	function exportCSV() {
		const headers = 'Pass Code,Name,Email,Phone,Purpose,Office,Check In,Check Out,Status,Verification\n';
		const rows = (visitors as any[]).map(v => {
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

<!-- Table Cell Snippets -->
{#snippet passCodeCell({ code }: { code: any })}
	<span class="font-mono font-black text-primary select-all">{code}</span>
{/snippet}

{#snippet visitorNameCell({ visitor }: { visitor: any })}
	<div>
		<div class="font-bold text-foreground text-sm leading-snug">{visitor.fullName}</div>
		<div class="text-[10px] text-muted-foreground font-semibold mt-0.5">{visitor.email} • {visitor.phone}</div>
	</div>
{/snippet}

{#snippet purposeCell({ purpose }: { purpose: any })}
	<div class="max-w-[150px] truncate text-muted-foreground text-xs" title={purpose}>{purpose}</div>
{/snippet}

{#snippet timestampCell({ time }: { time: any })}
	{#if time}
		<div>
			<div class="font-mono text-foreground font-semibold text-xs leading-none">{formatTime(time)}</div>
			<div class="text-[9px] text-muted-foreground mt-0.5">{formatDate(time)}</div>
		</div>
	{:else}
		<span class="text-muted-foreground/60 italic text-xs font-normal">-</span>
	{/if}
{/snippet}

<!-- Svelte Snippet for dynamic colored theme-aware badges using OKLCH custom colors -->
{#snippet officeBadge({ name }: { name: any })}
	{@const chartColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']}
	{@const hash = String(name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}
	{@const colorVar = chartColors[Math.abs(hash) % chartColors.length]}
	<Badge
		style="background-color: oklch(from var({colorVar}) l c h / 0.12); border-color: oklch(from var({colorVar}) l c h / 0.25); color: var({colorVar});"
		variant="outline"
		class="text-[11px] font-extrabold border transition-colors shadow-xs rounded-full px-2.5"
	>
		{name}
	</Badge>
{/snippet}

{#snippet statusBadge({ visitor }: { visitor: any })}
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
				class="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg"
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
			<p class="text-xs text-muted-foreground leading-relaxed">Historical database log spreadsheets</p>
		</div>
	</div>

	<!-- Print-Only Heading -->
	<div class="hidden print:block text-center space-y-1 mb-6">
		<h1 class="text-xl font-bold tracking-tight text-black">Calapexis Visitor Compliance Logbook</h1>
		<p class="text-xs text-zinc-600">Generated on {new Date().toLocaleString()} • Classified Official Campus Document</p>
	</div>

	<!-- Custom Toolbar snippet -->
	{#snippet customToolbarSnippet()}
		<Button onclick={exportCSV} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer">
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
		data={visitors}
		columns={columns as any}
		searchColumn="fullName"
		searchPlaceholder="Filter logs by visitor name..."
		bulkActions={bulkActionsSnippet}
		customToolbar={customToolbarSnippet}
	/>
</div>
