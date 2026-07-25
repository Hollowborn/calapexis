<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import AlignJustifyIcon from '@lucide/svelte/icons/align-justify';
	import HomeIcon from '@lucide/svelte/icons/home';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';

	let activeNav = $state('home');
</script>

<div class="min-h-screen bg-slate-50 flex flex-col font-sans">
	<!-- Top Navigation Header -->
	<header class="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
		<div class="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-6">
			<!-- Logo -->
			<div class="flex items-center gap-3">
				<a href="/prototypes" class="size-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
					<ArrowLeftIcon class="size-4" />
				</a>
				<span class="text-base font-black tracking-wider text-slate-800">CALAPEXIS</span>
			</div>

			<!-- Menu Items -->
			<nav class="hidden md:flex items-center gap-1.5 h-full">
				<button
					onclick={() => (activeNav = 'home')}
					class="px-4 h-16 flex items-center border-b-2 font-bold text-xs transition-all cursor-pointer {activeNav === 'home' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}"
				>
					<HomeIcon class="size-3.5 mr-2" />
					<span>Dashboard</span>
				</button>
				<button
					onclick={() => (activeNav = 'qrcodes')}
					class="px-4 h-16 flex items-center border-b-2 font-bold text-xs transition-all cursor-pointer {activeNav === 'qrcodes' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}"
				>
					<QrCodeIcon class="size-3.5 mr-2" />
					<span>QR Codes</span>
				</button>
				<button
					onclick={() => (activeNav = 'settings')}
					class="px-4 h-16 flex items-center border-b-2 font-bold text-xs transition-all cursor-pointer {activeNav === 'settings' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}"
				>
					<SettingsIcon class="size-3.5 mr-2" />
					<span>System Settings</span>
				</button>
			</nav>

			<!-- Profile / Mobile -->
			<div class="flex items-center gap-3">
				<div class="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 md:hidden cursor-pointer">
					<AlignJustifyIcon class="size-4" />
				</div>
				<div class="size-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
					E
				</div>
			</div>
		</div>
	</header>

	<!-- Main Workspace Page -->
	<main class="flex-grow max-w-7xl w-full mx-auto p-6 space-y-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-black text-slate-900 tracking-tight">3. Top Header Navigation Layout</h1>
			<p class="text-xs text-slate-400">Streamlined full-width layout, ideal for public kiosks, registration desks, or visitor dashboard interfaces.</p>
		</div>

		<!-- Layout Widgets Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<Card.Root class="border-slate-200/80 shadow-xs md:col-span-2">
				<Card.Header>
					<Card.Title class="text-base font-bold">Activity Telemetry</Card.Title>
					<Card.Description class="text-xs">Data chart workspace simulation.</Card.Description>
				</Card.Header>
				<Card.Content class="h-80 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 font-medium">
					Primary Content Grid Area (2/3 width)
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200/80 shadow-xs flex flex-col justify-between">
				<Card.Header>
					<Card.Title class="text-base font-bold">Campus Stats</Card.Title>
					<Card.Description class="text-xs">Quick tracking parameters.</Card.Description>
				</Card.Header>
				<Card.Content class="flex-grow flex items-center justify-center">
					<div class="text-center space-y-2">
						<div class="text-5xl font-black text-slate-800">92%</div>
						<div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor Approval Rate</div>
					</div>
				</Card.Content>
				<Card.Footer class="border-t border-slate-100 pt-4">
					<Button variant="outline" size="sm" class="w-full text-xs font-semibold">Generate Monthly Report</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</main>
</div>
