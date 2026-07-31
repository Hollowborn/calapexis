<script lang="ts">
	import type { Building, Room, Visitor } from '$lib/types';
	import { addLocalVisitor } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';

	interface Props {
		buildings: Building[];
		rooms: Room[];
		activeRoomId?: string;
		onSuccess: (visitor: Visitor) => void;
	}

	let { buildings = [], rooms = [], activeRoomId = '', onSuccess }: Props = $props();

	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedBuildingId = $state('');
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let isSubmitting = $state(false);
	let generatedPass: Visitor | null = $state(null);

	$effect(() => {
		if (activeRoomId) {
			selectedRoomId = activeRoomId;
			const parentRoom = rooms.find((r) => r.id === activeRoomId);
			if (parentRoom) {
				selectedBuildingId = parentRoom.buildingId;
			}
		}
	});

	let availableRooms = $derived(
		selectedBuildingId ? rooms.filter((r) => r.buildingId === selectedBuildingId) : []
	);

	let activeBuilding = $derived(buildings.find((b) => b.id === selectedBuildingId));
	let selectedRoomName = $derived(
		selectedRoomId ? rooms.find((r) => r.id === selectedRoomId)?.roomName : ''
	);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!fullName || !selectedBuildingId || !purpose) return;

		isSubmitting = true;

		const targetBuilding = buildings.find((b) => b.id === selectedBuildingId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		// Determine first, middle, last name from fullName
		const parts = fullName.trim().split(/\s+/);
		const firstName = parts[0] || '';
		const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
		const middleName = parts.length > 2 ? parts.slice(1, parts.length - 1).join(' ') : '';

		try {
			const visitor = await addLocalVisitor({
				fullName,
				firstName,
				middleName,
				lastName,
				email: email || 'walkin@campus.visitor',
				phone: phone || 'No Mobile Phone',
				purpose,
				buildingId: selectedBuildingId,
				buildingName: targetBuilding?.name,
				roomId: selectedRoomId || undefined,
				roomNumber: targetRoom?.roomNumber || undefined,
				hostPerson: hostPerson || targetBuilding?.headPerson,
				photoUrl: undefined, // No photo for manual staff desk assisted walk-ins
				verificationStatus: 'approved' // Staff entries are automatically verified
			});

			generatedPass = visitor;
			isSubmitting = false;
			toast.success('Assisted visitor pass issued successfully!', {
				description: `Pass Code: ${visitor.passCode}`
			});
			onSuccess(visitor);
		} catch (err: any) {
			isSubmitting = false;
			toast.error('Check-In Failed', {
				description: err.message || 'Unable to issue visitor pass.'
			});
		}
	}

	function handleReset() {
		generatedPass = null;
		fullName = '';
		email = '';
		phone = '';
		purpose = '';
		hostPerson = '';
		selectedRoomId = '';
	}
</script>

