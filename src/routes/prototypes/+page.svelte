<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import SidebarIcon from '@lucide/svelte/icons/sidebar';
	import ColumnsIcon from '@lucide/svelte/icons/columns';
	import AlignJustifyIcon from '@lucide/svelte/icons/align-justify';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import SplitSquareHorizontalIcon from '@lucide/svelte/icons/split-square-horizontal';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import FolderTabsIcon from '@lucide/svelte/icons/folder-git';
</script>

<div class="min-h-screen bg-slate-50 text-slate-900 py-12 px-6">
	<div class="max-w-5xl mx-auto space-y-8">
		<div class="text-center space-y-3">
			<h1 class="text-4xl font-extrabold tracking-tight text-slate-950">Dashboard Layout Prototypes</h1>
			<p class="text-sm text-slate-500 max-w-2xl mx-auto">
				Explore 7 distinct structural layout options for the Calapexis campus portal. Each design features a unique navigation hierarchy, widget placement, and grid arrangement.
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
			<!-- Layout 1 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2">
						<SidebarIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">1. Classic Sidebar Nav</Card.Title>
					<Card.Description class="text-xs">Left sidebar for portal options, clean header banner, and primary center widget grid.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-1" class="w-full text-xs font-semibold">View Layout 1</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Layout 2 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2">
						<ColumnsIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">2. Dual Column Sidebar</Card.Title>
					<Card.Description class="text-xs">A narrow global navigation rail matched with a secondary, dynamic contextual sub-sidebar.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-2" class="w-full text-xs font-semibold">View Layout 2</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Layout 3 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
						<AlignJustifyIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">3. Header-Only Portal</Card.Title>
					<Card.Description class="text-xs">Clean horizontal navigation header bar. Best for centered, full-width content widgets.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-3" class="w-full text-xs font-semibold">View Layout 3</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Layout 4 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
						<LayoutGridIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">4. Bento Grid Masonry</Card.Title>
					<Card.Description class="text-xs">Modern dashboard grid styling using variable column-spans and row-spans to form a Bento deck.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-4" class="w-full text-xs font-semibold">View Layout 4</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Layout 5 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
						<SplitSquareHorizontalIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">5. Split Master-Detail</Card.Title>
					<Card.Description class="text-xs">Three-column layout: navigation rail, item selector feed, and full viewport detail view panel.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-5" class="w-full text-xs font-semibold">View Layout 5</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Layout 6 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-2">
						<MonitorIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">6. Command Center</Card.Title>
					<Card.Description class="text-xs">High-density telemetry panel. Ideal for security hubs with live feeds, metrics, and logs.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-6" class="w-full text-xs font-semibold">View Layout 6</Button>
				</Card.Footer>
			</Card.Root>

			<!-- Layout 7 -->
			<Card.Root class="border-slate-200/80 shadow-xs hover:shadow-md transition-all md:col-span-2 lg:col-span-1">
				<Card.Header class="pb-3">
					<div class="size-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center mb-2">
						<FolderTabsIcon class="size-5" />
					</div>
					<Card.Title class="text-lg font-bold">7. Tabbed Navigation</Card.Title>
					<Card.Description class="text-xs">Minimalist top-banner matched with a prominent tab controller header to switch entire viewport contents.</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button href="/prototypes/layout-7" class="w-full text-xs font-semibold">View Layout 7</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</div>
