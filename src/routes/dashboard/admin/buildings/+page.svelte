<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { Building, Room } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	
	// Icons
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import SchoolIcon from "@lucide/svelte/icons/school";
	import XIcon from "@lucide/svelte/icons/x";
	import UploadCloudIcon from "@lucide/svelte/icons/upload-cloud";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import UserIcon from "@lucide/svelte/icons/user";
	import MailIcon from "@lucide/svelte/icons/mail";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";

	import { supabase, isSupabaseConfigured } from '$lib/supabase';

	let { data } = $props();

	// Derived lists from loader data
	let buildings = $derived(data.buildings || []);
	let rooms = $derived(data.rooms || []);

	// UI states
	let isCreatingBuilding = $state(false);
	let activeQrBuilding = $state<Building | null>(null);
	let activeManageRoomsBuilding = $state<Building | null>(null);
	let activeEditingBuilding = $state<Building | null>(null);

	// Deletion Confirmation Target States
	let deletingBuildingTarget = $state<Building | null>(null);
	let deletingRoomTarget = $state<Room | null>(null);

	// Edit Building Form States
	let editCode = $state("");
	let editName = $state("");
	let editFloors = $state(1);
	let editDescription = $state("");
	let editColor = $state("#3b82f6");
	let editXCoord = $state<number | undefined>(undefined);
	let editYCoord = $state<number | undefined>(undefined);
	let editHeadPerson = $state("");
	let editContactEmail = $state("");

	// Reddit-style Image States for Buildings
	let buildingImageFile = $state<File | null>(null);
	let buildingImagePreview = $state<string | null>(null);
	let isUploadingBuildingImage = $state(false);

	// Reddit-style Image States for Editing Buildings
	let editBuildingImageFile = $state<File | null>(null);
	let editBuildingImagePreview = $state<string | null>(null);
	let isUpdatingBuildingImage = $state(false);
	let keepExistingImage = $state(true);

	// Reddit-style Image States for Rooms
	let roomImageFile = $state<File | null>(null);
	let roomImagePreview = $state<string | null>(null);
	let isUploadingRoomImage = $state(false);

	function handleBuildingImageChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			buildingImageFile = file;
			buildingImagePreview = URL.createObjectURL(file);
		}
	}

	function clearBuildingImage() {
		buildingImageFile = null;
		buildingImagePreview = null;
	}

	function handleEditBuildingImageChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			editBuildingImageFile = file;
			editBuildingImagePreview = URL.createObjectURL(file);
			keepExistingImage = false;
		}
	}

	function clearEditBuildingImage() {
		editBuildingImageFile = null;
		editBuildingImagePreview = null;
		keepExistingImage = false;
	}

	function startEditBuilding(building: Building) {
		activeEditingBuilding = building;
		editCode = building.code;
		editName = building.name;
		editFloors = building.floors;
		editDescription = building.description || "";
		editColor = building.color || "#3b82f6";
		editXCoord = building.xCoord;
		editYCoord = building.yCoord;
		editHeadPerson = building.headPerson || "";
		editContactEmail = building.contactEmail || "";
		editBuildingImageFile = null;
		editBuildingImagePreview = building.imageUrl || null;
		keepExistingImage = !!building.imageUrl;
	}

	function handleRoomImageChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			roomImageFile = file;
			roomImagePreview = URL.createObjectURL(file);
		}
	}

	function clearRoomImage() {
		roomImageFile = null;
		roomImagePreview = null;
	}

	// SvelteKit form submission enhance handlers
	const handleCreateBuildingEnhance: SubmitFunction = async ({ formData }) => {
		if (buildingImageFile) {
			formData.set('buildingImage', buildingImageFile);
		}

		let resolveCreateBuilding: (v?: any) => void = () => {};
		let rejectCreateBuilding: (e: any) => void = () => {};
		const createPromise = new Promise((resolve, reject) => {
			resolveCreateBuilding = resolve;
			rejectCreateBuilding = reject;
		});

		toast.promise(createPromise, {
			loading: "Creating building landmark...",
			success: "Building created successfully!",
			error: (err: any) => err.message || "Failed to create building."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveCreateBuilding();
				isCreatingBuilding = false;
				clearBuildingImage();
				await update();
			} else if (result.type === "failure") {
				rejectCreateBuilding(new Error((result.data as any)?.message || "Failed to create building."));
			} else {
				rejectCreateBuilding(new Error("Unexpected error."));
			}
		};
	};

	const handleUpdateBuildingEnhance: SubmitFunction = async ({ formData }) => {
		if (editBuildingImageFile) {
			formData.set('editBuildingImage', editBuildingImageFile);
		} else {
			formData.set('keepExistingImage', String(keepExistingImage));
		}

		let resolveUpdateBuilding: (v?: any) => void = () => {};
		let rejectUpdateBuilding: (e: any) => void = () => {};
		const updatePromise = new Promise((resolve, reject) => {
			resolveUpdateBuilding = resolve;
			rejectUpdateBuilding = reject;
		});

		toast.promise(updatePromise, {
			loading: "Updating building landmark...",
			success: "Building updated successfully!",
			error: (err: any) => err.message || "Failed to update building."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveUpdateBuilding();
				activeEditingBuilding = null;
				clearEditBuildingImage();
				await update();
			} else if (result.type === "failure") {
				rejectUpdateBuilding(new Error((result.data as any)?.message || "Failed to update building."));
			} else {
				rejectUpdateBuilding(new Error("Unexpected error."));
			}
		};
	};

	const handleDeleteBuildingEnhance: SubmitFunction = () => {
		let resolveDelete: (v?: any) => void = () => {};
		let rejectDelete: (e: any) => void = () => {};
		const deletePromise = new Promise((resolve, reject) => {
			resolveDelete = resolve;
			rejectDelete = reject;
		});

		toast.promise(deletePromise, {
			loading: "Deleting building landmark...",
			success: "Building deleted successfully!",
			error: (err: any) => err.message || "Failed to delete building."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveDelete();
				deletingBuildingTarget = null;
				await update();
			} else if (result.type === "failure") {
				rejectDelete(new Error((result.data as any)?.message || "Failed to delete building."));
			} else {
				rejectDelete(new Error("Unexpected error."));
			}
		};
	};

	const handleCreateRoomEnhance: SubmitFunction = async ({ formData }) => {
		if (roomImageFile) {
			formData.set('roomImage', roomImageFile);
		}

		let resolveCreateRoom: (v?: any) => void = () => {};
		let rejectCreateRoom: (e: any) => void = () => {};
		const createPromise = new Promise((resolve, reject) => {
			resolveCreateRoom = resolve;
			rejectCreateRoom = reject;
		});

		toast.promise(createPromise, {
			loading: "Creating classroom/lab...",
			success: "Room created successfully!",
			error: (err: any) => err.message || "Failed to create room."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveCreateRoom();
				clearRoomImage();
				await update();
			} else if (result.type === "failure") {
				rejectCreateRoom(new Error((result.data as any)?.message || "Failed to create room."));
			} else {
				rejectCreateRoom(new Error("Unexpected error."));
			}
		};
	};

	const handleDeleteRoomEnhance: SubmitFunction = () => {
		let resolveDeleteRoom: (v?: any) => void = () => {};
		let rejectDeleteRoom: (e: any) => void = () => {};
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
				deletingRoomTarget = null;
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
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Campus Buildings & Landmarks</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Manage campus building layouts, classroom spaces, and generate door QR codes.</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- <a 
				href="/dashboard/admin/buildings/test-upload" 
				class="px-3 py-2 border border-border bg-card hover:bg-muted/40 text-xs font-extrabold rounded-xl h-10 flex items-center gap-1.5 transition-colors"
			>
				<UploadCloudIcon class="size-4 pointer-events-none" />
				<span>Storage Test</span>
			</a> -->
			<Button onclick={() => (isCreatingBuilding = true)} class="text-xs font-extrabold gap-1.5 rounded-xl h-10 shadow-md shadow-primary/10 cursor-pointer">
				<PlusIcon class="size-4 pointer-events-none" />
				<span>Add Building / Landmark</span>
			</Button>
		</div>
	</div>

	<!-- Buildings Cards Grid -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-extrabold text-foreground uppercase tracking-wider">Campus Locations Setup</h2>
			<span class="text-xs text-muted-foreground font-semibold">{buildings.length} buildings loaded.</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each buildings as building (building.id)}
				<Card.Root class="border-border shadow-xs hover:shadow-md rounded-2xl bg-card overflow-hidden transition-all flex flex-col group">
					<!-- Hero Image Cover Header -->
					<div class="relative w-full h-44 overflow-hidden bg-muted/40 shrink-0">
						{#if building.imageUrl}
							<img src={building.imageUrl} alt={building.name} class="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
							<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
						{:else}
							<div 
								class="size-full flex flex-col items-center justify-center p-4 text-center"
								style="background: linear-gradient(135deg, {building.color || '#3b82f6'}25 0%, {building.color || '#3b82f6'}08 100%);"
							>
								<SchoolIcon class="size-10 text-muted-foreground/30 mb-1" />
								<span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Landmark Image Unset</span>
							</div>
							<div class="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
						{/if}

						<!-- Floating Badges Top Left -->
						<div class="absolute top-3 left-3 flex items-center gap-2 z-10">
							<Badge class="backdrop-blur-md bg-background/85 text-foreground border-border/80 font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-xs">
								{building.code}
							</Badge>
							{#if building.color}
								<span class="size-3.5 rounded-full border border-white/40 shadow-xs" style="background-color: {building.color};"></span>
							{/if}
						</div>

						<!-- Floating Classrooms Count Top Right -->
						<div class="absolute top-3 right-3 z-10">
							<Badge variant="secondary" class="backdrop-blur-md bg-background/85 text-foreground font-extrabold text-[10px] px-2.5 py-1 rounded-xl shadow-xs gap-1">
								<SchoolIcon class="size-3 pointer-events-none" />
								<span>{rooms.filter(r => r.buildingId === building.id).length} Rooms</span>
							</Badge>
						</div>

						<!-- Building Title overlaid at bottom of cover -->
						<div class="absolute bottom-3 left-3 right-3 z-10">
							<h3 class="text-base font-black text-white dark:text-foreground line-clamp-1 leading-snug drop-shadow-sm">
								{building.name}
							</h3>
						</div>
					</div>

					<!-- Card Body Details -->
					<Card.Content class="p-5 flex-grow flex flex-col gap-4 text-xs font-semibold">
						<p class="text-muted-foreground text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]">
							{building.description || "No description provided for this campus landmark."}
						</p>

						<!-- 2x2 Grid Info Stats -->
						<div class="grid grid-cols-2 gap-3 text-[11px] pt-3 border-t border-border/60 text-muted-foreground">
							<div class="flex items-center gap-2">
								<LayersIcon class="size-3.5 text-primary shrink-0 pointer-events-none" />
								<span class="truncate"><span class="font-bold text-foreground">{building.floors}</span> Floors</span>
							</div>
							<div class="flex items-center gap-2">
								<UserIcon class="size-3.5 text-primary shrink-0 pointer-events-none" />
								<span class="truncate font-medium">{building.headPerson || 'Head N/A'}</span>
							</div>
							<div class="flex items-center gap-2">
								<MailIcon class="size-3.5 text-primary shrink-0 pointer-events-none" />
								<span class="truncate font-medium">{building.contactEmail || 'No Email'}</span>
							</div>
							<div class="flex items-center gap-2">
								<MapPinIcon class="size-3.5 text-primary shrink-0 pointer-events-none" />
								<span class="truncate font-medium">
									{#if building.xCoord && building.yCoord}
										{building.xCoord}, {building.yCoord}
									{:else}
										Unmapped
									{/if}
								</span>
							</div>
						</div>
					</Card.Content>

					<!-- Footer Actions Grid -->
					<Card.Footer class="p-3 border-t border-border/60 bg-muted/20 grid grid-cols-2 gap-2">
						<Button onclick={() => (activeQrBuilding = building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border/80">
							<QrCodeIcon class="size-3.5 pointer-events-none" />
							<span>Door QR</span>
						</Button>

						<Button onclick={() => (activeManageRoomsBuilding = building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border/80">
							<SchoolIcon class="size-3.5 pointer-events-none" />
							<span>Classrooms</span>
						</Button>

						<Button onclick={() => startEditBuilding(building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border/80">
							<PencilIcon class="size-3.5 pointer-events-none" />
							<span>Edit</span>
						</Button>

						<Button onclick={() => (deletingBuildingTarget = building)} variant="destructive" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer">
							<Trash2Icon class="size-3.5 pointer-events-none" />
							<span>Delete</span>
						</Button>
					</Card.Footer>
				</Card.Root>
			{:else}
				<div class="text-center py-12 text-sm text-muted-foreground/80 font-semibold bg-card border border-dashed border-border rounded-2xl col-span-full">
					No campus landmarks configured yet. Get started by clicking "Add Building / Landmark".
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Printable QR Code Modal -->
<Dialog.Root
	open={!!activeQrBuilding}
	onOpenChange={(open) => {
		if (!open) activeQrBuilding = null;
	}}
>
	<Dialog.Content class="max-w-sm border-primary/20 shadow-2xl rounded-2xl text-center">
		<Dialog.Header>
			<Dialog.Title class="text-left font-black">Building Landmark QR Code</Dialog.Title>
			<Dialog.Description class="text-left text-xs">
				{#if activeQrBuilding}{activeQrBuilding.name}{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if activeQrBuilding}
			<div class="py-4 flex flex-col gap-4 items-center">
				<div class="p-4 bg-white rounded-2xl shadow-inner border border-border/80 flex items-center justify-center size-52">
					<svg class="size-40 text-black" fill="currentColor" viewBox="0 0 24 24">
						<path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8zM14 17h2v2h-2v-2zm3-3h2v2h-2v-2zm-3 6h2v2h-2v-2zm3-3h2v2h-2v-2z"/>
					</svg>
				</div>

				<div class="text-center space-y-1">
					<Badge class="bg-primary text-primary-foreground font-black font-mono text-[10px] tracking-wider uppercase rounded-full">
						{activeQrBuilding.code} DOOR QR CODE
					</Badge>
					<p class="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto font-semibold">
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

<!-- Add Building Side Sheet -->
<Sheet.Root bind:open={isCreatingBuilding} onOpenChange={(open) => { if (!open) clearBuildingImage(); }}>
	<Sheet.Content class="sm:max-w-md md:max-w-lg flex flex-col h-full bg-card border-l border-border/80 overflow-hidden p-0">
		<Sheet.Header class="p-6 border-b border-border/60">
			<Sheet.Title class="font-black text-lg text-left">Add Building / Landmark</Sheet.Title>
			<Sheet.Description class="text-xs text-muted-foreground font-semibold leading-relaxed text-left">
				Create a new building node or department office on the campus map.
			</Sheet.Description>
		</Sheet.Header>
		
		<form 
			method="POST" 
			action="?/createBuilding" 
			enctype="multipart/form-data"
			use:enhance={handleCreateBuildingEnhance} 
			class="flex-grow overflow-y-auto p-6 flex flex-col gap-6 text-xs font-semibold"
		>
			<!-- Section 1: Core Info -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">1. Core Information (Required)</div>
				<div class="grid grid-cols-3 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Code *</label>
						<Input name="code" placeholder="e.g. TECH" maxlength={5} required class="h-9 rounded-lg text-xs font-semibold" />
					</div>
					<div class="flex flex-col gap-1.5 col-span-2">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Building Name *</label>
						<Input name="name" placeholder="e.g. Technology Complex" required class="h-9 rounded-lg text-xs font-semibold" />
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Total Floors *</label>
						<Input name="floors" type="number" min="1" placeholder="e.g. 4" required class="h-9 rounded-lg text-xs" />
					</div>
				</div>
				
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Brief Description *</label>
					<Input name="description" placeholder="Dean offices, lecture complexes, and research labs." required class="h-9 rounded-lg text-xs" />
				</div>
			</div>

			<!-- Section 2: Reddit Style Photo Uploader -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">2. Visual Asset (Optional)</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Landmark Image</label>
					{#if buildingImagePreview}
						<div class="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center group">
							<img src={buildingImagePreview} alt="Preview" class="size-full object-cover" />
							<button 
								type="button" 
								onclick={clearBuildingImage}
								class="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all cursor-pointer shadow-md"
							>
								<XIcon class="size-4 pointer-events-none" />
							</button>
						</div>
					{:else}
						<label 
							for="building-image-upload" 
							class="w-full h-28 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center gap-1 bg-muted/10 hover:bg-muted/20 transition-all cursor-pointer select-none"
						>
							<UploadCloudIcon class="size-6 text-muted-foreground pointer-events-none" />
							<span class="text-xs font-bold text-foreground">Upload Landmark Photo</span>
							<span class="text-[10px] text-muted-foreground/80 font-medium">JPEG, PNG up to 5MB</span>
						</label>
						<input 
							type="file" 
							id="building-image-upload" 
							name="buildingImage"
							accept="image/*" 
							onchange={handleBuildingImageChange} 
							class="sr-only" 
						/>
					{/if}
				</div>
			</div>
			
			<!-- Section 3: Map Coordinates -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">3. Map Coordinates & Pin (Optional)</div>
				<div class="grid grid-cols-3 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Pin Color</label>
						<Input name="color" type="color" value="#3b82f6" class="h-9 w-full rounded-lg p-0 border border-border cursor-pointer bg-transparent" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Latitude</label>
						<Input name="xCoord" type="number" step="any" placeholder="e.g. 9.894" class="h-9 rounded-lg text-xs" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Longitude</label>
						<Input name="yCoord" type="number" step="any" placeholder="e.g. 123.882" class="h-9 rounded-lg text-xs" />
					</div>
				</div>
			</div>
			
			<!-- Section 4: Admin Contacts -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">4. Department Contacts (Optional)</div>
				<div class="grid grid-cols-2 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Head Person</label>
						<Input name="headPerson" placeholder="Engr. Robert Lee" class="h-9 rounded-lg text-xs" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Contact Email</label>
						<Input name="contactEmail" type="email" placeholder="ccs@university.edu" class="h-9 rounded-lg text-xs" />
					</div>
				</div>
			</div>
			
			<input type="hidden" name="imageUrl" value="" />

			<div class="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-4 shrink-0">
				<Sheet.Close class="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted/40 cursor-pointer">
					Cancel
				</Sheet.Close>
				<Button 
					type="submit" 
					disabled={isUploadingBuildingImage}
					class="px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer h-9"
				>
					Create Landmark
				</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>

<!-- Edit Building Side Sheet -->
<Sheet.Root
	open={!!activeEditingBuilding}
	onOpenChange={(open) => {
		if (!open) {
			activeEditingBuilding = null;
			clearEditBuildingImage();
		}
	}}
>
	<Sheet.Content class="sm:max-w-md md:max-w-lg flex flex-col h-full bg-card border-l border-border/80 overflow-hidden p-0">
		<Sheet.Header class="p-6 border-b border-border/60">
			<Sheet.Title class="font-black text-lg text-left">Edit Building / Landmark</Sheet.Title>
			<Sheet.Description class="text-xs text-muted-foreground font-semibold leading-relaxed text-left">
				Modify building node or department office details.
			</Sheet.Description>
		</Sheet.Header>
		
		<form 
			method="POST" 
			action="?/updateBuilding" 
			enctype="multipart/form-data"
			use:enhance={handleUpdateBuildingEnhance} 
			class="flex-grow overflow-y-auto p-6 flex flex-col gap-6 text-xs font-semibold"
		>
			<input type="hidden" name="id" value={activeEditingBuilding?.id} />

			<!-- Section 1: Core Info -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">1. Core Information (Required)</div>
				<div class="grid grid-cols-3 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Code *</label>
						<Input name="code" placeholder="e.g. TECH" maxlength={5} required bind:value={editCode} class="h-9 rounded-lg text-xs font-semibold" />
					</div>
					<div class="flex flex-col gap-1.5 col-span-2">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Building Name *</label>
						<Input name="name" placeholder="e.g. Technology Complex" required bind:value={editName} class="h-9 rounded-lg text-xs font-semibold" />
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Total Floors *</label>
						<Input name="floors" type="number" min="1" placeholder="e.g. 4" required bind:value={editFloors} class="h-9 rounded-lg text-xs" />
					</div>
				</div>
				
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Brief Description *</label>
					<Input name="description" placeholder="Dean offices, lecture complexes, and research labs." required bind:value={editDescription} class="h-9 rounded-lg text-xs" />
				</div>
			</div>

			<!-- Section 2: Reddit Style Photo Uploader -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">2. Visual Asset (Optional)</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Landmark Image</label>
					{#if editBuildingImagePreview}
						<div class="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center group">
							<img src={editBuildingImagePreview} alt="Preview" class="size-full object-cover" />
							<button 
								type="button" 
								onclick={clearEditBuildingImage}
								class="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all cursor-pointer shadow-md"
							>
								<XIcon class="size-4 pointer-events-none" />
							</button>
						</div>
					{:else}
						<label 
							for="edit-building-image-upload" 
							class="w-full h-28 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center gap-1 bg-muted/10 hover:bg-muted/20 transition-all cursor-pointer select-none"
						>
							<UploadCloudIcon class="size-6 text-muted-foreground pointer-events-none" />
							<span class="text-xs font-bold text-foreground">Upload Landmark Photo</span>
							<span class="text-[10px] text-muted-foreground/80 font-medium">JPEG, PNG up to 5MB</span>
						</label>
						<input 
							type="file" 
							id="edit-building-image-upload" 
							name="editBuildingImage"
							accept="image/*" 
							onchange={handleEditBuildingImageChange} 
							class="sr-only" 
						/>
					{/if}
				</div>
			</div>
			
			<!-- Section 3: Map Coordinates -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">3. Map Coordinates & Pin (Optional)</div>
				<div class="grid grid-cols-3 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Pin Color</label>
						<Input name="color" type="color" bind:value={editColor} class="h-9 w-full rounded-lg p-0 border border-border cursor-pointer bg-transparent" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Latitude</label>
						<Input name="xCoord" type="number" step="any" placeholder="e.g. 9.894" bind:value={editXCoord} class="h-9 rounded-lg text-xs" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Longitude</label>
						<Input name="yCoord" type="number" step="any" placeholder="e.g. 123.882" bind:value={editYCoord} class="h-9 rounded-lg text-xs" />
					</div>
				</div>
			</div>
			
			<!-- Section 4: Admin Contacts -->
			<div class="space-y-3">
				<div class="text-[10px] font-black uppercase tracking-wider text-primary border-b border-border/60 pb-1">4. Department Contacts (Optional)</div>
				<div class="grid grid-cols-2 gap-2">
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Head Person</label>
						<Input name="headPerson" placeholder="Engr. Robert Lee" bind:value={editHeadPerson} class="h-9 rounded-lg text-xs" />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide font-sans">Contact Email</label>
						<Input name="contactEmail" type="email" placeholder="ccs@university.edu" bind:value={editContactEmail} class="h-9 rounded-lg text-xs" />
					</div>
				</div>
			</div>
			
			<input type="hidden" name="imageUrl" value="" />

			<div class="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-4 shrink-0">
				<button 
					type="button" 
					onclick={() => { activeEditingBuilding = null; clearEditBuildingImage(); }}
					class="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted/40 cursor-pointer bg-transparent font-semibold"
				>
					Cancel
				</button>
				<Button 
					type="submit" 
					disabled={isUpdatingBuildingImage}
					class="px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer h-9"
				>
					Save Changes
				</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>

<!-- Manage Rooms Side Sheet -->
<Sheet.Root
	open={!!activeManageRoomsBuilding}
	onOpenChange={(open) => {
		if (!open) {
			activeManageRoomsBuilding = null;
			clearRoomImage();
		}
	}}
>
	<Sheet.Content class="sm:max-w-md md:max-w-lg flex flex-col h-full bg-card border-l border-border/80 overflow-hidden p-0">
		{#if activeManageRoomsBuilding}
			<Sheet.Header class="p-6 border-b border-border/60">
				<Sheet.Title class="text-left font-black text-lg">Manage Classrooms</Sheet.Title>
				<Sheet.Description class="text-left text-xs font-semibold text-muted-foreground">
					{activeManageRoomsBuilding.name} ({activeManageRoomsBuilding.code})
				</Sheet.Description>
			</Sheet.Header>

			<!-- Rooms list section (scrollable) -->
			<div class="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
				<div class="flex items-center justify-between pb-1">
					<span class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Registered Classrooms / Labs</span>
					<Badge variant="secondary" class="font-bold text-[10px]">{rooms.filter(r => r.buildingId === activeManageRoomsBuilding?.id).length} Rooms</Badge>
				</div>

				<div class="flex flex-col gap-3">
					{#each rooms.filter(r => r.buildingId === activeManageRoomsBuilding?.id) as room}
						<div class="flex items-start justify-between p-3 border border-border bg-card rounded-xl shadow-xs gap-3">
							{#if room.imageUrl}
								<div class="size-12 rounded-lg overflow-hidden border border-border shrink-0">
									<img src={room.imageUrl} alt={room.roomNumber} class="size-full object-cover" />
								</div>
							{/if}
							<div class="flex-grow flex flex-col gap-0.5 min-w-0">
								<div class="flex items-center gap-1.5 flex-wrap">
									<span class="text-xs font-bold text-foreground font-mono">{room.roomNumber}</span>
									<span class="text-xs text-muted-foreground font-semibold truncate">- {room.roomName}</span>
								</div>
								{#if room.description}
									<p class="text-[10px] text-muted-foreground/80 font-semibold line-clamp-1">{room.description}</p>
								{/if}
								<div class="flex items-center gap-3 text-[9px] text-muted-foreground font-bold pt-1">
									<span>Floor: {room.floor}</span>
									<span>Coords: {room.xCoord}, {room.yCoord}</span>
								</div>
							</div>

							<Button 
								type="button" 
								onclick={() => (deletingRoomTarget = room)} 
								variant="ghost" 
								size="icon" 
								class="size-8 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
							>
								<Trash2Icon class="size-3.5 pointer-events-none" />
							</Button>
						</div>
					{:else}
						<div class="text-center py-8 text-xs text-muted-foreground/80 font-semibold bg-muted/10 border border-dashed border-border rounded-xl">
							No classrooms bound to this building yet. Provision one below.
						</div>
					{/each}
				</div>
			</div>

			<!-- Create Classroom/Lab Bottom Panel Form -->
			<div class="border-t border-border/80 bg-muted/20 p-6 max-h-[50vh] overflow-y-auto shrink-0">
				<form method="POST" action="?/createRoom" enctype="multipart/form-data" use:enhance={handleCreateRoomEnhance} class="flex flex-col gap-4 text-xs font-semibold">
					<input type="hidden" name="buildingId" value={activeManageRoomsBuilding?.id} />

					<div class="pb-1 border-b border-border/60">
						<h4 class="text-[10px] font-black uppercase tracking-wider text-primary">Provision Classroom / Lab</h4>
					</div>
					
					<div class="grid grid-cols-3 gap-2">
						<div class="flex flex-col gap-1.5 col-span-2">
							<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Number *</label>
							<Input name="roomNumber" placeholder="e.g. Room 201" required class="h-9 rounded-lg text-xs font-semibold" />
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Floor Level *</label>
							<select name="floor" required class="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-xs font-bold shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
								{#each Array.from({ length: activeManageRoomsBuilding?.floors || 1 }, (_, i) => i + 1) as fl}
									<option value={String(fl)}>{fl}{fl === 1 ? 'st' : fl === 2 ? 'nd' : fl === 3 ? 'rd' : 'th'} Floor</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Name *</label>
						<Input name="roomName" placeholder="e.g. Computer Lab A" required class="h-9 rounded-lg text-xs" />
					</div>
					
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Description *</label>
						<Input name="description" placeholder="e.g. Cisco networking workstation center" required class="h-9 rounded-lg text-xs" />
					</div>

					<!-- Reddit-style image uploader for Rooms -->
					<div class="flex flex-col gap-1.5">
						<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Photo (Optional)</label>
						{#if roomImagePreview}
							<div class="relative w-full h-32 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center group">
								<img src={roomImagePreview} alt="Preview" class="size-full object-cover" />
								<button 
									type="button" 
									onclick={clearRoomImage}
									class="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all cursor-pointer shadow-md"
								>
									<XIcon class="size-3.5 pointer-events-none" />
								</button>
							</div>
						{:else}
							<label 
								for="room-image-upload" 
								class="w-full h-20 border border-dashed border-border/80 rounded-xl flex flex-col items-center justify-center gap-1 bg-muted/10 hover:bg-muted/20 transition-all cursor-pointer select-none"
							>
								<UploadCloudIcon class="size-5 text-muted-foreground pointer-events-none" />
								<span class="text-xs font-bold text-foreground">Upload Room Photo</span>
							</label>
							<input 
								type="file" 
								id="room-image-upload" 
								name="roomImage"
								accept="image/*" 
								onchange={handleRoomImageChange} 
								class="sr-only" 
							/>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div class="flex flex-col gap-1.5">
							<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Latitude (Optional)</label>
							<Input name="xCoord" type="number" step="any" placeholder="e.g. 9.894" class="h-9 rounded-lg text-xs" />
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Longitude (Optional)</label>
							<Input name="yCoord" type="number" step="any" placeholder="e.g. 123.882" class="h-9 rounded-lg text-xs" />
						</div>
					</div>
					
					<input type="hidden" name="imageUrl" value="" />

					<Button 
						type="submit" 
						disabled={isUploadingRoomImage}
						class="w-full text-xs font-extrabold rounded-xl h-9 cursor-pointer shadow-sm"
					>
						Create & Bind Room
					</Button>
				</form>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<!-- Delete Building Confirmation Dialog -->
<Dialog.Root open={!!deletingBuildingTarget} onOpenChange={(open) => { if (!open) deletingBuildingTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="space-y-2">
			<div class="flex items-center gap-2 text-destructive">
				<AlertTriangleIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Delete Building Landmark?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium">
				Are you sure you want to delete <strong class="text-foreground">{deletingBuildingTarget?.name} ({deletingBuildingTarget?.code})</strong>?
				
				This action cannot be undone and will permanently remove the landmark and all associated classrooms.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2">
			<Button variant="outline" onclick={() => (deletingBuildingTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/deleteBuilding" use:enhance={handleDeleteBuildingEnhance}>
				<input type="hidden" name="id" value={deletingBuildingTarget?.id} />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer">
					Confirm Delete
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Room Confirmation Dialog -->
<Dialog.Root open={!!deletingRoomTarget} onOpenChange={(open) => { if (!open) deletingRoomTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="space-y-2">
			<div class="flex items-center gap-2 text-destructive">
				<AlertTriangleIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Delete Classroom / Lab?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium">
				Are you sure you want to delete <strong class="text-foreground">{deletingRoomTarget?.roomNumber} - {deletingRoomTarget?.roomName}</strong>?
				This will permanently remove the room from the building layout.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2">
			<Button variant="outline" onclick={() => (deletingRoomTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/deleteRoom" use:enhance={handleDeleteRoomEnhance}>
				<input type="hidden" name="id" value={deletingRoomTarget?.id} />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer">
					Confirm Delete
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
