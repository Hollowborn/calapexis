<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<title>University Digital Visitor Logbook & Map</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
	<!-- Navbar Header -->
	<header class="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90 transition-opacity">
				<div class="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-bold shadow-sm">
					C
				</div>
				<span class="tracking-tight">Calapexis <span class="text-primary font-normal text-sm">Logbook & Map</span></span>
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
					href="/admin"
					class="ml-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors"
				>
					Admin Portal
				</a>
			</nav>
		</div>
	</header>

	<!-- Main Body View -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-border py-4 text-center text-xs text-muted-foreground">
		<div class="max-w-7xl mx-auto px-4">
			University Digital Visitor Logbook System & Interactive Map • Refactored with Svelte 5 & Leaflet
		</div>
	</footer>
</div>
