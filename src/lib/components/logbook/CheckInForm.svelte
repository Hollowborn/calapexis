<script lang="ts">
	import type { Office, Room, Visitor } from '$lib/types';
	import { addLocalVisitor } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';

	interface Props {
		offices: Office[];
		rooms: Room[];
		onSuccess: (visitor: Visitor) => void;
	}

	let { offices = [], rooms = [], onSuccess }: Props = $props();

	let firstName = $state('');
	let middleName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state('');
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let isSubmitting = $state(false);

	let fullName = $derived(`${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' '));

	let availableRooms = $derived(
		selectedOfficeId ? rooms.filter((r) => r.officeId === selectedOfficeId) : []
	);

	let selectedOffice = $derived(offices.find((o) => o.id === selectedOfficeId));
	let selectedRoomName = $derived(
		selectedRoomId ? rooms.find((r) => r.id === selectedRoomId)?.roomName : ''
	);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!firstName || !lastName || !email || !selectedOfficeId || !purpose) return;

		isSubmitting = true;

		const targetOffice = offices.find((o) => o.id === selectedOfficeId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		const newVisitor = await addLocalVisitor({
			fullName,
			firstName,
			middleName,
			lastName,
			email,
			phone,
			purpose,
			officeId: selectedOfficeId,
			officeName: targetOffice?.name,
			roomId: selectedRoomId || undefined,
			roomNumber: targetRoom?.roomNumber || undefined,
			hostPerson: hostPerson || targetOffice?.headPerson,
			verificationStatus: 'approved' // Auto-approve on public desk check-in
		});

		isSubmitting = false;
		onSuccess(newVisitor);
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4 max-w-lg mx-auto bg-card p-6 rounded-xl border border-border shadow-lg">
	<div class="space-y-1">
		<h2 class="text-xl font-bold tracking-tight text-foreground">Digital Visitor Logbook</h2>
		<p class="text-xs text-muted-foreground">Please fill out your visitor check-in details for campus entry.</p>
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
				/>
			</Field.Field>
			<Field.Field>
				<Field.FieldLabel for="phone">Mobile Number (Optional)</Field.FieldLabel>
				<Input
					id="phone"
					type="tel"
					placeholder="+63 900 000 0000"
					bind:value={phone}
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
			/>
		</Field.Field>

		<Field.Field>
			<Field.FieldLabel for="office">Destination Office *</Field.FieldLabel>
			<Select.Root type="single" bind:value={selectedOfficeId}>
				<Select.Trigger id="office" class="w-full h-10">
					<span class="text-sm font-medium">
						{selectedOffice?.name || "Select an Office..."}
					</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						{#each offices as office}
							<Select.Item value={office.id} label={office.name}>
								{office.name} ({office.code})
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
					<Select.Trigger id="room" class="w-full h-10">
						<span class="text-sm font-medium">
							{selectedRoomName || "Any / General Counter"}
						</span>
					</Select.Trigger>
					<Select.Content>
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
			/>
		</Field.Field>
	</Field.FieldGroup>

	<div class="pt-3">
		<Button
			type="submit"
			disabled={isSubmitting}
			class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm py-2.5 rounded-lg transition-colors shadow-md"
		>
			{isSubmitting ? 'Processing Check-in...' : 'Complete Digital Check-In'}
		</Button>
	</div>
</form>
