<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';

	// Lucide Icons
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import LockIcon from '@lucide/svelte/icons/lock';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		open?: boolean;
		offices?: any[];
		role?: string;
		assignedOfficeId?: string | null;
		prefillVisitor?: any | null;
		onClose?: () => void;
		onSuccess?: (visitor: any) => void;
	}

	let {
		open = $bindable(false),
		offices = [],
		role = 'staff',
		assignedOfficeId = null,
		prefillVisitor = null,
		onClose,
		onSuccess
	}: Props = $props();

	let firstName = $state('');
	let middleName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state(assignedOfficeId || (offices.length > 0 ? offices[0].id : ''));
	let photoUrl = $state('');

	let isOfficeComboOpen = $state(false);
	let isCameraActive = $state(false);
	let isSubmitting = $state(false);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let generatedPass = $state<any | null>(null);

	// Watch prefillVisitor changes when modal opens
	$effect(() => {
		if (open && prefillVisitor) {
			firstName = prefillVisitor.firstName || prefillVisitor.fullName?.split(' ')[0] || '';
			middleName = prefillVisitor.middleName || '';
			lastName = prefillVisitor.lastName || prefillVisitor.fullName?.split(' ').slice(1).join(' ') || '';
			email = prefillVisitor.email || '';
			phone = prefillVisitor.phone || '';
			photoUrl = prefillVisitor.photoUrl || '';
			purpose = prefillVisitor.lastPurpose || '';
		} else if (open && !prefillVisitor && !generatedPass) {
			// Brand new walk-in
			firstName = '';
			middleName = '';
			lastName = '';
			email = '';
			phone = '';
			purpose = '';
			photoUrl = '';
		}
	});

	$effect(() => {
		if (assignedOfficeId) {
			selectedOfficeId = assignedOfficeId;
		} else if (!selectedOfficeId && offices.length > 0) {
			selectedOfficeId = offices[0].id;
		}
	});

	let selectedOffice = $derived(offices.find(o => o.id === selectedOfficeId));

	// Camera Handlers
	async function startCamera() {
		try {
			isCameraActive = true;
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
			if (videoElement) videoElement.srcObject = stream;
		} catch (err) {
			toast.error("Unable to access desk camera.");
			isCameraActive = false;
		}
	}

	function stopCamera() {
		if (videoElement && videoElement.srcObject) {
			const stream = videoElement.srcObject as MediaStream;
			stream.getTracks().forEach(track => track.stop());
			videoElement.srcObject = null;
		}
		isCameraActive = false;
	}

	function captureSelfie() {
		if (!videoElement || !canvasElement) return;
		const ctx = canvasElement.getContext('2d');
		if (ctx) {
			canvasElement.width = 250;
			canvasElement.height = 250;
			ctx.drawImage(videoElement, 0, 0, 250, 250);
			photoUrl = canvasElement.toDataURL('image/jpeg', 0.6);
			stopCamera();
			toast.success("Visitor photo captured!");
		}
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const tempCanvas = document.createElement('canvas');
					tempCanvas.width = 250;
					tempCanvas.height = 250;
					const ctx = tempCanvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0, 250, 250);
						photoUrl = tempCanvas.toDataURL('image/jpeg', 0.6);
						toast.success("Visitor photo uploaded!");
					}
				};
				img.src = event.target?.result as string;
			};
			reader.readAsDataURL(target.files[0]);
		}
	}

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result }: { result: any }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				const visitor = result.data?.visitor;
				generatedPass = visitor || {
					fullName: `${firstName} ${lastName}`,
					passCode: 'VP-' + Math.floor(1000 + Math.random() * 9000),
					officeName: selectedOffice?.name || 'Campus Desk',
					purpose,
					checkInTime: new Date().toISOString()
				};
				toast.success(result.data?.message || "Visitor pass issued successfully!");
				if (onSuccess) onSuccess(generatedPass);
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Assisted check-in failed.");
			}
		};
	}

	function handleReset() {
		generatedPass = null;
		firstName = '';
		middleName = '';
		lastName = '';
		email = '';
		phone = '';
		purpose = '';
		photoUrl = '';
		stopCamera();
	}

	function handleModalClose() {
		stopCamera();
		handleReset();
		open = false;
		if (onClose) onClose();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-lg w-[95vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
						<UserCheckIcon class="size-5 pointer-events-none" />
					</div>
					<div>
						<Dialog.Title class="text-base font-black text-foreground">
							{generatedPass ? 'Visitor Pass Issued' : (prefillVisitor ? 'Quick Re-Entry Check-In' : 'Assisted Walk-In Check-In')}
						</Dialog.Title>
						<Dialog.Description class="text-xs text-muted-foreground font-semibold">
							{generatedPass ? 'Physical pass slip ready for printing' : (prefillVisitor ? 'Pre-filled from previous visitor record' : 'Register walk-in visitors directly at the reception desk')}
						</Dialog.Description>
					</div>
				</div>
				<!-- <Button
					variant="ghost"
					size="icon"
					onclick={handleModalClose}
					class="size-8 rounded-full hover:bg-muted cursor-pointer shrink-0"
				>
					<XIcon class="size-4 pointer-events-none" />
				</Button> -->
			</div>

			<!-- Body -->
			<div class="p-6 overflow-y-auto flex-1">
				{#if !generatedPass}
					{#if prefillVisitor}
						<div class="mb-4 p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-2.5 text-xs text-primary font-semibold">
							<SparklesIcon class="size-4 shrink-0 text-primary" />
							<span>Auto-populated details for <strong>{prefillVisitor.fullName}</strong>. Review and confirm to check in.</span>
						</div>
					{/if}

					<form action="?/registerVisitorManual" method="POST" use:enhance={handleEnhance} class="flex flex-col gap-4 font-semibold text-xs">
						<input type="hidden" name="firstName" value={firstName} />
						<input type="hidden" name="middleName" value={middleName} />
						<input type="hidden" name="lastName" value={lastName} />
						<input type="hidden" name="email" value={email} />
						<input type="hidden" name="phone" value={phone} />
						<input type="hidden" name="officeId" value={selectedOfficeId} />
						<input type="hidden" name="purpose" value={purpose} />
						<input type="hidden" name="photoUrl" value={photoUrl} />

						<!-- Name Details -->
						<div class="grid grid-cols-3 gap-3">
							<Field.Field>
								<Field.FieldLabel for="modal-fn">First Name *</Field.FieldLabel>
								<Input id="modal-fn" bind:value={firstName} placeholder="Juan" required class="rounded-xl h-9 text-xs" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="modal-mn">Middle</Field.FieldLabel>
								<Input id="modal-mn" bind:value={middleName} placeholder="D." class="rounded-xl h-9 text-xs" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="modal-ln">Last Name *</Field.FieldLabel>
								<Input id="modal-ln" bind:value={lastName} placeholder="Cruz" required class="rounded-xl h-9 text-xs" />
							</Field.Field>
						</div>

						<!-- Contact Details -->
						<div class="grid grid-cols-2 gap-3">
							<Field.Field>
								<Field.FieldLabel for="modal-em">Email Address</Field.FieldLabel>
								<Input id="modal-em" type="email" bind:value={email} placeholder="juan@example.com" class="rounded-xl h-9 text-xs" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="modal-ph">Phone Number</Field.FieldLabel>
								<Input id="modal-ph" type="tel" bind:value={phone} placeholder="+63 9..." class="rounded-xl h-9 text-xs" />
							</Field.Field>
						</div>

						<!-- Designated Office (Role Validation: Selectable if Admin, Locked if Staff) -->
						<Field.Field>
							<Field.FieldLabel>Designated Office *</Field.FieldLabel>
							{#if role === 'admin'}
								<Popover.Root bind:open={isOfficeComboOpen}>
									<Popover.Trigger>
										<Button variant="outline" type="button" role="combobox" class="w-full justify-between rounded-xl h-10 text-xs font-bold border-border bg-background cursor-pointer">
											<span class="truncate">
												{selectedOffice ? `${selectedOffice.name} (${selectedOffice.code})` : "-- Select Office --"}
											</span>
											<ChevronsUpDownIcon class="size-4 opacity-50 ml-2 shrink-0 pointer-events-none" />
										</Button>
									</Popover.Trigger>
									<Popover.Content align="start" sideOffset={6} class="w-[var(--bits-popover-anchor-width)] max-w-xs p-0 max-h-60 overflow-y-auto z-[2700] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl">
										<Command.Root class="w-full">
											<Command.Input placeholder="Search office..." class="h-10 text-xs px-3 border-b border-border/60" />
											<Command.List class="p-1 max-h-48 overflow-y-auto">
												<Command.Empty class="p-3 text-xs text-muted-foreground text-center">No office found.</Command.Empty>
												<Command.Group>
													{#each offices as office}
														<Command.Item
															value={office.name}
															onSelect={() => {
																selectedOfficeId = office.id;
																isOfficeComboOpen = false;
															}}
															class="text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 flex items-center justify-between hover:bg-muted/60"
														>
															<span>{office.name} ({office.code})</span>
															{#if selectedOfficeId === office.id}
																<CheckIcon class="size-4 text-primary shrink-0 ml-2" />
															{/if}
														</Command.Item>
													{/each}
												</Command.Group>
											</Command.List>
										</Command.Root>
									</Popover.Content>
								</Popover.Root>
							{:else}
								<!-- Locked Badge Display for Staff Role -->
								<div class="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
									<div class="flex items-center gap-2">
										<Building2Icon class="size-4 text-primary shrink-0" />
										<span class="font-extrabold text-foreground">{selectedOffice ? selectedOffice.name : 'Assigned Reception Desk'}</span>
										{#if selectedOffice?.code}
											<Badge variant="outline" class="font-mono text-[10px]">{selectedOffice.code}</Badge>
										{/if}
									</div>
									<Badge variant="secondary" class="text-[9px] gap-1 font-bold">
										<LockIcon class="size-3 text-muted-foreground" />
										<span>Assigned Desk</span>
									</Badge>
								</div>
							{/if}
						</Field.Field>

						<!-- Purpose of Visit -->
						<Field.Field>
							<Field.FieldLabel for="modal-purp">Purpose of Visit *</Field.FieldLabel>
							<Input id="modal-purp" bind:value={purpose} placeholder="e.g. Document Inquiry / Consultation" required class="rounded-xl h-9 text-xs" />
						</Field.Field>

						<!-- Visitor Photo Capture / Upload / Auto-Avatar -->
						<div class="flex flex-col gap-2 items-center p-3 rounded-2xl border border-border bg-muted/30 text-center">
							{#if photoUrl}
								<div class="relative">
									<img src={photoUrl} alt="Visitor Snapshot" class="size-20 rounded-full object-cover border-2 border-primary/30 shadow-md" />
								</div>
								<Button type="button" onclick={startCamera} variant="outline" size="sm" class="text-xs font-bold rounded-xl h-7 gap-1 mt-1">
									<RefreshCwIcon class="size-3 pointer-events-none" />
									<span>Retake Photo</span>
								</Button>
							{:else if isCameraActive}
								<div class="relative size-32 rounded-2xl overflow-hidden bg-black border border-primary/40">
									<video bind:this={videoElement} autoplay playsinline class="size-full object-cover"></video>
								</div>
								<canvas bind:this={canvasElement} class="hidden"></canvas>
								<Button type="button" onclick={captureSelfie} class="bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-8 gap-1 cursor-pointer mt-1">
									<CameraIcon class="size-3.5 pointer-events-none" />
									<span>Capture Photo</span>
								</Button>
							{:else}
								<div class="flex gap-2 w-full pt-1">
									<Button type="button" onclick={startCamera} variant="outline" class="flex-1 text-xs font-bold rounded-xl h-9 gap-1 cursor-pointer">
										<CameraIcon class="size-3.5 pointer-events-none" />
										<span>Desk Camera</span>
									</Button>
									<label class="flex-1 flex items-center justify-center gap-1 px-3 h-9 rounded-xl border border-border bg-card hover:bg-muted/40 font-bold text-xs cursor-pointer">
										<UploadIcon class="size-3.5 text-primary pointer-events-none" />
										<span>Upload Photo</span>
										<input type="file" accept="image/*" onchange={handleFileUpload} class="hidden" />
									</label>
								</div>
							{/if}
						</div>

						<div class="pt-2 flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onclick={handleModalClose}
								class="flex-1 rounded-xl h-10 text-xs font-semibold cursor-pointer"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting}
								class="flex-2 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 h-10 cursor-pointer"
							>
								<UserCheckIcon class="size-4 pointer-events-none" />
								<span>{isSubmitting ? 'Issuing Pass...' : 'Issue Pass & Check In'}</span>
							</Button>
						</div>
					</form>
				{:else}
					<!-- Printable Physical Pass Slip View -->
					<div class="border-2 border-primary/60 shadow-xl bg-card text-center rounded-3xl p-6 flex flex-col gap-4">
						<div class="flex items-center justify-between border-b border-border pb-3">
							<Badge variant="outline" class="border-primary text-primary font-bold text-[10px] rounded-full">STAFF ASSISTED ENTRY</Badge>
							<span class="text-[10px] text-muted-foreground font-mono">{new Date(generatedPass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
						</div>

						<div>
							<h3 class="text-2xl font-black text-foreground">{generatedPass.fullName}</h3>
							<p class="text-xs text-muted-foreground">Assisted Entry • No Mobile Device Required</p>
						</div>

						<div class="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-1">
							<span class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Physical Pass Code</span>
							<div class="text-4xl font-mono font-black text-primary tracking-wider">{generatedPass.passCode}</div>
							<span class="text-[11px] text-muted-foreground italic font-semibold">Provide this pass code to the visitor or write on badge slip</span>
						</div>

						<div class="grid grid-cols-2 gap-2 text-left text-xs bg-muted/30 p-3 rounded-xl border border-border">
							<div>
								<span class="text-muted-foreground text-[10px]">Destination Office:</span>
								<div class="font-bold text-foreground">{generatedPass.officeName || selectedOffice?.name || 'General Desk'}</div>
							</div>
							<div>
								<span class="text-muted-foreground text-[10px]">Purpose:</span>
								<div class="font-bold text-foreground">{generatedPass.purpose}</div>
							</div>
						</div>

						<div class="flex flex-col gap-2 pt-2">
							<Button onclick={() => window.print()} variant="outline" class="w-full text-xs font-semibold flex items-center justify-center gap-2 rounded-xl h-10 cursor-pointer border-border">
								<PrinterIcon class="size-4 pointer-events-none" />
								<span>Print Physical Visitor Slip</span>
							</Button>
							<Button onclick={handleReset} class="w-full bg-primary text-primary-foreground text-xs font-extrabold rounded-xl h-10 cursor-pointer">
								Register Another Visitor
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
