<script lang="ts">
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { MOCK_OFFICES } from '$lib/supabase';
	import type { Office } from '$lib/types';
	
	// Icons
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import PrinterIcon from "@lucide/svelte/icons/printer";

	// Printable QR code modal states
	let activeQrOffice: Office | null = $state(null);
</script>

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Offices & Rooms Config</h1>
			<p class="text-xs text-muted-foreground leading-relaxed">Manage campus rooms and generate printable department QR passes.</p>
		</div>
	</div>

	<!-- Office Cards Grid -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-extrabold text-foreground uppercase tracking-wider">Campus Departments & QR Code Setup</h2>
			<span class="text-xs text-muted-foreground font-semibold">Generating room check-in sheets.</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each MOCK_OFFICES as office}
				<Card.Root class="border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden">
					<Card.Header class="pb-3 border-b border-border/45 bg-muted/20">
						<div class="flex items-center justify-between">
							<Badge variant="secondary" class="font-mono font-black text-xs px-2 py-0.5 rounded-lg">{office.code}</Badge>
							<span class="text-[11px] text-muted-foreground font-semibold">{office.building}</span>
						</div>
						<Card.Title class="text-base font-extrabold text-foreground pt-1.5 leading-tight">{office.name}</Card.Title>
						<Card.Description class="text-xs leading-relaxed text-muted-foreground font-medium">{office.description}</Card.Description>
					</Card.Header>
					<Card.Content class="py-4 text-xs flex flex-col gap-2 text-muted-foreground font-medium">
						<div><span class="font-bold text-foreground">Floor Location:</span> {office.floor}</div>
						<div><span class="font-bold text-foreground">Department Head:</span> {office.headPerson || 'N/A'}</div>
						<div><span class="font-bold text-foreground">Contact Email:</span> {office.contactEmail || 'N/A'}</div>
					</Card.Content>
					<Card.Footer class="pt-3 border-t border-border/40 flex gap-2">
						<Button onclick={() => (activeQrOffice = office)} variant="outline" size="sm" class="w-full text-xs font-bold gap-1.5 rounded-xl h-9 cursor-pointer">
							<QrCodeIcon class="size-4 pointer-events-none" />
							<span>Generate Door QR Sign</span>
						</Button>
					</Card.Footer>
				</Card.Root>
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
