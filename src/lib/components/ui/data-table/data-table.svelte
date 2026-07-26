<script lang="ts" generics="TData, TValue">
	import { type ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, type SortingState, type ColumnFiltersState, type RowSelectionState } from "@tanstack/table-core";
	import { type Snippet } from "svelte";
	import { createSvelteTable, FlexRender } from "./index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import SearchIcon from "@lucide/svelte/icons/search";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ChevronsLeftIcon from "@lucide/svelte/icons/chevrons-left";
	import ChevronsRightIcon from "@lucide/svelte/icons/chevrons-right";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";

	interface Props {
		data: TData[];
		columns: ColumnDef<TData, TValue>[];
		searchColumn?: string;
		searchPlaceholder?: string;
		bulkActions?: Snippet<[{ selectedRows: TData[] }]>;
		customToolbar?: Snippet;
	}

	let {
		data = [],
		columns = [],
		searchColumn = "",
		searchPlaceholder = "Search logs...",
		bulkActions,
		customToolbar
	}: Props = $props();

	// Local states for TanStack Table
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let pagination = $state({ pageIndex: 0, pageSize: 10 });
	let globalFilter = $state("");

	function handleSearch(value: string) {
		globalFilter = value;
		if (searchColumn) {
			table.getColumn(searchColumn)?.setFilterValue(value);
		} else {
			table.setGlobalFilter(value);
		}
	}

	// Instantiate TanStack Table using createSvelteTable helper
	const table = createSvelteTable({
		get data() { return data; },
		get columns() { return columns; },
		state: {
			get sorting() { return sorting; },
			get columnFilters() { return columnFilters; },
			get rowSelection() { return rowSelection; },
			get pagination() { return pagination; }
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') sorting = updater(sorting);
			else sorting = updater;
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') columnFilters = updater(columnFilters);
			else columnFilters = updater;
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') rowSelection = updater(rowSelection);
			else rowSelection = updater;
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') pagination = updater(pagination);
			else pagination = updater;
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableRowSelection: true
	});

	let selectedCount = $derived(Object.keys(rowSelection).length);
</script>

<div class="space-y-4 w-full">
	<!-- Toolbar Section -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="relative max-w-sm w-full">
			<SearchIcon class="absolute left-3.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
			<Input
				type="text"
				placeholder={searchPlaceholder}
				value={globalFilter}
				oninput={(e) => handleSearch(e.currentTarget.value)}
				class="pl-10 h-10 w-full rounded-xl bg-background border-border/80 focus-visible:ring-primary/20 text-xs font-medium"
			/>
		</div>

		<div class="flex items-center gap-2">
			{#if customToolbar}
				{@render customToolbar()}
			{/if}
		</div>
	</div>

	<!-- Bulk Selection Banner Overlay -->
	{#if selectedCount > 0}
		<div class="flex items-center justify-between px-5 py-3 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-bold shadow-xs animate-in fade-in duration-300">
			<div class="flex items-center gap-2">
				<span class="size-2 rounded-full bg-primary animate-pulse"></span>
				<span>{selectedCount} row{selectedCount > 1 ? 's' : ''} selected</span>
			</div>
			
			<div class="flex items-center gap-3">
				{#if bulkActions}
					{@render bulkActions({ selectedRows: table.getSelectedRowModel().flatRows.map(r => r.original) })}
				{/if}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => table.resetRowSelection()}
					class="h-8 text-[11px] font-bold text-primary hover:text-primary-foreground hover:bg-primary/95 rounded-lg border border-primary/30"
				>
					Clear Selection
				</Button>
			</div>
		</div>
	{/if}

	<!-- Table Component viewport container -->
	<div class="w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
		<Table.Root>
			<Table.Header class="bg-muted/50 border-b border-border/60">
				{#each table.getHeaderGroups() as headerGroup}
					<Table.Row class="hover:bg-transparent">
						{#each headerGroup.headers as header}
							<Table.Head class="px-6 py-4">
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body class="divide-y divide-border/60">
				{#if table.getRowModel().rows.length > 0}
					{#each table.getRowModel().rows as row}
						<Table.Row
							class="hover:bg-muted/30 transition-colors data-[state=selected]:bg-primary/5"
							data-state={row.getIsSelected() ? "selected" : undefined}
						>
							{#each row.getVisibleCells() as cell}
								<Table.Cell class="px-6 py-4 font-medium text-foreground">
									<FlexRender
										content={cell.column.columnDef.cell}
										context={cell.getContext()}
									/>
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={columns.length} class="h-40 text-center text-muted-foreground text-xs font-semibold">
							No records found matching filters.
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination Controls Toolbar -->
	<div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1">
		<div class="text-[11px] text-muted-foreground font-bold flex items-center gap-1.5">
			<span>Total rows: {data.length}</span>
			<span class="text-border/80 font-normal">|</span>
			<span>{table.getFilteredRowModel().rows.length} filtered</span>
		</div>

		<div class="flex flex-wrap items-center gap-4 sm:gap-6 justify-end">
			<!-- Row count Selector -->
			<div class="flex items-center gap-2">
				<span class="text-[11px] text-muted-foreground font-bold">Rows per page:</span>
				<Select.Root
					type="single"
					value={String(pagination.pageSize)}
					onValueChange={(val) => table.setPageSize(Number(val))}
				>
					<Select.Trigger class="w-[75px] h-8 text-xs font-semibold rounded-lg bg-background border-border/80 hover:bg-muted/40 cursor-pointer">
						<span>{pagination.pageSize}</span>
					</Select.Trigger>
					<Select.Content class="rounded-lg border border-border bg-card/90 backdrop-blur-md">
						<Select.Group>
							{#each [5, 10, 20, 30, 45, 60] as size}
								<Select.Item value={String(size)} label={String(size)}>
									{size}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Page Jump Details -->
			<div class="text-[11px] text-muted-foreground font-bold">
				Page {pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
			</div>

			<!-- Page Buttons -->
			<div class="flex items-center gap-1">
				<Button
					variant="outline"
					size="icon"
					onclick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
					class="size-8 rounded-lg border-border/80 hover:bg-muted/50 cursor-pointer"
					aria-label="First Page"
				>
					<ChevronsLeftIcon class="size-4 pointer-events-none" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onclick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					class="size-8 rounded-lg border-border/80 hover:bg-muted/50 cursor-pointer"
					aria-label="Previous Page"
				>
					<ChevronLeftIcon class="size-4 pointer-events-none" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onclick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
					class="size-8 rounded-lg border-border/80 hover:bg-muted/50 cursor-pointer"
					aria-label="Next Page"
				>
					<ChevronRightIcon class="size-4 pointer-events-none" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onclick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
					class="size-8 rounded-lg border-border/80 hover:bg-muted/50 cursor-pointer"
					aria-label="Last Page"
				>
					<ChevronsRightIcon class="size-4 pointer-events-none" />
				</Button>
			</div>
		</div>
	</div>
</div>
