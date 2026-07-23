<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import CheckIcon from '@lucide/svelte/icons/check';
	import UserIcon from '@lucide/svelte/icons/user';

	interface Props {
		onCapture: (photoDataUrl: string) => void;
	}

	let { onCapture }: Props = $props();

	let videoElement: HTMLVideoElement | undefined = $state();
	let canvasElement: HTMLCanvasElement | undefined = $state();
	let mediaStream: MediaStream | null = $state(null);
	let capturedPhoto: string | null = $state(null);
	let isCameraActive = $state(false);
	let cameraError = $state('');
	let facingMode: 'user' | 'environment' = $state('user');

	onMount(() => {
		startCamera();
	});

	onDestroy(() => {
		stopCamera();
	});

	async function startCamera() {
		cameraError = '';
		stopCamera();

		try {
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
					audio: false
				});
				mediaStream = stream;
				if (videoElement) {
					videoElement.srcObject = stream;
					videoElement.play();
					isCameraActive = true;
				}
			} else {
				cameraError = 'Camera not supported. Please use the file upload fallback.';
			}
		} catch (err: any) {
			console.warn('Camera access error:', err);
			cameraError = 'Could not access camera. Please allow camera permissions or upload a photo.';
			isCameraActive = false;
		}
	}

	function stopCamera() {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}
		isCameraActive = false;
	}

	function takeSnap() {
		if (!videoElement || !canvasElement) return;

		const context = canvasElement.getContext('2d');
		if (!context) return;

		const width = videoElement.videoWidth || 400;
		const height = videoElement.videoHeight || 400;

		canvasElement.width = width;
		canvasElement.height = height;

		// Mirror horizontally if using front camera
		if (facingMode === 'user') {
			context.translate(width, 0);
			context.scale(-1, 1);
		}

		context.drawImage(videoElement, 0, 0, width, height);

		const dataUrl = canvasElement.toDataURL('image/jpeg', 0.85);
		capturedPhoto = dataUrl;
		onCapture(dataUrl);
		stopCamera();
	}

	function handleRetake() {
		capturedPhoto = null;
		startCamera();
	}

	function toggleFacingMode() {
		facingMode = facingMode === 'user' ? 'environment' : 'user';
		startCamera();
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const result = event.target?.result as string;
				capturedPhoto = result;
				onCapture(result);
			};
			reader.readAsDataURL(file);
		}
	}
</script>

<div class="flex flex-col items-center gap-3 w-full">
	<div class="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-lg bg-slate-900 flex items-center justify-center">
		{#if capturedPhoto}
			<img src={capturedPhoto} alt="Visitor Face Snapshot" class="w-full h-full object-cover" />
			<div class="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
				<CheckIcon class="size-4" />
			</div>
		{:else}
			<video
				bind:this={videoElement}
				autoplay
				playsinline
				muted
				class="w-full h-full object-cover {facingMode === 'user' ? '-scale-x-100' : ''}"
			></video>

			{#if !isCameraActive}
				<div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-300 bg-slate-900/90 gap-2">
					<UserIcon class="size-10 text-primary/60" />
					<span class="text-xs">{cameraError || 'Camera Starting...'}</span>
				</div>
			{/if}

			<!-- Face Position Oval Guide -->
			{#if isCameraActive}
				<div class="absolute inset-0 border-2 border-dashed border-primary/60 rounded-full m-6 pointer-events-none opacity-60"></div>
			{/if}
		{/if}

		<canvas bind:this={canvasElement} class="hidden"></canvas>
	</div>

	<!-- Controls Bar -->
	{#if capturedPhoto}
		<Button onclick={handleRetake} variant="outline" size="sm" class="text-xs font-semibold gap-1.5">
			<RefreshCwIcon class="size-3.5" />
			<span>Retake Face Snapshot</span>
		</Button>
	{:else}
		<div class="flex items-center gap-2">
			{#if isCameraActive}
				<Button onclick={takeSnap} class="bg-primary text-primary-foreground text-xs font-bold px-5 py-2 rounded-xl shadow-md gap-2">
					<CameraIcon class="size-4" />
					<span>Snap Face Selfie *</span>
				</Button>

				<Button onclick={toggleFacingMode} variant="outline" size="sm" class="text-xs p-2">
					<RefreshCwIcon class="size-3.5" />
				</Button>
			{/if}

			<!-- Fallback Upload Button -->
			<label class="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium cursor-pointer">
				<span>Upload Photo</span>
				<input type="file" accept="image/*" capture="user" onchange={handleFileUpload} class="hidden" />
			</label>
		</div>
	{/if}
</div>
