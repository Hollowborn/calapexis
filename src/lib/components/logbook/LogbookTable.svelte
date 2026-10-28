<script lang="ts">
	import { getContext } from "svelte";
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import { createColumnHelper } from "@tanstack/table-core";
	import type { Visitor } from "$lib/types";
	import { checkoutLocalVisitor } from "$lib/supabase";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { toast } from "svelte-sonner";

	import DownloadIcon from "@lucide/svelte/icons/download";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import ZoomInIcon from "@lucide/svelte/icons/zoom-in";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";

	import VisitorPassBadge from "$lib/components/visitor-pass-badge.svelte";
	import LogbookPrintModal from "$lib/components/logbook/LogbookPrintModal.svelte";

	interface Props {
		visitors: any[];
		role?: string;
		officeId?: string | null;
		officeName?: string | null;
		generatedBy?: string;
		title?: string;
		subtitle?: string;
		showPageHeader?: boolean;
	}

	let {
		visitors = [],
		role = "admin",
		officeId = null,
		officeName = "",
		generatedBy = "Desk Officer",
		title = "Logbook Records",
		subtitle = "Historical visitor transactions and audit logs",
		showPageHeader = true
	}: Props = $props();

	const dashboardContext = getContext<any>("dashboard-state");

	let selectedDate = $state("");
	let isPhotoModalOpen = $state(false);
	let selectedVisitorPhoto = $state<any | null>(null);

	let isPassBadgeOpen = $state(false);
	let selectedBadgeVisitor = $state<Visitor | null>(null);

	let isPrintModalOpen = $state(false);

	function openVisitorPhotoModal(visitor: any) {
		selectedVisitorPhoto = visitor;
		isPhotoModalOpen = true;
	}

	function openPassBadge(visitor: Visitor) {
		selectedBadgeVisitor = visitor;
		isPassBadgeOpen = true;
	}

	let filteredVisitors = $derived.by(() => {
		let list = visitors || [];

		// If officeId is specified (e.g. staff desk), scope to that office
		if (officeId) {
			list = list.filter((v: any) => v.officeId === officeId);
		}

		if (selectedDate) {
			list = list.filter((v: any) => {
				if (!v.checkInTime) return false;
				const dateStr = new Date(v.checkInTime).toISOString().split("T")[0];
				return dateStr === selectedDate;
			});
		}

		return list;
	});

	function exportToCSV() {
		if (!filteredVisitors || filteredVisitors.length === 0) {
			toast.info("No visitor logs available to export.");
			return;
		}

		const headers = ["Pass Code", "Full Name", "Office", "Building", "Purpose", "Status", "Check-In Time", "Check-Out Time"];
		const rows = filteredVisitors.map((v: any) => [
			`"${v.passCode || ''}"`,
			`"${(v.fullName || '').replace(/"/g, '""')}"`,
			`"${(v.officeName || officeName || '').replace(/"/g, '""')}"`,
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
		link.setAttribute("download", `visitor_logs_${officeName ? officeName.toLowerCase().replace(/\s+/g, '_') + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success(`Exported ${filteredVisitors.length} visitor records to CSV spreadsheet.`);
	}

	// TanStack Columns Setup
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
			header: "Destination",
			cell: ({ row }) => renderSnippet(buildingBadge, { visitor: row.original })
		}),

		// 5. Purpose
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
			cell: ({ getValue }) => renderSnippet(timestampCell, { time: getValue() || "" })
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

	function formatTime(isoString: string): string {
		if (!isoString) return "-";
		return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}

	function formatDate(isoString: string): string {
		if (!isoString) return "-";
		return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
	}
</script>

{#snippet selectAllCheckbox({ table }: { table: any })}
	<div class="px-1">
		<input
			type="checkbox"
			checked={table.getIsAllPageRowsSelected()}
			indeterminate={table.getIsSomePageRowsSelected()}
			onchange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
			class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer align-middle"
			aria-label="Select all rows"
		/>
	</div>
{/snippet}

{#snippet selectRowCheckbox({ row }: { row: any })}
	<div class="px-1">
		<input
			type="checkbox"
			checked={row.getIsSelected()}
			disabled={!row.getCanSelect()}
			onchange={(e) => row.toggleSelected(e.currentTarget.checked)}
			class="rounded border-border size-4 text-primary focus:ring-primary cursor-pointer align-middle"
			aria-label="Select row"
		/>
	</div>
{/snippet}

{#snippet passCodeCell({ row }: { row: any })}
	<button
		type="button"
		onclick={() => openPassBadge(row.original)}
		class="font-mono text-xs font-black text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer text-left flex items-center gap-1.5"
		title="Click to view full digital pass"
	>
		<span>{row.original.passCode || 'PASS'}</span>
	</button>
{/snippet}

{#snippet visitorNameCell({ visitor }: { visitor: any })}
	<div class="flex items-center gap-2.5 py-0.5">
		<button
			type="button"
			onclick={() => openVisitorPhotoModal(visitor)}
			class="relative size-8 rounded-full overflow-hidden border border-border shrink-0 group cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
			title="Enlarge face verification photo"
		>
			<img
				src={visitor.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(visitor.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`}
				alt={visitor.fullName}
				class="size-full object-cover group-hover:scale-110 transition-transform duration-300"
			/>
			<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
				<ZoomInIcon class="size-3 text-white pointer-events-none" />
			</div>
		</button>
		<div class="flex flex-col min-w-0">
			<span class="font-bold text-xs text-foreground truncate">{visitor.fullName}</span>
			{#if visitor.email || visitor.phone}
				<span class="text-[10px] text-muted-foreground truncate">{visitor.email || visitor.phone}</span>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet buildingBadge({ visitor }: { visitor: any })}
	{@const name = visitor.buildingName || visitor.officeName || officeName || "General"}
	{@const colorCycle = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"]}
	{@const hash = name.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)}
	{@const colorVar = colorCycle[hash % colorCycle.length]}
	<Badge
		variant="outline"
		style="background-color: oklch(from var({colorVar}) l c h / 0.12); border-color: oklch(from var({colorVar}) l c h / 0.3); color: var({colorVar});"
		class="text-[10px] font-black uppercase tracking-wider rounded-xl px-2 py-0.5"
	>
		{name}
	</Badge>
{/snippet}

{#snippet purposeCell({ purpose }: { purpose: any })}
	<div class="text-xs text-muted-foreground max-w-[200px] truncate font-medium" title={purpose}>
		{purpose || "-"}
	</div>
{/snippet}

{#snippet timestampCell({ time }: { time: any })}
	{#if time}
		<div class="flex flex-col">
			<span class="font-mono text-xs font-bold text-foreground">{formatTime(time)}</span>
			<span class="text-[9.5px] text-muted-foreground font-medium">{formatDate(time)}</span>
		</div>
	{:else}
		<span class="text-xs text-muted-foreground/60 italic">-</span>
	{/if}
{/snippet}

{#snippet statusBadge({ visitor }: { visitor: any })}
	{#if visitor.status === "pre_pass"}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
			<span class="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
			<span>Pre-Pass</span>
		</span>
	{:else if visitor.status === "checked_out"}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border text-muted-foreground">
			Checked Out
		</span>
	{:else if visitor.verificationStatus === "rejected"}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/30">
			Declined
		</span>
	{:else if visitor.roomCheckInTime}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/30 animate-pulse">
			In Office
		</span>
	{:else}
		<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
			On Campus
		</span>
	{/if}
{/snippet}

{#snippet actionsHeader()}
	<span class="text-right block w-full pr-4 text-xs font-bold text-muted-foreground">Actions</span>
{/snippet}

{#snippet rowActions({ visitor }: { visitor: any })}
	<div class="text-right pr-2">
		{#if visitor.status === "checked_in"}
			<Button
				variant="ghost"
				size="sm"
				onclick={async () => {
					const updated = await checkoutLocalVisitor(visitor.id);
					if (updated) {
						toast.info(`Visitor ${updated.fullName} checked out successfully.`);
						if (dashboardContext?.loadData) await dashboardContext.loadData();
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

{#snippet bulkActionsSnippet({ selectedRows }: { selectedRows: any[] })}
	<Button
		variant="outline"
		size="sm"
		onclick={async () => {
			const checkedInRows = selectedRows.filter((r: any) => r.status === "checked_in");
			if (checkedInRows.length === 0) {
				toast.info("No active visitors among selected rows.");
				return;
			}
			const promises = checkedInRows.map((r: any) => checkoutLocalVisitor(r.id));
			await Promise.all(promises);
			toast.success(`Bulk checked out ${checkedInRows.length} active visitors.`);
			if (dashboardContext?.loadData) await dashboardContext.loadData();
		}}
		class="h-8 text-xs font-bold gap-1 rounded-lg border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
	>
		Bulk Checkout
	</Button>
{/snippet}

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
				onclick={() => (selectedDate = "")}
				class="h-9 text-[11px] font-extrabold text-muted-foreground hover:text-foreground cursor-pointer px-2"
			>
				Clear Date
			</Button>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-5 w-full">
	{#if showPageHeader}
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
			<div>
				<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">{title}</h1>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">{subtitle}</p>
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={exportToCSV}
					class="h-9 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-accent cursor-pointer shadow-2xs"
				>
					<DownloadIcon class="size-3.5 pointer-events-none" />
					<span>Export CSV</span>
				</Button>

				<Button
					variant="default"
					size="sm"
					onclick={() => (isPrintModalOpen = true)}
					class="h-9 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer shadow-2xs"
				>
					<PrinterIcon class="size-3.5 pointer-events-none" />
					<span>Print Audit Report</span>
				</Button>
			</div>
		</div>
	{:else}
		<div class="flex items-center justify-between gap-3 pb-2">
			<div>
				<h2 class="text-sm font-extrabold text-foreground tracking-tight">{title}</h2>
				<p class="text-[11px] text-muted-foreground font-semibold">{subtitle}</p>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={exportToCSV}
					class="h-8 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-accent cursor-pointer"
				>
					<DownloadIcon class="size-3.5 pointer-events-none" />
					<span>Export CSV</span>
				</Button>

				<Button
					variant="default"
					size="sm"
					onclick={() => (isPrintModalOpen = true)}
					class="h-8 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer"
				>
					<PrinterIcon class="size-3.5 pointer-events-none" />
					<span>Print Report</span>
				</Button>
			</div>
		</div>
	{/if}

	<!-- Mount TanStack DataTable -->
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

					<div class="grid grid-cols-2 gap-2 text-xs w-full bg-muted/40 p-3 rounded-2xl border border-border/60">
						<div>
							<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Destination:</span>
							<div class="font-extrabold text-foreground truncate">{selectedVisitorPhoto.buildingName || selectedVisitorPhoto.officeName || officeName || 'General Campus'}</div>
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

<!-- Print & Export Report Options Modal -->
<LogbookPrintModal
	bind:open={isPrintModalOpen}
	visitors={filteredVisitors}
	defaultOfficeName={officeName || undefined}
	{generatedBy}
/>
