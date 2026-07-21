<script lang="ts">
	import { MOCK_OFFICES } from '$lib/supabase';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<!-- Public Visitor Header Layout -->
	<header class="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
					C
				</div>
				<span class="tracking-tight">Calapexis <span class="text-primary font-normal text-sm">Visitor Portal</span></span>
			</a>

			<nav class="flex items-center gap-1 sm:gap-2">
				<a
					href="/checkin"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
				>
					<UserCheckIcon class="size-3.5" />
					<span>Visitor Check-In</span>
				</a>
				<a
					href="/map"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
				>
					<CompassIcon class="size-3.5" />
					<span>Campus Map</span>
				</a>
				<a
					href="/staff"
					class="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5"
				>
					<BuildingIcon class="size-3.5" />
					<span>Staff Desk</span>
				</a>
				<a
					href="/admin"
					class="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors flex items-center gap-1.5"
				>
					<ShieldCheckIcon class="size-3.5" />
					<span>Admin Portal</span>
				</a>
			</nav>
		</div>
	</header>

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
		<!-- Hero Banner Section -->
		<section class="relative rounded-2xl bg-card text-card-foreground p-8 md:p-12 overflow-hidden shadow-xl border border-border">
			<div class="absolute -right-10 -bottom-10 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
			
			<div class="max-w-2xl relative z-10 space-y-4">
				<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/20">
					<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
					Digital Visitor Logbook & Navigation
				</span>
				
				<h1 class="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
					Welcome to Calapexis Visitor Portal
				</h1>
				
				<p class="text-muted-foreground text-sm md:text-base leading-relaxed">
					Seamless digital check-in for campus visitors, instantaneous digital pass generation, and real-time interactive Leaflet map guidance directly to your destination office.
				</p>
				
				<div class="pt-4 flex flex-wrap items-center gap-3">
					<a
						href="/checkin"
						class="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md transition-all flex items-center gap-2"
					>
						<span>Start Visitor Check-In</span>
						<ArrowRightIcon class="size-4" />
					</a>

					<a
						href="/staff"
						class="px-5 py-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all flex items-center gap-2"
					>
						<BuildingIcon class="size-4" />
						<span>Staff Desk Portal</span>
					</a>
					
					<a
						href="/map"
						class="px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border font-medium text-sm transition-all flex items-center gap-2"
					>
						<CompassIcon class="size-4" />
						<span>Open Campus Map</span>
					</a>
				</div>
			</div>
		</section>

		<!-- Quick Directory Grid -->
		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold text-foreground">University Offices Directory</h2>
					<p class="text-xs text-muted-foreground">Select an office to view location details & navigate on map.</p>
				</div>
				<a href="/map" class="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
					<span>View All on Map</span>
					<ArrowRightIcon class="size-3.5" />
				</a>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each MOCK_OFFICES as office}
					<div class="p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3">
						<div class="space-y-1">
							<div class="flex items-center justify-between">
								<span class="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{office.code}</span>
								<span class="text-[11px] text-muted-foreground">{office.building}</span>
							</div>
							<h3 class="font-bold text-base text-foreground pt-1">{office.name}</h3>
							<p class="text-xs text-muted-foreground line-clamp-2">{office.description}</p>
						</div>

						<div class="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
							<span class="text-muted-foreground font-medium">{office.floor}</span>
							<a
								href="/map?office={office.id}"
								class="text-primary font-semibold hover:underline flex items-center gap-1"
							>
								<span>Locate Room</span>
								<MapPinIcon class="size-3.5" />
							</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</main>
</div>