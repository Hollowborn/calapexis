<script lang="ts">
	import { MOCK_OFFICES, MOCK_ROOMS } from '$lib/supabase';
	import MobileVisitorWizard from '$lib/components/logbook/MobileVisitorWizard.svelte';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import BuildingIcon from '@lucide/svelte/icons/building';
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<!-- Dedicated Mobile Visitor Header -->
	<header class="border-b border-border bg-card sticky top-0 z-40 shadow-xs">
		<div class="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
			<a href="/v" class="flex items-center gap-2 font-extrabold text-base tracking-tight text-foreground">
				<div class="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-xs font-bold shadow-xs">
					C
				</div>
				<span>Calapexis <span class="text-xs font-normal text-muted-foreground">Mobile Visitor Gate</span></span>
			</a>

			<a href="/staff" class="text-xs font-medium text-primary hover:underline flex items-center gap-1">
				<BuildingIcon class="size-3.5" />
				<span>Staff Desk</span>
			</a>
		</div>
	</header>

	<main class="flex-1 max-w-xl w-full mx-auto px-4 py-4">
		<MobileVisitorWizard offices={MOCK_OFFICES} rooms={MOCK_ROOMS} />
	</main>
</div>
