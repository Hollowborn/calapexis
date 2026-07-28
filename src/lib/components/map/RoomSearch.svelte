<script lang="ts">
	import type { Building, Room } from '$lib/types';
	import { Input } from '$lib/components/ui/input';
	import SearchIcon from '@lucide/svelte/icons/search';

	interface Props {
		buildings: Building[];
		rooms: Room[];
		onSelectBuilding: (building: Building) => void;
		onSelectRoom?: (room: Room) => void;
	}

	let { buildings = [], rooms = [], onSelectBuilding, onSelectRoom }: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);

	let filteredBuildings = $derived(
		searchQuery.trim() === ''
			? buildings
			: buildings.filter(
					(b) =>
						b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						b.code.toLowerCase().includes(searchQuery.toLowerCase())
			  )
	);

	let filteredRooms = $derived(
		searchQuery.trim() === ''
			? []
			: rooms.filter(
					(r) =>
						r.roomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
						r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
			  )
	);

	function handlePickBuilding(building: Building) {
		searchQuery = building.name;
		isOpen = false;
		onSelectBuilding(building);
	}

	function handlePickRoom(room: Room) {
		searchQuery = `${room.roomNumber} - ${room.roomName}`;
		isOpen = false;
		if (onSelectRoom) onSelectRoom(room);

		const matchingBuilding = buildings.find((b) => b.id === room.buildingId);
		if (matchingBuilding) onSelectBuilding(matchingBuilding);
	}
</script>

<div class="relative w-full max-w-md">
	<div class="relative">
		<Input
			type="text"
			placeholder="Search building, room (e.g. Administration, Room 101, CCS)..."
			bind:value={searchQuery}
			onfocus={() => (isOpen = true)}
			oninput={() => (isOpen = true)}
			class="w-full bg-background border-border/80 text-xs pl-9 pr-4 py-2 rounded-xl shadow-xs h-10 font-semibold"
		/>
		<SearchIcon class="absolute left-3 top-3 size-4 text-muted-foreground" />
	</div>

	{#if isOpen && (filteredBuildings.length > 0 || filteredRooms.length > 0)}
		<div
			class="absolute z-50 mt-1 w-full bg-background/95 backdrop-blur-md rounded-xl border border-border shadow-xl max-h-60 overflow-y-auto p-1 divide-y divide-border/40 font-semibold"
		>
			{#if filteredBuildings.length > 0}
				<div class="py-1">
					<div class="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
						Buildings
					</div>
					{#each filteredBuildings as building}
						<button
							type="button"
							onclick={() => handlePickBuilding(building)}
							class="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/80 transition-colors flex items-center justify-between text-xs"
						>
							<div>
								<div class="font-bold text-foreground">{building.name}</div>
								<div class="text-[10px] text-muted-foreground">{building.floors} Floors</div>
							</div>
							<span class="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-mono text-[10px]"
								>{building.code}</span
							>
						</button>
					{/each}
				</div>
			{/if}

			{#if filteredRooms.length > 0}
				<div class="py-1">
					<div class="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
						Rooms
					</div>
					{#each filteredRooms as room}
						<button
							type="button"
							onclick={() => handlePickRoom(room)}
							class="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/80 transition-colors flex items-center justify-between text-xs"
						>
							<div>
								<div class="font-bold text-foreground">{room.roomNumber} - {room.roomName}</div>
								<div class="text-[10px] text-muted-foreground">
									{buildings.find(b => b.id === room.buildingId)?.name || 'Building'}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
