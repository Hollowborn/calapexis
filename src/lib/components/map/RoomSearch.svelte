<script lang="ts">
	import type { Office, Room } from '$lib/types';
	import { Input } from '$lib/components/ui/input';
	import SearchIcon from '@lucide/svelte/icons/search';

	interface Props {
		offices: Office[];
		rooms: Room[];
		onSelectOffice: (office: Office) => void;
		onSelectRoom?: (room: Room) => void;
	}

	let { offices = [], rooms = [], onSelectOffice, onSelectRoom }: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);

	let filteredOffices = $derived(
		searchQuery.trim() === ''
			? offices
			: offices.filter(
					(o) =>
						o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
						o.building.toLowerCase().includes(searchQuery.toLowerCase())
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

	function handlePickOffice(office: Office) {
		searchQuery = office.name;
		isOpen = false;
		onSelectOffice(office);
	}

	function handlePickRoom(room: Room) {
		searchQuery = `${room.roomNumber} - ${room.roomName}`;
		isOpen = false;
		if (onSelectRoom) onSelectRoom(room);

		const matchingOffice = offices.find((o) => o.id === room.officeId);
		if (matchingOffice) onSelectOffice(matchingOffice);
	}
</script>

<div class="relative w-full max-w-md">
	<div class="relative">
		<Input
			type="text"
			placeholder="Search office, room (e.g. Registrar, Room 101, CCS)..."
			bind:value={searchQuery}
			onfocus={() => (isOpen = true)}
			oninput={() => (isOpen = true)}
			class="w-full bg-background border-border/80 text-sm pl-9 pr-4 py-2 rounded-lg shadow-xs"
		/>
		<SearchIcon class="absolute left-3 top-2.5 size-4 text-muted-foreground" />
	</div>

	{#if isOpen && (filteredOffices.length > 0 || filteredRooms.length > 0)}
		<div
			class="absolute z-50 mt-1 w-full bg-background/95 backdrop-blur-md rounded-lg border border-border shadow-xl max-h-60 overflow-y-auto p-1 divide-y divide-border/40"
		>
			{#if filteredOffices.length > 0}
				<div class="py-1">
					<div class="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						Offices
					</div>
					{#each filteredOffices as office}
						<button
							type="button"
							onclick={() => handlePickOffice(office)}
							class="w-full text-left px-3 py-2 rounded-md hover:bg-accent/80 transition-colors flex items-center justify-between text-xs"
						>
							<div>
								<div class="font-medium text-foreground">{office.name}</div>
								<div class="text-[11px] text-muted-foreground">{office.building} • {office.floor}</div>
							</div>
							<span class="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px]"
								>{office.code}</span
							>
						</button>
					{/each}
				</div>
			{/if}

			{#if filteredRooms.length > 0}
				<div class="py-1">
					<div class="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						Rooms
					</div>
					{#each filteredRooms as room}
						<button
							type="button"
							onclick={() => handlePickRoom(room)}
							class="w-full text-left px-3 py-2 rounded-md hover:bg-accent/80 transition-colors flex items-center justify-between text-xs"
						>
							<div>
								<div class="font-medium text-foreground">{room.roomNumber} - {room.roomName}</div>
								<div class="text-[11px] text-muted-foreground">{room.building}</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
