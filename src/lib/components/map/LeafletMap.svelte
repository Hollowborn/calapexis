<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Building, Room } from '$lib/types';
	import { MOCK_MAP_NODES } from '$lib/supabase';

	interface Props {
		buildings: Building[];
		rooms: Room[];
		selectedBuildingId?: string;
		selectedRoomId?: string;
		onSelectBuilding?: (building: Building) => void;
	}

	let {
		buildings = [],
		rooms = [],
		selectedBuildingId = '',
		selectedRoomId = '',
		onSelectBuilding
	}: Props = $props();

	let mapElement: HTMLDivElement | undefined = $state();
	let mapInstance: any = $state(null);
	let routePolyline: any = $state(null);
	let markersMap: Map<string, any> = new Map();

	// MAP CONFIGURATION & CAMPUS BOUNDARIES SETUP
	const MAP_WIDTH = 1920;
	const MAP_HEIGHT = 1080;
	const MAP_BOUNDS: [[number, number], [number, number]] = [[0, 0], [MAP_HEIGHT, MAP_WIDTH]];
	const MAP_MIN_ZOOM = -1;
	const MAP_MAX_ZOOM = 2;
	const MAP_DEFAULT_ZOOM = 0;
	const MAP_BOUNDS_VISCOSITY = 0.85;

	onMount(async () => {
		if (typeof window === 'undefined' || !mapElement) return;

		// Dynamically import leaflet to prevent SSR window reference issues
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		// Create map with L.CRS.Simple coordinate system
		const map = L.map(mapElement, {
			crs: L.CRS.Simple,
			minZoom: MAP_MIN_ZOOM,
			maxZoom: MAP_MAX_ZOOM,
			center: [MAP_HEIGHT / 2, MAP_WIDTH / 2],
			zoom: MAP_DEFAULT_ZOOM,
			maxBounds: MAP_BOUNDS,
			maxBoundsViscosity: MAP_BOUNDS_VISCOSITY
		});

		// Overlay the campus map image from /static/campusMap-adjusted.png
		const imageUrl = '/campusMap-adjusted.png';
		L.imageOverlay(imageUrl, MAP_BOUNDS).addTo(map);
		map.fitBounds(MAP_BOUNDS);

		mapInstance = map;

		// Add markers for buildings
		buildings.forEach((building) => {
			if (building.xCoord && building.yCoord) {
				// Leaflet CRS Simple uses [y, x]
				const latLng: [number, number] = [building.yCoord, building.xCoord];
				
				const customIcon = L.divIcon({
					className: 'custom-leaflet-marker',
					html: `<div class="flex items-center gap-1.5 bg-card text-card-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg border border-primary/50 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer">
						<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
						<span>${building.code}</span>
					</div>`,
					iconSize: [80, 28],
					iconAnchor: [40, 14]
				});

				const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
				
				const popupContent = document.createElement('div');
				popupContent.className = 'p-2 text-foreground font-semibold text-xs';
				popupContent.innerHTML = `
					<div class="font-black text-sm text-primary">${building.name}</div>
					<div class="text-[10px] text-muted-foreground mt-1">${building.floors} Floors</div>
					<div class="text-[10px] text-muted-foreground mt-1">${building.description || ''}</div>
				`;

				const selectBtn = document.createElement('button');
				selectBtn.className = 'mt-2 w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 px-2 rounded-xl transition-colors cursor-pointer h-8';
				selectBtn.innerText = 'Navigate Here';
				selectBtn.onclick = () => {
					if (onSelectBuilding) onSelectBuilding(building);
				};
				popupContent.appendChild(selectBtn);

				marker.bindPopup(popupContent);
				markersMap.set(building.id, marker);
			}
		});

		updateRoute(L);
	});

	onDestroy(() => {
		if (mapInstance) {
			mapInstance.remove();
		}
	});

	// Effect to draw navigation path when selected building changes
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

		if (!selectedBuildingId) return;

		const targetBuilding = buildings.find((b) => b.id === selectedBuildingId);
		if (!targetBuilding || !targetBuilding.xCoord || !targetBuilding.yCoord) return;

		// Waypoint path coordinates from Main Entrance -> Central Quad -> Target Building
		const startEntrance = MOCK_MAP_NODES.find((n) => n.id === 'node-entrance') || { x: 100, y: 400 };
		const midQuad = MOCK_MAP_NODES.find((n) => n.id === 'node-h1') || { x: 300, y: 400 };

		const pathLatLngs: [number, number][] = [
			[startEntrance.y, startEntrance.x],
			[midQuad.y, midQuad.x],
			[targetBuilding.yCoord, targetBuilding.xCoord]
		];

		// Draw polyline route using primary theme color
		routePolyline = L.polyline(pathLatLngs, {
			color: 'var(--color-primary)',
			weight: 5,
			opacity: 0.9,
			dashArray: '10, 10',
			lineCap: 'round'
		}).addTo(mapInstance);

		// Zoom to target marker
		const targetMarker = markersMap.get(selectedBuildingId);
		if (targetMarker) {
			targetMarker.openPopup();
			mapInstance.flyTo([targetBuilding.yCoord, targetBuilding.xCoord], 0.5, {
				duration: 1.2
			});
		}
	}
</script>

<div bind:this={mapElement} class="w-full h-full min-h-[450px] rounded-xl border border-border/80 shadow-md"></div>

<style>
	:global(.custom-leaflet-marker) {
		background: transparent;
		border: none;
	}
</style>
