<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import {Toaster} from "$lib/components/ui/sonner";
	import {ModeWatcher} from "mode-watcher"
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<title>Calapexis</title>
</svelte:head>
<ModeWatcher />
<Toaster />
<div class="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
	<main class="flex-1 w-full mx-auto">
		{@render children()}
	</main>
</div>
