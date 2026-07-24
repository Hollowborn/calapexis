<script lang="ts">
	import type { Office, Room, Visitor, VerificationStatus } from '$lib/types';
	import { addLocalVisitor, getLocalVisitors } from '$lib/supabase';
	import MobileCameraSnap from '$lib/components/logbook/MobileCameraSnap.svelte';
	import MobileLeafletMap from '$lib/components/map/MobileLeafletMap.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { toast } from 'svelte-sonner';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		offices: Office[];
		rooms: Room[];
	}

	let { offices = [], rooms = [] }: Props = $props();

	let currentStep = $state(1); // Step 1: Info & Photo, Step 2: Purpose & Office, Step 3: Map Navigation
	let firstName = $state('');
	let middleName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state(offices[0]?.id || '');
	let selectedRoomId = $state('');
	let hostPerson = $state('');
	let photoUrl = $state('');
	let registeredVisitor: Visitor | null = $state(null);

	let fullName = $derived(`${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' '));

	let availableRooms = $derived(
		selectedOfficeId ? rooms.filter((r) => r.officeId === selectedOfficeId) : []
	);

	let selectedOffice = $derived(offices.find((o) => o.id === selectedOfficeId));
	let selectedRoomName = $derived(
		selectedRoomId ? rooms.find((r) => r.id === selectedRoomId)?.roomName : ''
	);

	// Poll local store to reflect security approvals/rejections in real time on client
	$effect(() => {
		if (registeredVisitor && currentStep === 3) {
			const interval = setInterval(async () => {
				const currentVisitors = await getLocalVisitors();
				const freshData = currentVisitors.find((v) => v.id === registeredVisitor?.id);
				if (freshData) {
					registeredVisitor = freshData;
				}
			}, 1500);
			return () => clearInterval(interval);
		}
	});

	function handlePhotoCaptured(dataUrl: string) {
		photoUrl = dataUrl;
		toast.success('Visitor face photo captured!');
	}

	function handleStep1Next() {
		if (!firstName || !lastName) {
			toast.error('First Name and Last Name are required.');
			return;
		}
		if (!photoUrl) {
			toast.error('Selfie photo capture is required to replace paper logbook.');
			return;
		}
		currentStep = 2;
	}

	async function handleStep2Submit(e: SubmitEvent) {
		e.preventDefault();
		if (!purpose || !selectedOfficeId) return;

		const targetOffice = offices.find((o) => o.id === selectedOfficeId);
		const targetRoom = rooms.find((r) => r.id === selectedRoomId);

		const newVisitor = await addLocalVisitor({
			fullName,
			firstName,
			middleName,
			lastName,
			email: email || 'visitor@campus.mobile',
			phone: phone || 'No Mobile Phone',
			purpose,
			officeId: selectedOfficeId,
			officeName: targetOffice?.name,
			roomId: selectedRoomId || undefined,
			roomNumber: targetRoom?.roomNumber || undefined,
			hostPerson: hostPerson || targetOffice?.headPerson,
			photoUrl: photoUrl || undefined,
			verificationStatus: 'approved' // Auto-approve by default, guards can override
		});

		registeredVisitor = newVisitor;
		currentStep = 3;
		toast.success(`Check-in complete! Directing to ${targetOffice?.code || 'Office'} on map.`);
	}

	function handleReRegister() {
		registeredVisitor = null;
		currentStep = 1;
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
			<span>Live Navigation</span>
		</span>
	</div>

	{#if currentStep === 1}
		<!-- Step 1: Personal Info & Camera Selfie -->
		<Card.Root class="shadow-md border-border">
			<Card.Header class="pb-3 text-center">
				<Badge variant="outline" class="w-fit mx-auto border-primary text-primary text-[10px] mb-1">STEP 1 OF 3</Badge>
				<Card.Title class="text-xl font-extrabold text-foreground font-sans">Personal Information & Photo</Card.Title>
				<Card.Description class="text-xs text-muted-foreground">Names and live face photo are required. Contact details are optional.</Card.Description>
			</Card.Header>

			<Card.Content class="flex flex-col gap-4">
				<Field.FieldGroup class="flex flex-col gap-4">
					<div class="grid grid-cols-3 gap-2">
						<Field.Field>
							<Field.FieldLabel for="mob-firstName">First Name *</Field.FieldLabel>
							<Input
								id="mob-firstName"
								type="text"
								placeholder="e.g. John"
								bind:value={firstName}
								required
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="mob-middleName">Middle Name *</Field.FieldLabel>
							<Input
								id="mob-middleName"
								type="text"
								placeholder="e.g. Paul"
								bind:value={middleName}
								required
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="mob-lastName">Last Name *</Field.FieldLabel>
							<Input
								id="mob-lastName"
								type="text"
								placeholder="e.g. Doe"
								bind:value={lastName}
								required
							/>
						</Field.Field>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<Field.Field>
							<Field.FieldLabel for="mob-phone">Contact Phone (Optional)</Field.FieldLabel>
							<Input id="mob-phone" type="tel" placeholder="+63 900 000 0000" bind:value={phone} />
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="mob-email">Email Address (Optional)</Field.FieldLabel>
							<Input id="mob-email" type="email" placeholder="john.doe@example.com" bind:value={email} />
						</Field.Field>
					</div>
				</Field.FieldGroup>

				<!-- Camera Snapshot Section -->
				<div class="flex flex-col gap-2 pt-2 items-center">
					<div class="text-xs font-semibold text-foreground">Snap Face Photo (Required) *</div>
					<MobileCameraSnap onCapture={handlePhotoCaptured} />
				</div>
			</Card.Content>

			<Card.Footer class="pt-2">
				<Button onclick={handleStep1Next} class="w-full bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2">
					<span>Continue to Select Office Destination</span>
					<ArrowRightIcon class="size-4 pointer-events-none" />
				</Button>
			</Card.Footer>
		</Card.Root>
	{:else if currentStep === 2}
		<!-- Step 2: Purpose of Visit & Destination Office -->
		<Card.Root class="shadow-md border-border">
			<Card.Header class="pb-3 text-center">
				<Badge variant="outline" class="w-fit mx-auto border-primary text-primary text-[10px] mb-1">STEP 2 OF 3</Badge>
				<Card.Title class="text-xl font-extrabold text-foreground font-sans">Visit Purpose & Office</Card.Title>
				<Card.Description class="text-xs text-muted-foreground">Select the office and room you want to visit on campus.</Card.Description>
			</Card.Header>

			<Card.Content>
				<form onsubmit={handleStep2Submit} class="flex flex-col gap-4">
					<Field.FieldGroup class="flex flex-col gap-4">
						<Field.Field>
							<Field.FieldLabel for="mob-purpose">Purpose of Visit *</Field.FieldLabel>
							<Input
								id="mob-purpose"
								type="text"
								placeholder="e.g. Document Request, Faculty Meeting"
								bind:value={purpose}
								required
							/>
						</Field.Field>

						<Field.Field>
							<Field.FieldLabel for="mob-office">Destination Office *</Field.FieldLabel>
							<Select.Root type="single" bind:value={selectedOfficeId}>
								<Select.Trigger id="mob-office" class="w-full h-10">
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
								<Field.FieldLabel for="mob-room">Specific Room (Optional)</Field.FieldLabel>
								<Select.Root type="single" bind:value={selectedRoomId}>
									<Select.Trigger id="mob-room" class="w-full h-10">
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
							<Field.FieldLabel for="mob-host">Person / Host to Visit (Optional)</Field.FieldLabel>
							<Input
								id="mob-host"
								type="text"
								placeholder={selectedOffice?.headPerson || 'Office Head / Staff'}
								bind:value={hostPerson}
							/>
						</Field.Field>
					</Field.FieldGroup>

					<div class="flex items-center gap-2 pt-2">
						<Button onclick={() => (currentStep = 1)} variant="outline" class="w-1/3 text-xs flex items-center justify-center gap-1">
							<ArrowLeftIcon class="size-4 pointer-events-none" />
							<span>Back</span>
						</Button>

						<Button type="submit" class="w-2/3 bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2">
							<span>Complete Check-In & Launch Map</span>
							<ArrowRightIcon class="size-4 pointer-events-none" />
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{:else if currentStep === 3 && registeredVisitor}
		{#if registeredVisitor.verificationStatus === 'rejected'}
			<!-- Rejection Screen: Guards Declined Pass -->
			<Card.Root class="shadow-xl border-destructive bg-destructive/5 text-center">
				<Card.Header class="pb-3 text-center">
					<div class="w-12 h-12 mx-auto rounded-full bg-destructive/15 text-destructive flex items-center justify-center mb-2">
						<ShieldAlertIcon class="size-6 pointer-events-none" />
					</div>
					<Card.Title class="text-xl font-bold text-destructive">Visitor Pass Declined</Card.Title>
					<Card.Description class="text-xs text-muted-foreground">Your request was declined by campus security personnel.</Card.Description>
				</Card.Header>

				<Card.Content class="flex flex-col gap-4">
					<div class="bg-card p-4 rounded-xl border border-destructive/20 text-sm">
						<div class="font-bold text-foreground mb-1 text-xs uppercase tracking-wider">Rejection Reason:</div>
						<p class="text-muted-foreground font-medium">{registeredVisitor.rejectionReason || 'No reason provided by gate personnel.'}</p>
					</div>
					<p class="text-xs text-muted-foreground leading-relaxed">
						Please click the button below to re-enter valid identification details, take a clearer selfie snapshot, or verify your host purpose before submitting again.
					</p>
				</Card.Content>

				<Card.Footer>
					<Button onclick={handleReRegister} class="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs py-2.5 rounded-xl">
						Correct Details & Register Again
					</Button>
				</Card.Footer>
			</Card.Root>
		{:else if registeredVisitor.verificationStatus === 'pending'}
			<!-- Pending Verification State -->
			<Card.Root class="shadow-xl border-amber-500 bg-amber-500/5 text-center py-8">
				<Card.Header class="pb-3 text-center">
					<div class="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
						<Loader2Icon class="size-6 animate-spin pointer-events-none" />
					</div>
					<Card.Title class="text-xl font-bold text-amber-600">Awaiting Gate Approval</Card.Title>
					<Card.Description class="text-xs text-muted-foreground">Security personnel are checking your photo & visitor details.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-2">
					<div class="text-sm font-semibold">Pass Code: {registeredVisitor.passCode}</div>
					<p class="text-xs text-muted-foreground max-w-sm mx-auto">
						Please present this screen to the gate officer. The application will automatically load your campus navigation directions once approved.
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- Step 3: Full Mobile Leaflet Map View & GPS Navigation -->
			<div class="flex flex-col gap-3">
				<div class="p-3 rounded-xl bg-card border border-primary/40 flex items-center justify-between shadow-sm text-xs">
					<div class="flex items-center gap-2">
						{#if registeredVisitor.photoUrl}
							<img src={registeredVisitor.photoUrl} alt="Visitor Selfie" class="w-9 h-9 rounded-full object-cover border border-primary" />
						{/if}
						<div>
							<div class="font-bold text-foreground">{registeredVisitor.fullName}</div>
							<div class="text-[11px] text-primary font-mono flex items-center gap-1">
								<span>Pass: {registeredVisitor.passCode}</span>
								<span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
								<span class="text-[9px] uppercase font-bold text-green-500">Verified</span>
							</div>
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
					visitorId={registeredVisitor.id}
				/>
			</div>
		{/if}
	{/if}
</div>
