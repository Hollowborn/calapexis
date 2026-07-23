<script lang="ts">
	import type { Office, Room, Visitor } from '$lib/types';
	import { addLocalVisitor } from '$lib/supabase';
	import MobileCameraSnap from '$lib/components/logbook/MobileCameraSnap.svelte';
	import MobileLeafletMap from '$lib/components/map/MobileLeafletMap.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';

	interface Props {
		offices: Office[];
		rooms: Room[];
	}

	let { offices = [], rooms = [] }: Props = $props();

	let currentStep = $state(1); // Step 1: Info & Photo, Step 2: Purpose & Office, Step 3: Map Navigation
	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state(offices[0]?.id || '');
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let photoUrl = $state('');
	let registeredVisitor: Visitor | null = $state(null);

	let availableRooms = $derived(
		selectedOfficeId ? rooms.filter((r) => r.officeId === selectedOfficeId) : []
	);

	let selectedOffice = $derived(offices.find((o) => o.id === selectedOfficeId));

	function handlePhotoCaptured(dataUrl: string) {
		photoUrl = dataUrl;
		toast.success('Visitor face photo captured!');
	}

	function handleStep1Next() {
		if (!fullName) {
			toast.error('Please enter your full name.');
			return;
		}
		if (!photoUrl) {
			toast.error('Please snap a photo of your face to proceed.');
			return;
		}
		currentStep = 2;
	}

	function handleStep2Submit(e: SubmitEvent) {
		e.preventDefault();
		if (!purpose || !selectedOfficeId) return;

		const targetOffice = offices.find((o) => o.id === selectedOfficeId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		const newVisitor = addLocalVisitor({
			fullName,
			email: email || 'visitor@campus.mobile',
			phone: phone || 'No Mobile Phone',
			purpose,
			officeId: selectedOfficeId,
			officeName: targetOffice?.name,
			roomId: selectedRoomId || undefined,
			roomNumber: targetRoom?.roomNumber || undefined,
			hostPerson: hostPerson || targetOffice?.headPerson,
			photoUrl: photoUrl || undefined
		});

		registeredVisitor = newVisitor;
		currentStep = 3;
		toast.success(`Check-in complete! Directing to ${targetOffice?.code || 'Office'} on map.`);
	}
</script>

<div class="max-w-xl mx-auto w-full flex flex-col gap-4">
	<!-- Progress Indicator Header -->
	<div class="flex items-center justify-between px-2 text-xs font-semibold">
		<span class="flex items-center gap-1.5 text-muted-foreground">
			<span class="w-5 h-5 rounded-full {currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} flex items-center justify-center text-[10px]">1</span>
			<span>Info & Photo</span>
		</span>
		<span class="h-0.5 w-6 bg-border"></span>
		<span class="flex items-center gap-1.5 text-muted-foreground">
			<span class="w-5 h-5 rounded-full {currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} flex items-center justify-center text-[10px]">2</span>
			<span>Destination</span>
		</span>
		<span class="h-0.5 w-6 bg-border"></span>
		<span class="flex items-center gap-1.5 text-muted-foreground">
			<span class="w-5 h-5 rounded-full {currentStep === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} flex items-center justify-center text-[10px]">3</span>
			<span>Live Map Navigation</span>
		</span>
	</div>

	{#if currentStep === 1}
		<!-- Step 1: Personal Info & Camera Selfie -->
		<Card.Root class="shadow-md border-border">
			<Card.Header class="pb-3 text-center">
				<Badge variant="outline" class="w-fit mx-auto border-primary text-primary text-[10px] mb-1">STEP 1 OF 3</Badge>
				<Card.Title class="text-xl font-extrabold text-foreground">Personal Info & Face Photo</Card.Title>
				<Card.Description class="text-xs text-muted-foreground">Name is required. Email and contact phone are optional.</Card.Description>
			</Card.Header>

			<Card.Content class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<label for="mob-fullName" class="text-xs font-semibold text-foreground">Full Name *</label>
					<Input
						id="mob-fullName"
						type="text"
						placeholder="e.g. Alex Morgan"
						bind:value={fullName}
						required
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="flex flex-col gap-1.5">
						<label for="mob-phone" class="text-xs font-semibold text-foreground">Contact Phone (Optional)</label>
						<Input id="mob-phone" type="tel" placeholder="+63 900 000 0000" bind:value={phone} />
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="mob-email" class="text-xs font-semibold text-foreground">Email Address (Optional)</label>
						<Input id="mob-email" type="email" placeholder="alex@example.com" bind:value={email} />
					</div>
				</div>

				<!-- Camera Snapshot Section -->
				<div class="flex flex-col gap-2 pt-2 items-center">
					<div class="text-xs font-semibold text-foreground">Snap Face Photo *</div>
					<MobileCameraSnap onCapture={handlePhotoCaptured} />
				</div>
			</Card.Content>

			<Card.Footer class="pt-2">
				<Button onclick={handleStep1Next} class="w-full bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl shadow-md gap-2">
					<span>Continue to Select Office Destination</span>
					<ArrowRightIcon class="size-4" />
				</Button>
			</Card.Footer>
		</Card.Root>
	{:else if currentStep === 2}
		<!-- Step 2: Purpose of Visit & Destination Office -->
		<Card.Root class="shadow-md border-border">
			<Card.Header class="pb-3 text-center">
				<Badge variant="outline" class="w-fit mx-auto border-primary text-primary text-[10px] mb-1">STEP 2 OF 3</Badge>
				<Card.Title class="text-xl font-extrabold text-foreground">Visit Purpose & Office</Card.Title>
				<Card.Description class="text-xs text-muted-foreground">Select the office and room you want to visit on campus.</Card.Description>
			</Card.Header>

			<Card.Content>
				<form onsubmit={handleStep2Submit} class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="mob-purpose" class="text-xs font-semibold text-foreground">Purpose of Visit *</label>
						<Input
							id="mob-purpose"
							type="text"
							placeholder="e.g. TOR Request, Consultation, Meeting"
							bind:value={purpose}
							required
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="mob-office" class="text-xs font-semibold text-foreground">Destination Office *</label>
						<select
							id="mob-office"
							bind:value={selectedOfficeId}
							required
							class="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
						>
							{#each offices as office}
								<option value={office.id}>{office.name} ({office.code})</option>
							{/each}
						</select>
					</div>

					{#if availableRooms.length > 0}
						<div class="flex flex-col gap-1.5">
							<label for="mob-room" class="text-xs font-semibold text-foreground">Specific Room (Optional)</label>
							<select
								id="mob-room"
								bind:value={selectedRoomId}
								class="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
							>
								<option value="">Any / Reception Counter</option>
								{#each availableRooms as room}
									<option value={room.id}>{room.roomNumber} - {room.roomName}</option>
								{/each}
							</select>
						</div>
					{/if}

					<div class="flex flex-col gap-1.5">
						<label for="mob-host" class="text-xs font-semibold text-foreground">Person / Host to Visit (Optional)</label>
						<Input
							id="mob-host"
							type="text"
							placeholder={selectedOffice?.headPerson || 'Office Staff'}
							bind:value={hostPerson}
						/>
					</div>

					<div class="flex items-center gap-2 pt-2">
						<Button onclick={() => (currentStep = 1)} variant="outline" class="w-1/3 text-xs gap-1">
							<ArrowLeftIcon class="size-4" />
							<span>Back</span>
						</Button>

						<Button type="submit" class="w-2/3 bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl shadow-md gap-2">
							<span>Complete Check-In & Launch Map</span>
							<ArrowRightIcon class="size-4" />
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{:else if currentStep === 3 && registeredVisitor}
		<!-- Step 3: Full Mobile Leaflet Map View & GPS Navigation -->
		<div class="flex flex-col gap-3">
			<div class="p-3 rounded-xl bg-card border border-primary/40 flex items-center justify-between shadow-sm text-xs">
				<div class="flex items-center gap-2">
					{#if registeredVisitor.photoUrl}
						<img src={registeredVisitor.photoUrl} alt="Visitor Selfie" class="w-9 h-9 rounded-full object-cover border border-primary" />
					{/if}
					<div>
						<div class="font-bold text-foreground">{registeredVisitor.fullName}</div>
						<div class="text-[11px] text-primary font-mono">Pass: {registeredVisitor.passCode}</div>
					</div>
				</div>

				<Badge variant="outline" class="border-primary text-primary text-[10px]">DIRECTED TO {registeredVisitor.officeName}</Badge>
			</div>

			<MobileLeafletMap
				{offices}
				{rooms}
				selectedOfficeId={registeredVisitor.officeId}
				selectedRoomId={registeredVisitor.roomId}
				visitorName={registeredVisitor.fullName}
				photoUrl={registeredVisitor.photoUrl}
			/>
		</div>
	{/if}
</div>
