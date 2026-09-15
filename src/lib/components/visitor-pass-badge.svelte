<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import PrinterIcon from "@lucide/svelte/icons/printer";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
	import BrandLogo from "$lib/components/brand-logo.svelte";

	let {
		open = $bindable(false),
		visitor
	}: {
		open: boolean;
		visitor: {
			passCode: string;
			fullName: string;
			officeName?: string;
			buildingName?: string;
			purpose?: string;
			checkInTime?: string;
			status?: string;
		} | null;
	} = $props();

	function handlePrintBadge() {
		window.print();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md border-border bg-card p-0 shadow-2xl rounded-3xl overflow-hidden">
		{#if visitor}
			<!-- Printable ID Badge Container -->
			<div id="printable-visitor-badge" class="p-6 bg-gradient-to-b from-primary/10 via-background to-background flex flex-col gap-5 text-center">
				<!-- Header Letterhead -->
				<div class="flex flex-col items-center gap-1.5 pb-4 border-b border-border/70">
					<div class="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shadow-primary/20 mb-1">
						<BrandLogo class="" />
					</div>
					<h2 class="text-xs font-black uppercase tracking-widest text-primary">
						Bohol Island State University
					</h2>
					<p class="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
						Calape Campus • Official Visitor Pass
					</p>
				</div>

				<!-- Big Pass Code Badge -->
				<div class="flex flex-col items-center gap-1 my-1">
					<Badge variant="default" class="text-xs font-mono font-black tracking-widest px-4 py-1 rounded-full uppercase bg-primary text-primary-foreground">
						{visitor.passCode || "VP-0000"}
					</Badge>
					<span class="text-[10px] text-muted-foreground font-semibold">Authorized Visitor Identification</span>
				</div>

				<!-- QR Code Box -->
				<div class="flex flex-col items-center justify-center p-4 bg-white dark:bg-zinc-950 rounded-2xl border-2 border-primary/20 shadow-inner w-44 mx-auto">
					<img
						src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(visitor.passCode || 'VP-0000')}`}
						alt="Visitor Pass QR"
						class="size-36 object-contain rounded-lg"
					/>
				</div>

				<!-- Visitor Details Grid -->
				<div class="p-4 rounded-2xl border border-border/80 bg-muted/40 grid grid-cols-2 gap-3 text-left text-xs">
					<div class="flex flex-col col-span-2 pb-2 border-b border-border/60">
						<span class="text-[10px] text-muted-foreground font-bold uppercase">Visitor Name</span>
						<span class="font-black text-sm text-foreground">{visitor.fullName}</span>
					</div>

					<div class="flex flex-col">
						<span class="text-[10px] text-muted-foreground font-bold uppercase">Destination Desk</span>
						<span class="font-extrabold text-foreground">{visitor.officeName || "Main Gate"}</span>
					</div>

					<div class="flex flex-col">
						<span class="text-[10px] text-muted-foreground font-bold uppercase">Building</span>
						<span class="font-extrabold text-foreground">{visitor.buildingName || "Campus Center"}</span>
					</div>

					<div class="flex flex-col col-span-2 pt-2 border-t border-border/60">
						<span class="text-[10px] text-muted-foreground font-bold uppercase">Purpose of Visit</span>
						<span class="font-semibold text-foreground text-xs">{visitor.purpose || "Official Campus Business"}</span>
					</div>

					<div class="flex flex-col col-span-2 pt-1 border-t border-border/60 text-[10px] text-muted-foreground font-semibold flex items-center justify-between">
						<span class="flex items-center gap-1">
							<ClockIcon class="size-3 text-primary" />
							<span>Issued: {visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleString() : new Date().toLocaleString()}</span>
						</span>
						<span class="text-emerald-600 dark:text-emerald-400 font-bold uppercase flex items-center gap-1">
							<CheckCircle2Icon class="size-3" />
							<span>VALID PASS</span>
						</span>
					</div>
				</div>

				<!-- Footer Print Controls -->
				<Dialog.Footer class="pt-2">
					<Button
						onclick={handlePrintBadge}
						class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
					>
						<PrinterIcon data-icon="inline-start" />
						<span>Print Official Pass Badge</span>
					</Button>
				</Dialog.Footer>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
