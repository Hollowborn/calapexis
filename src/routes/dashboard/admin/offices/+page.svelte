<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import type { Office } from "$lib/types";
	import { toast } from "svelte-sonner";
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "@sveltejs/kit";

	// Icons
	import PlusIcon from "@lucide/svelte/icons/plus";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import ArchiveIcon from "@lucide/svelte/icons/archive";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SchoolIcon from "@lucide/svelte/icons/school";
	import UserIcon from "@lucide/svelte/icons/user";
	import MailIcon from "@lucide/svelte/icons/mail";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import MonitorCheck from "@lucide/svelte/icons/monitor-check";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import SearchIcon from "@lucide/svelte/icons/search";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import XIcon from "@lucide/svelte/icons/x";

	let { data } = $props();

	let buildings = $derived(data.buildings || []);
	let rooms = $derived(data.rooms || []);
	let offices = $derived(data.offices || []);

	// UI States
	let isCreatingOffice = $state(false);
	let activeQrOffice = $state<Office | null>(null);
	let activeEditingOffice = $state<Office | null>(null);
	let archiveOfficeTarget = $state<Office | null>(null);
	let restoreOfficeTarget = $state<Office | null>(null);

	// Filter & Search States
	let officeSearchQuery = $state("");
	let selectedStatusFilter = $state<"all" | "active" | "archived">("all");

	let filteredOffices = $derived(
		offices.filter((o) => {
			if (selectedStatusFilter === "active" && !o.isActive) return false;
			if (selectedStatusFilter === "archived" && o.isActive) return false;
			if (!officeSearchQuery.trim()) return true;
			const q = officeSearchQuery.toLowerCase().trim();
			return (
				o.name.toLowerCase().includes(q) ||
				o.code.toLowerCase().includes(q) ||
				(o.buildingName && o.buildingName.toLowerCase().includes(q)) ||
				(o.roomNumber && o.roomNumber.toLowerCase().includes(q)) ||
				(o.headPerson && o.headPerson.toLowerCase().includes(q)) ||
				(o.description && o.description.toLowerCase().includes(q))
			);
		})
	);

	// Create Form States
	let createBuildingId = $state("");
	let createRoomId = $state("");

	// Edit Form States
	let editName = $state("");
	let editCode = $state("");
	let editBuildingId = $state("");
	let editRoomId = $state("");
	let editHeadPerson = $state("");
	let editContactEmail = $state("");
	let editOperatingHours = $state("");
	let editDescription = $state("");

	let createAvailableRooms = $derived(
		createBuildingId ? rooms.filter((r) => r.buildingId === createBuildingId) : []
	);

	let editAvailableRooms = $derived(
		editBuildingId ? rooms.filter((r) => r.buildingId === editBuildingId) : []
	);

	function startEditOffice(office: Office) {
		activeEditingOffice = office;
		editName = office.name;
		editCode = office.code;
		editBuildingId = office.buildingId;
		editRoomId = office.roomId || "";
		editHeadPerson = office.headPerson || "";
		editContactEmail = office.contactEmail || "";
		editOperatingHours = office.operatingHours || "";
		editDescription = office.description || "";
	}

	const handleCreateOfficeEnhance: SubmitFunction = () => {
		let resolveCreate: (v?: any) => void = () => {};
		let rejectCreate: (e: any) => void = () => {};
		const promise = new Promise((resolve, reject) => {
			resolveCreate = resolve;
			rejectCreate = reject;
		});

		toast.promise(promise, {
			loading: "Registering office desk...",
			success: "Check-in office desk provisioned!",
			error: (err: any) => err.message || "Failed to create office desk."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveCreate();
				isCreatingOffice = false;
				createBuildingId = "";
				createRoomId = "";
				await update();
			} else if (result.type === "failure") {
				rejectCreate(new Error((result.data as any)?.message || "Failed to create office desk."));
			} else {
				rejectCreate(new Error("Unexpected error."));
			}
		};
	};

	const handleUpdateOfficeEnhance: SubmitFunction = () => {
		let resolveUpdate: (v?: any) => void = () => {};
		let rejectUpdate: (e: any) => void = () => {};
		const promise = new Promise((resolve, reject) => {
			resolveUpdate = resolve;
			rejectUpdate = reject;
		});

		toast.promise(promise, {
			loading: "Updating office desk...",
			success: "Office desk details updated!",
			error: (err: any) => err.message || "Failed to update office desk."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveUpdate();
				activeEditingOffice = null;
				await update();
			} else if (result.type === "failure") {
				rejectUpdate(new Error((result.data as any)?.message || "Failed to update office desk."));
			} else {
				rejectUpdate(new Error("Unexpected error."));
			}
		};
	};

	const handleToggleOfficeEnhance: SubmitFunction = () => {
		let resolveToggle: (v?: any) => void = () => {};
		let rejectToggle: (e: any) => void = () => {};
		const promise = new Promise((resolve, reject) => {
			resolveToggle = resolve;
			rejectToggle = reject;
		});

		toast.promise(promise, {
			loading: "Updating office desk status...",
			success: "Check-in office status updated!",
			error: (err: any) => err.message || "Failed to update office desk status."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveToggle();
				archiveOfficeTarget = null;
				restoreOfficeTarget = null;
				await update();
			} else if (result.type === "failure") {
				rejectToggle(new Error((result.data as any)?.message || "Failed to update office desk status."));
			} else {
				rejectToggle(new Error("Unexpected error."));
			}
		};
	};
