<script lang="ts">
	import type { Office, Room, Visitor } from '$lib/types';
	import { addLocalVisitor } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		offices: Office[];
		rooms: Room[];
		onSuccess: (visitor: Visitor) => void;
	}

	let { offices = [], rooms = [], onSuccess }: Props = $props();

	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state('');
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let isSubmitting = $state(false);

	let availableRooms = $derived(
		selectedOfficeId ? rooms.filter((r) => r.officeId === selectedOfficeId) : []
	);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!fullName || !email || !selectedOfficeId || !purpose) return;

		isSubmitting = true;

		const targetOffice = offices.find((o) => o.id === selectedOfficeId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		const newVisitor = addLocalVisitor({
			fullName,
			email,
			phone,
			purpose,
			officeId: selectedOfficeId,
			officeName: targetOffice?.name,
			roomId: selectedRoomId || undefined,
			roomNumber: targetRoom?.roomNumber || undefined,
			hostPerson: hostPerson || targetOffice?.headPerson
		});

		isSubmitting = false;
		onSuccess(newVisitor);
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4 max-w-lg mx-auto bg-card p-6 rounded-xl border border-border shadow-lg">
	<div class="space-y-1">
		<h2 class="text-xl font-bold tracking-tight text-foreground">Digital Visitor Logbook</h2>
		<p class="text-xs text-muted-foreground">Please fill out your visitor check-in details for campus entry.</p>
	</div>

	<div class="space-y-3 pt-2">
		<div>
			<label for="fullName" class="block text-xs font-medium text-foreground mb-1">Full Name *</label>
			<Input
				id="fullName"
				type="text"
				placeholder="e.g. Jane Doe"
				bind:value={fullName}
				required
				class="w-full"
			/>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<div>
				<label for="email" class="block text-xs font-medium text-foreground mb-1">Email Address *</label>
				<Input
					id="email"
					type="email"
					placeholder="jane@example.com"
					bind:value={email}
					required
					class="w-full"
				/>
			</div>
			<div>
				<label for="phone" class="block text-xs font-medium text-foreground mb-1">Mobile Number</label>
				<Input
					id="phone"
					type="tel"
					placeholder="+63 900 000 0000"
					bind:value={phone}
					class="w-full"
				/>
			</div>
		</div>

		<div>
			<label for="purpose" class="block text-xs font-medium text-foreground mb-1">Purpose of Visit *</label>
			<Input
				id="purpose"
				type="text"
				placeholder="e.g. TOR Request, Enrollment, Meeting"
				bind:value={purpose}
				required
				class="w-full"
			/>
		</div>

		<div>
			<label for="office" class="block text-xs font-medium text-foreground mb-1">Destination Office *</label>
			<select
				id="office"
				bind:value={selectedOfficeId}
				required
				class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			>
				<option value="" disabled selected>Select an Office...</option>
				{#each offices as office}
					<option value={office.id}>{office.name} ({office.code})</option>
				{/each}
			</select>
		</div>

		{#if availableRooms.length > 0}
			<div>
				<label for="room" class="block text-xs font-medium text-foreground mb-1">Specific Room (Optional)</label>
				<select
					id="room"
					bind:value={selectedRoomId}
					class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					<option value="">Any / General Counter</option>
					{#each availableRooms as room}
						<option value={room.id}>{room.roomNumber} - {room.roomName}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div>
			<label for="hostPerson" class="block text-xs font-medium text-foreground mb-1">Host / Person to Visit (Optional)</label>
			<Input
				id="hostPerson"
				type="text"
				placeholder="e.g. Dr. Maria Santos"
				bind:value={hostPerson}
				class="w-full"
			/>
		</div>
	</div>

	<div class="pt-3">
		<Button
			type="submit"
			disabled={isSubmitting}
			class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm py-2 rounded-lg transition-colors shadow-md"
		>
			{isSubmitting ? 'Processing Check-in...' : 'Complete Digital Check-In'}
		</Button>
	</div>
</form>