{#if !generatedPass}
	<Card.Root class="max-w-xl mx-auto shadow-md border-border">
		<Card.Header class="pb-4">
			<Card.Title class="text-xl font-bold text-foreground">Assisted Visitor Check-In</Card.Title>
			<Card.Description class="text-xs text-muted-foreground font-semibold">
				Manually register visitors who do not have a mobile phone or mobile data.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleSubmit} class="flex flex-col gap-4 font-semibold text-xs">
				<Field.FieldGroup class="flex flex-col gap-4">
					<Field.Field>
						<Field.FieldLabel for="staff-fullName">Visitor Full Name *</Field.FieldLabel>
						<Input
							id="staff-fullName"
							type="text"
							placeholder="e.g. Maria Clara"
							bind:value={fullName}
							required
							class="rounded-xl h-10 text-xs"
						/>
					</Field.Field>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Field.Field>
							<Field.FieldLabel for="staff-phone">Contact Phone (Optional)</Field.FieldLabel>
							<Input
								id="staff-phone"
								type="tel"
								placeholder="No phone or +63 900 000 0000"
								bind:value={phone}
								class="rounded-xl h-10 text-xs"
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="staff-email">Email Address (Optional)</Field.FieldLabel>
							<Input
								id="staff-email"
								type="email"
								placeholder="Optional email"
								bind:value={email}
								class="rounded-xl h-10 text-xs"
							/>
						</Field.Field>
					</div>

					<Field.Field>
						<Field.FieldLabel for="staff-purpose">Purpose of Visit *</Field.FieldLabel>
						<Input
							id="staff-purpose"
							type="text"
							placeholder="e.g. Inquiry, Document Submission, Consultation"
							bind:value={purpose}
							required
							class="rounded-xl h-10 text-xs"
						/>
					</Field.Field>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Field.Field>
							<Field.FieldLabel for="staff-building">Destination Building *</Field.FieldLabel>
							<Select.Root type="single" bind:value={selectedBuildingId}>
								<Select.Trigger id="staff-building" class="w-full h-10 rounded-xl cursor-pointer">
									<span class="text-xs font-semibold">
										{activeBuilding?.name || "Select a Building..."}
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
								<Field.FieldLabel for="staff-room">Specific Room</Field.FieldLabel>
								<Select.Root type="single" bind:value={selectedRoomId}>
									<Select.Trigger id="staff-room" class="w-full h-10 rounded-xl cursor-pointer">
										<span class="text-xs font-semibold">
											{selectedRoomName || "Any / Reception Counter"}
										</span>
									</Select.Trigger>
									<Select.Content class="rounded-xl border border-border bg-card">
										<Select.Group>
											<Select.Item value="" label="Any / Reception Counter">
												Any / Reception Counter
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
					</div>

					<Field.Field>
						<Field.FieldLabel for="staff-host">Staff / Host Person to Visit</Field.FieldLabel>
						<Input
							id="staff-host"
							type="text"
							placeholder={activeBuilding?.headPerson || 'Office Staff'}
							bind:value={hostPerson}
							class="rounded-xl h-10 text-xs"
						/>
					</Field.Field>
				</Field.FieldGroup>

				<div class="pt-2">
					<Button
						type="submit"
						disabled={isSubmitting}
						class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 h-10 cursor-pointer"
					>
						<UserCheckIcon class="size-4 pointer-events-none" />
						<span>{isSubmitting ? 'Issuing Pass...' : 'Issue Visitor Pass & Register'}</span>
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
{:else}
	<!-- Printable Physical Visitor Pass Slip View -->
	<Card.Root class="max-w-md mx-auto border-2 border-primary/60 shadow-2xl bg-card text-center">
		<Card.Header class="pb-3 border-b border-border">
			<div class="flex items-center justify-between">
				<Badge variant="outline" class="border-primary text-primary font-bold text-[10px] rounded-full">STAFF ASSISTED ENTRY</Badge>
				<span class="text-[10px] text-muted-foreground font-mono">{new Date(generatedPass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
			</div>
			<Card.Title class="text-2xl font-black text-foreground pt-1">{generatedPass.fullName}</Card.Title>
			<Card.Description class="text-xs text-muted-foreground">Assisted Entry • No Mobile Device Required</Card.Description>
		</Card.Header>

		<Card.Content class="py-6 flex flex-col gap-4">
			<div class="p-4 rounded-xl bg-muted/60 border border-border flex flex-col gap-1">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Physical Pass Code</span>
				<div class="text-4xl font-mono font-black text-primary tracking-wider">{generatedPass.passCode}</div>
				<span class="text-[11px] text-muted-foreground italic font-semibold">Provide this pass code to the visitor or write on slip</span>
			</div>

			<div class="grid grid-cols-2 gap-2 text-left text-xs bg-card p-3 rounded-lg border border-border">
				<div>
					<span class="text-muted-foreground text-[10px]">Building Destination:</span>
					<div class="font-bold text-foreground">{generatedPass.buildingName}</div>
				</div>
				<div>
					<span class="text-muted-foreground text-[10px]">Room / Host:</span>
					<div class="font-bold text-foreground">{generatedPass.roomNumber || generatedPass.hostPerson || 'General'}</div>
				</div>
				<div class="col-span-2">
					<span class="text-muted-foreground text-[10px]">Purpose:</span>
					<div class="font-medium text-foreground">{generatedPass.purpose}</div>
				</div>
			</div>
		</Card.Content>

		<Card.Footer class="flex flex-col gap-2 pt-0">
			<Button onclick={() => window.print()} variant="outline" class="w-full text-xs font-semibold flex items-center justify-center gap-2 rounded-xl h-10 cursor-pointer border-border">
				<PrinterIcon class="size-4 pointer-events-none" />
				<span>Print Physical Visitor Slip</span>
			</Button>
			<Button onclick={handleReset} class="w-full bg-primary text-primary-foreground text-xs font-semibold rounded-xl h-10 cursor-pointer">
				Register Another Walk-In Visitor
			</Button>
		</Card.Footer>
	</Card.Root>
{/if}
