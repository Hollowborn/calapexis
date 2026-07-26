<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { Office, Room } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { slide } from 'svelte/transition';
	
	// Icons
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import SchoolIcon from "@lucide/svelte/icons/school";
	import LocateIcon from "@lucide/svelte/icons/locate";

	let { data } = $props();

	// Derived lists from loader data
	let offices = $derived(data.offices || []);
	let rooms = $derived(data.rooms || []);

	// UI states
	let isCreatingOffice = $state(false);
	let expandedOfficeId = $state<string | null>(null);
	let activeQrOffice = $state<Office | null>(null);

	// SvelteKit form submission enhance handlers
	const handleCreateOfficeEnhance: SubmitFunction = () => {
		let resolveCreateOffice: (v?: any) => void;
		let rejectCreateOffice: (e: any) => void;
		const createPromise = new Promise((resolve, reject) => {
			resolveCreateOffice = resolve;
			rejectCreateOffice = reject;
		});

		toast.promise(createPromise, {
			loading: "Creating campus office...",
			success: "Office created successfully!",
			error: (err: any) => err.message || "Failed to create office."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveCreateOffice();
				isCreatingOffice = false;
				await update();
			} else if (result.type === "failure") {
				rejectCreateOffice(new Error((result.data as any)?.message || "Failed to create office."));
			} else {
				rejectCreateOffice(new Error("Unexpected error."));
			}
		};
	};

	const handleDeleteOfficeEnhance: SubmitFunction = () => {
		let resolveDelete: (v?: any) => void;
		let rejectDelete: (e: any) => void;
		const deletePromise = new Promise((resolve, reject) => {
			resolveDelete = resolve;
			rejectDelete = reject;
		});

		toast.promise(deletePromise, {
			loading: "Deleting campus office...",
			success: "Office deleted successfully!",
			error: (err: any) => err.message || "Failed to delete office."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveDelete();
				await update();
			} else if (result.type === "failure") {
				rejectDelete(new Error((result.data as any)?.message || "Failed to delete office."));
			} else {
				rejectDelete(new Error("Unexpected error."));
			}
		};
	};

	const handleCreateRoomEnhance: SubmitFunction = () => {
		let resolveCreateRoom: (v?: any) => void;
		let rejectCreateRoom: (e: any) => void;
		const createPromise = new Promise((resolve, reject) => {
			resolveCreateRoom = resolve;
			rejectCreateRoom = reject;
		});

		toast.promise(createPromise, {
			loading: "Creating classroom/lab...",
			success: "Room created successfully!",
			error: (err: any) => err.message || "Failed to create room."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveCreateRoom();
				await update();
			} else if (result.type === "failure") {
				rejectCreateRoom(new Error((result.data as any)?.message || "Failed to create room."));
			} else {
				rejectCreateRoom(new Error("Unexpected error."));
			}
		};
	};

	const handleDeleteRoomEnhance: SubmitFunction = () => {
		let resolveDeleteRoom: (v?: any) => void;
		let rejectDeleteRoom: (e: any) => void;
		const deletePromise = new Promise((resolve, reject) => {
			resolveDeleteRoom = resolve;
			rejectDeleteRoom = reject;
		});

		toast.promise(deletePromise, {
			loading: "Deleting classroom/lab...",
			success: "Room deleted successfully!",
			error: (err: any) => err.message || "Failed to delete room."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveDeleteRoom();
				await update();
			} else if (result.type === "failure") {
				rejectDeleteRoom(new Error((result.data as any)?.message || "Failed to delete room."));
			} else {
				rejectDeleteRoom(new Error("Unexpected error."));
			}
		};
	};
