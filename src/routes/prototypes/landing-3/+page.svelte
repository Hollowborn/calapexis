<script lang="ts">
	import { MOCK_OFFICES } from '$lib/supabase';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let searchQuery = $state('');
	let filteredOffices = $derived(
		searchQuery.trim() === '' 
			? [] 
			: MOCK_OFFICES.filter(o => 
				o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
				o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
				o.building.toLowerCase().includes(searchQuery.toLowerCase())
			)
	);
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans relative overflow-hidden">
	<!-- Decorative background glows -->
	<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

	<!-- Top Navigation header -->
	<header class="max-w-4xl w-full mx-auto px-6 h-20 flex items-center justify-between z-10 relative">
		<a href="/prototypes" class="flex items-center gap-2 font-black text-sm tracking-tight text-foreground hover:opacity-90 transition-opacity">
			<span class="w-2 h-2 rounded-full bg-primary"></span>
			<span>CALAPEXIS <span class="text-[10px] text-muted-foreground font-mono tracking-widest pl-1">L3</span></span>
		</a>
		<div class="flex items-center gap-2">
			<ThemeToggle />
		</div>
	</header>

	<!-- Main Workspace Area -->
	<main class="flex-1 max-w-2xl w-full mx-auto px-6 flex flex-col justify-center gap-10 pb-20 z-10 relative">
		<!-- Hero copy text -->
		<div class="text-center space-y-3">
			<h1 class="text-4xl sm:text-5xl font-black tracking-tight leading-none text-foreground">
				Find your way.
			</h1>
			<p class="text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed max-w-md mx-auto">
				Search for offices, verify your visitor passcodes, or explore the digital campus map.
			</p>
		</div>

		<!-- Search command spotlight bar -->
		<div class="space-y-4 relative">
			<div class="relative w-full shadow-2xl rounded-2xl overflow-hidden border border-border bg-card/65 backdrop-blur-xl">
				<SearchIcon class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
				<Input 
					type="text" 
					placeholder="Type office code or room name..." 
					bind:value={searchQuery}
					class="pl-12 pr-4 h-14 w-full bg-transparent border-0 focus-visible:ring-0 text-sm font-semibold placeholder:text-muted-foreground/60"
				/>

				<!-- Interactive spotlight search dropdown results -->
				{#if filteredOffices.length > 0}
					<div class="border-t border-border/60 max-h-60 overflow-y-auto p-2 flex flex-col gap-1.5">
						{#each filteredOffices as office}
							<a 
								href="/map?office={office.id}"
								class="flex items-center justify-between p-3 hover:bg-muted/40 rounded-xl transition-all text-xs font-semibold"
							>
								<div class="flex items-center gap-2.5">
									<Badge variant="outline" class="font-mono text-[9px] font-black">{office.code}</Badge>
									<div class="flex flex-col">
										<span class="text-foreground">{office.name}</span>
										<span class="text-[10px] text-muted-foreground font-medium">{office.building} ({office.floor})</span>
									</div>
								</div>
								<MapPinIcon class="size-4 text-muted-foreground shrink-0 pointer-events-none" />
							</a>
						{/each}
					</div>
				{:else if searchQuery.trim() !== ''}
					<div class="border-t border-border/60 py-6 text-center text-xs text-muted-foreground font-semibold">
						No matching campus offices found.
					</div>
				{/if}
			</div>
		</div>

		<!-- Fast actions pill navigation links -->
		<div class="flex flex-wrap items-center justify-center gap-3">
			<Button href="/checkin" variant="secondary" class="rounded-full text-xs font-extrabold h-10 px-5 gap-1.5 border border-border/50">
				<UserCheckIcon class="size-4 text-primary" />
				<span>Visitor Check-In</span>
			</Button>

			<Button href="/map" variant="secondary" class="rounded-full text-xs font-extrabold h-10 px-5 gap-1.5 border border-border/50">
				<CompassIcon class="size-4 text-blue-500" />
				<span>Campus Map</span>
			</Button>

			<Button href="/login" variant="secondary" class="rounded-full text-xs font-extrabold h-10 px-5 gap-1.5 border border-border/50">
				<ShieldCheckIcon class="size-4 text-emerald-500" />
				<span>Security Login</span>
			</Button>
		</div>
	</main>
</div>
