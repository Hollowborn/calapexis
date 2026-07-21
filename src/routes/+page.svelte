<script lang="ts">
	import { MOCK_OFFICES } from '$lib/supabase';
</script>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans">
	<!-- Public Visitor Header Layout -->
	<header class="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-xs">
					V
				</div>
				<span class="tracking-tight">UnivPass <span class="text-primary font-normal text-sm">Logbook & Map</span></span>
			</a>

			<nav class="flex items-center gap-1 sm:gap-2">
				<a
					href="/checkin"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
				>
					Visitor Check-In
				</a>
				<a
					href="/map"
					class="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
				>
					Campus Map
				</a>
				<a
					href="/staff"
					class="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
				>
					Staff Desk
				</a>
				<a
					href="/admin"
					class="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors"
				>
					Admin Portal
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
					Welcome to Campus Digital Visitor Portal
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
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
					</a>

					<a
						href="/staff"
						class="px-5 py-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all flex items-center gap-2"
					>
						<span>Staff Desk Portal</span>
					</a>
					
					<a
						href="/map"
						class="px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border font-medium text-sm transition-all flex items-center gap-2"
					>
						<span>Open Campus Map</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
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
				<a href="/map" class="text-xs font-semibold text-primary hover:underline">View All on Map →</a>
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
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
							</a>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</main>
</div>