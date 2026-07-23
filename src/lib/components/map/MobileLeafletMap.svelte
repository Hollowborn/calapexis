<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Office, Room } from '$lib/types';
	import { MOCK_MAP_NODES } from '$lib/supabase';
	import RoomQrScannerModal from '$lib/components/logbook/RoomQrScannerModal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CompassIcon from '@lucide/svelte/icons/compass';
	import QrCodeIcon from '@lucide/svelte/icons/qr-code';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	interface Props {
		offices: Office[];
		rooms: Room[];
		selectedOfficeId: string;
		selectedRoomId?: string;
		visitorName?: string;
		photoUrl?: string;
	}

	let {
		offices = [],
		rooms = [],
		selectedOfficeId = '',
		selectedRoomId = '',
		visitorName = 'Visitor',
		photoUrl = ''
	}: Props = $props();

	let mapElement: HTMLDivElement | undefined = $state();
	let mapInstance: any = $state(null);
	let routePolyline: any = $state(null);
	let visitorMarker: any = $state(null);
	let userLocation = $state({ x: 100, y: 400, label: 'Campus Entrance' });
	let facingHeading = $state(0); // Device compass orientation in degrees
	let isScannerOpen = $state(false);
	let isDrawerExpanded = $state(true);
	let isRoomCheckedIn = $state(false);

	let selectedOffice = $derived(offices.find((o) => o.id === selectedOfficeId));

	onMount(async () => {
		if (typeof window === 'undefined' || !mapElement) return;

		// 1. Listen for mobile device compass orientation
		if (window.DeviceOrientationEvent) {
			window.addEventListener('deviceorientation', handleDeviceOrientation);
		}

		// 2. Try device Geolocation
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					// Map real lat/lng to campus map bounds if available
					console.log('GPS acquired:', pos.coords.latitude, pos.coords.longitude);
				},
				(err) => console.log('Geolocation fallback to Entrance:', err.message),
				{ timeout: 5000 }
			);
		}

		// 3. Initialize Leaflet map
		const L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		const imageWidth = 1920;
		const imageHeight = 1080;
		const bounds: [ [number, number], [number, number] ] = [ [0, 0], [imageHeight, imageWidth] ];

		const map = L.map(mapElement, {
			crs: L.CRS.Simple,
			minZoom: -1,
			maxZoom: 2,
			center: [imageHeight / 2, imageWidth / 2],
			zoom: 0,
			maxBounds: bounds,
			maxBoundsViscosity: 0.8,
			zoomControl: false
		});

		L.imageOverlay('/campusMap-adjusted.png', bounds).addTo(map);
		map.fitBounds(bounds);
		mapInstance = map;

		// Add Visitor Current Location Marker with rotating Compass Direction Arrow
		updateVisitorMarker(L);

		// Add Destination Office Marker & Polyline Route
		updateDestinationRoute(L);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('deviceorientation', handleDeviceOrientation);
		}
		if (mapInstance) {
			mapInstance.remove();
		}
	});

	function handleDeviceOrientation(event: DeviceOrientationEvent) {
		if (event.alpha !== null && event.alpha !== undefined) {
			facingHeading = Math.round(event.alpha);
			if (visitorMarker) {
				const arrowElement = document.getElementById('compass-arrow');
				if (arrowElement) {
					arrowElement.style.transform = `rotate(${facingHeading}deg)`;
				}
			}
		}
	}

	function updateVisitorMarker(L: any) {
		if (!mapInstance) return;

		const iconHtml = `<div class="relative flex items-center justify-center">
			<div id="compass-arrow" class="absolute -top-3 w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-[14px] border-b-primary transition-transform duration-200" style="transform: rotate(${facingHeading}deg);"></div>
			<div class="w-8 h-8 rounded-full bg-primary text-primary-foreground border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs ring-4 ring-primary/30 animate-pulse">
				YOU
			</div>
		</div>`;

		const customIcon = L.divIcon({
			className: 'visitor-gps-marker',
			html: iconHtml,
			iconSize: [32, 32],
			iconAnchor: [16, 16]
		});

		if (visitorMarker) {
			visitorMarker.setLatLng([userLocation.y, userLocation.x]);
		} else {
			visitorMarker = L.marker([userLocation.y, userLocation.x], { icon: customIcon }).addTo(mapInstance);
		}
	}

	function updateDestinationRoute(L: any) {
		if (!mapInstance || !selectedOffice) return;

		if (routePolyline) {
			mapInstance.removeLayer(routePolyline);
			routePolyline = null;
		}

		if (selectedOffice.xCoord && selectedOffice.yCoord) {
			// Destination Marker
			const destIcon = L.divIcon({
				className: 'dest-marker',
				html: `<div class="bg-foreground text-background px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl border-2 border-primary flex items-center gap-1.5">
					<span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
					<span>${selectedOffice.code}</span>
				</div>`,
				iconSize: [90, 32],
				iconAnchor: [45, 16]
			});

			const destMarker = L.marker([selectedOffice.yCoord, selectedOffice.xCoord], { icon: destIcon }).addTo(mapInstance);
			destMarker.bindPopup(`<b>${selectedOffice.name}</b><br>${selectedOffice.building} • ${selectedOffice.floor}`);

			// Draw animated route line
			const midQuad = MOCK_MAP_NODES.find((n) => n.id === 'node-h1') || { x: 300, y: 400 };

			const pathLatLngs: [number, number][] = [
				[userLocation.y, userLocation.x],
				[midQuad.y, midQuad.x],
				[selectedOffice.yCoord, selectedOffice.xCoord]
			];

			routePolyline = L.polyline(pathLatLngs, {
				color: '#d97706',
				weight: 6,
				opacity: 0.95,
				dashArray: '12, 12',
				lineCap: 'round'
			}).addTo(mapInstance);

			// Auto zoom & pan to route
			mapInstance.fitBounds(L.latLngBounds(pathLatLngs), { padding: [40, 40] });
		}
	}

	function handleRoomQrSuccess() {
		isRoomCheckedIn = true;
	}
