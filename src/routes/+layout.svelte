<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Toaster from '$lib/components/ui/sonner/sonner.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import '../app.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={"favicon.png"} />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
	<link href="https://fonts.googleapis.com/css2?family=Grandstander:ital,wght@0,100..900;1,100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&family=Raleway:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
	<title>Calapexis | University Digital Visitor Logbook & Map</title>
</svelte:head>

<ModeWatcher />
<Toaster position="bottom-left"  />

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
	<main class="flex-1 w-full mx-auto">
		{@render children()}
	</main>
</div>
