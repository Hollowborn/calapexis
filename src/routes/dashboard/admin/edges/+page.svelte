<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Building, MapEdge } from '$lib/types';
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Command from "$lib/components/ui/command/index.js";
	import { Switch } from "$lib/components/ui/switch/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { toast } from "svelte-sonner";

	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import MapIcon from "@lucide/svelte/icons/map";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import RouteIcon from "@lucide/svelte/icons/route";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import Edit3Icon from "@lucide/svelte/icons/edit-3";
	import ArrowRightLeftIcon from "@lucide/svelte/icons/arrow-right-left";
	import Undo2Icon from "@lucide/svelte/icons/undo-2";
	import ListIcon from "@lucide/svelte/icons/list";
	import SearchIcon from "@lucide/svelte/icons/search";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import CheckIcon from "@lucide/svelte/icons/check";

	let { data } = $props();

	let actionEdges = $state<MapEdge[] | null>(null);
	let buildingsList = $derived<Building[]>(data.buildings || []);
	let edgesList = $derived<MapEdge[]>(actionEdges || data.mapEdges || []);

	// Navigation & Tab state
	let activeTab = $state<'map' | 'edges'>('map');
	let searchQuery = $state('');

	// Active editing & combobox state
	let activeEditingId = $state<string | null>(null);
	let selectedFromNode = $state<string>('');
	let selectedToNode = $state<string>('');
	let isFromComboOpen = $state(false);
	let isToComboOpen = $state(false);
	let waypoints = $state<[number, number][]>([]);

	let selectedFromBuilding = $derived(
		buildingsList.find(b => b.id === selectedFromNode || b.code === selectedFromNode)
	);
	let selectedToBuilding = $derived(
		buildingsList.find(b => b.id === selectedToNode || b.code === selectedToNode)
	);

	// Map layers & tile state
	let selectedBaseTile = $state<'osm' | 'satellite'>('osm');
	let showCampusOverlay = $state(true);
	let isLayerPopoverOpen = $state(false);

	// Delete dialog state
	let deletingTarget = $state<MapEdge | null>(null);

	// Leaflet map container & instances
	let mapElement = $state<HTMLDivElement | null>(null);
	let leafMap = $state<any>(null);
	let leafletInstance = $state<any>(null);
	let activePolyline = $state<any>(null);
	let osmLayerInstance = $state<any>(null);
	let satelliteLayerInstance = $state<any>(null);
	let campusOverlayInstance = $state<any>(null);
	let existingEdgePolylines: any[] = [];
	let waypointMarkers: any[] = [];
	let buildingMarkers: any[] = [];

	// Campus map bounds
	const campusBoundsCoords = [
		[9.893421456778755, 123.8815211010603],
		[9.895647770829878, 123.88369296680753]
	];

	let filteredEdgesList = $derived(
		edgesList.filter(edge => {
			const query = searchQuery.trim().toLowerCase();
			if (!query) return true;
			const fromName = getBuildingName(edge.fromNode).toLowerCase();
			const toName = getBuildingName(edge.toNode).toLowerCase();
			return fromName.includes(query) || toName.includes(query);
		})
	);

	function getBuildingName(nodeId: string): string {
		const found = buildingsList.find(b => b.id === nodeId || b.code === nodeId);
		return found ? `${found.name} (${found.code})` : nodeId;
	}

	function getBuildingCoords(nodeId: string): [number, number] | null {
		const found = buildingsList.find(b => b.id === nodeId || b.code === nodeId);
		if (!found) return null;
		const lat = found.lat || found.xCoord || 9.894414;
		const lng = found.lng || found.yCoord || 123.88258;
		return [lat, lng];
	}

	// Calculate total distance along waypoints in meters
	let totalDistanceMeters = $derived.by(() => {
		if (waypoints.length < 2) return 0;
		let total = 0;
		for (let i = 0; i < waypoints.length - 1; i++) {
			const [lat1, lon1] = waypoints[i];
			const [lat2, lon2] = waypoints[i + 1];
			total += haversineDistance(lat1, lon1, lat2, lon2);
		}
		return Math.round(total);
	});

	function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 6371000;
		const dLat = (lat2 - lat1) * (Math.PI / 180);
		const dLon = (lon2 - lon1) * (Math.PI / 180);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1 * (Math.PI / 180)) *
				Math.cos(lat2 * (Math.PI / 180)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// Update start and end of path whenever nodes change
	function handleFromNodeChange(nodeId: string) {
		selectedFromNode = nodeId;
		rebuildWaypoints();
	}

	function handleToNodeChange(nodeId: string) {
		selectedToNode = nodeId;
		rebuildWaypoints();
	}

	function rebuildWaypoints() {
		const fromCoords = getBuildingCoords(selectedFromNode);
		const toCoords = getBuildingCoords(selectedToNode);

		if (fromCoords && toCoords) {
			if (waypoints.length < 2) {
				waypoints = [fromCoords, toCoords];
			} else {
				const intermediate = waypoints.slice(1, -1);
				waypoints = [fromCoords, ...intermediate, toCoords];
			}
		} else if (fromCoords) {
			waypoints = [fromCoords];
		} else if (toCoords) {
			waypoints = [toCoords];
		}
		renderActivePathOnMap();
	}

	function handleMapClick(e: any) {
		if (!selectedFromNode || !selectedToNode) {
			toast.info("Please select From and To buildings first before adding curve waypoints on the map.");
			return;
		}

		const newLat = e.latlng.lat;
		const newLng = e.latlng.lng;

		if (waypoints.length >= 2) {
			const start = waypoints[0];
			const end = waypoints[waypoints.length - 1];
			const intermediate = waypoints.slice(1, -1);
			waypoints = [start, ...intermediate, [newLat, newLng], end];
		} else {
			waypoints = [...waypoints, [newLat, newLng]];
		}

		renderActivePathOnMap();
		toast.success(`Waypoint curve node added at (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`);
	}

	function removeLastWaypoint() {
		if (waypoints.length <= 2) {
			toast.info("Cannot remove building endpoint nodes. Clear selections to reset.");
			return;
		}
		const start = waypoints[0];
		const end = waypoints[waypoints.length - 1];
		const intermediate = waypoints.slice(1, -2);
		waypoints = [start, ...intermediate, end];
		renderActivePathOnMap();
	}

	function clearWaypoints() {
		activeEditingId = null;
		selectedFromNode = '';
		selectedToNode = '';
		waypoints = [];
		renderActivePathOnMap();
	}

	function reversePathDirection() {
		if (!selectedFromNode || !selectedToNode) return;
		const tempNode = selectedFromNode;
		selectedFromNode = selectedToNode;
		selectedToNode = tempNode;
		waypoints = [...waypoints].reverse();
		renderActivePathOnMap();
	}

	function startEditingEdge(edge: MapEdge) {
		activeEditingId = edge.id;
		selectedFromNode = edge.fromNode;
		selectedToNode = edge.toNode;
		waypoints = Array.isArray(edge.path) && edge.path.length >= 2 ? [...edge.path] : [];
		activeTab = 'map';
		setTimeout(() => {
			if (leafMap) {
				leafMap.invalidateSize();
				renderActivePathOnMap();
			}
		}, 100);
	}

	onMount(async () => {
		if (typeof window === 'undefined') return;

		let L = (window as any).L;
		if (!L) {
			try {
				const leafletModule = await import('leaflet');
				L = leafletModule.default || leafletModule;
			} catch (e) {
				console.error("Failed to load Leaflet module:", e);
			}
		}

		if (!L || !mapElement) return;
		leafletInstance = L;

		const bounds = L.latLngBounds(campusBoundsCoords[0], campusBoundsCoords[1]);
		const map = L.map(mapElement, {
			zoomControl: false,
			maxBounds: bounds,
			maxBoundsViscosity: 1.0,
			minZoom: 18,
			maxZoom: 22
		}).setView([9.894414742474977, 123.88258093049176], 19);

		const osmTile = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; OpenStreetMap',
			maxNativeZoom: 19,
			maxZoom: 22
		});

		const satTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
			attribution: '&copy; Esri',
			maxNativeZoom: 19,
			maxZoom: 22
		});

		const overlay = L.imageOverlay("/campusMap-adjusted.png", bounds, {
			opacity: 0.95,
			interactive: false
		});

		osmLayerInstance = osmTile;
		satelliteLayerInstance = satTile;
		campusOverlayInstance = overlay;

		if (selectedBaseTile === 'osm') osmTile.addTo(map);
		else satTile.addTo(map);

		if (showCampusOverlay) overlay.addTo(map);

		map.on('click', handleMapClick);
		leafMap = map;

		plotBuildingNodes();
		plotExistingEdges();

		setTimeout(() => map.invalidateSize(), 300);
	});

	// Dynamic Tile & Overlay Layer Watcher
	$effect(() => {
		if (!leafMap) return;

		if (selectedBaseTile === 'osm') {
			if (satelliteLayerInstance && leafMap.hasLayer(satelliteLayerInstance)) {
				leafMap.removeLayer(satelliteLayerInstance);
			}
			if (osmLayerInstance && !leafMap.hasLayer(osmLayerInstance)) {
				osmLayerInstance.addTo(leafMap);
			}
		} else {
			if (osmLayerInstance && leafMap.hasLayer(osmLayerInstance)) {
				leafMap.removeLayer(osmLayerInstance);
			}
			if (satelliteLayerInstance && !leafMap.hasLayer(satelliteLayerInstance)) {
				satelliteLayerInstance.addTo(leafMap);
			}
		}

		if (campusOverlayInstance) {
			if (showCampusOverlay) {
				if (!leafMap.hasLayer(campusOverlayInstance)) campusOverlayInstance.addTo(leafMap);
			} else {
				if (leafMap.hasLayer(campusOverlayInstance)) leafMap.removeLayer(campusOverlayInstance);
			}
		}
	});

	// Re-calc Leaflet dimensions when switching tabs to 'map'
	$effect(() => {
		if (activeTab === 'map' && leafMap) {
			setTimeout(() => {
				leafMap.invalidateSize();
				renderActivePathOnMap();
			}, 100);
		}
	});

	function plotBuildingNodes() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		buildingMarkers.forEach(m => m.remove());
		buildingMarkers = [];

		buildingsList.forEach(b => {
			const lat = b.lat || b.xCoord || 9.894414;
			const lng = b.lng || b.yCoord || 123.88258;
			const pinColor = b.color || '#3b82f6';

			const iconHtml = `
				<div class="flex items-center gap-1.5 bg-background/95 text-foreground border shadow-md px-2 py-1 rounded-xl text-[10px] font-extrabold whitespace-nowrap cursor-pointer transition-all hover:scale-105" style="border-color: ${pinColor}80;">
					<span class="size-2.5 rounded-full inline-block shrink-0 shadow-xs" style="background-color: ${pinColor}; font-size: 0;"></span>
					<span>${b.code || b.name}</span>
				</div>
			`;

			const customIcon = L.divIcon({
				html: iconHtml,
				className: 'custom-building-pin',
				iconSize: [85, 24],
				iconAnchor: [42, 12]
			});

			const marker = L.marker([lat, lng], { icon: customIcon }).addTo(leafMap);
			marker.bindTooltip(`<b>${b.name}</b><br/>${b.description || ''}`, { direction: 'top' });
			marker.on('click', () => {
				if (!selectedFromNode) {
					handleFromNodeChange(b.id);
				} else if (!selectedToNode && selectedFromNode !== b.id) {
					handleToNodeChange(b.id);
				}
			});
			buildingMarkers.push(marker);
		});
	}

	function plotExistingEdges() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		existingEdgePolylines.forEach(p => p.remove());
		existingEdgePolylines = [];

		edgesList.forEach(edge => {
			if (edge.id === activeEditingId) return;
			if (!Array.isArray(edge.path) || edge.path.length < 2) return;

			const fromName = getBuildingName(edge.fromNode);
			const toName = getBuildingName(edge.toNode);

			const polyline = L.polyline(edge.path, {
				color: '#3b82f6',
				weight: 6,
				opacity: 0.75,
				dashArray: '6, 8',
				className: 'cursor-pointer hover:stroke-emerald-500 transition-all'
			}).addTo(leafMap);

			polyline.bindTooltip(`<b>Click to Edit Pathway</b><br/>${fromName} &rarr; ${toName}`, { sticky: true });

			polyline.on('click', (evt: any) => {
				if (L.DomEvent) {
					L.DomEvent.stopPropagation(evt);
				}
				startEditingEdge(edge);
				toast.info(`Editing pathway: ${fromName} → ${toName}`);
			});

			existingEdgePolylines.push(polyline);
		});
	}

	function renderActivePathOnMap() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		if (activePolyline) {
			activePolyline.remove();
			activePolyline = null;
		}
		waypointMarkers.forEach(m => m.remove());
		waypointMarkers = [];

		plotExistingEdges();

		if (waypoints.length < 2) return;

		activePolyline = L.polyline(waypoints, {
			color: '#10b981',
			weight: 6,
			opacity: 0.9
		}).addTo(leafMap);

		waypoints.forEach((pt, index) => {
			const isStart = index === 0;
			const isEnd = index === waypoints.length - 1;

			if (!isStart && !isEnd) {
				const markerHtml = `
					<div class="size-6 bg-emerald-500 text-white font-black text-[9px] rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-grab active:cursor-grabbing">
						${index}
					</div>
				`;
				const markerIcon = L.divIcon({
					html: markerHtml,
					className: 'waypoint-pin',
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});

				const marker = L.marker(pt, { icon: markerIcon, draggable: true }).addTo(leafMap);
				marker.bindTooltip(`Curve Waypoint #${index}`, { direction: 'top' });

				marker.on('drag', (e: any) => {
					const newPos = e.target.getLatLng();
					waypoints[index] = [newPos.lat, newPos.lng];
					if (activePolyline) {
						activePolyline.setLatLngs(waypoints);
					}
				});

				marker.on('dragend', () => {
					renderActivePathOnMap();
				});

				waypointMarkers.push(marker);
			}
		});
	}

	// Form Submission Handlers
	const handleSaveEdgeEnhance: SubmitFunction = () => {
		let resolveSave: (v?: any) => void = () => {};
		let rejectSave: (e: any) => void = () => {};
		const savePromise = new Promise((resolve, reject) => {
			resolveSave = resolve;
			rejectSave = reject;
		});

		toast.promise(savePromise, {
			loading: activeEditingId ? "Updating map edge path..." : "Creating map edge path...",
			success: activeEditingId ? "Map edge updated successfully!" : "Map edge created successfully!",
			error: (err: any) => err.message || "Failed to save map edge."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveSave();
				if (result.data?.mapEdges) {
					actionEdges = result.data.mapEdges;
				}
				clearWaypoints();
				await update();
			} else if (result.type === "failure") {
				rejectSave(new Error((result.data as any)?.message || "Failed to save map edge."));
			} else {
				rejectSave(new Error("Unexpected error."));
			}
		};
	};

	const handleDeleteEdgeEnhance: SubmitFunction = () => {
		let resolveDelete: (v?: any) => void = () => {};
		let rejectDelete: (e: any) => void = () => {};
		const deletePromise = new Promise((resolve, reject) => {
			resolveDelete = resolve;
			rejectDelete = reject;
		});

		toast.promise(deletePromise, {
			loading: "Deleting map edge path...",
			success: "Map edge deleted successfully!",
			error: (err: any) => err.message || "Failed to delete map edge."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			if (result.type === "success") {
				resolveDelete();
				if (result.data?.mapEdges) {
					actionEdges = result.data.mapEdges;
				}
				deletingTarget = null;
				await update();
			} else if (result.type === "failure") {
				rejectDelete(new Error((result.data as any)?.message || "Failed to delete map edge."));
			} else {
				rejectDelete(new Error("Unexpected error."));
			}
		};
	};
</script>

<div class="flex flex-col gap-6 p-6 md:p-8 w-full">
	<!-- Top Navigation & Tabs Header Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Map Edges & Navigation Paths</h1>
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">
				Configure visual paths and curves between campus buildings for visitor pathfinding
			</p>
		</div>

		<!-- Tabs Selector -->
		<Tabs.Root value={activeTab} onValueChange={(v) => activeTab = v as 'map' | 'edges'}>
			<Tabs.List class="bg-muted/80 p-1 rounded-2xl border border-border">
				<Tabs.Trigger value="map" class="rounded-xl text-xs font-bold px-3.5 py-1.5 gap-1.5 cursor-pointer">
					<MapIcon class="size-4 pointer-events-none" />
					<span>Interactive Canvas</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="edges" class="rounded-xl text-xs font-bold px-3.5 py-1.5 gap-1.5 cursor-pointer">
					<ListIcon class="size-4 pointer-events-none" />
					<span>Network Listing ({edgesList.length})</span>
				</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
	</div>

	<!-- TAB 1: FULL-WIDTH INTERACTIVE LEAFLET CANVAS -->
	<div class={activeTab === 'map' ? 'flex flex-col md:block gap-4' : 'hidden'}>
		<div class="w-full h-[440px] md:h-[620px] rounded-2xl relative overflow-hidden border border-border shadow-md bg-card">
			<!-- Leaflet Map Mount Node -->
			<div bind:this={mapElement} class="w-full h-full z-0"></div>

			<!-- TOP-RIGHT FLOATING CONTROLS: ButtonGroup Zoom & Popover Tile/Overlay Switcher -->
			<div class="absolute top-4 right-4 z-50 flex items-center gap-2 pointer-events-auto">
				<!-- ButtonGroup Zoom Controls -->
				<div class="flex items-center rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-xl overflow-hidden p-0.5">
					<Button 
						onclick={() => leafMap?.zoomIn()} 
						variant="ghost" 
						size="icon" 
						class="size-8 rounded-xl text-foreground hover:bg-muted cursor-pointer"
						title="Zoom In"
					>
						<PlusIcon class="size-4 pointer-events-none" />
					</Button>
					<Separator orientation="vertical" class="h-4 bg-border/60" />
					<Button 
						onclick={() => leafMap?.zoomOut()} 
						variant="ghost" 
						size="icon" 
						class="size-8 rounded-xl text-foreground hover:bg-muted cursor-pointer"
						title="Zoom Out"
					>
						<MinusIcon class="size-4 pointer-events-none" />
					</Button>
				</div>

				<!-- Map Layers & Campus Overlay Popover -->
				<Popover.Root bind:open={isLayerPopoverOpen}>
					<Popover.Trigger>
						<Button variant="default" size="icon" class="size-9 rounded-2xl border-border bg-card/90 backdrop-blur-xl shadow-xl text-foreground cursor-pointer" title="Map Layers">
							<LayersIcon class="size-4 pointer-events-none" />
						</Button>
					</Popover.Trigger>
					<Popover.Content align="end" sideOffset={8} class="w-64 p-3 rounded-2xl border-border bg-popover text-popover-foreground shadow-2xl z-[2600] flex flex-col gap-3">
						<div class="flex items-center justify-between border-b border-border/60 pb-2">
							<span class="text-xs font-black uppercase tracking-wider text-foreground">Map View & Layer Settings</span>
							<Badge variant="outline" class="text-[9px] font-mono">Leaflet</Badge>
						</div>

						<!-- Base Tile Map Selection -->
						<div class="flex flex-col gap-1.5">
							<span class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Base Tile Map</span>
							<div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
								<button 
									onclick={() => selectedBaseTile = 'osm'}
									class="px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer {selectedBaseTile === 'osm' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
								>
									Standard
								</button>
								<button 
									onclick={() => selectedBaseTile = 'satellite'}
									class="px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer {selectedBaseTile === 'satellite' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
								>
									3D Satellite
								</button>
							</div>
						</div>

						<Separator class="bg-border/60" />

						<!-- Campus Overlay Switch -->
						<div class="flex items-center justify-between">
							<div>
								<span class="text-xs font-extrabold text-foreground block">Campus Overlay</span>
								<span class="text-[10px] text-muted-foreground font-semibold">3D structure map layer</span>
							</div>
							<Switch bind:checked={showCampusOverlay} />
						</div>
					</Popover.Content>
				</Popover.Root>
			</div>

			<!-- DESKTOP FLOATING PATH EDITOR CARD (Visible on md+ screens) -->
			<div class="hidden md:flex absolute top-4 left-4 z-50 w-96 max-h-[580px] overflow-y-auto bg-card/90 backdrop-blur-xl border border-border/80 p-4 rounded-2xl shadow-2xl flex-col gap-3 pointer-events-auto">
				{@render pathFormContent()}
			</div>
		</div>

		<!-- MOBILE PATH EDITOR CARD (Placed below map canvas on mobile < md screens) -->
		<div class="md:hidden w-full bg-card/90 backdrop-blur-xl border border-border/80 p-4 rounded-2xl shadow-md flex flex-col gap-3">
			{@render pathFormContent()}
		</div>
	</div>

{#snippet pathFormContent()}
	<div class="flex items-center justify-between">
		<h2 class="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
			<RouteIcon class="size-4 text-primary pointer-events-none" />
			<span>{activeEditingId ? "Edit Edge Path" : "Draw Curve Edge"}</span>
		</h2>
		{#if activeEditingId}
			<Badge variant="secondary" class="text-[9px] font-bold">Editing Mode</Badge>
		{/if}
	</div>

	<form method="POST" action={activeEditingId ? "?/updateEdge" : "?/createEdge"} use:enhance={handleSaveEdgeEnhance} class="flex flex-col gap-3">
		{#if activeEditingId}
			<input type="hidden" name="id" value={activeEditingId} />
		{/if}

		<input type="hidden" name="path" value={JSON.stringify(waypoints)} />
		<input type="hidden" name="fromNode" value={selectedFromNode} />
		<input type="hidden" name="toNode" value={selectedToNode} />

		<!-- From Building Combobox Selector -->
		<div class="flex flex-col gap-1">
			<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">From Building (Start Node) *</label>
			<Popover.Root bind:open={isFromComboOpen}>
				<Popover.Trigger>
					<Button variant="outline" type="button" role="combobox" class="w-full justify-between rounded-xl h-8 text-xs font-bold border-border bg-background/80 cursor-pointer">
						<span class="truncate flex items-center gap-1.5">
							{#if selectedFromBuilding}
								<span class="size-2 rounded-full inline-block shrink-0" style="background-color: {selectedFromBuilding.color || '#3b82f6'};"></span>
								<span>{selectedFromBuilding.name} ({selectedFromBuilding.code})</span>
							{:else}
								<span>-- Select Start Building --</span>
							{/if}
						</span>
						<ChevronsUpDownIcon class="size-3.5 opacity-50 ml-1 shrink-0 pointer-events-none" />
					</Button>
				</Popover.Trigger>
				<Popover.Content align="start" sideOffset={6} class="w-72 p-0 max-h-60 overflow-y-auto z-[2700] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl">
					<Command.Root class="w-full">
						<Command.Input placeholder="Search building name or code..." class="h-9 text-xs px-3 border-border/60" />
						<Command.List class="p-1 max-h-48 overflow-y-auto">
							<Command.Empty class="p-3 text-xs text-muted-foreground text-center">No building found.</Command.Empty>
							<Command.Group>
								{#each buildingsList as b (b.id)}
									<Command.Item
										value={`${b.name} ${b.code}`}
										onSelect={() => {
											handleFromNodeChange(b.id);
											isFromComboOpen = false;
										}}
										class="text-xs font-semibold cursor-pointer rounded-xl px-2.5 py-1.5 flex items-center justify-between hover:bg-muted/60"
									>
										<span class="truncate flex items-center gap-1.5">
											<span class="size-2 rounded-full inline-block shrink-0" style="background-color: {b.color || '#3b82f6'};"></span>
											<span>{b.name} ({b.code})</span>
										</span>
										{#if selectedFromNode === b.id || selectedFromNode === b.code}
											<CheckIcon class="size-3.5 text-primary shrink-0 ml-1" />
										{/if}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>

		<!-- Reverse Direction Toggle -->
		<div class="flex justify-center -my-1">
			<Button type="button" onclick={reversePathDirection} variant="ghost" size="xs" class="h-6 text-[11px] gap-1 rounded-lg text-muted-foreground hover:text-foreground">
				<ArrowRightLeftIcon class="size-3 pointer-events-none" />
				<span>Reverse Direction</span>
			</Button>
		</div>

		<!-- To Building Combobox Selector -->
		<div class="flex flex-col gap-1">
			<label class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">To Building (Destination Node) *</label>
			<Popover.Root bind:open={isToComboOpen}>
				<Popover.Trigger>
					<Button variant="outline" type="button" role="combobox" class="w-full justify-between rounded-xl h-8 text-xs font-bold border-border bg-background/80 cursor-pointer">
						<span class="truncate flex items-center gap-1.5">
							{#if selectedToBuilding}
								<span class="size-2 rounded-full inline-block shrink-0" style="background-color: {selectedToBuilding.color || '#3b82f6'};"></span>
								<span>{selectedToBuilding.name} ({selectedToBuilding.code})</span>
							{:else}
								<span>-- Select Destination Building --</span>
							{/if}
						</span>
						<ChevronsUpDownIcon class="size-3.5 opacity-50 ml-1 shrink-0 pointer-events-none" />
					</Button>
				</Popover.Trigger>
				<Popover.Content align="start" sideOffset={6} class="w-72 p-0 max-h-60 overflow-y-auto z-[2700] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl">
					<Command.Root class="w-full">
						<Command.Input placeholder="Search building name or code..." class="h-9 text-xs px-3 border-border/60" />
						<Command.List class="p-1 max-h-48 overflow-y-auto">
							<Command.Empty class="p-3 text-xs text-muted-foreground text-center">No building found.</Command.Empty>
							<Command.Group>
								{#each buildingsList as b (b.id)}
									<Command.Item
										value={`${b.name} ${b.code}`}
										onSelect={() => {
											handleToNodeChange(b.id);
											isToComboOpen = false;
										}}
										class="text-xs font-semibold cursor-pointer rounded-xl px-2.5 py-1.5 flex items-center justify-between hover:bg-muted/60"
									>
										<span class="truncate flex items-center gap-1.5">
											<span class="size-2 rounded-full inline-block shrink-0" style="background-color: {b.color || '#3b82f6'};"></span>
											<span>{b.name} ({b.code})</span>
										</span>
										{#if selectedToNode === b.id || selectedToNode === b.code}
											<CheckIcon class="size-3.5 text-primary shrink-0 ml-1" />
										{/if}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>

		<!-- Waypoints Stats Box -->
		<div class="p-2.5 bg-muted/60 rounded-xl border border-border/60 flex flex-col gap-1.5">
			<div class="flex items-center justify-between text-xs font-bold">
				<span class="text-muted-foreground">Curve Waypoints:</span>
				<Badge variant="secondary" class="font-extrabold text-[9px]">{waypoints.length} Points</Badge>
			</div>
			<div class="flex items-center justify-between text-xs font-bold">
				<span class="text-muted-foreground">Path Distance:</span>
				<span class="text-foreground">{totalDistanceMeters} meters</span>
			</div>
		</div>

		<!-- Form Submit & Auxiliary Action Buttons -->
		<div class="flex flex-col gap-1.5 pt-1">
			<Button type="submit" disabled={waypoints.length < 2 || !selectedFromNode || !selectedToNode} class="w-full h-8 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
				<PlusIcon class="size-3.5 pointer-events-none" />
				<span>{activeEditingId ? "Save Path Updates" : "Save Edge Pathway"}</span>
			</Button>

			<div class="flex gap-1.5">
				<Button type="button" onclick={removeLastWaypoint} disabled={waypoints.length <= 2} variant="outline" class="flex-1 h-7 rounded-xl text-[11px] font-semibold gap-1 cursor-pointer">
					<Undo2Icon class="size-3 pointer-events-none" />
					<span>Undo Point</span>
				</Button>
				<Button type="button" onclick={clearWaypoints} variant="ghost" class="flex-1 h-7 rounded-xl text-[11px] font-semibold cursor-pointer">
					<span>Clear</span>
				</Button>
			</div>
		</div>
	</form>
{/snippet}

	<!-- TAB 2: REGISTERED MAP EDGES NETWORK TABLE -->
	<div class={activeTab === 'edges' ? 'block' : 'hidden'}>
		<Card.Root class="p-6 flex flex-col gap-4 rounded-2xl border-border/80 bg-card shadow-xs">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
				<div>
					<h2 class="text-base font-extrabold text-foreground">Configured Map Edges Network</h2>
					<p class="text-xs text-muted-foreground font-semibold">
						Active building-to-building navigation pathways registered in Supabase `map_edges` table
					</p>
				</div>

				<div class="relative w-full sm:w-64">
					<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
					<Input 
						type="text" 
						placeholder="Filter building name or code..." 
						bind:value={searchQuery} 
						class="pl-9 h-9 text-xs rounded-xl"
					/>
				</div>
			</div>

			{#if filteredEdgesList.length === 0}
				<div class="py-12 flex flex-col items-center justify-center gap-2 text-center border border-dashed border-border/80 rounded-xl">
					<RouteIcon class="size-8 text-muted-foreground/60" />
					<p class="text-xs font-bold text-muted-foreground">No map path edges found matching query.</p>
					<p class="text-[11px] text-muted-foreground">Use the Interactive Canvas tab above to start drawing new campus building pathways!</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="text-xs font-extrabold text-muted-foreground">From Building</Table.Head>
							<Table.Head class="text-xs font-extrabold text-muted-foreground">To Building</Table.Head>
							<Table.Head class="text-xs font-extrabold text-muted-foreground">Waypoints</Table.Head>
							<Table.Head class="text-xs font-extrabold text-muted-foreground">Est. Distance</Table.Head>
							<Table.Head class="text-xs font-extrabold text-muted-foreground text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredEdgesList as edge (edge.id)}
							{@const pts = Array.isArray(edge.path) ? edge.path : []}
							{@const dist = pts.length >= 2 ? Math.round(pts.reduce((acc, curr, idx) => {
								if (idx === 0) return 0;
								return acc + haversineDistance(pts[idx-1][0], pts[idx-1][1], curr[0], curr[1]);
							}, 0)) : 0}
							<Table.Row class="hover:bg-muted/40">
								<Table.Cell class="font-bold text-xs">
									{getBuildingName(edge.fromNode)}
								</Table.Cell>
								<Table.Cell class="font-bold text-xs">
									{getBuildingName(edge.toNode)}
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class="font-extrabold text-[10px] rounded-lg">
										{pts.length} Coordinates
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-xs font-semibold text-muted-foreground">
									{dist} m
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1.5">
										<Button onclick={() => startEditingEdge(edge)} variant="outline" size="xs" class="h-7 text-[11px] font-bold gap-1 rounded-lg cursor-pointer">
											<Edit3Icon class="size-3 pointer-events-none" />
											<span>Edit Path</span>
										</Button>
										<Button onclick={() => deletingTarget = edge} variant="ghost" size="xs" class="h-7 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer">
											<Trash2Icon class="size-3.5 pointer-events-none" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Root>
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if deletingTarget}
	<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
		<Card.Root class="w-full max-w-md p-6 flex flex-col gap-4 rounded-2xl border-border/80 bg-card shadow-2xl">
			<div>
				<h3 class="text-base font-extrabold text-foreground">Delete Map Edge Pathway?</h3>
				<p class="text-xs text-muted-foreground font-semibold mt-1">
					Are you sure you want to delete the path between <span class="font-bold text-foreground">{getBuildingName(deletingTarget.fromNode)}</span> and <span class="font-bold text-foreground">{getBuildingName(deletingTarget.toNode)}</span>?
				</p>
			</div>

			<form method="POST" action="?/deleteEdge" use:enhance={handleDeleteEdgeEnhance} class="flex items-center justify-end gap-2 pt-2">
				<input type="hidden" name="id" value={deletingTarget.id} />
				<Button type="button" onclick={() => deletingTarget = null} variant="outline" class="h-9 text-xs font-semibold rounded-xl cursor-pointer">
					Cancel
				</Button>
				<Button type="submit" variant="destructive" class="h-9 text-xs font-bold rounded-xl cursor-pointer">
					Delete Edge
				</Button>
			</form>
		</Card.Root>
	</div>
{/if}

<style>
	:global(.custom-building-pin) {
		background: transparent !important;
		border: none !important;
	}
	:global(.waypoint-pin) {
		background: transparent !important;
		border: none !important;
	}
</style>
