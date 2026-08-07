<script lang="ts">
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
</script>

<div class="flex flex-col gap-6 p-6 md:p-8 w-full animate-fade-in">
	<!-- Page Header Skeleton -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex flex-col gap-2">
			<Skeleton class="h-7 w-48 rounded-xl" />
			<Skeleton class="h-4 w-72 rounded-lg" />
		</div>
		<div class="flex items-center gap-2">
			<Skeleton class="h-9 w-28 rounded-xl" />
		</div>
	</div>

	<!-- Top Metric KPI Cards Grid Skeleton -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		{#each Array(4) as _, i (i)}
			<Card.Root class="p-5 flex flex-col justify-between gap-3 rounded-2xl border-border/80 bg-card">
				<div class="flex items-center justify-between">
					<Skeleton class="h-4 w-24 rounded-md" />
					<Skeleton class="size-8 rounded-xl" />
				</div>
				<div class="flex flex-col gap-1.5 pt-2">
					<Skeleton class="h-8 w-16 rounded-lg" />
					<Skeleton class="h-3 w-28 rounded-md" />
				</div>
			</Card.Root>
		{/each}
	</div>

	<!-- Main Workspace / Table / Chart Skeleton -->
	<Card.Root class="p-6 flex flex-col gap-4 rounded-2xl border-border/80 bg-card">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<Skeleton class="h-6 w-36 rounded-lg" />
			<Skeleton class="h-9 w-64 rounded-xl" />
		</div>

		<!-- Table Header Skeleton -->
		<div class="flex items-center justify-between py-2 border-b border-border/50">
			<Skeleton class="h-5 w-24 rounded-md" />
			<Skeleton class="h-5 w-32 rounded-md" />
			<Skeleton class="h-5 w-28 rounded-md" />
			<Skeleton class="h-5 w-20 rounded-md" />
		</div>

		<!-- Table Rows Skeleton -->
		<div class="flex flex-col gap-3 pt-1">
			{#each Array(5) as _, i (i)}
				<div class="flex items-center justify-between py-2 border-b border-border/30">
					<div class="flex items-center gap-3">
						<Skeleton class="size-9 rounded-xl" />
						<div class="flex flex-col gap-1">
							<Skeleton class="h-4 w-32 rounded-md" />
							<Skeleton class="h-3 w-48 rounded-md" />
						</div>
					</div>
					<Skeleton class="h-6 w-24 rounded-full" />
					<Skeleton class="h-4 w-28 rounded-md" />
					<Skeleton class="h-8 w-16 rounded-xl" />
				</div>
			{/each}
		</div>
	</Card.Root>
</div>
