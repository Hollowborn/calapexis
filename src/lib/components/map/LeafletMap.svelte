<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Office, Room } from '$lib/types';
	import { MOCK_MAP_NODES } from '$lib/supabase';

	interface Props {
		offices: Office[];
		rooms: Room[];
		selectedOfficeId?: string;
		selectedRoomId?: string;
		onSelectOffice?: (office: Office) => void;
	}

	let {
		offices = [],
		rooms = [],
		selectedOfficeId = '',
		selectedRoomId = '',
		onSelectOffice
	}: Props = $props();

	let mapElement: HTMLDivElement | undefined = $state();
	let mapInstance: any = $state(null);
	let routePolyline: any = $state(null);
	let markersMap: Map<string, any> = new Map();

	onMount(async () => {
		if (typeof window === 'undefined' || !mapElement) return;

		// Dynamically import leaflet to prevent SSR window reference issues
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		// Image bounds (adjust bounds according to campusMap dimensions)
		const imageWidth = 1920;
		const imageHeight = 1080;
		const bounds: [ [number, number], [number, number] ] = [ [0, 0], [imageHeight, imageWidth] ];

		// Create map with L.CRS.Simple coordinate system
		const map = L.map(mapElement, {
			crs: L.CRS.Simple,
			minZoom: -1,
			maxZoom: 2,
			center: [imageHeight / 2, imageWidth / 2],
			zoom: 0,
			maxBounds: bounds,
			maxBoundsViscosity: 0.8
		});

		// Overlay the campus map image from /static/campusMap-adjusted.png
		const imageUrl = '/campusMap-adjusted.png';
		L.imageOverlay(imageUrl, bounds).addTo(map);
		map.fitBounds(bounds);

		mapInstance = map;

		// Add markers for offices
		offices.forEach((office) => {
			if (office.xCoord && office.yCoord) {
				// Leaflet CRS Simple uses [y, x]
				const latLng: [number, number] = [office.yCoord, office.xCoord];
				
				const customIcon = L.divIcon({
					className: 'custom-leaflet-marker',
					html: `<div class="flex items-center gap-1.5 bg-card text-card-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg border border-primary/50 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer">
						<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
						<span>${office.code}</span>
					</div>`,
					iconSize: [80, 28],
					iconAnchor: [40, 14]
				});

				const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
				
				const popupContent = document.createElement('div');
				popupContent.className = 'p-2 text-foreground';
				popupContent.innerHTML = `
					<div class="font-bold text-sm text-primary">${office.name}</div>
					<div class="text-xs text-muted-foreground mt-1">${office.building} • ${office.floor}</div>
					<div class="text-xs text-muted-foreground mt-1">${office.description}</div>
				`;

				const selectBtn = document.createElement('button');
				selectBtn.className = 'mt-2 w-full text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground py-1 px-2 rounded transition-colors';
				selectBtn.innerText = 'Navigate Here';
				selectBtn.onclick = () => {
					if (onSelectOffice) onSelectOffice(office);
				};
				popupContent.appendChild(selectBtn);

				marker.bindPopup(popupContent);
				markersMap.set(office.id, marker);
			}
		});

		updateRoute(L);
	});

	onDestroy(() => {
		if (mapInstance) {
			mapInstance.remove();
		}
	});

	// Effect to draw navigation path when selected office/room changes
	$effect(() => {
		if (mapInstance && typeof window !== 'undefined') {
			import('leaflet').then((L) => {
				updateRoute(L);
			});
		}
	});

	function updateRoute(L: any) {
		if (!mapInstance) return;

		// Remove existing route line
		if (routePolyline) {
			mapInstance.removeLayer(routePolyline);
			routePolyline = null;
		}

		if (!selectedOfficeId) return;

		const targetOffice = offices.find((o) => o.id === selectedOfficeId);
		if (!targetOffice || !targetOffice.xCoord || !targetOffice.yCoord) return;

		// Waypoint path coordinates from Main Entrance -> Central Quad -> Target Office
		const startEntrance = MOCK_MAP_NODES.find((n) => n.id === 'node-entrance') || { x: 100, y: 400 };
		const midQuad = MOCK_MAP_NODES.find((n) => n.id === 'node-h1') || { x: 300, y: 400 };

		const pathLatLngs: [number, number][] = [
			[startEntrance.y, startEntrance.x],
			[midQuad.y, midQuad.x],
			[targetOffice.yCoord, targetOffice.xCoord]
		];

		// Draw polyline route using primary theme color
		routePolyline = L.polyline(pathLatLngs, {
			color: '#d97706',
			weight: 5,
			opacity: 0.9,
			dashArray: '10, 10',
			lineCap: 'round'
		}).addTo(mapInstance);

		// Zoom to target marker
		const targetMarker = markersMap.get(selectedOfficeId);
		if (targetMarker) {
			targetMarker.openPopup();
			mapInstance.flyTo([targetOffice.yCoord, targetOffice.xCoord], 0.5, {
				duration: 1.2
			});
		}
	}
</script>

<div class="relative w-full h-[550px] rounded-xl overflow-hidden border border-border shadow-md bg-muted">
	<div bind:this={mapElement} class="w-full h-full z-0"></div>

	<!-- Floating Legend / Controls Overlay -->
	<div class="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-md px-3 py-2 rounded-lg border border-border/60 text-xs shadow-lg space-y-1">
		<div class="font-semibold text-foreground flex items-center gap-1.5">
			<span class="w-2.5 h-2.5 rounded-full bg-primary"></span>
			Campus Interactive Map
		</div>
		<div class="text-muted-foreground">Click markers to inspect & draw route</div>
	</div>
</div>

<style>
	:global(.custom-leaflet-marker) {
		background: transparent;
		border: none;
	}
</style>