</script>

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Offices & Rooms Config</h1>
			<p class="text-xs text-muted-foreground leading-relaxed">Manage campus rooms and generate printable department QR passes.</p>
		</div>
		<Button onclick={() => (isCreatingOffice = true)} class="text-xs font-extrabold gap-1.5 rounded-xl h-10 shadow-md shadow-primary/10 cursor-pointer">
			<PlusIcon class="size-4 pointer-events-none" />
			<span>Add Campus Office</span>
		</Button>
	</div>

	<!-- Office Cards Grid -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-extrabold text-foreground uppercase tracking-wider">Campus Departments & QR Code Setup</h2>
			<span class="text-xs text-muted-foreground font-semibold">{offices.length} offices loaded.</span>
		</div>

		<div class="grid grid-cols-1 gap-6">
			{#each offices as office (office.id)}
				<Card.Root class="border-border shadow-xs rounded-2xl bg-card overflow-hidden transition-all">
					<Card.Header class="pb-3 border-b border-border/45 bg-muted/20">
						<div class="flex items-center justify-between flex-wrap gap-2">
							<div class="flex items-center gap-2">
								<Badge variant="secondary" class="font-mono font-black text-xs px-2 py-0.5 rounded-lg">{office.code}</Badge>
								{#if office.color}
									<span class="size-3 rounded-full border border-border" style="background-color: {office.color};"></span>
								{/if}
							</div>
							<span class="text-[11px] text-muted-foreground font-semibold">{office.building}</span>
						</div>
						<Card.Title class="text-base font-extrabold text-foreground pt-1.5 leading-tight">{office.name}</Card.Title>
						<Card.Description class="text-xs leading-relaxed text-muted-foreground font-medium">{office.description}</Card.Description>
					</Card.Header>
					
					<Card.Content class="py-4 text-xs font-medium border-b border-border/40">
						<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-muted-foreground">
							<div><span class="font-bold text-foreground">Floor Location:</span> {office.floor}</div>
							<div><span class="font-bold text-foreground">Department Head:</span> {office.headPerson || 'N/A'}</div>
							<div><span class="font-bold text-foreground">Contact Email:</span> {office.contactEmail || 'N/A'}</div>
							<div>
								<span class="font-bold text-foreground">Coords:</span> 
								{#if office.xCoord && office.yCoord}
									{office.xCoord}, {office.yCoord}
								{:else}
									Unmapped
								{/if}
							</div>
						</div>
					</Card.Content>

					<!-- Expandable Room Drawer Section (Option A: Collapsible Panels) -->
					{#if expandedOfficeId === office.id}
						<div transition:slide={{ duration: 250 }} class="p-6 bg-muted/10 border-b border-border/40">
							<div class="flex items-center justify-between pb-3 border-b border-border/60">
								<h3 class="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
									<SchoolIcon class="size-4 text-primary pointer-events-none" />
									<span>Rooms under this Department Office</span>
								</h3>
								<Badge variant="outline" class="text-[10px] font-black">{rooms.filter(r => r.officeId === office.id).length} Rooms</Badge>
							</div>

							<!-- Room entries list -->
							<div class="flex flex-col gap-3 mt-4">
								{#each rooms.filter(r => r.officeId === office.id) as room}
									<div class="flex items-start sm:items-center justify-between p-3 border border-border/60 bg-card rounded-xl shadow-xs gap-3">
										<div class="flex flex-col gap-1">
											<div class="flex items-center gap-2">
												<span class="text-xs font-bold text-foreground">{room.roomNumber}</span>
												<span class="text-xs text-muted-foreground font-semibold">- {room.roomName}</span>
											</div>
											{#if room.description}
												<p class="text-[10px] text-muted-foreground/80 font-medium">{room.description}</p>
											{/if}
											<div class="flex items-center gap-3 text-[9px] text-muted-foreground font-semibold pt-1">
												<span>Floor: {room.floor}</span>
												<span>Coords: {room.xCoord}, {room.yCoord}</span>
												{#if room.imageUrl}
													<span class="text-primary font-bold">Image Set</span>
												{/if}
											</div>
										</div>

										<form method="POST" action="?/deleteRoom" use:enhance={handleDeleteRoomEnhance}>
											<input type="hidden" name="id" value={room.id} />
											<Button type="submit" variant="ghost" size="icon" class="size-8 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer">
												<Trash2Icon class="size-3.5" />
											</Button>
										</form>
									</div>
								{:else}
									<div class="text-center py-6 text-xs text-muted-foreground/80 font-semibold bg-card border border-dashed border-border rounded-xl">
										No rooms bound to this office yet. Add rooms using the form below.
									</div>
								{/each}
							</div>

							<!-- Create Classroom/Lab inline form -->
							<form method="POST" action="?/createRoom" use:enhance={handleCreateRoomEnhance} class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 border border-border/80 bg-card rounded-2xl mt-6">
								<input type="hidden" name="officeId" value={office.id} />
								<input type="hidden" name="building" value={office.building} />
								<input type="hidden" name="floor" value={office.floor} />

								<div class="sm:col-span-2 pb-1 border-b border-border/50">
									<h4 class="text-[10px] font-black uppercase tracking-wider text-primary">Provision Classroom / Lab</h4>
								</div>
								
								<div class="flex flex-col gap-1.5">
									<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Number / ID</label>
									<Input name="roomNumber" placeholder="e.g. Room 201" required class="h-9 rounded-lg text-xs" />
								</div>
								
								<div class="flex flex-col gap-1.5">
									<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Name</label>
									<Input name="roomName" placeholder="e.g. Networking Lab" required class="h-9 rounded-lg text-xs" />
								</div>
								
								<div class="flex flex-col gap-1.5 sm:col-span-2">
									<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Description</label>
									<Input name="description" placeholder="e.g. Cisco training workstation center" class="h-9 rounded-lg text-xs" />
								</div>

								<div class="flex flex-col gap-1.5">
									<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Image URL (Optional)</label>
									<Input name="imageUrl" placeholder="e.g. /assets/cs/networking.jpg" class="h-9 rounded-lg text-xs" />
								</div>

								<div class="grid grid-cols-2 gap-2">
									<div class="flex flex-col gap-1.5">
										<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Latitude (Lat)</label>
										<Input name="xCoord" type="number" step="any" placeholder="9.894" class="h-9 rounded-lg text-xs" />
									</div>
									<div class="flex flex-col gap-1.5">
										<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Longitude (Lng)</label>
										<Input name="yCoord" type="number" step="any" placeholder="123.882" class="h-9 rounded-lg text-xs" />
									</div>
								</div>
								
								<div class="sm:col-span-2 pt-2">
									<Button type="submit" size="sm" class="w-full text-xs font-bold rounded-xl h-9 cursor-pointer">
										Create & Bind Room
									</Button>
								</div>
							</form>
						</div>
					{/if}

					<!-- Footer Actions Panel -->
					<Card.Footer class="pt-3 flex gap-2 flex-wrap sm:flex-nowrap">
						<Button onclick={() => (activeQrOffice = office)} variant="outline" size="sm" class="w-full text-xs font-bold gap-1.5 rounded-xl h-9 cursor-pointer border-border/80">
							<QrCodeIcon class="size-4 pointer-events-none" />
							<span>Generate Door QR Sign</span>
						</Button>

						<Button 
							onclick={() => (expandedOfficeId = expandedOfficeId === office.id ? null : office.id)} 
							variant="outline" 
							size="sm" 
							class="w-full text-xs font-bold gap-1.5 rounded-xl h-9 cursor-pointer border-border/80"
						>
							{#if expandedOfficeId === office.id}
								<ChevronUpIcon class="size-4 pointer-events-none" />
								<span>Hide Classrooms</span>
							{:else}
								<ChevronDownIcon class="size-4 pointer-events-none" />
								<span>Manage Classrooms ({rooms.filter(r => r.officeId === office.id).length})</span>
							{/if}
						</Button>

						<form method="POST" action="?/deleteOffice" use:enhance={handleDeleteOfficeEnhance} class="w-full sm:w-auto shrink-0">
							<input type="hidden" name="id" value={office.id} />
							<Button type="submit" variant="destructive" size="sm" class="w-full sm:w-auto text-xs font-bold gap-1.5 rounded-xl h-9 cursor-pointer">
								<Trash2Icon class="size-4 pointer-events-none" />
								<span>Delete</span>
							</Button>
						</form>
					</Card.Footer>
				</Card.Root>
			{:else}
				<div class="text-center py-12 text-sm text-muted-foreground/80 font-semibold bg-card border border-dashed border-border rounded-2xl">
					No campus offices configured yet. Get started by clicking "Add Campus Office".
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Printable Office QR Code Modal -->
<Dialog.Root
	open={!!activeQrOffice}
	onOpenChange={(open) => {
		if (!open) activeQrOffice = null;
	}}
>
	<Dialog.Content class="max-w-sm border-primary/20 shadow-2xl rounded-2xl text-center">
		<Dialog.Header>
			<Dialog.Title class="text-left font-black">Office Door QR Code</Dialog.Title>
			<Dialog.Description class="text-left text-xs">
				{#if activeQrOffice}{activeQrOffice.name}{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if activeQrOffice}
			<div class="py-4 flex flex-col gap-4 items-center">
				<!-- Simulated QR code container -->
				<div class="p-4 bg-white rounded-2xl shadow-inner border border-border/80 flex items-center justify-center size-52">
					<svg class="size-40 text-black" fill="currentColor" viewBox="0 0 24 24">
						<path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8zM14 17h2v2h-2v-2zm3-3h2v2h-2v-2zm-3 6h2v2h-2v-2zm3-3h2v2h-2v-2z"/>
					</svg>
				</div>

				<div class="text-center space-y-1">
					<Badge class="bg-primary text-primary-foreground font-black font-mono text-[10px] tracking-wider uppercase rounded-full">
						{activeQrOffice.code} DOOR QR CODE
					</Badge>
					<p class="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto font-medium">
						Visitors scan this code with their digital passes to automatically confirm arrival or check-out of this department.
					</p>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="border-t border-border/60 pt-3">
			<Button onclick={() => window.print()} class="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs py-2.5 rounded-xl gap-2 shadow-sm cursor-pointer">
				<PrinterIcon class="size-4 pointer-events-none" />
				<span>Print Door QR Sign</span>
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Add Office Dialog Modal -->
<Dialog.Root bind:open={isCreatingOffice}>
	<Dialog.Content class="max-w-md border-border shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="font-black text-lg">Add Campus Office / Landmark</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground font-semibold leading-relaxed">
				Create a new building node or department office on the campus map.
			</Dialog.Description>
		</Dialog.Header>
		
		<form method="POST" action="?/createOffice" use:enhance={handleCreateOfficeEnhance} class="flex flex-col gap-4 py-4 text-xs font-medium">
			<div class="grid grid-cols-3 gap-2">
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Code</label>
					<Input name="code" placeholder="e.g. CCS" required class="h-9 rounded-lg text-xs font-semibold" />
				</div>
				<div class="flex flex-col gap-1.5 col-span-2">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Office Name</label>
					<Input name="name" placeholder="e.g. College of Computer Studies" required class="h-9 rounded-lg text-xs font-semibold" />
				</div>
			</div>
			
			<div class="grid grid-cols-2 gap-2">
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Building</label>
					<Input name="building" placeholder="e.g. Technology Complex" required class="h-9 rounded-lg text-xs" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Floor</label>
					<Input name="floor" placeholder="e.g. 2nd Floor" required class="h-9 rounded-lg text-xs" />
				</div>
			</div>
			
			<div class="flex flex-col gap-1.5">
				<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Description</label>
				<Input name="description" placeholder="Dean office, faculty rooms, and IT laboratories." class="h-9 rounded-lg text-xs" />
			</div>
			
			<div class="grid grid-cols-2 gap-2">
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Head Person</label>
					<Input name="headPerson" placeholder="Engr. Robert Lee" class="h-9 rounded-lg text-xs" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Contact Email</label>
					<Input name="contactEmail" type="email" placeholder="ccs@university.edu" class="h-9 rounded-lg text-xs" />
				</div>
			</div>
			
			<div class="grid grid-cols-3 gap-2">
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Pin Color</label>
					<Input name="color" type="color" value="#3b82f6" class="h-9 w-full rounded-lg p-0 border border-border cursor-pointer bg-transparent" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Latitude (Lat)</label>
					<Input name="xCoord" type="number" step="any" placeholder="9.894" class="h-9 rounded-lg text-xs" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Longitude (Lng)</label>
					<Input name="yCoord" type="number" step="any" placeholder="123.882" class="h-9 rounded-lg text-xs" />
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Image URL (Optional)</label>
				<Input name="imageUrl" placeholder="e.g. /assets/cs/office.jpg" class="h-9 rounded-lg text-xs" />
			</div>
			
			<Button type="submit" class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs py-2.5 mt-2 cursor-pointer shadow-md shadow-primary/10">
				Create Campus Office
			</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
