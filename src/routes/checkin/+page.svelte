<script lang="ts">
	import type { Visitor } from '$lib/types';
	import { MOCK_OFFICES, MOCK_ROOMS, checkoutLocalVisitor } from '$lib/supabase';
	import CheckInForm from '$lib/components/logbook/CheckInForm.svelte';

	let activePass: Visitor | null = $state(null);
	let isCheckedOut = $state(false);

	function handleCheckInSuccess(visitor: Visitor) {
		activePass = visitor;
		isCheckedOut = false;
	}

	function handleSelfCheckout() {
		if (activePass) {
			checkoutLocalVisitor(activePass.id);
			isCheckedOut = true;
		}
	}

	function handleNewCheckin() {
		activePass = null;
		isCheckedOut = false;
	}
</script>

<div class="py-6 max-w-4xl mx-auto space-y-6">
	{#if !activePass}
		<CheckInForm offices={MOCK_OFFICES} rooms={MOCK_ROOMS} onSuccess={handleCheckInSuccess} />
	{:else}
		<!-- Digital Visitor Pass Card -->
		<div class="max-w-md mx-auto bg-card text-card-foreground p-6 rounded-2xl border border-primary/40 shadow-2xl space-y-6 text-center">
			<div class="space-y-1">
				<span class="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
					{#if isCheckedOut}
						VISITOR CHECKED OUT
					{:else}
						OFFICIAL DIGITAL VISITOR PASS
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
					<span class="text-muted-foreground text-[10px]">Destination Office:</span>
					<div class="font-bold text-foreground">{activePass.officeName || 'General'}</div>
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
					href="/map?office={activePass.officeId}"
					class="block w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md transition-colors"
				>
					Interactive Map & Directions to {activePass.officeName} →
				</a>

				{#if !isCheckedOut}
					<button
						type="button"
						onclick={handleSelfCheckout}
						class="w-full py-2 px-4 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold text-xs transition-colors"
					>
						Self-Serve Check-Out Now
					</button>
				{:else}
					<div class="text-xs text-primary font-semibold py-1">✓ You have checked out successfully.</div>
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
</div>
