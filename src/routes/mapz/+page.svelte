<script lang="ts">
	import { onMount } from 'svelte';
	import type { Building, Room } from '$lib/types';
	import { MOCK_BUILDINGS, MOCK_ROOMS } from '$lib/supabase';
	import LeafletMap from '$lib/components/map/LeafletMap.svelte';
	import RoomSearch from '$lib/components/map/RoomSearch.svelte';
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";

	let selectedBuilding: Building | null = $state(null);
	let selectedRoom: Room | null = $state(null);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const buildingId = params.get('building');
		if (buildingId) {
			const found = MOCK_BUILDINGS.find((b) => b.id === buildingId);
			if (found) selectedBuilding = found;
		}
	});

	function handleSelectBuilding(building: Building) {
		selectedBuilding = building;
		selectedRoom = null;
	}

	function handleSelectRoom(room: Room) {
		selectedRoom = room;
	}
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans font-semibold text-xs">
	<!-- Interactive Map Header Layout -->
	<header class="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
					M
				</div>
				<span class="tracking-tight">CampusMap <span class="text-primary font-normal text-sm">Interactive Guide</span></span>
			</a>

			<nav class="flex items-center gap-2">
				<a href="/checkin" class="text-xs font-medium text-muted-foreground hover:text-foreground">Visitor Check-In</a>
				<a href="/staff" class="text-xs font-medium text-primary hover:underline ml-2">Staff Desk</a>
				<a href="/admin" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-xs">Admin Portal</a>
				<div class="ml-1">
					<AnimatedThemeToggler />
				</div>
			</nav>
		</div>
	</header>

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
		<!-- Page Header & Search Bar -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
			<div>
				<h1 class="text-xl font-bold tracking-tight text-foreground">Interactive Campus Map & Room Navigation</h1>
				<p class="text-xs text-muted-foreground font-semibold">Select a building or search for rooms to get directional route guidance.</p>
			</div>

			<RoomSearch
				buildings={MOCK_BUILDINGS}
				rooms={MOCK_ROOMS}
				onSelectBuilding={handleSelectBuilding}
				onSelectRoom={handleSelectRoom}
			/>
		</div>

		<!-- Main Map Grid Area -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2">
				<LeafletMap
					buildings={MOCK_BUILDINGS}
					rooms={MOCK_ROOMS}
					selectedBuildingId={selectedBuilding?.id}
					selectedRoomId={selectedRoom?.id}
					onSelectBuilding={handleSelectBuilding}
				/>
			</div>

			<!-- Selected Destination Building Sidebar -->
			<div class="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4 h-fit">
				{#if selectedBuilding}
					<div class="space-y-2 pb-3 border-b border-border">
						<div class="flex items-center justify-between">
							<span class="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-bold">
								{selectedBuilding.code}
							</span>
							<span class="text-xs text-muted-foreground">{selectedBuilding.floors} Floors</span>
						</div>
						<h2 class="text-lg font-bold text-foreground">{selectedBuilding.name}</h2>
						<p class="text-xs text-muted-foreground">{selectedBuilding.description}</p>
					</div>

					<div class="space-y-2 text-xs">
						{#if selectedBuilding.headPerson}
							<div>
								<span class="text-muted-foreground">Building Admin/Head:</span>
								<span class="font-semibold text-foreground ml-1">{selectedBuilding.headPerson}</span>
							</div>
						{/if}
					</div>

					<div class="pt-2 border-t border-border">
						<h3 class="text-xs font-bold text-foreground mb-2">Directional Waypoint Route:</h3>
						<ol class="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
							<li>Enter via <span class="font-medium text-foreground">Main Campus Gate</span>.</li>
							<li>Proceed straight through the <span class="font-medium text-foreground">Central Quadrangle Walkway</span>.</li>
							<li>Turn toward the <span class="font-bold text-primary">{selectedBuilding.name}</span> entrance.</li>
						</ol>
					</div>

					<div class="pt-2">
						<a
							href="/checkin"
							class="block text-center w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition-colors h-10 flex items-center justify-center cursor-pointer"
						>
							Check In for Visit to {selectedBuilding.code} →
						</a>
					</div>
				{:else}
					<div class="text-center py-10 space-y-2 text-muted-foreground">
						<svg class="w-10 h-10 mx-auto text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
						</svg>
						<div class="text-sm font-semibold text-foreground">No Building Selected</div>
						<p class="text-xs max-w-xs mx-auto">Click any map marker or use the search bar above to view room directions.</p>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
