<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import XIcon from '@lucide/svelte/icons/x';
	import CameraIcon from '@lucide/svelte/icons/camera';

	interface Props {
		isOpen: boolean;
		targetOfficeName?: string;
		onClose: () => void;
		onSuccess: (scannedCode: string) => void;
	}

	let { isOpen = false, targetOfficeName = 'Office', onClose, onSuccess }: Props = $props();

	let videoElement: HTMLVideoElement | undefined = $state();
	let mediaStream: MediaStream | null = $state(null);
	let isScanning = $state(false);

	$effect(() => {
		if (isOpen) {
			startScanner();
		} else {
			stopScanner();
		}
	});

	onDestroy(() => {
		stopScanner();
	});

	async function startScanner() {
		stopScanner();
		try {
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' },
					audio: false
				});
				mediaStream = stream;
				if (videoElement) {
					videoElement.srcObject = stream;
					videoElement.play();
					isScanning = true;
				}
			}
		} catch (err) {
			console.warn('QR camera error:', err);
		}
	}

	function stopScanner() {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}
		isScanning = false;
	}

	function handleConfirmArrival(code: string) {
		stopScanner();
		toast.success(`Arrived & Checked in at ${targetOfficeName}!`, {
			description: `Room Door Code: ${code}`
		});
		onSuccess(code);
		onClose();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
		<Card.Root class="w-full max-w-sm border-primary/40 shadow-2xl bg-card">
			<Card.Header class="pb-3 flex flex-row items-center justify-between border-b border-border">
				<div>
					<Card.Title class="text-lg font-bold text-foreground">Scan Room Door QR Code</Card.Title>
					<Card.Description class="text-xs text-muted-foreground">Confirm arrival at {targetOfficeName}</Card.Description>
				</div>
				<Button onclick={onClose} variant="ghost" size="sm" class="p-1 size-8 rounded-full">
					<XIcon class="size-4" />
				</Button>
			</Card.Header>

			<Card.Content class="py-4 flex flex-col gap-4 items-center">
				<div class="relative w-60 h-60 rounded-xl overflow-hidden border-2 border-primary bg-slate-950 flex items-center justify-center">
					<video bind:this={videoElement} autoplay playsinline muted class="w-full h-full object-cover"></video>

					<!-- Animated Scanner Overlay Line -->
					<div class="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_15px_var(--color-primary)] animate-bounce top-1/2"></div>
					<div class="absolute inset-0 border-2 border-dashed border-primary/50 m-6 pointer-events-none"></div>
				</div>

				<div class="text-center space-y-1">
					<Badge variant="outline" class="border-primary text-primary text-[10px]">ALIGN DOOR QR INSIDE FRAME</Badge>
					<p class="text-[11px] text-muted-foreground">Or click below to simulate room door QR scan</p>
				</div>

				<!-- Quick Simulation Action for Demo/Testing -->
				<Button
					onclick={() => handleConfirmArrival(`ROOM-QR-${Math.floor(100 + Math.random() * 900)}`)}
					class="w-full bg-primary text-primary-foreground font-bold text-xs py-2 rounded-lg gap-2 shadow-md"
				>
					<CheckCircleIcon class="size-4" />
					<span>Simulate Room Door QR Scan</span>
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
