<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Alert from "$lib/components/ui/alert/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { toast } from "svelte-sonner";
	import { exportAuditLogsToDocx, exportAuditLogsToPdf } from "$lib/report-export";

	import PrinterIcon from "@lucide/svelte/icons/printer";
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import FileDownIcon from "@lucide/svelte/icons/file-down";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import AlertTriangleIcon from "@lucide/svelte/icons/triangle-alert";
	import RectangleHorizontalIcon from "@lucide/svelte/icons/rectangle-horizontal";
	import RectangleVerticalIcon from "@lucide/svelte/icons/rectangle-vertical";

	interface Props {
		open: boolean;
		visitors: any[];
		defaultOfficeName?: string;
		generatedBy?: string;
	}

	let {
		open = $bindable(false),
		visitors = [],
		defaultOfficeName = "",
		generatedBy = "Desk Officer"
	}: Props = $props();

	let printModalTab = $state<"configure" | "review">("configure");
	let printDateMode = $state<"today" | "specific" | "range" | "week" | "month" | "all">("today");
	let printOrientation = $state<"landscape" | "portrait">("landscape");
	let printStartDate = $state(new Date().toISOString().split("T")[0]);
	let printEndDate = $state(new Date().toISOString().split("T")[0]);

	let printColumns = $state({
		fullName: true,
		officeName: true,
		purpose: true,
		checkInTime: true,
		checkOutTime: true
	});

	let isExportingDocx = $state(false);
	let isExportingPdf = $state(false);

	function formatTimeOnly(isoString: string): string {
		if (!isoString) return "-";
		const d = new Date(isoString);
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function formatCheckOutTime(checkInIso: string, checkOutIso: string | null | undefined, status: string): string {
		if (!checkOutIso) {
			return status === "checked_in" ? "Still In" : "-";
		}
		const inDate = new Date(checkInIso).toISOString().split("T")[0];
		const outDate = new Date(checkOutIso).toISOString().split("T")[0];
		const timeStr = formatTimeOnly(checkOutIso);

		if (inDate !== outDate) {
			const dateStr = new Date(checkOutIso).toLocaleDateString([], { month: "short", day: "numeric" });
			return `${dateStr}, ${timeStr}`;
		}
		return timeStr;
	}

	let printableVisitors = $derived.by(() => {
		let list = visitors || [];
		const now = new Date();
		const todayStr = now.toISOString().split("T")[0];

		if (printDateMode === "today") {
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime).toISOString().split("T")[0] === todayStr);
		} else if (printDateMode === "specific" && printStartDate) {
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime).toISOString().split("T")[0] === printStartDate);
		} else if (printDateMode === "range" && printStartDate && printEndDate) {
			list = list.filter((v: any) => {
				if (!v.checkInTime) return false;
				const d = new Date(v.checkInTime).toISOString().split("T")[0];
				return d >= printStartDate && d <= printEndDate;
			});
		} else if (printDateMode === "week") {
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime) >= sevenDaysAgo);
		} else if (printDateMode === "month") {
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			list = list.filter((v: any) => v.checkInTime && new Date(v.checkInTime) >= startOfMonth);
		}
		return list;
	});

	let groupedPrintableVisitors = $derived.by(() => {
		const map = new Map<string, any[]>();

		for (const v of printableVisitors) {
			const dateStr = v.checkInTime
				? new Date(v.checkInTime).toISOString().split("T")[0]
				: "Unscheduled";
			if (!map.has(dateStr)) {
				map.set(dateStr, []);
			}
			map.get(dateStr)!.push(v);
		}

		const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

		return sortedDates.map((dateStr) => {
			let dateLabel = "Unscheduled Logs";
			if (dateStr !== "Unscheduled") {
				const [year, month, day] = dateStr.split("-").map(Number);
				if (year && month && day) {
					const d = new Date(year, month - 1, day);
					dateLabel = d.toLocaleDateString("en-US", {
						weekday: "long",
						month: "short",
						day: "numeric"
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

	function generateReportBodyHTML(): string {
		const scopeLabel = printDateMode.toUpperCase();
		const totalEntries = printableVisitors.length;
		const generatedTime = new Date().toLocaleString();
		const headerTitle = defaultOfficeName ? `${defaultOfficeName.toUpperCase()} - VISITOR LOGS` : "OFFICIAL VISITOR COMPLIANCE AUDIT REPORT";

		const baseWeights = {
			fullName: 26,
			officeName: 22,
			purpose: 34,
			checkInTime: 9,
			checkOutTime: 9
		};

		const totalActiveWeight =
			(printColumns.fullName ? baseWeights.fullName : 0) +
			(printColumns.officeName ? baseWeights.officeName : 0) +
			(printColumns.purpose ? baseWeights.purpose : 0) +
			(printColumns.checkInTime ? baseWeights.checkInTime : 0) +
			(printColumns.checkOutTime ? baseWeights.checkOutTime : 0) || 1;

		const colPct = {
			fullName: Math.round((baseWeights.fullName / totalActiveWeight) * 100),
			officeName: Math.round((baseWeights.officeName / totalActiveWeight) * 100),
			purpose: Math.round((baseWeights.purpose / totalActiveWeight) * 100),
			checkInTime: Math.round((baseWeights.checkInTime / totalActiveWeight) * 100),
			checkOutTime: Math.round((baseWeights.checkOutTime / totalActiveWeight) * 100)
		};

		let tableHeaders = "";
		if (printColumns.fullName) tableHeaders += `<th style="width: ${colPct.fullName}%; padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">Visitor Name</th>`;
		if (printColumns.officeName) tableHeaders += `<th style="width: ${colPct.officeName}%; padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">Office / Desk</th>`;
		if (printColumns.purpose) tableHeaders += `<th style="width: ${colPct.purpose}%; padding: 8px 10px; border: 1px solid #a1a1aa; text-align: left; word-wrap: break-word; overflow-wrap: break-word;">Purpose of Visit</th>`;
		if (printColumns.checkInTime) tableHeaders += `<th style="width: ${colPct.checkInTime}%; padding: 8px 10px; border: 1px solid #a1a1aa; text-align: center; white-space: nowrap; word-wrap: break-word; overflow-wrap: break-word;">Time In</th>`;
		if (printColumns.checkOutTime) tableHeaders += `<th style="width: ${colPct.checkOutTime}%; padding: 8px 10px; border: 1px solid #a1a1aa; text-align: center; white-space: nowrap; word-wrap: break-word; overflow-wrap: break-word;">Time Out</th>`;

		let tableBody = "";
		if (groupedPrintableVisitors.length === 0) {
			tableBody = `<tr><td colspan="${activeColumnCount}" style="padding: 24px; text-align: center; color: #71717a; font-style: italic; font-weight: 600;">No visitor log records found for the selected date scope.</td></tr>`;
		} else {
			for (const group of groupedPrintableVisitors) {
				tableBody += `
					<tr style="background-color: #e4e4e7; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-top: 2px solid #71717a; border-bottom: 1px solid #a1a1aa;">
						<td colspan="${activeColumnCount}" style="padding: 8px 10px; font-weight: 900; font-size: 11.5px; color: #09090b; letter-spacing: 0.2px;">
							 ${group.dateLabel} &nbsp;•&nbsp; <span style="font-weight: 700; font-size: 10.5px; color: #52525b;">${group.visitors.length} ${group.visitors.length === 1 ? 'Record' : 'Records'}</span>
						</td>
					</tr>
				`;

				for (let i = 0; i < group.visitors.length; i++) {
					const v = group.visitors[i];
					const bg = i % 2 === 1 ? "#f4f4f5" : "#ffffff";
					const checkInStr = v.checkInTime ? formatTimeOnly(v.checkInTime) : "-";
					const checkOutStr = formatCheckOutTime(v.checkInTime, v.checkOutTime, v.status);

					tableBody += `
						<tr style="background-color: ${bg}; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-bottom: 1px solid #e4e4e7; page-break-inside: avoid;">
							${printColumns.fullName ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; font-weight: 700; color: #09090b; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">${v.fullName || ''}</td>` : ''}
							${printColumns.officeName ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; color: #18181b; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">${v.officeName || defaultOfficeName || 'General Campus'}</td>` : ''}
							${printColumns.purpose ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; color: #27272a; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">${v.purpose || '-'}</td>` : ''}
							${printColumns.checkInTime ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; font-family: monospace; font-weight: 700; font-size: 10px; text-align: center; white-space: nowrap; color: #09090b;">${checkInStr}</td>` : ''}
							${printColumns.checkOutTime ? `<td style="padding: 7px 10px; border: 1px solid #d4d4d8; font-family: monospace; font-weight: 700; font-size: 10px; text-align: center; white-space: nowrap; color: #09090b;">${checkOutStr}</td>` : ''}
						</tr>
					`;
				}
			}
		}

		const dateRangeText = printDateMode === "today"
			? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
			: (printStartDate ? `${printStartDate} ${printEndDate ? "to " + printEndDate : ""}` : "All Dates");

		return `
			<div class="report-wrapper" style="width: 100%; max-width: 100%; margin: 0 auto;">
				<div style="margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 6px; page-break-inside: avoid;">
					<img src="/bisu_header_banner.png" alt="Bohol Island State University" style="width: 100%; max-height: 85px; object-fit: contain; object-position: center; display: block; margin: 0 auto 6px;" onerror="this.onerror=null; this.src='/header.png';" />
					<div style="text-align: center;">
						<h2 style="font-size: 13px; font-weight: 900; margin: 0 0 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #09090b;">${headerTitle}</h2>
						<div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; color: #52525b; margin-top: 4px; padding: 5px 8px; background: #f4f4f5; border: 1px solid #d4d4d8; border-radius: 4px;">
							<span>Scope: <strong style="color: #000;">${scopeLabel}</strong></span>
							<span>Date Range: <strong style="color: #000;">${dateRangeText}</strong></span>
							<span>Records: <strong style="color: #000;">${totalEntries}</strong></span>
							<span>Generated: ${generatedTime}</span>
						</div>
					</div>
				</div>

				<table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 6px; font-size: 10.5px;">
					<thead>
						<tr style="background-color: #f4f4f5; border-bottom: 2px solid #71717a;">
							${tableHeaders}
						</tr>
					</thead>
					<tbody>
						${tableBody}
					</tbody>
				</table>

				<div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #d4d4d8; font-size: 9px; color: #71717a; display: flex; justify-content: space-between; font-weight: 600; page-break-inside: avoid;">
					<div>F-ADF-ADM-011 | Rev. 2 | 07/01/24 | Page 1 of 1</div>
					<div>BISU Calape Campus Visitor Logbook</div>
				</div>
			</div>
		`;
	}

	function generatePrintableReportHTML(): string {
		const scopeLabel = printDateMode.toUpperCase();
		const totalEntries = printableVisitors.length;
		const innerContent = generateReportBodyHTML();

		return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>Visitor Compliance Audit Report - BISU Calape</title>
	<style>
		@page {
			size: ${printOrientation};
			margin: ${printOrientation === 'landscape' ? '8mm 10mm' : '12mm'};
		}
		* { box-sizing: border-box; }
		html, body {
			width: 100%;
			margin: 0;
			padding: 0;
			background: #fff;
			color: #000;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
			border-bottom: 1px solid #d4d4d8;
			padding: 10px 16px;
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
		.report-container {
			width: 100%;
			max-width: 100%;
			padding: 0 16px 24px 16px;
		}
		table {
			width: 100%;
			table-layout: fixed;
			border-collapse: collapse;
		}
		th, td {
			word-wrap: break-word;
			overflow-wrap: break-word;
		}
		th {
			background-color: #f4f4f5;
			font-weight: 800;
			text-transform: uppercase;
			font-size: 9.5px;
			color: #09090b;
		}
		@media print {
			@page {
				size: ${printOrientation};
				margin: ${printOrientation === 'landscape' ? '8mm 10mm' : '12mm'};
			}
			html, body {
				width: 100% !important;
				min-width: 100% !important;
				max-width: 100% !important;
				margin: 0 !important;
				padding: 0 !important;
			}
			.toolbar { display: none !important; }
			.report-container {
				width: 100% !important;
				max-width: 100% !important;
				padding: 0 !important;
			}
			table {
				width: 100% !important;
				table-layout: fixed !important;
			}
		}
	</style>
</head>
<body>
	<div class="toolbar">
		<span style="font-weight: 700; font-size: 11px; color: #27272a;">
			🖨️ Ready to print (${printOrientation.toUpperCase()}): <strong>${totalEntries} ${totalEntries === 1 ? 'Record' : 'Records'}</strong> (${scopeLabel})
		</span>
		<div style="display: flex; gap: 8px;">
			<button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
			<button class="btn btn-outline" onclick="window.close()">Close Window</button>
		</div>
	</div>

	<div class="report-container">
		${innerContent}
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

	async function handleExportDocx() {
		if (printableVisitors.length === 0) {
			toast.error("No visitor log records found for the selected date filter.");
			return;
		}
		isExportingDocx = true;
		try {
			const scopeText = printDateMode.toUpperCase();
			const dateRangeText = printDateMode === "today"
				? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
				: (printStartDate ? `${printStartDate} ${printEndDate ? "to " + printEndDate : ""}` : "All Dates");

			const res = await exportAuditLogsToDocx(printableVisitors, {
				scopeLabel: scopeText,
				dateRange: dateRangeText,
				generatedBy,
				columns: printColumns
			});
			toast.success(`Generated and downloaded ${res.filename}`);
			open = false;
		} catch (err: any) {
			toast.error(err?.message || "Failed to generate Word document.");
		} finally {
			isExportingDocx = false;
		}
	}

	async function handleExportPdf() {
		if (printableVisitors.length === 0) {
			toast.error("No visitor log records found for the selected date filter.");
			return;
		}
		isExportingPdf = true;
		try {
			const scopeText = printDateMode.toUpperCase();
			const dateRangeText = printDateMode === "today"
				? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
				: (printStartDate ? `${printStartDate} ${printEndDate ? "to " + printEndDate : ""}` : "All Dates");

			const res = await exportAuditLogsToPdf(printableVisitors, {
				scopeLabel: scopeText,
				dateRange: dateRangeText,
				generatedBy,
				columns: printColumns,
				orientation: printOrientation
			});

			toast.success(`Generated and downloaded ${res.filename}`);
			open = false;
		} catch (err: any) {
			console.error("PDF generation error:", err);
			toast.error(err?.message || "Failed to generate PDF file.");
		} finally {
			isExportingPdf = false;
		}
	}

	function executePrintReport() {
		if (printableVisitors.length === 0) {
			toast.error("No visitor log records found for the selected date filter.");
			return;
		}
		open = false;

		const html = generatePrintableReportHTML();
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
		} else {
			toast.error("Pop-up blocked. Please allow pop-ups for this site to open print window.");
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="z-[2600] max-w-xl w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
		<!-- Header with 2-Step Progress Indicator -->
		<div class="p-5 sm:p-6 pb-4 border-b border-border/80 bg-muted/20 flex flex-col gap-3 shrink-0">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
						<PrinterIcon class="size-4 pointer-events-none" />
					</div>
					<div>
						<Dialog.Title class="text-base font-black text-foreground">
							Print & Export Visitor Logbook
						</Dialog.Title>
						<Dialog.Description class="text-xs font-semibold text-muted-foreground">
							{defaultOfficeName ? `${defaultOfficeName} Audit Reports` : "Official Campus Logbook Documentation"}
						</Dialog.Description>
					</div>
				</div>
			</div>

			<!-- Tab Switcher Navigation -->
			<div class="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold w-full">
				<button
					type="button"
					onclick={() => (printModalTab = "configure")}
					class="flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer {printModalTab === 'configure' ? 'bg-card text-foreground shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'}"
				>
					1. Filter & Columns
				</button>
				<button
					type="button"
					onclick={() => {
						if (printableVisitors.length > 0) printModalTab = "review";
					}}
					disabled={printableVisitors.length === 0}
					class="flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer disabled:opacity-40 {printModalTab === 'review' ? 'bg-card text-foreground shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'}"
				>
					2. Review & Export
				</button>
			</div>
		</div>

		<!-- Scrollable Tab Content Area -->
		<div class="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-xs flex-1">
			{#if printModalTab === "configure"}
				<!-- Date Filter Section -->
				<div class="flex flex-col gap-2.5">
					<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
						1. Date Range Filter
					</span>

					<div class="flex flex-col gap-3 p-3.5 rounded-2xl border border-border bg-muted/30">
						<div class="grid grid-cols-3 gap-1.5">
							<Button
								type="button"
								size="sm"
								variant={printDateMode === "today" ? "default" : "outline"}
								onclick={() => (printDateMode = "today")}
								class="h-8 text-xs font-bold rounded-xl"
							>
								Today
							</Button>
							<Button
								type="button"
								size="sm"
								variant={printDateMode === "week" ? "default" : "outline"}
								onclick={() => (printDateMode = "week")}
								class="h-8 text-xs font-bold rounded-xl"
							>
								This Week
							</Button>
							<Button
								type="button"
								size="sm"
								variant={printDateMode === "month" ? "default" : "outline"}
								onclick={() => (printDateMode = "month")}
								class="h-8 text-xs font-bold rounded-xl"
							>
								This Month
							</Button>
							<Button
								type="button"
								size="sm"
								variant={printDateMode === "specific" ? "default" : "outline"}
								onclick={() => (printDateMode = "specific")}
								class="h-8 text-xs font-bold rounded-xl"
							>
								Specific Date
							</Button>
							<Button
								type="button"
								size="sm"
								variant={printDateMode === "range" ? "default" : "outline"}
								onclick={() => (printDateMode = "range")}
								class="h-8 text-xs font-bold rounded-xl"
							>
								Date Range
							</Button>
							<Button
								type="button"
								size="sm"
								variant={printDateMode === "all" ? "default" : "outline"}
								onclick={() => (printDateMode = "all")}
								class="h-8 text-xs font-bold rounded-xl"
							>
								All Records
							</Button>
						</div>

						{#if printDateMode === "specific"}
							<Separator />
							<div class="flex flex-col gap-1.5 pt-1">
								<span class="text-[10px] text-muted-foreground font-semibold">Select Target Date</span>
								<Input
									type="date"
									bind:value={printStartDate}
									class="h-9 text-xs font-bold rounded-xl bg-background"
								/>
							</div>
						{:else if printDateMode === "range"}
							<Separator />
							<div class="grid grid-cols-2 gap-2 pt-1">
								<div class="flex flex-col gap-1.5">
									<span class="text-[10px] text-muted-foreground font-semibold">Start Date</span>
									<Input
										type="date"
										bind:value={printStartDate}
										class="h-9 text-xs font-bold rounded-xl bg-background"
									/>
								</div>
								<div class="flex flex-col gap-1.5">
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
					<Alert.Root variant="destructive" class="py-2.5 px-3.5 rounded-2xl">
						<AlertTriangleIcon class="size-4" />
						<Alert.Description class="text-xs font-semibold">
							No log entries match date scope ("{printDateMode}"). Select "All Records" or a different date range.
						</Alert.Description>
					</Alert.Root>
				{/if}

				<!-- Column Selector Checkboxes -->
				<div class="flex flex-col gap-2.5">
					<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
						2. Printable Columns
					</span>

					<div class="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl border border-border bg-muted/30">
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

				<!-- 3. Paper Orientation Selection -->
				<div class="flex flex-col gap-2.5">
					<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
						3. Paper Orientation
					</span>

					<div class="grid grid-cols-2 gap-2">
						<Button
							type="button"
							size="sm"
							variant={printOrientation === "landscape" ? "default" : "outline"}
							onclick={() => (printOrientation = "landscape")}
							class="h-9 text-xs font-bold rounded-xl gap-2 cursor-pointer {printOrientation === 'landscape' ? 'bg-primary text-primary-foreground font-black shadow-xs' : 'border-border hover:bg-muted text-muted-foreground'}"
						>
							<RectangleHorizontalIcon class="size-4 pointer-events-none" />
							<span>Landscape (Default)</span>
						</Button>

						<Button
							type="button"
							size="sm"
							variant={printOrientation === "portrait" ? "default" : "outline"}
							onclick={() => (printOrientation = "portrait")}
							class="h-9 text-xs font-bold rounded-xl gap-2 cursor-pointer {printOrientation === 'portrait' ? 'bg-primary text-primary-foreground font-black shadow-xs' : 'border-border hover:bg-muted text-muted-foreground'}"
						>
							<RectangleVerticalIcon class="size-4 pointer-events-none" />
							<span>Portrait</span>
						</Button>
					</div>
				</div>
			{:else}
				<!-- Tab 2: Print & Review -->
				<div class="p-4 rounded-2xl border border-border bg-muted/30 flex flex-col gap-3">
					<div class="flex items-center justify-between flex-wrap gap-2">
						<div>
							<span class="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">Active Scope</span>
							<span class="text-sm font-black text-foreground capitalize">{printDateMode} ({printableVisitors.length} total entries)</span>
						</div>
						<div class="flex items-center gap-1.5 flex-wrap">
							<Badge variant="outline" class="text-[9px] uppercase font-mono font-black border-primary/40 text-primary">
								{printOrientation}
							</Badge>
							{#if printColumns.fullName}<Badge variant="secondary" class="text-[9px]">Name</Badge>{/if}
							{#if printColumns.officeName}<Badge variant="secondary" class="text-[9px]">Office</Badge>{/if}
							{#if printColumns.purpose}<Badge variant="secondary" class="text-[9px]">Purpose</Badge>{/if}
							{#if printColumns.checkInTime}<Badge variant="secondary" class="text-[9px]">Check-In</Badge>{/if}
							{#if printColumns.checkOutTime}<Badge variant="secondary" class="text-[9px]">Check-Out</Badge>{/if}
						</div>
					</div>
				</div>

				<!-- Live Preview Table Snippet -->
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between">
						<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
							Logbook Data Preview (First 5 of {printableVisitors.length})
						</span>
					</div>

					<div class="rounded-2xl border border-border bg-card overflow-hidden">
						<div class="max-h-40 overflow-y-auto">
							<table class="w-full text-left text-[10.5px]">
								<thead class="bg-muted sticky top-0 border-b border-border text-[9.5px] font-extrabold uppercase text-muted-foreground">
									<tr>
										{#if printColumns.fullName}<th class="p-2.5">Visitor</th>{/if}
										{#if printColumns.officeName}<th class="p-2.5">Office</th>{/if}
										{#if printColumns.purpose}<th class="p-2.5">Purpose</th>{/if}
										{#if printColumns.checkInTime}<th class="p-2.5">In</th>{/if}
										{#if printColumns.checkOutTime}<th class="p-2.5">Out</th>{/if}
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									{#each printableVisitors.slice(0, 5) as v}
										<tr class="hover:bg-muted/30">
											{#if printColumns.fullName}<td class="p-2.5 font-bold text-foreground">{v.fullName || '-'}</td>{/if}
											{#if printColumns.officeName}<td class="p-2.5 text-muted-foreground">{v.officeName || defaultOfficeName || 'General'}</td>{/if}
											{#if printColumns.purpose}<td class="p-2.5 text-muted-foreground max-w-[150px] truncate">{v.purpose || '-'}</td>{/if}
											{#if printColumns.checkInTime}<td class="p-2.5 font-mono text-[9.5px] text-foreground">{v.checkInTime ? formatTimeOnly(v.checkInTime) : '-'}</td>{/if}
											{#if printColumns.checkOutTime}<td class="p-2.5 font-mono text-[9.5px] text-foreground">{formatCheckOutTime(v.checkInTime, v.checkOutTime, v.status)}</td>{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<!-- Export Format Action Cards -->
				<div class="flex flex-col gap-2.5 pt-1">
					<span class="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
						Select Output Format & Generate
					</span>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						<!-- Word Document Option -->
						<button
							type="button"
							onclick={handleExportDocx}
							disabled={isExportingDocx || isExportingPdf}
							class="p-4 rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-xs hover:shadow-md disabled:opacity-50"
						>
							<div class="flex items-center justify-between">
								<div class="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
									<FileTextIcon class="size-4 pointer-events-none" />
								</div>
								{#if isExportingDocx}
									<span class="text-[10px] font-bold text-primary animate-pulse">Exporting...</span>
								{/if}
							</div>
							<div class="flex flex-col gap-0.5">
								<div class="font-black text-xs text-foreground group-hover:text-primary transition-colors">
									Word (.docx)
								</div>
								<div class="text-[10px] text-muted-foreground font-medium leading-tight">
									Fills .docx template with official headers & footers
								</div>
							</div>
						</button>

						<!-- PDF Document Option -->
						<button
							type="button"
							onclick={handleExportPdf}
							disabled={isExportingPdf || isExportingDocx}
							class="p-4 rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-xs hover:shadow-md disabled:opacity-50"
						>
							<div class="flex items-center justify-between">
								<div class="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
									<FileDownIcon class="size-4 pointer-events-none" />
								</div>
								{#if isExportingPdf}
									<span class="text-[10px] font-bold text-primary animate-pulse">Exporting...</span>
								{/if}
							</div>
							<div class="flex flex-col gap-0.5">
								<div class="font-black text-xs text-foreground group-hover:text-primary transition-colors">
									Download PDF (.pdf)
								</div>
								<div class="text-[10px] text-muted-foreground font-medium leading-tight">
									Vectorized A4 printable report document
								</div>
							</div>
						</button>

						<!-- Print Preview Option -->
						<button
							type="button"
							onclick={executePrintReport}
							disabled={isExportingDocx || isExportingPdf}
							class="p-4 rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-xs hover:shadow-md disabled:opacity-50"
						>
							<div class="flex items-center justify-between">
								<div class="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
									<PrinterIcon class="size-4 pointer-events-none" />
								</div>
							</div>
							<div class="flex flex-col gap-0.5">
								<div class="font-black text-xs text-foreground group-hover:text-primary transition-colors">
									Print Preview
								</div>
								<div class="text-[10px] text-muted-foreground font-medium leading-tight">
									Send directly to printer or browser print
								</div>
							</div>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Dialog Footer -->
		<Dialog.Footer class="p-5 sm:p-6 pt-0 border-t border-border mt-auto shrink-0 flex items-center justify-between gap-2">
			{#if printModalTab === "configure"}
				<Button
					type="button"
					variant="ghost"
					onclick={() => (open = false)}
					class="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
				>
					Cancel
				</Button>

				<Button
					type="button"
					onclick={() => (printModalTab = "review")}
					disabled={printableVisitors.length === 0}
					class="h-9 px-5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
				>
					<span>Next: Review & Export</span>
					<ChevronRightIcon data-icon="inline-end" class="size-4 shrink-0 pointer-events-none" />
				</Button>
			{:else}
				<Button
					type="button"
					variant="outline"
					onclick={() => (printModalTab = "configure")}
					class="h-9 px-4 text-xs font-bold rounded-xl gap-1.5 cursor-pointer border-border"
				>
					<ChevronLeftIcon data-icon="inline-start" class="size-4 shrink-0 pointer-events-none" />
					<span>Modify Filters</span>
				</Button>

				<Button
					type="button"
					variant="ghost"
					onclick={() => (open = false)}
					class="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
				>
					Close
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
