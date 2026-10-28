<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import type { Office } from "$lib/types";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import PrinterIcon from "@lucide/svelte/icons/printer";

	interface Props {
		office: Office | null;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { office, open = $bindable(false), onOpenChange }: Props = $props();

	function handlePrint() {
		if (typeof window !== "undefined") {
			window.print();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(val) => onOpenChange?.(val)}>
	<Dialog.Content class="max-w-sm border-primary/20 shadow-2xl rounded-3xl text-center z-[2600] p-6">
		<Dialog.Header>
			<Dialog.Title class="text-left font-black flex items-center gap-2">
				<QrCodeIcon class="size-5 text-primary" />
				<span>Office Desk QR Code</span>
			</Dialog.Title>
			<Dialog.Description class="text-left text-xs">
				{#if office}{office.name} ({office.code}){/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if office}
			<div class="py-4 flex flex-col gap-4 items-center">
				<div class="p-4 bg-white rounded-2xl shadow-xl border border-border/80 flex items-center justify-center size-56">
					<img
						src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(office.code)}`}
						alt={`${office.code} QR Code`}
						class="size-48 object-contain"
					/>
				</div>

				<div class="text-center space-y-1">
					<Badge class="bg-primary text-primary-foreground font-black font-mono text-[10px] tracking-wider uppercase rounded-full">
						{office.code} DESK SIGN
					</Badge>
					<p class="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto font-semibold">
						Display this QR code sign at the {office.name} reception desk or door. Visitors scan this code with their mobile device to complete arrival check-in.
					</p>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="border-t border-border/60 pt-3">
			<Button onclick={handlePrint} class="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs py-2.5 rounded-xl gap-2 shadow-sm cursor-pointer">
				<PrinterIcon class="size-4 pointer-events-none" />
				<span>Print Office QR Desk Sign</span>
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