</script>

<div class="relative w-full h-[75vh] min-h-[500px] rounded-2xl overflow-hidden border border-border shadow-xl bg-slate-950 flex flex-col">
	<!-- Leaflet Map Container -->
	<div bind:this={mapElement} class="w-full h-full z-0"></div>

	<!-- Top Status Bar -->
	<div class="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
		<Badge class="bg-background/95 text-foreground backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-border text-xs font-semibold flex items-center gap-1.5 pointer-events-auto">
			<CompassIcon class="size-3.5 text-primary" />
			<span>Facing: {facingHeading}°</span>
		</Badge>

		<Button
			onclick={() => (isScannerOpen = true)}
			class="bg-primary text-primary-foreground font-bold text-xs px-3.5 py-1.5 rounded-full shadow-xl pointer-events-auto flex items-center gap-1.5"
		>
			<QrCodeIcon class="size-4" />
			<span>Scan Room QR</span>
		</Button>
	</div>

	<!-- Mobile Turn-By-Turn Direction Bottom Sheet -->
	<div class="absolute bottom-0 inset-x-0 z-20 bg-card/95 backdrop-blur-xl border-t border-border rounded-t-2xl p-4 shadow-2xl transition-all duration-300">
		<div class="flex items-center justify-between border-b border-border/60 pb-2 mb-3">
			<div class="flex items-center gap-2">
				<NavigationIcon class="size-4 text-primary" />
				<span class="font-bold text-sm text-foreground">Route to {selectedOffice?.name || 'Office'}</span>
			</div>

			<button
				type="button"
				onclick={() => (isDrawerExpanded = !isDrawerExpanded)}
				class="text-muted-foreground hover:text-foreground p-1"
			>
				{#if isDrawerExpanded}
					<ChevronDownIcon class="size-5" />
				{:else}
					<ChevronUpIcon class="size-5" />
				{/if}
			</button>
		</div>

		{#if isDrawerExpanded}
			<div class="space-y-3 text-xs">
				<div class="flex items-center justify-between bg-muted/60 p-2.5 rounded-xl border border-border/80">
					<div class="flex items-center gap-2">
						<MapPinIcon class="size-4 text-primary" />
						<div>
							<div class="font-bold text-foreground">{selectedOffice?.name} ({selectedOffice?.code})</div>
							<div class="text-[11px] text-muted-foreground">{selectedOffice?.building} • {selectedOffice?.floor}</div>
						</div>
					</div>
					{#if isRoomCheckedIn}
						<Badge class="bg-primary text-primary-foreground font-bold text-[10px]">ROOM CHECKED IN</Badge>
					{/if}
				</div>

				<ol class="space-y-2 text-[11px] text-muted-foreground list-decimal list-inside bg-card p-3 rounded-xl border border-border">
					<li>Start at <span class="font-bold text-foreground">Main Campus Gate</span>.</li>
					<li>Walk down the <span class="font-bold text-foreground">Central Quadrangle Walkway</span>.</li>
					<li>Turn into <span class="font-bold text-foreground">{selectedOffice?.building}</span>.</li>
					<li>Locate <span class="font-bold text-primary">{selectedOffice?.name}</span> door sign and scan door QR code.</li>
				</ol>

				<Button
					onclick={() => (isScannerOpen = true)}
					class="w-full bg-primary text-primary-foreground font-bold text-xs py-2 rounded-xl shadow-md gap-2"
				>
					<QrCodeIcon class="size-4" />
					<span>{isRoomCheckedIn ? 'Scan Room Door QR Again' : 'Arrived at Room? Scan Room QR Code'}</span>
				</Button>
			</div>
		{/if}
	</div>

	<!-- Room QR Scanner Modal -->
	<RoomQrScannerModal
		isOpen={isScannerOpen}
		targetOfficeName={selectedOffice?.name}
		onClose={() => (isScannerOpen = false)}
		onSuccess={handleRoomQrSuccess}
	/>
</div>

<style>
	:global(.visitor-gps-marker), :global(.dest-marker) {
		background: transparent;
		border: none;
	}
</style>
