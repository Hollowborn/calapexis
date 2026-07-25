<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SearchIcon from '@lucide/svelte/icons/search';
	import UserIcon from '@lucide/svelte/icons/user';
	import MailIcon from '@lucide/svelte/icons/mail';
	import ShieldIcon from '@lucide/svelte/icons/shield';

	let activeProfile = $state('usr-1');

	const mockList = [
		{ id: 'usr-1', email: 'registrar_staff', role: 'staff', desc: 'Registrar Binding' },
		{ id: 'usr-2', email: 'guard_gate_main', role: 'security', desc: 'Main Campus Gate' },
		{ id: 'usr-3', email: 'ccs_dean_desk', role: 'staff', desc: 'CCS Department Office' }
	];

	let current = $derived(mockList.find(i => i.id === activeProfile));
</script>

<div class="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
	<!-- Mini Left Column: Nav rail -->
	<aside class="bg-slate-900 w-16 flex-shrink-0 flex flex-col items-center py-4 text-slate-300">
		<a href="/prototypes" class="size-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-sm mb-8">
			<ArrowLeftIcon class="size-4" />
		</a>
		<span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest rotate-270 mt-8 whitespace-nowrap">SPLIT VIEW</span>
	</aside>

	<!-- Master Item List Feed (Left Column) -->
	<aside class="bg-white w-72 flex-shrink-0 flex flex-col border-r border-slate-200">
		<div class="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
			<h2 class="text-sm font-bold text-slate-800">Master-Detail Feeds</h2>
			<div class="relative">
				<SearchIcon class="absolute left-2.5 top-2 size-3.5 text-slate-400" />
				<input type="text" placeholder="Search profiles..." class="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-hidden focus:border-rose-500" />
			</div>
		</div>
		<div class="flex-1 overflow-y-auto p-3 space-y-1">
			{#each mockList as item}
				<button
					onclick={() => (activeProfile = item.id)}
					class="w-full text-left p-3 rounded-xl transition-all cursor-pointer flex flex-col gap-1 {activeProfile === item.id ? 'bg-rose-50 border border-rose-100/50 shadow-xs' : 'hover:bg-slate-50 border border-transparent'}"
				>
					<span class="text-xs font-bold {activeProfile === item.id ? 'text-rose-950' : 'text-slate-800'}">{item.email}</span>
					<span class="text-[10px] text-slate-400 font-medium">{item.desc}</span>
				</button>
			{/each}
		</div>
	</aside>

	<!-- Detail Main Viewport Column (Wide Column) -->
	<main class="flex-1 flex flex-col overflow-hidden bg-slate-50">
		<!-- Header -->
		<header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
			<span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Viewport Panel</span>
			<span class="text-xs font-semibold text-slate-600">Active Profile ID: {activeProfile}</span>
		</header>

		<!-- Detail View Context -->
		<div class="flex-1 overflow-y-auto p-8 space-y-6">
			{#if current}
				<Card.Root class="border-slate-200/80 shadow-xs">
					<Card.Header class="pb-4">
						<div class="flex items-center gap-4">
							<div class="size-14 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
								<UserIcon class="size-6" />
							</div>
							<div>
								<Card.Title class="text-xl font-bold">{current.email}</Card.Title>
								<Card.Description class="text-xs font-medium uppercase tracking-wider text-slate-400 pt-0.5">{current.role}</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="py-4 border-t border-slate-100 text-xs text-slate-600 space-y-3">
						<div class="flex items-center gap-2">
							<MailIcon class="size-4 text-slate-400" />
							<span>{current.email}@university.edu</span>
						</div>
						<div class="flex items-center gap-2">
							<ShieldIcon class="size-4 text-slate-400" />
							<span class="capitalize">Security privilege level: {current.role}</span>
						</div>
					</Card.Content>
					<Card.Footer class="border-t border-slate-100 pt-4 bg-slate-50/50 flex gap-2">
						<Button variant="outline" size="sm" class="text-xs">Reset Password</Button>
						<Button size="sm" class="text-xs bg-rose-600 hover:bg-rose-700">Modify Access</Button>
					</Card.Footer>
				</Card.Root>
			{/if}
		</div>
	</main>
</div>
