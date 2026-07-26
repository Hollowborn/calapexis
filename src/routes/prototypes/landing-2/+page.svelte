<script lang="ts">
	import { MOCK_OFFICES } from '$lib/supabase';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let searchQuery = $state('');
	let filteredOffices = $derived(
		MOCK_OFFICES.filter(o => 
			o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
			o.code.toLowerCase().includes(searchQuery.toLowerCase())
		).slice(0, 4)
	);
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans w-full">
	<!-- Left Side: Immersive Map Hero Banner -->
	<div class="w-full md:w-1/2 bg-muted/20 border-r border-border p-8 md:p-12 flex flex-col justify-between relative overflow-hidden shrink-0">
		<div class="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
		
		<!-- Header brand logo -->
		<div class="flex items-center justify-between w-full relative z-10">
			<a href="/prototypes" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-md shadow-primary/20">
					C
				</div>
				<span class="tracking-tight">Calapexis <span class="text-primary font-normal text-xs uppercase tracking-widest pl-1 font-mono">L2</span></span>
			</a>
			<ThemeToggle />
		</div>

		<!-- Center Graphics: Simulated Live Map UI Card -->
		<div class="my-8 md:my-0 flex flex-col items-center justify-center relative z-10">
			<div class="w-full max-w-sm bg-card border border-border shadow-2xl rounded-2xl p-4 space-y-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
						<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
						Live Campus Node Tracking
					</span>
					<Badge variant="secondary" class="text-[9px] font-black uppercase">Active Mode</Badge>
				</div>
				
				<!-- Simulated Map overlay graphic -->
				<div class="relative w-full h-44 bg-muted/40 rounded-xl border border-border/80 overflow-hidden flex items-center justify-center">
					<div class="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:16px_16px] dark:bg-[radial-gradient(#fff_1.5px,transparent_1.5px)]"></div>
					
					<!-- Simulated node pins -->
					<div class="absolute top-8 left-12 animate-bounce">
						<MapPinIcon class="size-6 text-primary fill-primary/10" />
					</div>
					<div class="absolute bottom-10 right-16 animate-pulse">
						<MapPinIcon class="size-6 text-emerald-500 fill-emerald-500/10" />
					</div>
					<div class="absolute top-20 right-28">
						<MapPinIcon class="size-5 text-amber-500 fill-amber-500/10" />
					</div>
					
					<span class="text-[10px] text-muted-foreground/80 font-mono font-black uppercase tracking-widest">Campus Layout Preview</span>
				</div>

				<div class="flex justify-between items-center text-[10px] text-muted-foreground font-semibold pt-1">
					<span>Active Visitors: <span class="font-extrabold text-foreground">12</span></span>
					<span>Telemetry Status: <span class="text-emerald-500 font-extrabold">Healthy</span></span>
				</div>
			</div>
		</div>

		<!-- Footer guidelines link -->
		<div class="relative z-10 text-[10px] text-muted-foreground/60 font-semibold leading-relaxed">
			BISU Calape campus security logbook systems adhere to compliance protocols.
		</div>
	</div>

	<!-- Right Side: Fast Portals Controls -->
	<div class="w-full md:w-1/2 p-8 md:p-16 flex items-center justify-center bg-background">
		<div class="w-full max-w-md flex flex-col gap-8">
			<!-- Header -->
			<div class="space-y-2">
				<h2 class="text-3xl font-black text-foreground tracking-tight">Access Gateways</h2>
				<p class="text-xs text-muted-foreground font-semibold">Select a portal action to begin logging or navigation.</p>
			</div>

			<!-- Direct Portals Links list -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<!-- Visitor Check-In Portal -->
				<a 
					href="/checkin" 
					class="p-4 border border-border/80 bg-card rounded-2xl hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-32 group"
				>
					<div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
						<UserCheckIcon class="size-5 pointer-events-none" />
					</div>
					<div class="flex items-center justify-between w-full pt-2">
						<span class="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors">Visitor Check-In</span>
						<ArrowRightIcon class="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform pointer-events-none" />
					</div>
				</a>

				<!-- Live Campus Map Navigation -->
				<a 
					href="/map" 
					class="p-4 border border-border/80 bg-card rounded-2xl hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-32 group"
				>
					<div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
						<CompassIcon class="size-5 pointer-events-none" />
					</div>
					<div class="flex items-center justify-between w-full pt-2">
						<span class="text-xs font-extrabold text-foreground group-hover:text-blue-500 transition-colors">Campus Map</span>
						<ArrowRightIcon class="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform pointer-events-none" />
					</div>
				</a>

				<!-- Security Gate Console -->
				<a 
					href="/login" 
					class="p-4 border border-border/80 bg-card rounded-2xl hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-32 group"
				>
					<div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
						<ShieldCheckIcon class="size-5 pointer-events-none" />
					</div>
					<div class="flex items-center justify-between w-full pt-2">
						<span class="text-xs font-extrabold text-foreground group-hover:text-emerald-500 transition-colors">Security Desk</span>
						<ArrowRightIcon class="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform pointer-events-none" />
					</div>
				</a>

				<!-- Staff Office Desk -->
				<a 
					href="/staff" 
					class="p-4 border border-border/80 bg-card rounded-2xl hover:border-primary/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-32 group"
				>
					<div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
						<BuildingIcon class="size-5 pointer-events-none" />
					</div>
					<div class="flex items-center justify-between w-full pt-2">
						<span class="text-xs font-extrabold text-foreground group-hover:text-purple-500 transition-colors">Staff Office</span>
						<ArrowRightIcon class="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform pointer-events-none" />
					</div>
				</a>
			</div>

			<!-- Search Directory list drawer -->
			<div class="border-t border-border/60 pt-6 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-xs font-black uppercase text-foreground tracking-wider">Fast Room Finder</h3>
					<span class="text-[10px] text-muted-foreground font-semibold">Real-time coordinates lookup</span>
				</div>
				
				<div class="relative w-full">
					<SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input 
						type="text" 
						placeholder="Search office code..." 
						bind:value={searchQuery}
						class="pl-10 rounded-xl h-10 text-xs font-semibold"
					/>
				</div>

				<div class="flex flex-col gap-2">
					{#each filteredOffices as office}
						<div class="flex items-center justify-between p-2.5 bg-muted/20 border border-border/80 rounded-xl text-xs font-semibold">
							<div class="flex items-center gap-2">
								<Badge variant="outline" class="font-mono text-[9px] font-black">{office.code}</Badge>
								<span class="text-foreground truncate max-w-[150px]">{office.name}</span>
							</div>
							<a href="/map?office={office.id}" class="text-[10px] text-primary hover:underline font-bold">Locate &rarr;</a>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
