<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Toaster from '$lib/components/ui/sonner/sonner.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';

	let { data, children } = $props();

	onMount(() => {
		const { data: authListener } = data.supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => {
			authListener.subscription.unsubscribe();
		};
	});
</script>


<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<link rel="alternate icon" type="image/png" href="/favicon.png" />
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
	<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
	<link href="https://fonts.googleapis.com/css2?family=Grandstander:ital,wght@0,100..900;1,100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&family=Raleway:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
	<title>Calapexis | University Digital Visitor Logbook & Map</title>
	<meta name="description" content="Calapexis is a university digital visitor logbook and interactive campus navigation portal for real-time check-ins, office directories, and route guidance." />
	<meta name="keywords" content="Calapexis, visitor logbook, university campus map, digital check-in, campus navigation, visitor pass" />
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
	<link rel="canonical" href="https://calapexis.online" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Calapexis" />
	<meta property="og:url" content="https://calapexis.online" />
	<meta property="og:title" content="Calapexis | University Digital Visitor Logbook & Map" />
	<meta property="og:description" content="University digital visitor logbook and interactive campus navigation portal for check-ins, office directories, and route guidance." />
	<meta property="og:image" content="https://calapexis.online/screenshot.png" />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@calapexis" />
	<meta name="twitter:url" content="https://calapexis.online" />
	<meta name="twitter:title" content="Calapexis | University Digital Visitor Logbook & Map" />
	<meta name="twitter:description" content="University digital visitor logbook and interactive campus navigation portal for check-ins, office directories, and route guidance." />
	<meta name="twitter:image" content="https://calapexis.online/screenshot.png" />

	<!-- Structured Data (JSON-LD) -->
	{@html `<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": "https://calapexis.online/#website",
				"url": "https://calapexis.online/",
				"name": "Calapexis",
				"description": "University Digital Visitor Logbook & Interactive Campus Map",
				"publisher": {
					"@type": "EducationalOrganization",
					"name": "Calapexis Campus Systems",
					"url": "https://calapexis.online/"
				}
			},
			{
				"@type": "SoftwareApplication",
				"@id": "https://calapexis.online/#software",
				"name": "Calapexis Campus Portal",
				"applicationCategory": "EducationalApplication",
				"operatingSystem": "All",
				"offers": {
					"@type": "Offer",
					"price": "0"
				}
			}
		]
	}
	</script>`}
</svelte:head>

<ModeWatcher />
<Toaster position="bottom-left"  />

<div class="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
	<main class="flex-1 w-full mx-auto">
		{@render children()}
	</main>
</div>
