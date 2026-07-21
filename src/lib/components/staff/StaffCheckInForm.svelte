<script lang="ts">
	import type { Office, Room, Visitor } from '$lib/types';
	import { addLocalVisitor } from '$lib/supabase';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		offices: Office[];
		rooms: Room[];
		activeOfficeId: string;
		onSuccess: (visitor: Visitor) => void;
	}

	let { offices = [], rooms = [], activeOfficeId = '', onSuccess }: Props = $props();

	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state(activeOfficeId);
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let isSubmitting = $state(false);
	let generatedPass: Visitor | null = $state(null);

	$effect(() => {
		if (activeOfficeId) {
			selectedOfficeId = activeOfficeId;
		}
	});

	let availableRooms = $derived(
		selectedOfficeId ? rooms.filter((r) => r.officeId === selectedOfficeId) : []
	);

	let activeOffice = $derived(offices.find((o) => o.id === selectedOfficeId));

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!fullName || !selectedOfficeId || !purpose) return;

		isSubmitting = true;

		const targetOffice = offices.find((o) => o.id === selectedOfficeId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		const visitor = addLocalVisitor({
			fullName,
			email: email || 'walkin@campus.visitor',
			phone: phone || 'No Mobile Phone',
			purpose,
			officeId: selectedOfficeId,
			officeName: targetOffice?.name,
			roomId: selectedRoomId || undefined,
			roomNumber: targetRoom?.roomNumber || undefined,
			hostPerson: hostPerson || targetOffice?.headPerson
		});

		generatedPass = visitor;
		isSubmitting = false;
		onSuccess(visitor);
	}

	function handleReset() {
		generatedPass = null;
		fullName = '';
		email = '';
		phone = '';
		purpose = '';
		hostPerson = '';
	}
</script>

{#if !generatedPass}
	<Card.Root class="max-w-xl mx-auto shadow-md border-border">
		<Card.Header class="pb-4">
			<Card.Title class="text-xl font-bold text-foreground">Assisted Visitor Check-In</Card.Title>
			<Card.Description class="text-xs text-muted-foreground">
				Manually register visitors who do not have a mobile phone or mobile data.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleSubmit} class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<label for="staff-fullName" class="text-xs font-semibold text-foreground">Visitor Full Name *</label>
					<Input
						id="staff-fullName"
						type="text"
						placeholder="e.g. Maria Clara"
						bind:value={fullName}
						required
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="staff-phone" class="text-xs font-semibold text-foreground">Contact Phone (Optional)</label>
						<Input
							id="staff-phone"
							type="tel"
							placeholder="No phone or +63 900 000 0000"
							bind:value={phone}
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="staff-email" class="text-xs font-semibold text-foreground">Email Address (Optional)</label>
						<Input
							id="staff-email"
							type="email"
							placeholder="Optional email"
							bind:value={email}
						/>
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="staff-purpose" class="text-xs font-semibold text-foreground">Purpose of Visit *</label>
					<Input
						id="staff-purpose"
						type="text"
						placeholder="e.g. Inquiry, Document Submission, Consultation"
						bind:value={purpose}
						required
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="staff-office" class="text-xs font-semibold text-foreground">Destination Office *</label>
						<select
							id="staff-office"
							bind:value={selectedOfficeId}
							required
							class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
						>
							{#each offices as office}
								<option value={office.id}>{office.name} ({office.code})</option>
							{/each}
						</select>
					</div>

					{#if availableRooms.length > 0}
						<div class="flex flex-col gap-1.5">
							<label for="staff-room" class="text-xs font-semibold text-foreground">Specific Room</label>
							<select
								id="staff-room"
								bind:value={selectedRoomId}
								class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
							>
								<option value="">Any / Reception Counter</option>
								{#each availableRooms as room}
									<option value={room.id}>{room.roomNumber} - {room.roomName}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="staff-host" class="text-xs font-semibold text-foreground">Staff / Host Person to Visit</label>
					<Input
						id="staff-host"
						type="text"
						placeholder={activeOffice?.headPerson || 'Office Staff'}
						bind:value={hostPerson}
					/>
				</div>

				<div class="pt-2">
					<Button
						type="submit"
						disabled={isSubmitting}
						class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2.5 rounded-lg shadow-md"
					>
						{isSubmitting ? 'Issuing Pass...' : 'Issue Visitor Pass & Register'}
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
				<Badge variant="outline" class="border-primary text-primary font-bold text-[10px]">STAFF ASSISTED ENTRY</Badge>
				<span class="text-[10px] text-muted-foreground font-mono">{new Date(generatedPass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
			</div>
			<Card.Title class="text-2xl font-black text-foreground pt-1">{generatedPass.fullName}</Card.Title>
			<Card.Description class="text-xs text-muted-foreground">Assisted Entry • No Mobile Device Required</Card.Description>
		</Card.Header>

		<Card.Content class="py-6 flex flex-col gap-4">
			<div class="p-4 rounded-xl bg-muted/60 border border-border flex flex-col gap-1">
				<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Physical Pass Code</span>
				<div class="text-4xl font-mono font-black text-primary tracking-wider">{generatedPass.passCode}</div>
				<span class="text-[11px] text-muted-foreground italic">Provide this pass code to the visitor or write on slip</span>
			</div>

			<div class="grid grid-cols-2 gap-2 text-left text-xs bg-card p-3 rounded-lg border border-border">
				<div>
					<span class="text-muted-foreground text-[10px]">Office Destination:</span>
					<div class="font-bold text-foreground">{generatedPass.officeName}</div>
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
			<Button onclick={() => window.print()} variant="outline" class="w-full text-xs font-semibold">
				🖨️ Print Physical Visitor Slip
			</Button>
			<Button onclick={handleReset} class="w-full bg-primary text-primary-foreground text-xs font-semibold">
				Register Another Walk-In Visitor
			</Button>
		</Card.Footer>
	</Card.Root>
{/if}
