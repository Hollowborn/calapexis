<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import BarChartIcon from '@lucide/svelte/icons/bar-chart-2';
	import ListIcon from '@lucide/svelte/icons/list';
	import SettingsIcon from '@lucide/svelte/icons/settings';
</script>

<div class="min-h-screen bg-slate-50 flex flex-col font-sans">
	<!-- Status Top Header Banner -->
	<header class="h-20 bg-slate-900 text-white flex items-center justify-between px-8">
		<div class="flex items-center gap-4">
			<a href="/prototypes" class="size-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
				<ArrowLeftIcon class="size-4" />
			</a>
			<div>
				<h1 class="text-base font-extrabold tracking-tight">7. Tab-Driven Segmented Layout</h1>
				<p class="text-[10px] text-slate-400">Perfect for multi-mode single pages (e.g. logbook filters + analytics on the same desk).</p>
			</div>
		</div>
		<div class="size-9 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
			T
		</div>
	</header>

	<!-- Main Workspace tab sheet -->
	<main class="flex-grow p-8 max-w-5xl w-full mx-auto">
		<Tabs.Root value="analytics" class="w-full space-y-6">
			<Tabs.List class="grid grid-cols-3 max-w-sm bg-slate-200/60 p-1 rounded-xl">
				<Tabs.Trigger value="analytics" class="text-xs font-bold flex items-center gap-1.5 py-2">
					<BarChartIcon class="size-3.5" />
					<span>Analytics</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="logs" class="text-xs font-bold flex items-center gap-1.5 py-2">
					<ListIcon class="size-3.5" />
					<span>Log Records</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="settings" class="text-xs font-bold flex items-center gap-1.5 py-2">
					<SettingsIcon class="size-3.5" />
					<span>Settings</span>
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Analytics Tab Content -->
			<Tabs.Content value="analytics" class="space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card.Root class="border-slate-200/80 shadow-xs">
						<Card.Header>
							<Card.Title class="text-sm font-bold">Department Traffic</Card.Title>
						</Card.Header>
						<Card.Content class="h-48 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
							[Chart Area]
						</Card.Content>
					</Card.Root>

					<Card.Root class="border-slate-200/80 shadow-xs">
						<Card.Header>
							<Card.Title class="text-sm font-bold">Peak Check-In Hours</Card.Title>
						</Card.Header>
						<Card.Content class="h-48 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
							[Chart Area]
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>

			<!-- Log Records Tab Content -->
			<Tabs.Content value="logs">
				<Card.Root class="border-slate-200/80 shadow-xs">
					<Card.Header>
						<Card.Title class="text-sm font-bold">Master Table Logs</Card.Title>
						<Card.Description class="text-xs">Database visitor entries view simulation.</Card.Description>
					</Card.Header>
					<Card.Content class="h-64 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
						[Data Table Container Area]
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Settings Tab Content -->
			<Tabs.Content value="settings">
				<Card.Root class="border-slate-200/80 shadow-xs">
					<Card.Header>
						<Card.Title class="text-sm font-bold">Config Options</Card.Title>
						<Card.Description class="text-xs">Manage layouts permissions and theme modes.</Card.Description>
					</Card.Header>
					<Card.Content class="h-64 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
						[Controls Container Area]
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</main>
</div>
