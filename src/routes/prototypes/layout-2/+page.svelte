<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import HomeIcon from '@lucide/svelte/icons/home';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import UsersIcon from '@lucide/svelte/icons/users';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import BellIcon from '@lucide/svelte/icons/bell';
	import FolderIcon from '@lucide/svelte/icons/folder';

	let activeRailItem = $state('logs');
</script>

<div class="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
	<!-- Primary Narrow Global Navigation Rail -->
	<aside class="bg-indigo-950 w-16 flex-shrink-0 flex flex-col items-center py-4 border-r border-indigo-900/50">
		<div class="size-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold font-mono text-sm mb-8 shadow-md">
			C
		</div>
		<div class="flex-1 w-full flex flex-col items-center gap-3">
			<a href="/prototypes" class="size-10 rounded-xl flex items-center justify-center text-indigo-300 hover:text-white hover:bg-indigo-900/40 transition-colors">
				<HomeIcon class="size-5" />
			</a>
			<button
				onclick={() => (activeRailItem = 'logs')}
				class="size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer {activeRailItem === 'logs' ? 'bg-indigo-900/60 text-white shadow-inner border border-indigo-700/30' : 'text-indigo-300 hover:text-white hover:bg-indigo-900/40'}"
			>
				<UsersIcon class="size-5 pointer-events-none" />
			</button>
			<button
				onclick={() => (activeRailItem = 'security')}
				class="size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer {activeRailItem === 'security' ? 'bg-indigo-900/60 text-white shadow-inner border border-indigo-700/30' : 'text-indigo-300 hover:text-white hover:bg-indigo-900/40'}"
			>
				<ShieldAlertIcon class="size-5 pointer-events-none" />
			</button>
			<button
				onclick={() => (activeRailItem = 'codes')}
				class="size-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer {activeRailItem === 'codes' ? 'bg-indigo-900/60 text-white shadow-inner border border-indigo-700/30' : 'text-indigo-300 hover:text-white hover:bg-indigo-900/40'}"
			>
				<QrCodeIcon class="size-5 pointer-events-none" />
			</button>
		</div>
		<div class="size-8 rounded-full bg-indigo-900/50 text-indigo-200 text-[10px] font-bold flex items-center justify-center font-mono border border-indigo-800/40">
			OP
		</div>
	</aside>

	<!-- Secondary Wide Contextual Sidebar -->
	<aside class="bg-white w-60 flex-shrink-0 flex flex-col border-r border-slate-200">
		<div class="h-16 flex items-center px-6 border-b border-slate-100 bg-slate-50/50">
			<h2 class="text-xs font-bold text-slate-800 tracking-wider uppercase">
				{#if activeRailItem === 'logs'}Visitor Center{:else if activeRailItem === 'security'}Security Desk{:else}QR Operations{/if}
			</h2>
		</div>
		<div class="flex-1 p-4 space-y-4">
			<div class="space-y-1">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</span>
				<div class="flex flex-col gap-1.5 pt-1">
					<button class="w-full text-left px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100/70 text-xs font-semibold text-slate-700 transition-colors cursor-pointer">Active Logs</button>
					<button class="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50/70 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">Declined Passes</button>
					<button class="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50/70 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">Archive History</button>
				</div>
			</div>
			
			<div class="space-y-1">
				<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filters</span>
				<div class="pt-1.5 text-xs text-slate-400 italic">No filters active</div>
			</div>
		</div>
		<div class="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
			<span class="text-[9px] font-bold text-slate-400">Desk Terminal #04</span>
			<span class="size-2 bg-emerald-500 rounded-full"></span>
		</div>
	</aside>

	<!-- Workspace Panel -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Header Banner -->
		<header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
			<h1 class="text-sm font-extrabold text-slate-800 tracking-tight">2. Dual Column Sidebar Layout</h1>
			<div class="flex items-center gap-4">
				<button class="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer">
					<BellIcon class="size-4" />
				</button>
				<div class="w-px h-6 bg-slate-200"></div>
				<span class="text-xs font-bold text-slate-700">Security Team A</span>
			</div>
		</header>

		<!-- Content Viewport -->
		<main class="flex-1 overflow-y-auto p-6 space-y-6">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Stat 1 -->
				<Card.Root class="border-slate-200/80 shadow-xs flex items-center gap-4 p-4">
					<div class="size-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
						<UsersIcon class="size-5" />
					</div>
					<div>
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visitor Queue</span>
						<div class="text-2xl font-black text-slate-900">48</div>
					</div>
				</Card.Root>
				<!-- Stat 2 -->
				<Card.Root class="border-slate-200/80 shadow-xs flex items-center gap-4 p-4">
					<div class="size-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
						<ShieldAlertIcon class="size-5" />
					</div>
					<div>
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unverified Alerts</span>
						<div class="text-2xl font-black text-red-600">3</div>
					</div>
				</Card.Root>
			</div>

			<Card.Root class="border-slate-200/80 shadow-xs">
				<Card.Header>
					<Card.Title class="text-base font-bold">Dual Column Overview</Card.Title>
					<Card.Description class="text-xs">Highly structural, ideal for workflow hubs where navigation is segmented by operational module.</Card.Description>
				</Card.Header>
				<Card.Content class="h-80 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-medium">
					Context Workspace Area
				</Card.Content>
			</Card.Root>
		</main>
	</div>
</div>
