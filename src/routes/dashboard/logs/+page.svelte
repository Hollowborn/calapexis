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
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import VisitorPassBadge from "$lib/components/visitor-pass-badge.svelte";

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
			cell: ({ row }) => renderSnippet(passCodeCell, { row })
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

	function formatTimeOnly(isoString: string): string {
		if (!isoString) return '-';
		const d = new Date(isoString);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function formatCheckOutTime(checkInIso: string, checkOutIso: string | null | undefined, status: string): string {
		if (!checkOutIso) {
			return status === 'checked_in' ? 'Still In' : '-';
		}
		const inDate = new Date(checkInIso).toISOString().split('T')[0];
		const outDate = new Date(checkOutIso).toISOString().split('T')[0];
		const timeStr = formatTimeOnly(checkOutIso);

		if (inDate !== outDate) {
			const dateStr = new Date(checkOutIso).toLocaleDateString([], { month: 'short', day: 'numeric' });
			return `${dateStr}, ${timeStr}`;
		}
		return timeStr;
	}

	function formatDate(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
	}

	let isPassBadgeOpen = $state(false);
	let selectedBadgeVisitor = $state<Visitor | null>(null);

	// Print Audit Modal & Date Presets State
	let isPrintModalOpen = $state(false);
	let printDateMode = $state<'today' | 'specific' | 'range' | 'week' | 'month' | 'all'>('today');
	let printStartDate = $state(new Date().toISOString().split('T')[0]);
	let printEndDate = $state(new Date().toISOString().split('T')[0]);

	// Column Visibility Checkboxes (Only 5 toggleable options: Name, Office, Purpose, Check-In, Check-Out)
	let printColumns = $state({
		fullName: true,
		officeName: true,
		purpose: true,
		checkInTime: true,
		checkOutTime: true
	});

	function openPassBadge(visitor: Visitor) {
		selectedBadgeVisitor = visitor;
		isPassBadgeOpen = true;
	}

	let printableVisitors = $derived.by(() => {
		let list = visitors || [];
		const now = new Date();
		const todayStr = now.toISOString().split('T')[0];

		if (printDateMode === 'today') {
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime).toISOString().split('T')[0] === todayStr);
		} else if (printDateMode === 'specific' && printStartDate) {
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime).toISOString().split('T')[0] === printStartDate);
		} else if (printDateMode === 'range' && printStartDate && printEndDate) {
			list = list.filter((v: any) => {
				if (!v.checkInTime) return false;
				const d = new Date(v.checkInTime).toISOString().split('T')[0];
				return d >= printStartDate && d <= printEndDate;
			});
		} else if (printDateMode === 'week') {
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime) >= sevenDaysAgo);
		} else if (printDateMode === 'month') {
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime) >= startOfMonth);
		}
		return list;
	});

	let groupedPrintableVisitors = $derived.by(() => {
		const map = new Map<string, any[]>();

		for (const v of printableVisitors) {
			const dateStr = v.checkInTime
				? new Date(v.checkInTime).toISOString().split('T')[0]
				: 'Unscheduled';
			if (!map.has(dateStr)) {
				map.set(dateStr, []);
			}
			map.get(dateStr)!.push(v);
		}

		const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

		return sortedDates.map((dateStr) => {
			let dateLabel = 'Unscheduled Logs';
			if (dateStr !== 'Unscheduled') {
				const [year, month, day] = dateStr.split('-').map(Number);
				if (year && month && day) {
					const d = new Date(year, month - 1, day);
					dateLabel = d.toLocaleDateString('en-US', {
						weekday: 'long',
						month: 'short',
						day: 'numeric'
					});
				}
			}
			return {
				dateStr,
				dateLabel,
				visitors: map.get(dateStr)!
			};
		});
	});

	let activeColumnCount = $derived(
		(printColumns.fullName ? 1 : 0) +
		(printColumns.officeName ? 1 : 0) +
		(printColumns.purpose ? 1 : 0) +
		(printColumns.checkInTime ? 1 : 0) +
		(printColumns.checkOutTime ? 1 : 0)
	);

	function exportToCSV() {
		if (!filteredVisitors || filteredVisitors.length === 0) {
			toast.info("No visitor logs available to export.");
			return;
		}

		const headers = ["Pass Code", "Full Name", "Office", "Building", "Purpose", "Status", "Check-In Time", "Check-Out Time"];
		const rows = filteredVisitors.map((v: any) => [
			`"${v.passCode || ''}"`,
			`"${(v.fullName || '').replace(/"/g, '""')}"`,
			`"${(v.officeName || '').replace(/"/g, '""')}"`,
			`"${(v.buildingName || '').replace(/"/g, '""')}"`,
			`"${(v.purpose || '').replace(/"/g, '""')}"`,
			`"${v.status || ''}"`,
			`"${v.checkInTime ? new Date(v.checkInTime).toLocaleString() : ''}"`,
			`"${v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : ''}"`
		]);

		const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `calapexis_visitor_logs_${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success(`Exported ${filteredVisitors.length} visitor records to CSV spreadsheet.`);
	}

	function handlePrintReport() {
		isPrintModalOpen = true;
	}

	function generatePrintableReportHTML(): string {
		const scopeLabel = printDateMode.toUpperCase();
		const totalEntries = printableVisitors.length;
		const generatedTime = new Date().toLocaleString();

		let tableHeaders = '';
		if (printColumns.fullName) tableHeaders += '<th style="padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left;">Visitor Name</th>';
		if (printColumns.officeName) tableHeaders += '<th style="padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left;">Office / Desk</th>';
		if (printColumns.purpose) tableHeaders += '<th style="padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left;">Purpose of Visit</th>';
		if (printColumns.checkInTime) tableHeaders += '<th style="padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left; white-space: nowrap;">Check-In Time</th>';
		if (printColumns.checkOutTime) tableHeaders += '<th style="padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left; white-space: nowrap;">Check-Out Time</th>';

		let tableBody = '';
		if (groupedPrintableVisitors.length === 0) {
			tableBody = `<tr><td colspan="${activeColumnCount}" style="padding: 24px; text-align: center; color: #71717a; font-style: italic; font-weight: 600;">No visitor log records found for the selected date scope.</td></tr>`;
		} else {
			for (const group of groupedPrintableVisitors) {
				tableBody += `
					<tr style="background-color: #e4e4e7; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-top: 2px solid #71717a; border-bottom: 1px solid #a1a1aa;">
						<td colspan="${activeColumnCount}" style="padding: 8px 10px; font-weight: 900; font-size: 11.5px; color: #09090b; letter-spacing: 0.2px;">
							📅 ${group.dateLabel} &nbsp;•&nbsp; <span style="font-weight: 700; font-size: 10.5px; color: #52525b;">${group.visitors.length} ${group.visitors.length === 1 ? 'Record' : 'Records'}</span>
						</td>
					</tr>
				`;

				for (let i = 0; i < group.visitors.length; i++) {
					const v = group.visitors[i];
					const bg = i % 2 === 1 ? '#f4f4f5' : '#ffffff';
					const checkInStr = v.checkInTime ? formatTimeOnly(v.checkInTime) : '-';
					const checkOutStr = formatCheckOutTime(v.checkInTime, v.checkOutTime, v.status);

					tableBody += `
						<tr style="background-color: ${bg}; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom: 1px solid #e4e4e7;">
							${printColumns.fullName ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; font-weight: 700; color: #09090b;">${v.fullName || ''}</td>` : ''}
							${printColumns.officeName ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; color: #18181b;">${v.officeName || 'General Campus'}</td>` : ''}
							${printColumns.purpose ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; color: #27272a;">${v.purpose || '-'}</td>` : ''}
							${printColumns.checkInTime ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; font-family: monospace; font-weight: 700; font-size: 10.5px; white-space: nowrap; color: #09090b;">${checkInStr}</td>` : ''}
							${printColumns.checkOutTime ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; font-family: monospace; font-weight: 700; font-size: 10.5px; white-space: nowrap; color: #09090b;">${checkOutStr}</td>` : ''}
						</tr>
					`;
				}
			}
		}

		return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>Visitor Compliance Audit Report - BISU Calape</title>
	<style>
		@page { size: portrait; margin: 12mm; }
		* { box-sizing: border-box; }
		body {
			font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 16px;
			font-size: 11px;
			line-height: 1.4;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.toolbar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			background: #f4f4f5;
			border: 1px solid #d4d4d8;
			padding: 8px 12px;
			border-radius: 8px;
			margin-bottom: 16px;
		}
		.btn {
			padding: 6px 14px;
			border-radius: 6px;
			font-weight: 700;
			font-size: 11px;
			cursor: pointer;
			border: none;
		}
		.btn-primary {
			background: #000;
			color: #fff;
		}
		.btn-outline {
			background: #fff;
			color: #000;
			border: 1px solid #a1a1aa;
		}
		.letterhead {
			text-align: center;
			border-bottom: 2px solid #000;
			padding-bottom: 12px;
			margin-bottom: 16px;
		}
		.letterhead h1 {
			font-size: 16px;
			font-weight: 900;
			margin: 0 0 3px;
			letter-spacing: 0.5px;
			text-transform: uppercase;
		}
		.letterhead h2 {
			font-size: 12px;
			font-weight: 800;
			margin: 0 0 4px;
			color: #27272a;
			text-transform: uppercase;
		}
		.letterhead p {
			font-size: 10px;
			font-weight: 600;
			color: #52525b;
			margin: 0;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 11px;
		}
		th {
			background-color: #f4f4f5;
			font-weight: 800;
			text-transform: uppercase;
			font-size: 9.5px;
			color: #09090b;
		}
		.footer {
			margin-top: 24px;
			padding-top: 10px;
			border-top: 1px solid #d4d4d8;
			font-size: 9.5px;
			color: #71717a;
			display: flex;
			justify-content: space-between;
			font-weight: 600;
		}
		@media print {
			.toolbar { display: none !important; }
			body { padding: 0; }
		}
	</style>
</head>
<body>
	<div class="toolbar">
		<span style="font-weight: 700; font-size: 11px; color: #27272a;">
			🖨️ Ready to print: <strong>${totalEntries} ${totalEntries === 1 ? 'Record' : 'Records'}</strong> (${scopeLabel})
		</span>
		<div style="display: flex; gap: 8px;">
			<button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
			<button class="btn btn-outline" onclick="window.close()">Close Window</button>
		</div>
	</div>

	<div class="letterhead">
		<h1>BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS</h1>
		<h2>OFFICIAL VISITOR COMPLIANCE AUDIT REPORT</h2>
		<p>Report Scope: <strong>${scopeLabel}</strong> • Total Log Entries: <strong>${totalEntries}</strong> • Generated: ${generatedTime}</p>
	</div>

	<table>
		<thead>
			<tr style="background-color: #f4f4f5; border-bottom: 2px solid #71717a;">
				${tableHeaders}
			</tr>
		</thead>
		<tbody>
			${tableBody}
		</tbody>
	</table>

	<div class="footer">
		<div>Certified Official Audit Record • BISU Calape Campus Security Desk</div>
		<div>Generated from Calapexis Secure Logbook Master</div>
	</div>

	<script>
		window.onload = function() {
			setTimeout(function() {
				window.print();
			}, 300);
		};
	<\/script>
</body>
</html>`;
	}

	function executePrintReport() {
		if (printableVisitors.length === 0) {
			toast.error("No visitor log records found for the selected date filter.");
			return;
		}
		isPrintModalOpen = false;

		const html = generatePrintableReportHTML();
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
		} else {
			toast.error("Pop-up blocked. Please allow pop-ups for this site to print the report.");
		}
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
{#snippet passCodeCell({ row }: { row: any })}
	<button
		type="button"
		onclick={() => openPassBadge(row.original)}
		class="font-mono font-black text-xs text-primary hover:underline cursor-pointer"
		title="Click to view printable visitor pass badge"
	>
		{row.original.passCode}
	</button>
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
<div class="flex flex-col gap-6 p-6 md:p-8 print:hidden">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Logbook Master</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Historical database log spreadsheets</p>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={exportToCSV}
				class="h-9 text-xs font-bold gap-1.5 rounded-xl border-border/80 hover:bg-accent cursor-pointer shadow-2xs"
			>
				<DownloadIcon data-icon="inline-start" />
				<span>Export CSV</span>
			</Button>

			<Button
				variant="default"
				size="sm"
				onclick={handlePrintReport}
				class="h-9 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer shadow-2xs"
			>
				<PrinterIcon data-icon="inline-start" />
				<span>Print Audit Report</span>
			</Button>
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

		<!-- <Button onclick={exportCSV} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer ml-auto sm:ml-0">
			<DownloadIcon class="size-3.5" />
			<span>Export CSV</span>
		</Button>

		<Button onclick={() => window.print()} variant="outline" size="sm" class="h-9 text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-background hover:bg-muted/40 cursor-pointer">
			<PrinterIcon class="size-3.5" />
			<span>Print PDF</span>
		</Button> -->
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

<!-- Printable Visitor Pass Badge Modal -->
<VisitorPassBadge bind:open={isPassBadgeOpen} visitor={selectedBadgeVisitor} />

<!-- Print Audit Report Options Modal -->
<Dialog.Root bind:open={isPrintModalOpen}>
	<Dialog.Content class="sm:max-w-md border-border bg-card p-0 shadow-2xl rounded-3xl overflow-hidden">
		<!-- Header Banner -->
		<div class="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/70 flex flex-col gap-1">
			<div class="flex items-center gap-2">
				<PrinterIcon class="size-5 text-primary shrink-0 pointer-events-none" />
				<Dialog.Title class="text-base font-black text-foreground">
					Print Audit Report Options
				</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs text-muted-foreground font-semibold">
				Configure date scope, status filters, and printable columns before printing.
			</Dialog.Description>
		</div>

		<div class="p-6 space-y-5 text-xs">
			<!-- Date Filter Section -->
			<div class="space-y-2.5">
				<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
					1. Date Range Filter
				</span>

				<div class="flex flex-col gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/30">
					<div class="grid grid-cols-3 gap-1.5">
						<button
							type="button"
							onclick={() => (printDateMode = 'today')}
							class="py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] {printDateMode === 'today' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}"
						>
							Today
						</button>
						<button
							type="button"
							onclick={() => (printDateMode = 'week')}
							class="py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] {printDateMode === 'week' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}"
						>
							This Week
						</button>
						<button
							type="button"
							onclick={() => (printDateMode = 'month')}
							class="py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] {printDateMode === 'month' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}"
						>
							This Month
						</button>
						<button
							type="button"
							onclick={() => (printDateMode = 'specific')}
							class="py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] {printDateMode === 'specific' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}"
						>
							Specific Date
						</button>
						<button
							type="button"
							onclick={() => (printDateMode = 'range')}
							class="py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] {printDateMode === 'range' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}"
						>
							Date Range
						</button>
						<button
							type="button"
							onclick={() => (printDateMode = 'all')}
							class="py-1.5 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer text-[11px] {printDateMode === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-muted'}"
						>
							All Records
						</button>
					</div>

					{#if printDateMode === 'specific'}
						<div class="flex flex-col gap-1 pt-2 border-t border-border/60">
							<span class="text-[10px] text-muted-foreground font-semibold">Select Target Date</span>
							<Input
								type="date"
								bind:value={printStartDate}
								class="h-9 text-xs font-bold rounded-xl bg-background"
							/>
						</div>
					{:else if printDateMode === 'range'}
						<div class="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
							<div class="flex flex-col gap-1">
								<span class="text-[10px] text-muted-foreground font-semibold">Start Date</span>
								<Input
									type="date"
									bind:value={printStartDate}
									class="h-9 text-xs font-bold rounded-xl bg-background"
								/>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-[10px] text-muted-foreground font-semibold">End Date</span>
								<Input
									type="date"
									bind:value={printEndDate}
									class="h-9 text-xs font-bold rounded-xl bg-background"
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Empty Records Warning Alert -->
			{#if printableVisitors.length === 0}
				<div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2.5">
					<AlertTriangleIcon class="size-4 shrink-0 text-amber-500" />
					<span>No log entries match date scope ("{printDateMode}"). Select "All Records" or a different date range.</span>
				</div>
			{/if}

			<!-- Column Selector Checkboxes (Only 5 options shown: Visitor Name, Office Desk, Purpose, Checked In, Checked Out) -->
			<div class="space-y-2.5">
				<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
					2. Printable Columns
				</span>

				<div class="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl border border-border/80 bg-muted/30">
					<label class="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
						<input type="checkbox" bind:checked={printColumns.fullName} class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer" />
						<span>Visitor Name</span>
					</label>

					<label class="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
						<input type="checkbox" bind:checked={printColumns.officeName} class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer" />
						<span>Office / Desk</span>
					</label>

					<label class="flex items-center gap-2 cursor-pointer font-semibold text-foreground col-span-2">
						<input type="checkbox" bind:checked={printColumns.purpose} class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer" />
						<span>Purpose of Visit</span>
					</label>

					<label class="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
						<input type="checkbox" bind:checked={printColumns.checkInTime} class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer" />
						<span>Checked In</span>
					</label>

					<label class="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
						<input type="checkbox" bind:checked={printColumns.checkOutTime} class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer" />
						<span>Checked Out</span>
					</label>
				</div>
			</div>
		</div>

		<!-- Dialog Footer -->
		<Dialog.Footer class="p-6 pt-0">
			<Button
				onclick={executePrintReport}
				disabled={printableVisitors.length === 0}
				class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<PrinterIcon data-icon="inline-start" />
				<span>Generate & Print ({printableVisitors.length} Entries)</span>
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