</script>

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<MonitorCheck class="size-6 pointer-events-none" />
			</div>
			<div>
				<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Check-In Offices & Reception Desks</h1>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Designate official campus reception counters and department desks available for visitor check-in.</p>
			</div>
		</div>
		<Button onclick={() => (isCreatingOffice = true)} class="text-xs font-extrabold gap-1.5 rounded-xl h-10 shadow-md shadow-primary/10 cursor-pointer">
			<PlusIcon class="size-4 pointer-events-none" />
			<span>Register Office Desk</span>
		</Button>
	</div>

	<!-- Offices Cards Grid -->
	<div class="flex flex-col gap-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div>
				<h2 class="text-xs font-black text-foreground uppercase tracking-wider">Registered Reception Desks ({filteredOffices.length})</h2>
				<span class="text-xs text-muted-foreground font-semibold">{filteredOffices.length} of {offices.length} desks displayed ({offices.filter(o => o.isActive).length} active, {offices.filter(o => !o.isActive).length} archived).</span>
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
								<Select.Item value="all" label="All Status">All Status ({offices.length})</Select.Item>
								<Select.Item value="active" label="Active">Active ({offices.filter(o => o.isActive).length})</Select.Item>
								<Select.Item value="archived" label="Archived">Archived ({offices.filter(o => !o.isActive).length})</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="relative w-full sm:w-64">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input 
						type="text" 
						placeholder="Search offices, rooms, codes..." 
						bind:value={officeSearchQuery} 
						class="pl-9 h-9 text-xs rounded-xl"
					/>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredOffices as office (office.id)}
				{@const parentBuilding = buildings.find(b => b.id === office.buildingId)}
				<Card.Root class="rounded-2xl border transition-all flex flex-col group overflow-hidden shadow-xs hover:shadow-md {office.isActive ? 'border-border/80 bg-card hover:border-primary/40' : 'border-amber-500/40 border-dashed bg-amber-500/[0.04] opacity-90'}">
					<Card.Header class="pb-3 border-b {office.isActive ? 'border-border/50' : 'border-amber-500/20'}">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<Badge variant="outline" class="font-mono font-black text-xs px-2.5 py-0.5 rounded-xl {office.isActive ? 'border-primary/30 text-primary bg-primary/10' : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'}">
									{office.code}
								</Badge>
								{#if parentBuilding?.color}
									<span class="size-2.5 rounded-full border border-black/10 dark:border-white/20 shrink-0" style="background-color: {parentBuilding.color};" title="{parentBuilding.name}"></span>
								{/if}
							</div>
							{#if office.isActive}
								<Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold uppercase gap-1.5 px-2.5 py-0.5 rounded-xl">
									<span class="size-1.5 rounded-full bg-emerald-500 inline-block"></span>
									<span>Active Desk</span>
								</Badge>
							{:else}
								<Badge variant="outline" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-extrabold uppercase gap-1.5 px-2.5 py-0.5 rounded-xl">
									<span class="size-1.5 rounded-full bg-amber-500 inline-block"></span>
									<span>Archived</span>
								</Badge>
							{/if}
						</div>
						<Card.Title class="text-base font-black text-foreground pt-1.5 leading-tight">{office.name}</Card.Title>
						<Card.Description class="text-xs leading-relaxed text-muted-foreground font-semibold line-clamp-2">
							{office.description || "Official check-in desk for transactions and visitor logs."}
						</Card.Description>
					</Card.Header>

					<Card.Content class="p-5 flex-grow flex flex-col gap-4 text-xs font-semibold">
						<div class="grid grid-cols-1 gap-2.5 text-[11px] text-muted-foreground">
							<div class="flex items-center gap-2">
								<MonitorCheck class="size-3.5 {office.isActive ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
								<span class="truncate"><strong class="text-foreground">Building:</strong> {office.buildingName || parentBuilding?.name || 'Main Building'}</span>
							</div>

							{#if office.roomNumber}
								<div class="flex items-center gap-2">
									<SchoolIcon class="size-3.5 {office.isActive ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
									<span class="truncate"><strong class="text-foreground">Assigned Room:</strong> {office.roomNumber}</span>
								</div>
							{/if}

							<div class="flex items-center gap-2">
								<UserIcon class="size-3.5 {office.isActive ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
								<span class="truncate"><strong class="text-foreground">Officer in Charge:</strong> {office.headPerson || 'Staff Desk'}</span>
							</div>

							{#if office.contactEmail}
								<div class="flex items-center gap-2">
									<MailIcon class="size-3.5 {office.isActive ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
									<span class="truncate"><strong class="text-foreground">Email:</strong> {office.contactEmail}</span>
								</div>
							{/if}

							{#if office.operatingHours}
								<div class="flex items-center gap-2">
									<ClockIcon class="size-3.5 {office.isActive ? 'text-primary' : 'text-amber-600/70 dark:text-amber-400/70'} shrink-0 pointer-events-none" />
									<span class="truncate"><strong class="text-foreground">Hours:</strong> {office.operatingHours}</span>
								</div>
							{/if}
						</div>
					</Card.Content>

					<Card.Footer class="p-3 border-t {office.isActive ? 'border-border/50' : 'border-amber-500/20'} flex items-center justify-end gap-2">
						<Button onclick={() => (activeQrOffice = office)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border hover:bg-muted/50">
							<QrCodeIcon class="size-3.5 pointer-events-none" />
							<span>Office QR</span>
						</Button>

						<Button onclick={() => startEditOffice(office)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-border hover:bg-muted/50">
							<PencilIcon class="size-3.5 pointer-events-none" />
							<span>Edit Desk</span>
						</Button>

						{#if office.isActive}
							<Button onclick={() => (archiveOfficeTarget = office)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
								<ArchiveIcon class="size-3.5 pointer-events-none" />
								<span>Archive</span>
							</Button>
						{:else}
							<Button onclick={() => (restoreOfficeTarget = office)} variant="outline" size="sm" class="text-xs font-bold gap-1.5 rounded-xl h-8 cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
								<RotateCcwIcon class="size-3.5 pointer-events-none" />
								<span>Restore</span>
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{:else}
				<div class="text-center py-12 text-sm text-muted-foreground/80 font-semibold bg-card border border-dashed border-border rounded-2xl col-span-full">
					{#if officeSearchQuery.trim()}
						No check-in office desks match your search "{officeSearchQuery}".
					{:else}
						No check-in office desks registered yet. Click "Register Office Desk" to provision one.
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Create Office Desk Dialog Modal -->
<Dialog.Root bind:open={isCreatingOffice}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-xl w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
			<div class="p-6 border-b border-border/60 bg-muted/20 flex items-center justify-between">
				<div>
					<Dialog.Title class="text-left font-black text-lg text-foreground">Register Check-In Office Desk</Dialog.Title>
					<Dialog.Description class="text-left text-xs font-semibold text-muted-foreground mt-0.5">
						Designate a building reception counter or room office that accepts visitor arrivals.
					</Dialog.Description>
				</div>
				<!-- <Button
					variant="ghost"
					size="icon"
					onclick={() => (isCreatingOffice = false)}
					class="size-8 rounded-full hover:bg-muted cursor-pointer shrink-0"
				>
					<XIcon class="size-4 pointer-events-none" />
				</Button> -->
			</div>

			<form 
				method="POST" 
				action="?/createOffice" 
				use:enhance={handleCreateOfficeEnhance} 
				class="flex-grow overflow-y-auto p-6 flex flex-col gap-5 text-xs font-semibold"
			>
				<div class="grid grid-cols-3 gap-2">
					<div class="flex flex-col gap-1.5">
						<label for="create-code" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Code *</label>
						<Input id="create-code" name="code" placeholder="e.g. OFF-CCS" maxlength={10} required class="h-9 rounded-lg text-xs font-semibold" />
					</div>
					<div class="flex flex-col gap-1.5 col-span-2">
						<label for="create-name" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Office Name *</label>
						<Input id="create-name" name="name" placeholder="e.g. Dean's Office Reception" required class="h-9 rounded-lg text-xs font-semibold" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="create-buildingId-hidden" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Target Building *</label>
						<input type="hidden" id="create-buildingId-hidden" name="buildingId" value={createBuildingId} />
						<Select.Root 
							type="single" 
							value={createBuildingId} 
							onValueChange={(val) => { createBuildingId = val; createRoomId = ""; }}
						>
							<Select.Trigger class="h-9 rounded-lg cursor-pointer">
								<span class="text-xs font-semibold text-foreground">
									{buildings.find(b => b.id === createBuildingId)?.name || "Select Building..."}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
								<Select.Group>
									{#each buildings as b}
										<Select.Item value={b.id} label={b.name}>{b.name} ({b.code})</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="create-roomId-hidden" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Linked Room (Optional)</label>
						<input type="hidden" id="create-roomId-hidden" name="roomId" value={createRoomId} />
						<Select.Root 
							type="single" 
							value={createRoomId} 
							onValueChange={(val) => createRoomId = val}
							disabled={!createBuildingId || createAvailableRooms.length === 0}
						>
							<Select.Trigger class="h-9 rounded-lg cursor-pointer">
								<span class="text-xs font-semibold text-foreground">
									{rooms.find(r => r.id === createRoomId)?.roomName || (createAvailableRooms.length > 0 ? "Building Main Lobby Desk" : "No Rooms Available")}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
								<Select.Group>
									<Select.Item value="" label="Building Main Lobby Desk">Building Main Lobby Desk</Select.Item>
									{#each createAvailableRooms as r}
										<Select.Item value={r.id} label={`${r.roomNumber} - ${r.roomName}`}>
											{r.roomNumber} - {r.roomName}
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="create-headPerson" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Officer / Head Person</label>
						<Input id="create-headPerson" name="headPerson" placeholder="e.g. Dr. Santos" class="h-9 rounded-lg text-xs font-semibold" />
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="create-contactEmail" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Contact Email</label>
						<Input id="create-contactEmail" name="contactEmail" type="email" placeholder="ccs@university.edu" class="h-9 rounded-lg text-xs font-semibold" />
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="create-operatingHours" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Operating Hours</label>
					<Input id="create-operatingHours" name="operatingHours" placeholder="e.g. 8:00 AM - 5:00 PM (Mon-Fri)" class="h-9 rounded-lg text-xs font-semibold" />
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="create-description" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Office Description</label>
					<Input id="create-description" name="description" placeholder="Brief statement regarding services handled at this desk..." class="h-9 rounded-lg text-xs font-semibold" />
				</div>

				<div class="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-auto">
					<Button type="button" variant="outline" onclick={() => (isCreatingOffice = false)} class="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted/40 cursor-pointer h-9">
						Cancel
					</Button>
					<Button type="submit" class="px-5 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer h-9">
						Provision Desk
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Edit Office Desk Dialog Modal -->
<Dialog.Root open={!!activeEditingOffice} onOpenChange={(open) => { if (!open) activeEditingOffice = null; }}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-xl w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
			<div class="p-6 border-b border-border/60 bg-muted/20 flex items-center justify-between">
				<div>
					<Dialog.Title class="text-left font-black text-lg text-foreground">Edit Check-In Office Desk</Dialog.Title>
					<Dialog.Description class="text-left text-xs font-semibold text-muted-foreground mt-0.5">
						Modify details for {activeEditingOffice?.name}.
					</Dialog.Description>
				</div>
				<!-- <Button
					variant="ghost"
					size="icon"
					onclick={() => (activeEditingOffice = null)}
					class="size-8 rounded-full hover:bg-muted cursor-pointer shrink-0"
				>
					<XIcon class="size-4 pointer-events-none" />
				</Button> -->
			</div>

			<form 
				method="POST" 
				action="?/updateOffice" 
				use:enhance={handleUpdateOfficeEnhance} 
				class="flex-grow overflow-y-auto p-6 flex flex-col gap-5 text-xs font-semibold"
			>
				<input type="hidden" name="id" value={activeEditingOffice?.id} />
				<input type="hidden" name="isActive" value="true" />

				<div class="grid grid-cols-3 gap-2">
					<div class="flex flex-col gap-1.5">
						<label for="edit-code" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Code *</label>
						<Input id="edit-code" name="code" placeholder="e.g. OFF-CCS" maxlength={10} required bind:value={editCode} class="h-9 rounded-lg text-xs font-semibold" />
					</div>
					<div class="flex flex-col gap-1.5 col-span-2">
						<label for="edit-name" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Office Name *</label>
						<Input id="edit-name" name="name" placeholder="e.g. Dean's Office Reception" required bind:value={editName} class="h-9 rounded-lg text-xs font-semibold" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="edit-buildingId-hidden" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Target Building *</label>
						<input type="hidden" id="edit-buildingId-hidden" name="buildingId" value={editBuildingId} />
						<Select.Root 
							type="single" 
							value={editBuildingId} 
							onValueChange={(val) => { editBuildingId = val; editRoomId = ""; }}
						>
							<Select.Trigger class="h-9 rounded-lg cursor-pointer">
								<span class="text-xs font-semibold text-foreground">
									{buildings.find(b => b.id === editBuildingId)?.name || "Select Building..."}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
								<Select.Group>
									{#each buildings as b}
										<Select.Item value={b.id} label={b.name}>{b.name} ({b.code})</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="edit-roomId-hidden" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Linked Room (Optional)</label>
						<input type="hidden" id="edit-roomId-hidden" name="roomId" value={editRoomId} />
						<Select.Root 
							type="single" 
							value={editRoomId} 
							onValueChange={(val) => editRoomId = val}
							disabled={!editBuildingId || editAvailableRooms.length === 0}
						>
							<Select.Trigger class="h-9 rounded-lg cursor-pointer">
								<span class="text-xs font-semibold text-foreground">
									{rooms.find(r => r.id === editRoomId)?.roomName || (editAvailableRooms.length > 0 ? "Building Main Lobby Desk" : "No Rooms Available")}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card z-[2700]">
								<Select.Group>
									<Select.Item value="" label="Building Main Lobby Desk">Building Main Lobby Desk</Select.Item>
									{#each editAvailableRooms as r}
										<Select.Item value={r.id} label={`${r.roomNumber} - ${r.roomName}`}>
											{r.roomNumber} - {r.roomName}
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="edit-headPerson" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Officer / Head Person</label>
						<Input id="edit-headPerson" name="headPerson" placeholder="e.g. Dr. Santos" bind:value={editHeadPerson} class="h-9 rounded-lg text-xs font-semibold" />
					</div>

					<div class="flex flex-col gap-1.5">
						<label for="edit-contactEmail" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Contact Email</label>
						<Input id="edit-contactEmail" name="contactEmail" type="email" placeholder="ccs@university.edu" bind:value={editContactEmail} class="h-9 rounded-lg text-xs font-semibold" />
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="edit-operatingHours" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Operating Hours</label>
					<Input id="edit-operatingHours" name="operatingHours" placeholder="e.g. 8:00 AM - 5:00 PM (Mon-Fri)" bind:value={editOperatingHours} class="h-9 rounded-lg text-xs font-semibold" />
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="edit-description" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">Office Description</label>
					<Input id="edit-description" name="description" placeholder="Brief statement regarding services..." bind:value={editDescription} class="h-9 rounded-lg text-xs font-semibold" />
				</div>

				<div class="pt-4 border-t border-border/60 flex items-center justify-end gap-3 mt-auto">
					<Button type="button" variant="outline" onclick={() => activeEditingOffice = null} class="px-4 py-2 border border-border rounded-xl text-xs font-bold hover:bg-muted/40 cursor-pointer h-9">
						Cancel
					</Button>
					<Button type="submit" class="px-5 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer h-9">
						Save Changes
					</Button>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Archive Office Confirmation Dialog -->
<Dialog.Root open={!!archiveOfficeTarget} onOpenChange={(open) => { if (!open) archiveOfficeTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
				<ArchiveIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Archive Check-In Desk?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Are you sure you want to archive desk <strong class="text-foreground">{archiveOfficeTarget?.name} ({archiveOfficeTarget?.code})</strong>?
				This office will be hidden from visitor check-in selections, but all historical visitor logs and staff assignments remain safely preserved. You can restore it at any time.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (archiveOfficeTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleOfficeStatus" use:enhance={handleToggleOfficeEnhance}>
				<input type="hidden" name="id" value={archiveOfficeTarget?.id} />
				<input type="hidden" name="isActive" value="false" />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5">
					<ArchiveIcon class="size-3.5" />
					<span>Confirm Archive</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Restore Office Confirmation Dialog -->
<Dialog.Root open={!!restoreOfficeTarget} onOpenChange={(open) => { if (!open) restoreOfficeTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
				<RotateCcwIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Restore Check-In Desk?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Reactivate and restore desk <strong class="text-foreground">{restoreOfficeTarget?.name} ({restoreOfficeTarget?.code})</strong>?
				This office desk will immediately become active again and available for visitor check-in.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (restoreOfficeTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleOfficeStatus" use:enhance={handleToggleOfficeEnhance}>
				<input type="hidden" name="id" value={restoreOfficeTarget?.id} />
				<input type="hidden" name="isActive" value="true" />
				<Button type="submit" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
					<RotateCcwIcon class="size-3.5" />
					<span>Confirm Restore</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Printable Office Desk QR Code Modal -->
<Dialog.Root
	open={!!activeQrOffice}
	onOpenChange={(open) => {
		if (!open) activeQrOffice = null;
	}}
>
	<Dialog.Content class="max-w-sm border-primary/20 shadow-2xl rounded-3xl text-center z-[2600] p-6">
		<Dialog.Header>
			<Dialog.Title class="text-left font-black flex items-center gap-2">
				<QrCodeIcon class="size-5 text-primary" />
				<span>Office Desk QR Code</span>
			</Dialog.Title>
			<Dialog.Description class="text-left text-xs">
				{#if activeQrOffice}{activeQrOffice.name} ({activeQrOffice.code}){/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if activeQrOffice}
			<div class="py-4 flex flex-col gap-4 items-center">
				<div class="p-4 bg-white rounded-2xl shadow-xl border border-border/80 flex items-center justify-center size-56">
					<img
						src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeQrOffice.code)}`}
						alt={`${activeQrOffice.code} QR Code`}
						class="size-48 object-contain"
					/>
				</div>

				<div class="text-center space-y-1">
					<Badge class="bg-primary text-primary-foreground font-black font-mono text-[10px] tracking-wider uppercase rounded-full">
						{activeQrOffice.code} DESK SIGN
					</Badge>
					<p class="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto font-semibold">
						Display this QR code sign at the {activeQrOffice.name} reception desk or door. Visitors scan this code with their mobile device to complete arrival check-in.
					</p>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="border-t border-border/60 pt-3">
			<Button onclick={() => window.print()} class="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs py-2.5 rounded-xl gap-2 shadow-sm cursor-pointer">
				<PrinterIcon class="size-4 pointer-events-none" />
				<span>Print Office QR Desk Sign</span>
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
