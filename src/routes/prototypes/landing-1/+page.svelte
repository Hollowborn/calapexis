<script lang="ts">
	import { MOCK_OFFICES } from '$lib/supabase';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let searchQuery = $state('');
	let filteredOffices = $derived(
		MOCK_OFFICES.filter(o => 
			o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
			o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
			o.building.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<!-- Top Navigation -->
	<header class="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<a href="/prototypes" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-md shadow-primary/20">
					C
				</div>
				<span class="tracking-tight">Calapexis <span class="text-primary font-normal text-xs uppercase tracking-widest pl-1 font-mono">L1</span></span>
			</a>

			<nav class="flex items-center gap-2">
				<Button href="/checkin" variant="ghost" size="sm" class="text-xs font-bold gap-1.5 rounded-xl">
					<UserCheckIcon class="size-4" />
					<span>Visitor Check-In</span>
				</Button>
				<Button href="/map" variant="ghost" size="sm" class="text-xs font-bold gap-1.5 rounded-xl">
					<CompassIcon class="size-4" />
					<span>Campus Map</span>
				</Button>
				<Button href="/login" variant="default" size="sm" class="text-xs font-extrabold gap-1.5 rounded-xl shadow-md shadow-primary/10">
					<ShieldCheckIcon class="size-4" />
					<span>Admin Portal</span>
				</Button>
				<div class="ml-1">
					<ThemeToggle />
				</div>
			</nav>
		</div>
	</header>

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
		<!-- Hero Section -->
		<section class="relative rounded-3xl border border-border bg-gradient-to-br from-card to-muted/20 p-8 md:p-16 overflow-hidden shadow-2xl">
			<!-- Glowing decorative background blobs -->
			<div class="absolute -right-20 -top-20 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
			<div class="absolute -left-20 -bottom-20 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
			
			<div class="max-w-2xl relative z-10 space-y-6">
				<Badge variant="outline" class="font-bold border-primary/20 bg-primary/5 text-primary rounded-full px-3 py-1 text-xs gap-1.5">
					<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
					Dynamic Campus Guide & Desk Console
				</Badge>
				
				<h1 class="text-4xl md:text-6xl font-black tracking-tight leading-none text-foreground">
					Experience a smarter campus journey.
				</h1>
				
				<p class="text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
					Check in instantly with digital guest passes. Search, query, and navigate through campus offices in real-time with our interactive pathfinding map.
				</p>
				
				<div class="pt-4 flex flex-wrap items-center gap-3">
					<Button href="/checkin" size="lg" class="text-xs font-bold rounded-2xl h-11 px-6 shadow-md shadow-primary/10 gap-2">
						<span>Start Check-In</span>
						<ArrowRightIcon class="size-4" />
					</Button>
					
					<Button href="/map" variant="outline" size="lg" class="text-xs font-bold rounded-2xl h-11 px-6 border-border/85 gap-2">
						<CompassIcon class="size-4" />
						<span>Open Campus Map</span>
					</Button>
				</div>
			</div>
		</section>

		<!-- Statistics Board -->
		<section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
			<Card.Root class="border-border rounded-2xl bg-card">
				<Card.Header class="pb-2">
					<Card.Description class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Visitors</Card.Description>
					<Card.Title class="text-3xl font-black text-foreground">12</Card.Title>
				</Card.Header>
			</Card.Root>
			<Card.Root class="border-border rounded-2xl bg-card">
				<Card.Header class="pb-2">
					<Card.Description class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Checked Out Today</Card.Description>
					<Card.Title class="text-3xl font-black text-foreground">84</Card.Title>
				</Card.Header>
			</Card.Root>
			<Card.Root class="border-border rounded-2xl bg-card">
				<Card.Header class="pb-2">
					<Card.Description class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Avg. Visit Duration</Card.Description>
					<Card.Title class="text-3xl font-black text-foreground">22 min</Card.Title>
				</Card.Header>
			</Card.Root>
		</section>

		<!-- Directory section -->
		<section class="space-y-6">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h2 class="text-2xl font-black text-foreground tracking-tight">Campus Directory</h2>
					<p class="text-xs text-muted-foreground font-semibold">Instantly find details and coordinates of all campus departments.</p>
				</div>

				<div class="relative w-full sm:max-w-xs">
					<SearchIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input 
						type="text" 
						placeholder="Search office or building..." 
						bind:value={searchQuery}
						class="pl-10 rounded-xl h-10 text-xs font-semibold"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each filteredOffices as office}
					<Card.Root class="border-border/80 shadow-xs hover:shadow-md transition-all rounded-2xl bg-card overflow-hidden flex flex-col justify-between">
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between">
								<Badge variant="secondary" class="font-mono font-black text-[10px] rounded-md">{office.code}</Badge>
								<span class="text-[10px] text-muted-foreground font-bold">{office.building}</span>
							</div>
							<Card.Title class="text-base font-extrabold text-foreground pt-2 leading-tight">{office.name}</Card.Title>
							<Card.Description class="text-xs leading-relaxed line-clamp-2 pt-1 font-medium">{office.description}</Card.Description>
						</Card.Header>
						
						<Card.Content class="pt-0 pb-4 text-[11px] font-semibold text-muted-foreground">
							<div><span class="font-bold text-foreground">Location:</span> {office.floor}</div>
						</Card.Content>

						<Card.Footer class="border-t border-border/40 pt-3 flex items-center justify-between">
							<span class="text-[10px] text-muted-foreground font-bold">Coords: {office.xCoord || 'N/A'}, {office.yCoord || 'N/A'}</span>
							<Button href="/map?office={office.id}" variant="ghost" size="sm" class="text-xs font-bold text-primary hover:text-primary gap-1">
								<span>Locate Office</span>
								<MapPinIcon class="size-3.5" />
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		</section>
	</main>
</div>
