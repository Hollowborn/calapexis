# Reusable Svelte 5 DataTable Component Guide

We have created a feature-rich, highly configurable `DataTable` component wrapper leveraging Svelte 5 runes (`$state`, `$derived`, `$effect`) and TanStack Table core logic.

## Location
- Component: `src/lib/components/ui/data-table/data-table.svelte` (Exported as `Root` or `DataTable`)
- Column Sorting Header Helper: `src/lib/components/ui/data-table/data-table-column-header.svelte` (Exported as `ColumnHeader` or `DataTableColumnHeader`)
- Export Barrel: `src/lib/components/ui/data-table/index.ts`

---

## 1. Quick Start Usage Example

Here is how you can render a data table inside your pages with sorting, selection, search, pagination, custom badges, and actions.

```svelte
<script lang="ts">
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import type { ColumnDef } from "@tanstack/table-core";
	import { createColumnHelper } from "@tanstack/table-core";
	import { Button } from "$lib/components/ui/button/index.js";

	// 1. Define your data type
	type Visitor = {
		id: string;
		fullName: string;
		purpose: string;
		status: "checked_in" | "checked_out";
	};

	const mockVisitors: Visitor[] = [
		{ id: "1", fullName: "Alice Smith", purpose: "Registrar", status: "checked_in" },
		{ id: "2", fullName: "Bob Johnson", purpose: "Billing Inquiry", status: "checked_out" },
	];

	// 2. Setup Column definitions
	const columnHelper = createColumnHelper<Visitor>();

	const columns = [
		// Selection Column
		columnHelper.display({
			id: "select",
			header: ({ table }) => renderSnippet(selectAllCheckbox, { table }),
			cell: ({ row }) => renderSnippet(selectRowCheckbox, { row })
		}),
		
		// Sortable Column (using ColumnHeader helper)
		columnHelper.accessor("fullName", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column, title: "Visitor Name" }),
			cell: ({ getValue }) => getValue()
		}),

		columnHelper.accessor("purpose", {
			header: "Purpose of Visit",
			cell: ({ getValue }) => getValue()
		}),

		// Custom snippet-rendered cell for status
		columnHelper.accessor("status", {
			header: "Status",
			cell: ({ getValue }) => renderSnippet(statusBadge, { status: getValue() })
		}),

		// Actions column
		columnHelper.display({
			id: "actions",
			header: () => "Actions",
			cell: ({ row }) => renderSnippet(rowActions, { visitor: row.original })
		})
	];

	function handleBulkDelete(selected: Visitor[]) {
		console.log("Deleting rows:", selected);
	}
</script>

<!-- Checkbox Snippets -->
{#snippet selectAllCheckbox({ table })}
	<input
		type="checkbox"
		checked={table.getIsAllPageRowsSelected()}
		indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
		onchange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
		class="rounded border-border bg-background text-primary focus:ring-primary size-4 cursor-pointer transition-all"
	/>
{/snippet}

{#snippet selectRowCheckbox({ row })}
	<input
		type="checkbox"
		checked={row.getIsSelected()}
		onchange={(e) => row.toggleSelected(e.currentTarget.checked)}
		class="rounded border-border bg-background text-primary focus:ring-primary size-4 cursor-pointer transition-all"
		aria-label="Select row"
	/>
{/snippet}

<!-- Status Badge Snippet -->
{#snippet statusBadge({ status })}
	<span class="px-2 py-0.5 rounded-full text-xs font-bold {status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}">
		{status}
	</span>
{/snippet}

<!-- Row Actions Snippet -->
{#snippet rowActions({ visitor })}
	<Button variant="ghost" size="sm" onclick={() => console.log("Edit:", visitor.id)}>
		Edit
	</Button>
{/snippet}

<!-- Bulk Actions Snippet -->
{#snippet bulkActionsSnippet({ selectedRows })}
	<Button
		variant="destructive"
		size="sm"
		onclick={() => handleBulkDelete(selectedRows)}
		class="h-8 text-xs font-semibold gap-1.5"
	>
		Delete Selected
	</Button>
{/snippet}

<!-- 3. Render the Component -->
<DataTable.Root
	data={mockVisitors}
	{columns}
	searchColumn="fullName"
	searchPlaceholder="Filter visitors by name..."
	bulkActions={bulkActionsSnippet}
/>
```

---

## 2. API Properties Reference

The component takes the following props:

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `data` | `TData[]` | Yes | `[]` | Array of row objects to feed into the table. |
| `columns` | `ColumnDef<TData, TValue>[]` | Yes | `[]` | TanStack table columns list. |
| `searchColumn` | `string` | No | `""` | Column accessor key to bind the search bar text filter to. If not provided, search applies a global filter. |
| `searchPlaceholder` | `string` | No | `"Search logs..."` | Custom placeholder text inside search bar. |
| `bulkActions` | `Snippet<[{ selectedRows: TData[] }]>` | No | `undefined` | Svelte snippet rendered in the dynamic bulk selections overlay bar. |
| `customToolbar` | `Snippet` | No | `undefined` | Custom snippet buttons/controls rendered next to the search input. |

---

## 3. Dynamic Badge Styling Rule Compliance

When designing badge columns in the table cells, implement the dynamic theme-aware cycle rule:

```svelte
{#snippet programBadge({ programName })}
	<!-- 1. Define CSS chart variables -->
	{@const chartColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']}
	
	<!-- 2. Simple hash index resolver -->
	{@const hash = programName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}
	{@const colorVar = chartColors[hash % chartColors.length]}
	
	<!-- 3. Render Badge with custom alpha adjustments -->
	<Badge
		style="background-color: oklch(from var({colorVar}) l c h / 0.12); border-color: oklch(from var({colorVar}) l c h / 0.25); color: var({colorVar});"
		variant="outline"
		class="text-xs font-semibold px-2 py-0.5 rounded-full"
	>
		{programName}
	</Badge>
{/snippet}
```
