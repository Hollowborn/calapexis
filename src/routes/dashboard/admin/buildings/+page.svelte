<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
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
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import ArchiveIcon from "@lucide/svelte/icons/archive";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SchoolIcon from "@lucide/svelte/icons/school";
	import XIcon from "@lucide/svelte/icons/x";
	import UploadCloudIcon from "@lucide/svelte/icons/upload-cloud";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import UserIcon from "@lucide/svelte/icons/user";
	import MailIcon from "@lucide/svelte/icons/mail";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import SearchIcon from "@lucide/svelte/icons/search";

	import { supabase, isSupabaseConfigured } from '$lib/supabase';

	let { data } = $props();

	// Derived lists from loader data
	let buildings = $derived(data.buildings || []);
	let rooms = $derived(data.rooms || []);

	// UI states
	let isCreatingBuilding = $state(false);
	let activeManageRoomsBuilding = $state<Building | null>(null);
	let activeEditingBuilding = $state<Building | null>(null);

	// Archival and Restoration Target States
	let archiveBuildingTarget = $state<Building | null>(null);
	let restoreBuildingTarget = $state<Building | null>(null);
	let archiveRoomTarget = $state<Room | null>(null);
	let restoreRoomTarget = $state<Room | null>(null);

	// Edit Room States
	let activeEditingRoom = $state<Room | null>(null);
	let editRoomNumber = $state("");
	let editRoomName = $state("");
	let editRoomFloor = $state("");
	let editRoomDescription = $state("");
	let editRoomXCoord = $state<number | undefined>(undefined);
	let editRoomYCoord = $state<number | undefined>(undefined);
	let editRoomImageFile = $state<File | null>(null);
	let editRoomImagePreview = $state<string | null>(null);
	let keepExistingRoomImage = $state(true);

	// Filter & Search Query State
	let buildingSearchQuery = $state("");
	let selectedStatusFilter = $state<"all" | "active" | "archived">("all");

	let filteredBuildings = $derived(
		buildings.filter((b) => {
			const isActive = b.isActive ?? true;
			if (selectedStatusFilter === "active" && !isActive) return false;
			if (selectedStatusFilter === "archived" && isActive) return false;
			if (!buildingSearchQuery.trim()) return true;
			const q = buildingSearchQuery.toLowerCase().trim();
			return (
				b.name.toLowerCase().includes(q) ||
				b.code.toLowerCase().includes(q) ||
				(b.description && b.description.toLowerCase().includes(q)) ||
				(b.headPerson && b.headPerson.toLowerCase().includes(q))
			);
		})
	);

	// Create Building Form States
	let createColor = $state("#3b82f6");

	// Edit Building Form States
	let editCode = $state("");
	let editName = $state("");
	let editFloors = $state(1);
	let editDescription = $state("");
	let editColor = $state("#3b82f6");

	const RAINBOW_COLORS = [
		{ label: "Red (Crimson)", value: "#ef4444" },
		{ label: "Orange (Amber)", value: "#f97316" },
		{ label: "Yellow (Gold)", value: "#eab308" },
		{ label: "Green (Emerald)", value: "#10b981" },
		{ label: "Blue (Royal Blue)", value: "#3b82f6" },
		{ label: "Indigo (Navy)", value: "#6366f1" },
		{ label: "Violet (Purple)", value: "#8b5cf6" },
		{ label: "Pink (Rose)", value: "#ec4899" },
		{ label: "Teal (Cyan)", value: "#14b8a6" },
		{ label: "Slate (Neutral)", value: "#64748b" }
	];
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

	function startEditRoom(room: Room) {
		activeEditingRoom = room;
		editRoomNumber = room.roomNumber;
		editRoomName = room.roomName;
		editRoomFloor = room.floor;
		editRoomDescription = room.description || "";
		editRoomXCoord = room.xCoord;
		editRoomYCoord = room.yCoord;
		editRoomImageFile = null;
		editRoomImagePreview = room.imageUrl || null;
		keepExistingRoomImage = !!room.imageUrl;
	}

	function handleEditRoomImageChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			editRoomImageFile = file;
			editRoomImagePreview = URL.createObjectURL(file);
			keepExistingRoomImage = false;
		}
	}

	function clearEditRoomImage() {
		editRoomImageFile = null;
		editRoomImagePreview = null;
		keepExistingRoomImage = false;
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

	const handleToggleBuildingEnhance: SubmitFunction = () => {
		let resolveToggle: (v?: any) => void = () => {};
		let rejectToggle: (e: any) => void = () => {};
		const togglePromise = new Promise((resolve, reject) => {
			resolveToggle = resolve;
			rejectToggle = reject;
		});

		toast.promise(togglePromise, {
			loading: "Updating building landmark status...",
			success: "Building landmark status updated!",
			error: (err: any) => err.message || "Failed to update building landmark status."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveToggle();
				archiveBuildingTarget = null;
				restoreBuildingTarget = null;
				await update();
			} else if (result.type === "failure") {
				rejectToggle(new Error((result.data as any)?.message || "Failed to update building landmark status."));
			} else {
				rejectToggle(new Error("Unexpected error."));
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

	const handleUpdateRoomEnhance: SubmitFunction = async ({ formData }) => {
		if (editRoomImageFile) {
			formData.set('editRoomImage', editRoomImageFile);
		}
		formData.set('keepExistingImage', keepExistingRoomImage.toString());

		let resolveUpdateRoom: (v?: any) => void = () => {};
		let rejectUpdateRoom: (e: any) => void = () => {};
		const updatePromise = new Promise((resolve, reject) => {
			resolveUpdateRoom = resolve;
			rejectUpdateRoom = reject;
		});

		toast.promise(updatePromise, {
			loading: "Updating classroom/lab...",
			success: "Room details updated!",
			error: (err: any) => err.message || "Failed to update room."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveUpdateRoom();
				activeEditingRoom = null;
				await update();
			} else if (result.type === "failure") {
				rejectUpdateRoom(new Error((result.data as any)?.message || "Failed to update room."));
			} else {
				rejectUpdateRoom(new Error("Unexpected error."));
			}
		};
	};

	const handleToggleRoomEnhance: SubmitFunction = () => {
		let resolveToggleRoom: (v?: any) => void = () => {};
		let rejectToggleRoom: (e: any) => void = () => {};
		const togglePromise = new Promise((resolve, reject) => {
			resolveToggleRoom = resolve;
			rejectToggleRoom = reject;
		});

		toast.promise(togglePromise, {
			loading: "Updating classroom/lab status...",
			success: "Room status updated!",
			error: (err: any) => err.message || "Failed to update room status."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveToggleRoom();
				archiveRoomTarget = null;
				restoreRoomTarget = null;
				await update();
			} else if (result.type === "failure") {
				rejectToggleRoom(new Error((result.data as any)?.message || "Failed to update room status."));
			} else {
				rejectToggleRoom(new Error("Unexpected error."));
			}
		};
	};
</script>

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<Building2Icon class="size-6 pointer-events-none" />
			</div>
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Campus Buildings & Landmarks</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Manage campus building layouts, classroom spaces, and generate door QR codes.</p>
		</div>
		</div>
		
		
			<Button onclick={() => (isCreatingBuilding = true)} class="text-xs font-extrabold gap-1.5 rounded-xl h-10 shadow-md shadow-primary/10 cursor-pointer">
				<PlusIcon class="size-4 pointer-events-none" />
				<span>Add Building / Landmark</span>
			</Button>
	

	</div>

	<!-- Buildings Cards Grid -->
	<div class="flex flex-col gap-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div>
				<h2 class="text-sm font-extrabold text-foreground uppercase tracking-wider">Campus Locations Setup</h2>
				<span class="text-xs text-muted-foreground font-semibold">{filteredBuildings.length} of {buildings.length} buildings displayed ({buildings.filter(b => b.isActive ?? true).length} active, {buildings.filter(b => b.isActive === false).length} archived).</span>
			</div>

			<div class="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
				<!-- Status Filter Select -->
				<div class="w-full sm:w-36">
					<Select.Root
						type="single"
						value={selectedStatusFilter}
						onValueChange={(val) => {
							if (val) selectedStatusFilter = val as "all" | "active" | "archived";
						}}
					>
						<Select.Trigger class="h-9 rounded-xl text-xs font-semibold cursor-pointer border-border">
							<span class="truncate">
								{selectedStatusFilter === "all" ? "All Status" : (selectedStatusFilter === "active" ? "Active" : "Archived")}
							</span>
						</Select.Trigger>
						<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
							<Select.Group>
								<Select.Item value="all" label="All Status">All Status ({buildings.length})</Select.Item>
								<Select.Item value="active" label="Active">Active ({buildings.filter(b => b.isActive ?? true).length})</Select.Item>
								<Select.Item value="archived" label="Archived">Archived ({buildings.filter(b => b.isActive === false).length})</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="relative w-full sm:w-64">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input 
						type="text" 
						placeholder="Search buildings or codes..." 
						bind:value={buildingSearchQuery} 
						class="pl-9 h-9 text-xs rounded-xl"
					/>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredBuildings as building (building.id)}
				<Card.Root class="pt-0 rounded-2xl border transition-all flex flex-col group overflow-hidden shadow-xs hover:shadow-md {(building.isActive ?? true) ? 'border-border/80 bg-card hover:border-primary/40' : 'border-amber-500/40 border-dashed bg-amber-500/[0.04] opacity-90'}">
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
							{#if (building.isActive ?? true)}
								<Badge variant="outline" class="backdrop-blur-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold uppercase gap-1.5 px-2.5 py-0.5 rounded-xl shadow-xs">
									<span class="size-1.5 rounded-full bg-emerald-500 inline-block"></span>
									<span>Active</span>
								</Badge>
							{:else}
								<Badge variant="outline" class="backdrop-blur-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-extrabold uppercase gap-1.5 px-2.5 py-0.5 rounded-xl shadow-xs">
									<span class="size-1.5 rounded-full bg-amber-500 inline-block"></span>
									<span>Archived</span>
								</Badge>
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
						<div class="grid grid-cols-2 gap-3 text-[11px] pt-3 border-t {(building.isActive ?? true) ? 'border-border/60' : 'border-amber-500/20'} text-muted-foreground">
							<div class="flex items-center gap-2">
								<LayersIcon class="size-3.5 {(building.isActive ?? true) ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
								<span class="truncate"><span class="font-bold text-foreground">{building.floors}</span> Floors</span>
							</div>
							<div class="flex items-center gap-2">
								<UserIcon class="size-3.5 {(building.isActive ?? true) ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
								<span class="truncate font-medium">{building.headPerson || 'Head N/A'}</span>
							</div>
							<div class="flex items-center gap-2">
								<MailIcon class="size-3.5 {(building.isActive ?? true) ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
								<span class="truncate font-medium">{building.contactEmail || 'No Email'}</span>
							</div>
							<div class="flex items-center gap-2">
								<MapPinIcon class="size-3.5 {(building.isActive ?? true) ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
								<span class="truncate font-medium">
									{#if building.xCoord && building.yCoord}
										Mapped
									{:else}
										<span class='text-destructive'>Unmapped</span>
									{/if}
								</span>
							</div>
						</div>
					</Card.Content>

					<!-- Footer Actions Grid -->
					<Card.Footer class="p-3 border-t {(building.isActive ?? true) ? 'border-border/50' : 'border-amber-500/20'} grid grid-cols-3 gap-2">
						<Button onclick={() => (activeManageRoomsBuilding = building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border hover:bg-muted/50">
							<SchoolIcon class="size-3.5 pointer-events-none" />
							<span>Classrooms</span>
						</Button>

						<Button onclick={() => startEditBuilding(building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border hover:bg-muted/50">
							<PencilIcon class="size-3.5 pointer-events-none" />
							<span>Edit</span>
						</Button>

						{#if (building.isActive ?? true)}
							<Button onclick={() => (archiveBuildingTarget = building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
								<ArchiveIcon class="size-3.5 pointer-events-none" />
								<span>Archive</span>
							</Button>
						{:else}
							<Button onclick={() => (restoreBuildingTarget = building)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
								<RotateCcwIcon class="size-3.5 pointer-events-none" />
								<span>Restore</span>
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{:else}
				<div class="text-center py-12 text-sm text-muted-foreground/80 font-semibold bg-card border border-dashed border-border rounded-2xl col-span-full">
					{#if buildingSearchQuery.trim()}
						No building landmarks match your search "{buildingSearchQuery}".
					{:else}
						No campus landmarks configured yet. Get started by clicking "Add Building / Landmark".
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Add Building Dialog Modal -->
<Dialog.Root bind:open={isCreatingBuilding} onOpenChange={(open) => { if (!open) clearBuildingImage(); }}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-2xl w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
			<div class="p-6 border-b border-border/60 bg-muted/20 flex items-center justify-between">
				<div>
					<Dialog.Title class="font-black text-lg text-left text-foreground">Add Building / Landmark</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground font-semibold leading-relaxed text-left mt-0.5">
						Create a new building node or department office on the campus map.
					</Dialog.Description>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => { isCreatingBuilding = false; clearBuildingImage(); }}
					class="size-8 rounded-full hover:bg-muted cursor-pointer shrink-0"
				>
					<XIcon class="size-4 pointer-events-none" />
				</Button>
			</div>
			
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

				<!-- Section 2: Photo Uploader -->
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
							<input type="hidden" name="color" value={createColor} />
							<Select.Root
								type="single"
								value={createColor}
								onValueChange={(val) => createColor = val}
							>
								<Select.Trigger class="h-9 w-full rounded-lg cursor-pointer truncate">
									<span class="text-xs font-semibold flex items-center gap-2">
										<span class="size-3 rounded-full border border-border shrink-0" style="background-color: {createColor};"></span>
										<span>{RAINBOW_COLORS.find(c => c.value === createColor)?.label || "Select"}</span>
									</span>
								</Select.Trigger>
								<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
									<Select.Group>
										{#each RAINBOW_COLORS as colorOpt}
											<Select.Item value={colorOpt.value} label={colorOpt.label}>
												<div class="flex items-center gap-2">
													<span class="size-3 rounded-full border border-border shrink-0" style="background-color: {colorOpt.value};"></span>
													<span>{colorOpt.label}</span>
												</div>
											</Select.Item>
										{/each}
									</Select.Group>
								</Select.Content>
							</Select.Root>
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
					<Button 
						type="button" 
						variant="outline" 
						onclick={() => { isCreatingBuilding = false; clearBuildingImage(); }} 
						class="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted/40 cursor-pointer h-9"
					>
						Cancel
					</Button>
					<Button 
						type="submit" 
						disabled={isUploadingBuildingImage} 
						class="px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer h-9"
					>
						Create Landmark
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Edit Building Dialog Modal -->
<Dialog.Root
	open={!!activeEditingBuilding}
	onOpenChange={(open) => {
		if (!open) {
			activeEditingBuilding = null;
			clearEditBuildingImage();
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-2xl w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
			<div class="p-6 border-b border-border/60 bg-muted/20 flex items-center justify-between">
				<div>
					<Dialog.Title class="font-black text-lg text-left text-foreground">Edit Building / Landmark</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground font-semibold leading-relaxed text-left mt-0.5">
						Modify building node or department office details.
					</Dialog.Description>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => { activeEditingBuilding = null; clearEditBuildingImage(); }}
					class="size-8 rounded-full hover:bg-muted cursor-pointer shrink-0"
				>
					<XIcon class="size-4 pointer-events-none" />
				</Button>
			</div>
			
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

				<!-- Section 2: Photo Uploader -->
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
							<input type="hidden" name="color" value={editColor} />
							<Select.Root
								type="single"
								value={editColor}
								onValueChange={(val) => editColor = val}
							>
								<Select.Trigger class="h-9 w-full rounded-lg cursor-pointer truncate">
									<span class="text-xs font-semibold flex items-center gap-2">
										<span class="size-3 rounded-full border border-border shrink-0" style="background-color: {editColor};"></span>
										<span>{RAINBOW_COLORS.find(c => c.value === editColor)?.label || "Select"}</span>
									</span>
								</Select.Trigger>
								<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
									<Select.Group>
										{#each RAINBOW_COLORS as colorOpt}
											<Select.Item value={colorOpt.value} label={colorOpt.label}>
												<div class="flex items-center gap-2">
													<span class="size-3 rounded-full border border-border shrink-0" style="background-color: {colorOpt.value};"></span>
													<span>{colorOpt.label}</span>
												</div>
											</Select.Item>
										{/each}
									</Select.Group>
								</Select.Content>
							</Select.Root>
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
					<Button 
						type="button" 
						variant="outline" 
						onclick={() => { activeEditingBuilding = null; clearEditBuildingImage(); }} 
						class="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted/40 cursor-pointer h-9"
					>
						Cancel
					</Button>
					<Button 
						type="submit" 
						disabled={isUpdatingBuildingImage} 
						class="px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer h-9"
					>
						Save Changes
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Manage Rooms Dialog Modal -->
<Dialog.Root
	open={!!activeManageRoomsBuilding}
	onOpenChange={(open) => {
		if (!open) {
			activeManageRoomsBuilding = null;
			clearRoomImage();
		}
	}}
>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-2xl w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
			{#if activeManageRoomsBuilding}
				<div class="p-6 border-b border-border/60 bg-muted/20 flex items-center justify-between">
					<div>
						<Dialog.Title class="text-left font-black text-lg text-foreground">Manage Classrooms</Dialog.Title>
						<Dialog.Description class="text-left text-xs font-semibold text-muted-foreground mt-0.5">
							{activeManageRoomsBuilding.name} ({activeManageRoomsBuilding.code})
						</Dialog.Description>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => { activeManageRoomsBuilding = null; clearRoomImage(); }}
						class="size-8 rounded-full hover:bg-muted cursor-pointer shrink-0"
					>
						<XIcon class="size-4 pointer-events-none" />
					</Button>
				</div>

				<!-- Rooms list section (scrollable) -->
				<div class="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
					<div class="flex items-center justify-between pb-1">
						<span class="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Registered Classrooms / Labs</span>
						<Badge variant="secondary" class="font-bold text-[10px]">{rooms.filter(r => r.buildingId === activeManageRoomsBuilding?.id).length} Rooms</Badge>
					</div>

					<div class="flex flex-col gap-3">
						{#each rooms.filter(r => r.buildingId === activeManageRoomsBuilding?.id) as room}
							<div class="flex items-start justify-between p-3 border rounded-xl shadow-xs gap-3 transition-all {(room.isActive ?? true) ? 'border-border/80 bg-card hover:border-primary/40' : 'opacity-90 border-dashed border-amber-500/40 bg-amber-500/[0.04]'}">
								{#if room.imageUrl}
									<div class="size-12 rounded-lg overflow-hidden border border-border shrink-0">
										<img src={room.imageUrl} alt={room.roomNumber} class="size-full object-cover" />
									</div>
								{/if}
								<div class="flex-grow flex flex-col gap-0.5 min-w-0">
									<div class="flex items-center gap-1.5 flex-wrap">
										<span class="text-xs font-bold text-foreground font-mono">{room.roomNumber}</span>
										<span class="text-xs text-muted-foreground font-semibold truncate">- {room.roomName}</span>
										{#if (room.isActive ?? true)}
											<Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-extrabold uppercase gap-1 px-1.5 py-0 rounded-lg">
												<span class="size-1 rounded-full bg-emerald-500 inline-block"></span>
												<span>Active</span>
											</Badge>
										{:else}
											<Badge variant="outline" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] font-extrabold uppercase gap-1 px-1.5 py-0 rounded-lg">
												<span class="size-1 rounded-full bg-amber-500 inline-block"></span>
												<span>Archived</span>
											</Badge>
										{/if}
									</div>
									{#if room.description}
										<p class="text-[10px] text-muted-foreground/80 font-semibold line-clamp-1">{room.description}</p>
									{/if}
									<div class="flex items-center gap-3 text-[9px] text-muted-foreground font-bold pt-1">
										<span>Floor: {room.floor}</span>
										<span>Coords: {room.xCoord}, {room.yCoord}</span>
									</div>
								</div>

								<div class="flex items-center gap-1 shrink-0">
									<Button 
										type="button" 
										onclick={() => startEditRoom(room)} 
										variant="ghost" 
										size="icon" 
										class="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
										title="Edit Room"
									>
										<PencilIcon class="size-3.5 pointer-events-none" />
									</Button>
									{#if (room.isActive ?? true)}
										<Button 
											type="button" 
											onclick={() => (archiveRoomTarget = room)} 
											variant="ghost" 
											size="icon" 
											class="size-8 rounded-lg hover:bg-amber-500/15 text-muted-foreground hover:text-amber-600 shrink-0 cursor-pointer"
											title="Archive Classroom"
										>
											<ArchiveIcon class="size-3.5 pointer-events-none" />
										</Button>
									{:else}
										<Button 
											type="button" 
											onclick={() => (restoreRoomTarget = room)} 
											variant="ghost" 
											size="icon" 
											class="size-8 rounded-lg hover:bg-emerald-500/15 text-muted-foreground hover:text-emerald-600 shrink-0 cursor-pointer"
											title="Restore Classroom"
										>
											<RotateCcwIcon class="size-3.5 pointer-events-none" />
										</Button>
									{/if}
								</div>
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

						<!-- Photo uploader for Rooms -->
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
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Archive Building Confirmation Dialog -->
<Dialog.Root open={!!archiveBuildingTarget} onOpenChange={(open) => { if (!open) archiveBuildingTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
				<ArchiveIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Archive Building Landmark?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Are you sure you want to archive <strong class="text-foreground">{archiveBuildingTarget?.name} ({archiveBuildingTarget?.code})</strong>?
				This building will be hidden from visitor live navigation and pathfinding routing, while preserving historical visitor check-ins and logs. You can restore it anytime.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (archiveBuildingTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleBuildingStatus" use:enhance={handleToggleBuildingEnhance}>
				<input type="hidden" name="id" value={archiveBuildingTarget?.id} />
				<input type="hidden" name="isActive" value="false" />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5">
					<ArchiveIcon class="size-3.5" />
					<span>Confirm Archive</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Restore Building Confirmation Dialog -->
<Dialog.Root open={!!restoreBuildingTarget} onOpenChange={(open) => { if (!open) restoreBuildingTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
				<RotateCcwIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Restore Building Landmark?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Reactivate and restore landmark <strong class="text-foreground">{restoreBuildingTarget?.name} ({restoreBuildingTarget?.code})</strong>?
				This building will immediately become visible again on the campus map and available for navigation.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (restoreBuildingTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleBuildingStatus" use:enhance={handleToggleBuildingEnhance}>
				<input type="hidden" name="id" value={restoreBuildingTarget?.id} />
				<input type="hidden" name="isActive" value="true" />
				<Button type="submit" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
					<RotateCcwIcon class="size-3.5" />
					<span>Confirm Restore</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Archive Room Confirmation Dialog -->
<Dialog.Root open={!!archiveRoomTarget} onOpenChange={(open) => { if (!open) archiveRoomTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
				<ArchiveIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Archive Classroom / Lab?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Are you sure you want to archive classroom <strong class="text-foreground">{archiveRoomTarget?.roomNumber} - {archiveRoomTarget?.roomName}</strong>?
				This room will be archived without deleting any linked historical records.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (archiveRoomTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleRoomStatus" use:enhance={handleToggleRoomEnhance}>
				<input type="hidden" name="id" value={archiveRoomTarget?.id} />
				<input type="hidden" name="isActive" value="false" />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5">
					<ArchiveIcon class="size-3.5" />
					<span>Confirm Archive</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Restore Room Confirmation Dialog -->
<Dialog.Root open={!!restoreRoomTarget} onOpenChange={(open) => { if (!open) restoreRoomTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
				<RotateCcwIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Restore Classroom / Lab?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Reactivate classroom <strong class="text-foreground">{restoreRoomTarget?.roomNumber} - {restoreRoomTarget?.roomName}</strong>?
				The classroom will be restored and marked as active again.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (restoreRoomTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleRoomStatus" use:enhance={handleToggleRoomEnhance}>
				<input type="hidden" name="id" value={restoreRoomTarget?.id} />
				<input type="hidden" name="isActive" value="true" />
				<Button type="submit" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
					<RotateCcwIcon class="size-3.5" />
					<span>Confirm Restore</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Room Modal Dialog -->
<Dialog.Root open={!!activeEditingRoom} onOpenChange={(open) => { if (!open) { activeEditingRoom = null; clearEditRoomImage(); } }}>
	<Dialog.Content class="sm:max-w-md md:max-w-lg rounded-2xl p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="text-base font-black text-foreground">Edit Classroom / Lab</Dialog.Title>
			<Dialog.Description class="text-xs font-semibold text-muted-foreground">
				Modify room number, floor, description, or photo asset.
			</Dialog.Description>
		</Dialog.Header>

		<form 
			method="POST" 
			action="?/updateRoom" 
			enctype="multipart/form-data" 
			use:enhance={handleUpdateRoomEnhance} 
			class="flex flex-col gap-4 text-xs font-semibold pt-2"
		>
			<input type="hidden" name="id" value={activeEditingRoom?.id} />

			<div class="grid grid-cols-3 gap-3">
				<div class="flex flex-col gap-1.5 col-span-2">
					<label for="edit-roomNumber" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Number *</label>
					<Input id="edit-roomNumber" name="roomNumber" placeholder="e.g. Room 201" required bind:value={editRoomNumber} class="h-9 rounded-lg text-xs font-semibold" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="edit-roomFloor" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Floor Level *</label>
					<select id="edit-roomFloor" name="floor" required bind:value={editRoomFloor} class="h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-xs font-bold shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
						<option value="1st">1st Floor</option>
						<option value="2nd">2nd Floor</option>
						<option value="3rd">3rd Floor</option>
						<option value="4th">4th Floor</option>
						<option value="5th">5th Floor</option>
					</select>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="edit-roomName" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Name *</label>
				<Input id="edit-roomName" name="roomName" placeholder="e.g. Computer Lab A" required bind:value={editRoomName} class="h-9 rounded-lg text-xs" />
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="edit-roomDescription" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Description *</label>
				<Input id="edit-roomDescription" name="description" placeholder="e.g. Cisco networking workstation center" required bind:value={editRoomDescription} class="h-9 rounded-lg text-xs" />
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="edit-room-photo-input" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Room Photo (Optional)</label>
				{#if editRoomImagePreview}
					<div class="relative w-full h-32 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center group">
						<img src={editRoomImagePreview} alt="Preview" class="size-full object-cover" />
						<button 
							type="button" 
							onclick={clearEditRoomImage} 
							class="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
						>
							<XIcon class="size-3.5" />
						</button>
					</div>
				{:else}
					<label for="edit-room-photo-input" class="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
						<UploadCloudIcon class="size-5 text-muted-foreground mb-1" />
						<span class="text-[11px] font-bold text-foreground">Click to upload room photo</span>
						<span class="text-[9px] text-muted-foreground">PNG, JPG up to 5MB</span>
					</label>
					<input 
						type="file" 
						id="edit-room-photo-input"
						name="editRoomImage" 
						accept="image/*" 
						onchange={handleEditRoomImageChange} 
						class="sr-only" 
					/>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<label for="edit-room-xCoord" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Latitude (Optional)</label>
					<Input id="edit-room-xCoord" name="xCoord" type="number" step="any" placeholder="e.g. 9.894" bind:value={editRoomXCoord} class="h-9 rounded-lg text-xs" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="edit-room-yCoord" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Longitude (Optional)</label>
					<Input id="edit-room-yCoord" name="yCoord" type="number" step="any" placeholder="e.g. 123.882" bind:value={editRoomYCoord} class="h-9 rounded-lg text-xs" />
				</div>
			</div>

			<Dialog.Footer class="pt-3 flex items-center justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => { activeEditingRoom = null; clearEditRoomImage(); }} class="text-xs font-bold rounded-xl h-9">
					Cancel
				</Button>
				<Button type="submit" class="text-xs font-bold rounded-xl h-9 cursor-pointer">
					Save Room Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
