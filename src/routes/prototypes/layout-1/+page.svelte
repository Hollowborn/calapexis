<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import SidebarIcon from '@lucide/svelte/icons/sidebar';
	import LayoutIcon from '@lucide/svelte/icons/layout';
	import UsersIcon from '@lucide/svelte/icons/users';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HomeIcon from '@lucide/svelte/icons/home';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BellIcon from '@lucide/svelte/icons/bell';

	let sidebarOpen = $state(true);
</script>

<div class="min-h-screen bg-slate-100 flex font-sans">
	<!-- Left Navigation Sidebar -->
	<aside class="bg-slate-900 text-slate-300 w-64 flex-shrink-0 flex flex-col transition-all duration-300 {sidebarOpen ? 'ml-0' : '-ml-64'}">
		<div class="h-16 flex items-center px-6 border-b border-slate-800">
			<span class="text-lg font-black text-white tracking-wider font-mono">CALAPEXIS</span>
		</div>
		<nav class="flex-1 p-4 space-y-1">
			<a href="/prototypes" class="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-800 text-white font-semibold text-xs">
				<HomeIcon class="size-4" />
				<span>Return Hub</span>
			</a>
			<a href="#" class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-colors">
				<LayoutIcon class="size-4" />
				<span>Dashboard</span>
			</a>
			<a href="#" class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-colors">
				<UsersIcon class="size-4" />
				<span>Visitors Log</span>
			</a>
			<a href="#" class="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs transition-colors">
				<SettingsIcon class="size-4" />
				<span>System Config</span>
			</a>
		</nav>
		<div class="p-4 border-t border-slate-800 text-center">
			<span class="text-[10px] text-slate-500 font-mono">v1.2.0 - Prototype</span>
		</div>
	</aside>

	<!-- Main Workspace Column -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Top Action Header Banner -->
		<header class="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6">
			<div class="flex items-center gap-4">
				<Button onclick={() => (sidebarOpen = !sidebarOpen)} variant="ghost" size="icon" class="text-slate-500 hover:text-slate-800">
					<SidebarIcon class="size-5 pointer-events-none" />
				</Button>
				<div class="relative w-64 hidden sm:block">
					<SearchIcon class="absolute left-3 top-2.5 size-4 text-slate-400" />
					<input type="text" placeholder="Global search logs..." class="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-blue-500" />
				</div>
			</div>

			<div class="flex items-center gap-4">
				<button class="relative size-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer">
					<BellIcon class="size-4" />
					<span class="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full"></span>
				</button>
				<div class="size-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
					A
				</div>
			</div>
		</header>

		<!-- Dashboard Viewport Content -->
		<main class="flex-1 overflow-y-auto p-6 space-y-6">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight text-slate-950">1. Classic Sidebar Layout</h1>
				<p class="text-xs text-slate-500">Traditional portal layout optimized for administrative desks and config managers.</p>
			</div>

			<!-- Quick Grid Cards -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card.Root class="border-slate-200/80 shadow-xs">
					<Card.Header class="pb-2">
						<Card.Description class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Entries</Card.Description>
						<Card.Title class="text-3xl font-black">1,482</Card.Title>
					</Card.Header>
				</Card.Root>
				<Card.Root class="border-slate-200/80 shadow-xs">
					<Card.Header class="pb-2">
						<Card.Description class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Currently Onsite</Card.Description>
						<Card.Title class="text-3xl font-black text-emerald-600">82</Card.Title>
					</Card.Header>
				</Card.Root>
				<Card.Root class="border-slate-200/80 shadow-xs">
					<Card.Header class="pb-2">
						<Card.Description class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejections</Card.Description>
						<Card.Title class="text-3xl font-black text-rose-600">14</Card.Title>
					</Card.Header>
				</Card.Root>
			</div>

			<!-- Main Content Block -->
			<Card.Root class="border-slate-200/80 shadow-xs">
				<Card.Header>
					<Card.Title class="text-base font-bold">Activity Log</Card.Title>
					<Card.Description class="text-xs">Mock grid visualization for visitor traffic.</Card.Description>
				</Card.Header>
				<Card.Content class="h-64 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-medium">
					Workspace Layout Content Area
				</Card.Content>
			</Card.Root>
		</main>
	</div>
</div>
