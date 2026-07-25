<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import PercentIcon from '@lucide/svelte/icons/percent';
	import SettingsIcon from '@lucide/svelte/icons/settings';
</script>

<div class="min-h-screen bg-slate-50 flex flex-col font-sans">
	<!-- Mini Header -->
	<header class="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-6">
		<div class="flex items-center gap-3">
			<a href="/prototypes" class="size-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
				<ArrowLeftIcon class="size-4" />
			</a>
			<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Prototype 4</span>
		</div>
		<h1 class="text-sm font-black text-slate-800">4. Bento Grid Layout</h1>
	</header>

	<!-- Bento Area -->
	<main class="flex-grow p-6 max-w-6xl w-full mx-auto space-y-6">
		<div class="flex flex-col gap-1">
			<h2 class="text-2xl font-black text-slate-900 tracking-tight">Bento Box Portal Panel</h2>
			<p class="text-xs text-slate-400">Variable-dimension cards structured in an interlocking Bento grid. Best for data-rich dashboards requiring visual hierarchy.</p>
		</div>

		<!-- Bento Grid Grid -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[160px]">
			<!-- Box 1: Large telemetry (2 columns x 2 rows) -->
			<Card.Root class="border-slate-200/80 shadow-xs md:col-span-2 md:row-span-2 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 flex flex-col justify-between">
				<div>
					<span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Operations</span>
					<div class="text-3xl font-black mt-2">Logbook Monitor</div>
				</div>
				<div class="h-28 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-slate-400">
					Simulated Real-Time Sparkline Chart
				</div>
			</Card.Root>

			<!-- Box 2: Tall Metric (1 column x 2 rows) -->
			<Card.Root class="border-slate-200/80 shadow-xs md:row-span-2 p-6 flex flex-col justify-between bg-amber-500 text-white">
				<div class="size-10 rounded-lg bg-white/10 flex items-center justify-center">
					<ClockIcon class="size-5" />
				</div>
				<div class="space-y-1">
					<div class="text-4xl font-extrabold font-mono">4.2m</div>
					<div class="text-[10px] font-bold uppercase tracking-wider opacity-80">Avg. Check-In Duration</div>
				</div>
			</Card.Root>

			<!-- Box 3: Tiny Stat (1 column x 1 row) -->
			<Card.Root class="border-slate-200/80 shadow-xs p-4 flex items-center justify-between">
				<div class="space-y-1">
					<span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Verified Pass</span>
					<div class="text-xl font-extrabold text-emerald-600">99.8%</div>
				</div>
				<div class="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
					<PercentIcon class="size-4" />
				</div>
			</Card.Root>

			<!-- Box 4: Tiny Action (1 column x 1 row) -->
			<Card.Root class="border-slate-200/80 shadow-xs p-4 flex items-center justify-between">
				<div class="space-y-1">
					<span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Guards</span>
					<div class="text-xl font-extrabold text-slate-900">8</div>
				</div>
				<div class="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
					<UsersIcon class="size-4" />
				</div>
			</Card.Root>

			<!-- Box 5: Wide bar widget (2 columns x 1 row) -->
			<Card.Root class="border-slate-200/80 shadow-xs md:col-span-2 p-4 flex flex-col justify-between">
				<div class="flex items-center justify-between">
					<span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kiosk QR Engine</span>
					<span class="size-2 bg-emerald-500 rounded-full"></span>
				</div>
				<div class="flex items-center justify-between pt-2">
					<div class="text-xs font-semibold text-slate-600">Online Scanner Stations</div>
					<div class="flex gap-1">
						<span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold">REG-1</span>
						<span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold">CCS-2</span>
						<span class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold">GATE-A</span>
					</div>
				</div>
			</Card.Root>
		</div>
	</main>
</div>
