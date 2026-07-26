<script lang="ts">
	import { MOCK_OFFICES } from '$lib/supabase';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import CommandIcon from '@lucide/svelte/icons/command';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	import AuroraText from '$lib/components/magic/aurora-text/aurora-text.svelte';
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { fade, slide } from 'svelte/transition';

	let searchQuery = $state('');
	let isFocused = $state(false);
	let inputRef = $state<HTMLInputElement | null>(null);

	// Filter offices matching query
	let filteredOffices = $derived(
		searchQuery.trim() === '' 
			? [] 
			: MOCK_OFFICES.filter(o => 
				o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
				o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
				o.building.toLowerCase().includes(searchQuery.toLowerCase())
			)
	);

	// Quick suggestion locations for command spotlight
	const popularOffices = [
		{ id: 'off-1', name: "Registrar & Admissions Office", code: "REG", building: "Administration Building", floor: "1st Floor" },
		{ id: 'off-2', name: "Cashier & Finance Office", code: "CASH", building: "Administration Building", floor: "1st Floor" },
		{ id: 'off-3', name: "College of Computer Studies", code: "CCS", building: "Technology Complex", floor: "2nd Floor" }
	];

	// Keyboard Shortcut handler for Ctrl + K (or Meta + K)
	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			inputRef?.focus();
		}
		if (event.key === 'Escape') {
			inputRef?.blur();
			isFocused = false;
		}
	}

	// Watch clicks outside to close search dropdown
	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (isFocused && !target.closest('.search-container')) {
			isFocused = false;
		}
	}

	$effect(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('click', handleOutsideClick);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('click', handleOutsideClick);
		};
	});
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
	<!-- Ambient Background Glow blobs -->
	<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
	<div class="absolute -right-24 top-1/3 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

	<!-- Top Navigation header -->
	<header class="max-w-5xl w-full mx-auto px-6 h-20 flex items-center justify-between z-10 relative">
		<a href="/" class="flex items-center gap-2.5 font-black text-sm tracking-widest text-foreground hover:opacity-90 transition-opacity">
			<span class="size-2 rounded-full bg-primary animate-pulse"></span>
			<span>CALAPEXIS <span class="text-primary font-normal text-[10px] tracking-widest font-mono">PORTAL</span></span>
		</a>
		<div class="flex items-center gap-2">
			<AnimatedThemeToggler />
		</div>
	</header>

	<!-- Main Workspace Centered Area -->
	<main class="flex-grow max-w-2xl w-full mx-auto px-6 flex flex-col justify-center gap-12 pb-24 z-10 relative">
		
		<!-- Hero copy text with extra premium typography -->
		<div class="text-center space-y-4">
			<Badge variant="outline" class="font-extrabold tracking-widest border-primary/20 bg-primary/5 text-primary rounded-full px-3.5 py-1 text-[10px] gap-1.5 uppercase font-mono mx-auto">
				<SparklesIcon class="size-3 text-primary animate-spin" style="animation-duration: 3s" />
				<span>Digital Pass & Navigation System</span>
			</Badge>
			
			<h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-none text-foreground select-none">
				Find your way <br class="hidden sm:inline" />
				<AuroraText>around campus.</AuroraText>
			</h1>
			
			<p class="text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed max-w-md mx-auto">
				A minimalist navigation gateway. Instantly locate department offices, verify your visitor logs, and explore interactive pathfindings.
			</p>
		</div>

		<!-- Interactive Spotlight Search command block -->
		<div class="space-y-3 relative search-container">
			<div 
				class="relative w-full shadow-2xl rounded-2xl overflow-hidden border transition-all duration-300 bg-card/65 backdrop-blur-xl {isFocused ? 'border-primary ring-2 ring-primary/15' : 'border-border'}"
			>
				<SearchIcon class="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
				
				<Input 
					bind:ref={inputRef}
					type="text" 
					placeholder="Search department, building, or room..." 
					bind:value={searchQuery}
					onfocus={() => (isFocused = true)}
					class="pl-12 pr-16 h-14 w-full bg-transparent border-0 focus-visible:ring-0 text-sm font-semibold placeholder:text-muted-foreground/60 rounded-none"
				/>

				<div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
					<Kbd class="h-6 px-1.5 border border-border shadow-xs bg-muted text-[10px] font-bold">
						Ctrl K
					</Kbd>
				</div>

				<!-- Command Spotlight dropdown list -->
				{#if isFocused}
					<div transition:slide={{ duration: 200 }} class="border-t border-border/60 max-h-72 overflow-y-auto p-2 flex flex-col gap-1 bg-card">
						
						<!-- Search results found -->
						{#if searchQuery.trim() !== ''}
							<div class="px-3 py-1.5 text-[10px] font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
								<CommandIcon class="size-3 text-muted-foreground" />
								<span>Search Results</span>
							</div>

							{#each filteredOffices as office}
								<a 
									href="/map?office={office.id}"
									class="flex items-center justify-between p-3 hover:bg-muted/60 rounded-xl transition-all text-xs font-semibold"
								>
									<div class="flex items-center gap-2.5">
										<Badge variant="secondary" class="font-mono text-[9px] font-black">{office.code}</Badge>
										<div class="flex flex-col">
											<span class="text-foreground">{office.name}</span>
											<span class="text-[10px] text-muted-foreground font-medium">{office.building} ({office.floor})</span>
										</div>
									</div>
									<MapPinIcon class="size-4 text-muted-foreground shrink-0 pointer-events-none" />
								</a>
							{:else}
								<div class="py-8 text-center text-xs text-muted-foreground font-semibold">
									No matching campus offices found.
								</div>
							{/each}

						<!-- Default recent/popular suggestion links -->
						{:else}
							<div class="px-3 py-1.5 text-[10px] font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
								<CommandIcon class="size-3 text-muted-foreground" />
								<span>Frequent Destinations</span>
							</div>

							{#each popularOffices as office}
								<a 
									href="/map?office={office.id}"
									class="flex items-center justify-between p-3 hover:bg-muted/60 rounded-xl transition-all text-xs font-semibold"
								>
									<div class="flex items-center gap-2.5">
										<Badge variant="secondary" class="font-mono text-[9px] font-black">{office.code}</Badge>
										<div class="flex flex-col">
											<span class="text-foreground">{office.name}</span>
											<span class="text-[10px] text-muted-foreground font-medium">{office.building} ({office.floor})</span>
										</div>
									</div>
									<MapPinIcon class="size-4 text-muted-foreground shrink-0 pointer-events-none" />
								</a>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Action Portals Pills layout with premium highlight hover tags -->
		<div class="flex flex-wrap items-center justify-center gap-3">
			<Button href="/checkin" variant="outline" class="rounded-full text-xs font-extrabold h-11 px-6 gap-2 border-border/80 bg-card hover:bg-muted/40 transition-all hover:scale-[1.02]">
				<UserCheckIcon class="size-4 text-primary pointer-events-none" />
				<span>Visitor Check-In</span>
			</Button>

			<Button href="/map" variant="outline" class="rounded-full text-xs font-extrabold h-11 px-6 gap-2 border-border/80 bg-card hover:bg-muted/40 transition-all hover:scale-[1.02]">
				<CompassIcon class="size-4 text-blue-500 pointer-events-none" />
				<span>Campus Map</span>
			</Button>

			<Button href="/login" variant="outline" class="rounded-full text-xs font-extrabold h-11 px-6 gap-2 border-border/80 bg-card hover:bg-muted/40 transition-all hover:scale-[1.02]">
				<ShieldCheckIcon class="size-4 text-emerald-500 pointer-events-none" />
				<span>Console Gateways</span>
			</Button>
		</div>

		<!-- Footnotes -->
		<div class="text-center text-[10px] text-muted-foreground/60 font-semibold flex items-center justify-center gap-2">
			<span>Press</span>
			<Kbd class="h-5 px-1 bg-muted shadow-xs text-[9px] border border-border">Ctrl</Kbd>
			<Kbd class="h-5 px-1 bg-muted shadow-xs text-[9px] border border-border">K</Kbd>
			<span>to query location</span>
		</div>
	</main>
</div>