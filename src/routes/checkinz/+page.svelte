<script lang="ts">
	import type { Visitor } from '$lib/types';
	import { MOCK_BUILDINGS, MOCK_ROOMS, checkoutLocalVisitor } from '$lib/supabase';
	import CheckInForm from '$lib/components/logbook/CheckInForm.svelte';
	import { toast } from 'svelte-sonner';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";

	let activePass: Visitor | null = $state(null);
	let isCheckedOut = $state(false);

	function handleCheckInSuccess(visitor: Visitor) {
		activePass = visitor;
		isCheckedOut = false;
		toast.success('Digital Visitor Pass generated successfully!', {
			description: `Pass Code: ${visitor.passCode}`
		});
	}

	function handleSelfCheckout() {
		if (activePass) {
			checkoutLocalVisitor(activePass.id);
			isCheckedOut = true;
			toast.info('You have checked out successfully.', {
				description: 'Thank you for visiting our campus.'
			});
		}
	}

	function handleNewCheckin() {
		activePass = null;
		isCheckedOut = false;
	}
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<!-- Visitor Check-In Surface Header -->
	<header class="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
					C
				</div>
				<span class="tracking-tight">Calapexis <span class="text-primary font-normal text-sm">Visitor Check-In</span></span>
			</a>

			<nav class="flex items-center gap-2">
				<a href="/v" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
					<SmartphoneIcon class="size-3.5" />
					<span>Mobile Gate QR View</span>
				</a>
				<a href="/map" class="text-xs font-medium text-muted-foreground hover:text-foreground">Campus Map</a>
				<a href="/staff" class="text-xs font-semibold text-primary hover:underline ml-2 flex items-center gap-1">
					<BuildingIcon class="size-3.5" />
					<span>Staff Desk</span>
				</a>
				<div class="ml-1">
					<AnimatedThemeToggler />
				</div>
			</nav>
		</div>
	</header>

	<main class="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
		<a
			href="/v"
			class="p-4 rounded-xl bg-card border border-primary/40 shadow-sm flex items-center justify-between hover:bg-primary/5 transition-colors group"
		>
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
					<SmartphoneIcon class="size-5" />
				</div>
				<div>
					<div class="font-bold text-sm text-foreground">Using a Mobile Phone / Scanned Campus Entry QR?</div>
					<div class="text-xs text-muted-foreground">Launch mobile selfie snap, GPS compass navigation, & room QR camera check-in</div>
				</div>
			</div>
			<ArrowRightIcon class="size-4 text-primary group-hover:translate-x-1 transition-transform" />
		</a>

		{#if !activePass}
			<CheckInForm buildings={MOCK_BUILDINGS} rooms={MOCK_ROOMS} onSuccess={handleCheckInSuccess} />
		{:else}
			<!-- Digital Visitor Pass Card -->
			<div class="max-w-md mx-auto bg-card text-card-foreground p-6 rounded-2xl border border-primary/40 shadow-2xl space-y-6 text-center font-semibold text-xs">
				<div class="space-y-1">
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
						{#if isCheckedOut}
							<CheckCircleIcon class="size-3.5" />
							<span>VISITOR CHECKED OUT</span>
						{:else}
							<QrCodeIcon class="size-3.5" />
							<span>OFFICIAL DIGITAL VISITOR PASS</span>
						{/if}
					</span>
					<h2 class="text-2xl font-black tracking-tight text-foreground">{activePass.fullName}</h2>
					<p class="text-xs text-muted-foreground">{activePass.email} • {activePass.phone}</p>
				</div>

				<!-- Pass Code Badge -->
				<div class="py-4 bg-muted/60 rounded-xl border border-border space-y-2">
					<div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Visitor Pass Code</div>
					<div class="text-3xl font-mono font-black tracking-wider text-primary">
						{activePass.passCode}
					</div>
					<!-- Simulated QR Code visual block -->
					<div class="w-32 h-32 mx-auto bg-foreground text-background rounded-lg p-2 flex items-center justify-center border border-border shadow-inner">
						<svg class="w-24 h-24 text-primary" fill="currentColor" viewBox="0 0 24 24">
							<path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm9-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8z"/>
						</svg>
					</div>
				</div>

				<!-- Pass Details Grid -->
				<div class="grid grid-cols-2 gap-3 text-left text-xs bg-muted/30 p-3 rounded-lg border border-border">
					<div>
						<span class="text-muted-foreground text-[10px]">Destination Building:</span>
						<div class="font-bold text-foreground">{activePass.buildingName || 'General'}</div>
					</div>
					<div>
						<span class="text-muted-foreground text-[10px]">Room / Host:</span>
						<div class="font-bold text-foreground">{activePass.roomNumber || activePass.hostPerson || 'General Counter'}</div>
					</div>
					<div>
						<span class="text-muted-foreground text-[10px]">Purpose:</span>
						<div class="font-medium text-foreground truncate">{activePass.purpose}</div>
					</div>
					<div>
						<span class="text-muted-foreground text-[10px]">Check-In Time:</span>
						<div class="font-mono text-foreground">{new Date(activePass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="space-y-2 pt-2">
					<a
						href="/map?building={activePass.buildingId}"
						class="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
					>
						<span>Interactive Map & Directions to {activePass.buildingName}</span>
						<ArrowRightIcon class="size-4" />
					</a>

					<button
						type="button"
						onclick={() => window.print()}
						class="w-full py-2 px-4 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs transition-colors flex items-center justify-center gap-2 h-10 cursor-pointer"
					>
						<PrinterIcon class="size-4" />
						<span>Print Visitor Pass Receipt</span>
					</button>

					{#if !isCheckedOut}
						<button
							type="button"
							onclick={handleSelfCheckout}
							class="w-full py-2 px-4 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold text-xs transition-colors h-10 cursor-pointer"
						>
							Self-Serve Check-Out Now
						</button>
					{:else}
						<div class="text-xs text-primary font-semibold py-1 flex items-center justify-center gap-1.5">
							<CheckCircleIcon class="size-4" />
							<span>You have checked out successfully.</span>
						</div>
					{/if}

					<button
						type="button"
						onclick={handleNewCheckin}
						class="w-full py-2 text-xs text-muted-foreground hover:text-foreground font-medium underline"
					>
						Submit Another Visitor Check-In
					</button>
				</div>
			</div>
		{/if}
	</main>
</div>
