<script lang="ts">
	// Icons
	import CompassIcon from '@lucide/svelte/icons/compass';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import DoorClosedIcon from '@lucide/svelte/icons/door-closed';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';

	// shadcn-svelte and sv-animations components
	import AnimatedShinyText from '$lib/components/magic/animated-shiny-text/animated-shiny-text.svelte';
	import AuroraText from '$lib/components/magic/aurora-text/aurora-text.svelte';
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Kbd } from '$lib/components/ui/kbd/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Command from '$lib/components/ui/command/index.js';

	let { data } = $props();

	let buildingsList = $derived(data?.buildings || []);
	let officesList = $derived(data?.offices || []);
	let roomsList = $derived(data?.rooms || []);

	let isCommandOpen = $state(false);
	let searchQuery = $state('');

	// Keyboard Shortcut handler for Ctrl + K (or Meta + K)
	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			isCommandOpen = !isCommandOpen;
		}
	}

	$effect(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
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
				<SparklesIcon class="size-3 text-primary animate-duration-3000" />
				<AnimatedShinyText class="text-[10px] font-extrabold tracking-widest uppercase text-primary">
					<span>Digital Pass & Navigation System</span>
				</AnimatedShinyText>
			</Badge>
			
			<h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-none text-foreground select-none">
				Find your way <br class="hidden sm:inline" />
				<AuroraText>around campus.</AuroraText>
			</h1>
			
			<p class="text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed max-w-md mx-auto">
				A minimalist navigation gateway. Instantly locate building landmarks, check into rooms, and explore interactive pathfinding.
			</p>
		</div>

		<!-- Interactive Command Search Trigger Block -->
		<div class="space-y-3 relative">
			<button 
				onclick={() => (isCommandOpen = true)}
				class="w-full h-14 rounded-2xl border border-border bg-card/65 backdrop-blur-xl hover:border-primary/50 shadow-2xl flex items-center justify-between px-4 text-sm text-muted-foreground/60 transition-all select-none cursor-pointer"
			>
				<div class="flex items-center gap-3">
					<SearchIcon class="size-5 text-muted-foreground pointer-events-none" />
					<span class="font-semibold text-xs sm:text-sm">Search building complex, office, or room...</span>
				</div>
				<Kbd class="h-6 px-1.5 border border-border shadow-xs bg-muted text-[10px] font-bold">
					Ctrl K
				</Kbd>
			</button>
		</div>

		<!-- Action Portals Pills layout with premium highlight hover tags -->
		<div class="flex flex-wrap items-center justify-center gap-3">
			<Button href="/v" variant="outline" class="rounded-full text-xs font-extrabold h-11 px-6 gap-2 border-border/80 bg-card hover:bg-muted/40 transition-all hover:scale-[1.02]">
				<UserCheckIcon class="size-4 text-primary pointer-events-none" />
				<span class='flex flex-row items-center'>Visitor Check-In <ArrowUpRightIcon class='ml-1'/></span>
			</Button>

			<Button href="/v?skipSetup=true" variant="outline" class="rounded-full text-xs font-extrabold h-11 px-6 gap-2 border-border/80 bg-card hover:bg-muted/40 transition-all hover:scale-[1.02]">
				<CompassIcon class="size-4 text-blue-500 pointer-events-none" />
				<span class='flex flex-row items-center'>Campus Map <ArrowUpRightIcon class='ml-1'/></span>
			</Button>

			<Button href="/login" variant="outline" class="rounded-full text-xs font-extrabold h-11 px-6 gap-2 border-border/80 bg-card hover:bg-muted/40 transition-all hover:scale-[1.02]">
				<ShieldCheckIcon class="size-4 text-emerald-500 pointer-events-none" />
				<span class='flex flex-row items-center'>Console Gateways <ArrowUpRightIcon class='ml-1'/></span>
			</Button>
		</div>

		<!-- Footnotes -->
		<div class="text-center text-[10px] text-muted-foreground/60 font-semibold flex items-center justify-center gap-2">
			<span>Press</span>
			<Kbd class="h-5 px-1 bg-muted shadow-xs text-[9px] border border-border">Ctrl</Kbd> +
			<Kbd class="h-5 px-1 bg-muted shadow-xs text-[9px] border border-border">K</Kbd>
			<span>to query location</span>
		</div>
	</main>
</div>

<!-- Command Palette Dialog -->
<Command.Dialog 
	bind:open={isCommandOpen} 
	title="Campus Portal Guide" 
	description="Search for rooms, buildings, or access console gateways."
	class="border border-border/80 shadow-2xl overflow-hidden"
>
	<Command.Input placeholder="Search building complex, office, or room..." bind:value={searchQuery} />
	<Command.List class="p-2 max-h-[380px] overflow-y-auto">
		<Command.Empty class="py-6 text-center text-xs text-muted-foreground">No results found.</Command.Empty>
		
		<Command.Group heading="Access Gateways" class="px-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
			<Command.LinkItem href="/v" class="rounded-xl flex items-center gap-2 px-3 py-2 cursor-pointer">
				<UserCheckIcon class="size-4 text-primary pointer-events-none" />
				<span class="font-semibold text-xs text-foreground">Visitor Check-In</span>
				<Command.Shortcut class="text-[9px] font-bold">Check-In</Command.Shortcut>
			</Command.LinkItem>
			
			<Command.LinkItem href="/v?skipSetup=true" class="rounded-xl flex items-center gap-2 px-3 py-2 cursor-pointer">
				<CompassIcon class="size-4 text-blue-500 pointer-events-none" />
				<span class="font-semibold text-xs text-foreground">Campus Map</span>
				<Command.Shortcut class="text-[9px] font-bold">Map</Command.Shortcut>
			</Command.LinkItem>
			
			<Command.LinkItem href="/login" class="rounded-xl flex items-center gap-2 px-3 py-2 cursor-pointer">
				<ShieldCheckIcon class="size-4 text-emerald-500 pointer-events-none" />
				<span class="font-semibold text-xs text-foreground">Console Gateways</span>
				<Command.Shortcut class="text-[9px] font-bold">Desk</Command.Shortcut>
			</Command.LinkItem>
		</Command.Group>
		
		{#if buildingsList.length > 0}
			<Command.Separator class="my-2 bg-border/60" />
			<Command.Group heading="Campus Buildings & Landmarks" class="px-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
				{#each buildingsList as building}
					<Command.LinkItem href="/v?building={building.id}" class="rounded-xl flex items-center gap-2.5 px-3 py-2.5 cursor-pointer font-semibold text-xs">
						<MapPinIcon class="size-4 text-primary pointer-events-none" />
						<div class="flex flex-col gap-0.5">
							<span class="font-bold text-xs text-foreground leading-tight">{building.name}</span>
							<span class="text-[10px] text-muted-foreground font-semibold leading-relaxed">{building.floors || 1} Floors</span>
						</div>
						<Command.Shortcut class="font-mono text-[9px] font-bold">{building.code}</Command.Shortcut>
					</Command.LinkItem>
				{/each}
			</Command.Group>
		{/if}

		{#if officesList.length > 0}
			<Command.Separator class="my-2 bg-border/60" />
			<Command.Group heading="Offices & Services" class="px-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
				{#each officesList as office}
					<Command.LinkItem href="/v?office={office.id}" class="rounded-xl flex items-center gap-2.5 px-3 py-2.5 cursor-pointer font-semibold text-xs">
						<Building2Icon class="size-4 text-blue-500 pointer-events-none" />
						<div class="flex flex-col gap-0.5">
							<span class="font-bold text-xs text-foreground leading-tight">{office.name}</span>
							<span class="text-[10px] text-muted-foreground font-semibold leading-relaxed">{office.buildingName || 'Campus Office'}</span>
						</div>
						<Command.Shortcut class="font-mono text-[9px] font-bold">{office.code}</Command.Shortcut>
					</Command.LinkItem>
				{/each}
			</Command.Group>
		{/if}

		{#if roomsList.length > 0}
			<Command.Separator class="my-2 bg-border/60" />
			<Command.Group heading="Campus Rooms & Labs" class="px-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
				{#each roomsList as room}
					<Command.LinkItem href="/v?room={room.id}" class="rounded-xl flex items-center gap-2.5 px-3 py-2.5 cursor-pointer font-semibold text-xs">
						<DoorClosedIcon class="size-4 text-amber-500 pointer-events-none" />
						<div class="flex flex-col gap-0.5">
							<span class="font-bold text-xs text-foreground leading-tight">{room.roomName} ({room.roomNumber})</span>
							<span class="text-[10px] text-muted-foreground font-semibold leading-relaxed">{room.buildingName || 'Building'} • Floor {room.floor}</span>
						</div>
						<Command.Shortcut class="font-mono text-[9px] font-bold">{room.roomNumber}</Command.Shortcut>
					</Command.LinkItem>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>