<script lang="ts" generics="TData, TValue">
	import type { Column } from "@tanstack/table-core";
	import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";

	interface Props {
		column: Column<TData, TValue>;
		title: string;
		class?: string;
	}

	let { column, title, class: className }: Props = $props();

	function handleSortToggle() {
		if (column.getIsSorted() === "asc") {
			column.toggleSorting(true); // Sort desc
		} else if (column.getIsSorted() === "desc") {
			column.clearSorting(); // Clear
		} else {
			column.toggleSorting(false); // Sort asc
		}
	}
</script>

<div class={cn("flex items-center space-x-2", className)}>
	{#if column.getCanSort()}
		<Button
			variant="ghost"
			size="sm"
			onclick={handleSortToggle}
			class="-ml-3 h-8 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=open]:bg-accent"
		>
			<span>{title}</span>
			{#if column.getIsSorted() === "desc"}
				<ArrowDownIcon class="ml-2 size-3.5" />
			{:else if column.getIsSorted() === "asc"}
				<ArrowUpIcon class="ml-2 size-3.5" />
			{:else}
				<ArrowUpDownIcon class="ml-2 size-3.5 opacity-50" />
			{/if}
		</Button>
	{:else}
		<span class="text-xs font-bold text-muted-foreground">{title}</span>
	{/if}
</div>
