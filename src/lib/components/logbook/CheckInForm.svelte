<script lang="ts">
	import type { Building, Room, Visitor } from '$lib/types';
	import { addLocalVisitor } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';

	interface Props {
		buildings: Building[];
		rooms: Room[];
		onSuccess: (visitor: Visitor) => void;
	}

	let { buildings = [], rooms = [], onSuccess }: Props = $props();

	let firstName = $state('');
	let middleName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedBuildingId = $state('');
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let isSubmitting = $state(false);

	let fullName = $derived(`${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' '));

	let availableRooms = $derived(
		selectedBuildingId ? rooms.filter((r) => r.buildingId === selectedBuildingId) : []
	);

	let selectedBuilding = $derived(buildings.find((b) => b.id === selectedBuildingId));
	let selectedRoomName = $derived(
		selectedRoomId ? rooms.find((r) => r.id === selectedRoomId)?.roomName : ''
	);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!firstName || !lastName || !email || !selectedBuildingId || !purpose) return;

		isSubmitting = true;

		const targetBuilding = buildings.find((b) => b.id === selectedBuildingId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		const newVisitor = await addLocalVisitor({
			fullName,
			firstName,
			middleName,
			lastName,
			email,
			phone,
			purpose,
			buildingId: selectedBuildingId,
			buildingName: targetBuilding?.name,
			roomId: selectedRoomId || undefined,
			roomNumber: targetRoom?.roomNumber || undefined,
			hostPerson: hostPerson || targetBuilding?.headPerson,
			verificationStatus: 'approved' // Auto-approve on public desk check-in
		});

		isSubmitting = false;
		onSuccess(newVisitor);
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4 max-w-lg mx-auto bg-card p-6 rounded-xl border border-border shadow-lg font-semibold text-xs">
	<div class="space-y-1">
		<h2 class="text-xl font-bold tracking-tight text-foreground">Digital Visitor Logbook</h2>
		<p class="text-xs text-muted-foreground font-semibold">Please fill out your visitor check-in details for campus entry.</p>
	</div>

	<Field.FieldGroup class="flex flex-col gap-4 pt-2">
		<div class="grid grid-cols-3 gap-2">
			<Field.Field>
				<Field.FieldLabel for="firstName">First Name *</Field.FieldLabel>
				<Input
					id="firstName"
					type="text"
					placeholder="John"
					bind:value={firstName}
					required
					class="rounded-xl h-10 text-xs font-semibold"
				/>
			</Field.Field>
			<Field.Field>
				<Field.FieldLabel for="middleName">Middle Name *</Field.FieldLabel>
				<Input
					id="middleName"
					type="text"
					placeholder="Paul"
					bind:value={middleName}
					required
					class="rounded-xl h-10 text-xs font-semibold"
				/>
			</Field.Field>
			<Field.Field>
				<Field.FieldLabel for="lastName">Last Name *</Field.FieldLabel>
				<Input
					id="lastName"
					type="text"
					placeholder="Doe"
					bind:value={lastName}
					required
					class="rounded-xl h-10 text-xs font-semibold"
				/>
			</Field.Field>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<Field.Field>
				<Field.FieldLabel for="email">Email Address *</Field.FieldLabel>
				<Input
					id="email"
					type="email"
					placeholder="john.doe@example.com"
					bind:value={email}
					required
					class="rounded-xl h-10 text-xs"
				/>
			</Field.Field>
			<Field.Field>
				<Field.FieldLabel for="phone">Mobile Number (Optional)</Field.FieldLabel>
				<Input
					id="phone"
					type="tel"
					placeholder="+63 900 000 0000"
					bind:value={phone}
					class="rounded-xl h-10 text-xs"
				/>
			</Field.Field>
		</div>

		<Field.Field>
			<Field.FieldLabel for="purpose">Purpose of Visit *</Field.FieldLabel>
			<Input
				id="purpose"
				type="text"
				placeholder="e.g. Document Request, Faculty Meeting"
				bind:value={purpose}
				required
				class="rounded-xl h-10 text-xs"
			/>
		</Field.Field>

		<Field.Field>
			<Field.FieldLabel for="building">Destination Building *</Field.FieldLabel>
			<Select.Root type="single" bind:value={selectedBuildingId}>
				<Select.Trigger id="building" class="w-full h-10 rounded-xl cursor-pointer">
					<span class="text-xs font-semibold">
						{selectedBuilding?.name || "Select a Building..."}
					</span>
				</Select.Trigger>
				<Select.Content class="rounded-xl border border-border bg-card">
					<Select.Group>
						{#each buildings as building}
							<Select.Item value={building.id} label={building.name}>
								{building.name} ({building.code})
							</Select.Item>
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</Field.Field>

		{#if availableRooms.length > 0}
			<Field.Field>
				<Field.FieldLabel for="room">Specific Room (Optional)</Field.FieldLabel>
				<Select.Root type="single" bind:value={selectedRoomId}>
					<Select.Trigger id="room" class="w-full h-10 rounded-xl cursor-pointer">
						<span class="text-xs font-semibold">
							{selectedRoomName || "Any / General Counter"}
						</span>
					</Select.Trigger>
					<Select.Content class="rounded-xl border border-border bg-card">
						<Select.Group>
							<Select.Item value="" label="Any / General Counter">
								Any / General Counter
							</Select.Item>
							{#each availableRooms as room}
								<Select.Item value={room.id} label={`${room.roomNumber} - ${room.roomName}`}>
									{room.roomNumber} - {room.roomName}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</Field.Field>
		{/if}

		<Field.Field>
			<Field.FieldLabel for="hostPerson">Host / Person to Visit (Optional)</Field.FieldLabel>
			<Input
				id="hostPerson"
				type="text"
				placeholder="e.g. Dr. Maria Santos"
				bind:value={hostPerson}
				class="rounded-xl h-10 text-xs"
			/>
		</Field.Field>
	</Field.FieldGroup>

	<div class="pt-3">
		<Button
			type="submit"
			disabled={isSubmitting}
			class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-md h-10 cursor-pointer"
		>
			{isSubmitting ? 'Processing Check-in...' : 'Complete Digital Check-In'}
		</Button>
	</div>
</form>
