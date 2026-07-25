<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
</script>

<div class="min-h-screen bg-[#0F111A] text-slate-300 flex flex-col font-mono text-xs">
	<!-- High Density Top Bar -->
	<header class="h-12 bg-[#090A10] border-b border-slate-900 flex items-center justify-between px-6">
		<div class="flex items-center gap-3">
			<a href="/prototypes" class="size-6 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold">
				<ArrowLeftIcon class="size-3.5" />
			</a>
			<span class="text-cyan-500 font-bold tracking-wider">COMMAND CENTER: ACTIVE DESK</span>
		</div>
		<div class="flex items-center gap-4 text-[10px]">
			<span class="flex items-center gap-1.5"><span class="size-2 bg-emerald-500 rounded-full animate-pulse"></span> SYSTEM OK</span>
			<span class="text-slate-600">|</span>
			<span>NODE-X4</span>
		</div>
	</header>

	<!-- Main Dense Panels -->
	<div class="flex-grow p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
		<!-- Left Telemetry metrics (1 column) -->
		<div class="flex flex-col gap-4">
			<Card.Root class="bg-[#141724] border-slate-900 shadow-none text-slate-300">
				<Card.Header class="pb-2">
					<Card.Description class="text-[9px] font-bold text-slate-500 uppercase font-mono">Camera Feed status</Card.Description>
					<Card.Title class="text-lg font-bold text-white flex items-center justify-between">
						<span>CAM-01</span>
						<ActivityIcon class="size-4 text-cyan-400" />
					</Card.Title>
				</Card.Header>
				<Card.Content class="h-28 bg-[#090A10] rounded-md border border-slate-900 flex items-center justify-center text-[10px] text-slate-500">
					[FEED CONNECTED]
				</Card.Content>
			</Card.Root>

			<Card.Root class="bg-[#141724] border-slate-900 shadow-none text-slate-300">
				<Card.Header class="pb-2">
					<Card.Description class="text-[9px] font-bold text-slate-500 uppercase font-mono">Scanner status</Card.Description>
					<Card.Title class="text-lg font-bold text-white">4 Online</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-1.5">
					<div class="flex items-center justify-between"><span class="text-slate-500">GATE-A</span> <span class="text-emerald-400 font-bold">READY</span></div>
					<div class="flex items-center justify-between"><span class="text-slate-500">CCS-202</span> <span class="text-emerald-400 font-bold">READY</span></div>
					<div class="flex items-center justify-between"><span class="text-slate-500">REG-1</span> <span class="text-amber-400 font-bold">POLLING</span></div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Central Grid Area (2 columns) -->
		<div class="lg:col-span-2 flex flex-col gap-4">
			<Card.Root class="bg-[#141724] border-slate-900 shadow-none text-slate-300 flex-grow flex flex-col">
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-bold text-white flex items-center justify-between">
						<span>REAL-TIME GATE MONITOR</span>
						<Button variant="ghost" size="icon" class="size-6 text-slate-400 hover:text-white"><RefreshCwIcon class="size-3" /></Button>
					</Card.Title>
				</Card.Header>
				<Card.Content class="flex-grow bg-[#090A10] rounded-md border border-slate-900 p-3 flex flex-col gap-1.5 overflow-y-auto max-h-80">
					<div class="p-2 bg-[#141724]/40 border-l-2 border-cyan-500 flex justify-between">
						<span>08:24:12 - Visitor VP-8910 Checked In</span>
						<span class="text-cyan-400">[GATE-A]</span>
					</div>
					<div class="p-2 bg-[#141724]/40 border-l-2 border-cyan-500 flex justify-between">
						<span>08:23:45 - Visitor VP-7241 Arrived Room 205</span>
						<span class="text-cyan-400">[CCS-2]</span>
					</div>
					<div class="p-2 bg-[#141724]/40 border-l-2 border-red-500 flex justify-between">
						<span>08:20:10 - Alert: Pass VP-9022 Verification Rejected</span>
						<span class="text-red-400">[SYS]</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right Side Alert feed panel (1 column) -->
		<div class="flex flex-col gap-4">
			<Card.Root class="bg-[#141724] border-slate-900 shadow-none text-slate-300 flex-grow">
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-bold text-white flex items-center gap-1.5">
						<ShieldAlertIcon class="size-4 text-red-500" />
						<span>SECURITY QUEUE</span>
					</Card.Title>
				</Card.Header>
				<Card.Content class="h-64 flex flex-col items-center justify-center text-slate-500 text-center gap-2">
					<div>No unverified visitor alerts in queue.</div>
					<div class="text-[10px] text-slate-600">Standing by.</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Bottom Console Terminal Widget -->
	<footer class="h-28 bg-[#090A10] border-t border-slate-900 p-4 flex gap-3">
		<div class="text-cyan-500"><TerminalIcon class="size-5" /></div>
		<div class="flex-grow overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1">
			<div>[calapexis-console@security ~]$ fetch --active-visitors --realtime</div>
			<div>Fetching records from supabase database schema... status 200 OK</div>
			<div>Real-time connection listener established: postgresql://postgres:***@db.calapexis.local</div>
		</div>
	</footer>
</div>
