<script lang="ts">
	import { onDestroy } from "svelte";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import type { Building } from "$lib/types";
	import {
		BuildingExtrusionManager,
		calculatePolygonCentroid,
	} from "$lib/components/map/building-extrusion";
	import { toast } from "svelte-sonner";

	// Icons
	import BoxIcon from "@lucide/svelte/icons/box";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import PaletteIcon from "@lucide/svelte/icons/palette";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import XIcon from "@lucide/svelte/icons/x";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import SaveIcon from "@lucide/svelte/icons/save";
	import SatelliteIcon from "@lucide/svelte/icons/satellite";
	import MapIcon from "@lucide/svelte/icons/map";
	import CheckIcon from "@lucide/svelte/icons/check";
	import Wand2Icon from "@lucide/svelte/icons/wand-2";
	import FocusIcon from "@lucide/svelte/icons/focus";

	let {
		open = $bindable(false),
		buildings = [],
		selectedBuildingId = $bindable<string | null>(null),
		onSaved,
	}: {
		open: boolean;
		buildings: Building[];
		selectedBuildingId: string | null;
		onSaved?: () => void;
	} = $props();

	// Map DOM element & Leaflet instances
	let mapContainer = $state<HTMLDivElement | null>(null);
	let leafMap = $state<any>(null);
	let L = $state<any>(null);
	let extrusionManager = $state<BuildingExtrusionManager | null>(null);

	// Layers
	let osmLayer = $state<any>(null);
	let satelliteLayer = $state<any>(null);
	let currentBaseLayer = $state<"satellite" | "osm">("satellite");
	let vertexMarkers: any[] = [];
	let centroidMarker = $state<any>(null);

	// Active editing state
	let activeBuilding = $derived(
		buildings.find((b) => b.id === selectedBuildingId) || buildings[0] || null
	);

	let currentFootprint = $state<[number, number][]>([]);
	let currentFloors = $state(1);
	let currentElevation = $state(0);
	let currentColor = $state("#3b82f6");
	let isSaving = $state(false);

	const COLOR_PRESETS = [
		{ label: "Royal Blue", value: "#3b82f6" },
		{ label: "Emerald Green", value: "#10b981" },
		{ label: "Crimson Red", value: "#ef4444" },
		{ label: "Amber Orange", value: "#f59e0b" },
		{ label: "Purple Violet", value: "#8b5cf6" },
		{ label: "Cyan Teal", value: "#06b6d4" },
		{ label: "Rose Pink", value: "#ec4899" },
		{ label: "Slate Gray", value: "#64748b" },
	];

	// Synchronize editing variables whenever the selected building changes
	$effect(() => {
		if (activeBuilding) {
			currentFootprint = activeBuilding.footprint
				? JSON.parse(JSON.stringify(activeBuilding.footprint))
				: [];
			// Max floors constrained to 4
			currentFloors = Math.min(4, Math.max(1, activeBuilding.floors || 1));
			currentElevation = activeBuilding.elevation || 0;
			currentColor = activeBuilding.color || "#3b82f6";

			if (leafMap && L) {
				updateMapDisplay();
				panToActiveBuilding();
			}
		}
	});

	// Initialize Leaflet Map when dialog opens and container is ready
	$effect(() => {
		if (open && mapContainer && !leafMap) {
			initMap();
		}
	});

	async function initMap() {
		if (!mapContainer) return;

		let leafletModule = (window as any).L;
		if (!leafletModule) {
			try {
				const mod = await import("leaflet");
				leafletModule = mod.default || mod;
			} catch (e) {
				console.error("Failed to load Leaflet:", e);
				return;
			}
		}

		L = leafletModule;

		const centerCoords: [number, number] = [9.894414, 123.88258];

		leafMap = L.map(mapContainer, {
			center: centerCoords,
			zoom: 18.5,
			minZoom: 16,
			maxZoom: 22,
			zoomControl: false,
		});

		L.control.zoom({ position: "bottomright" }).addTo(leafMap);

		satelliteLayer = L.tileLayer(
			"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
			{
				attribution: "Esri",
				maxNativeZoom: 18,
				maxZoom: 22,
			}
		);

		osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "OpenStreetMap",
			maxNativeZoom: 19,
			maxZoom: 22,
		});

		if (currentBaseLayer === "satellite") {
			satelliteLayer.addTo(leafMap);
		} else {
			osmLayer.addTo(leafMap);
		}

		extrusionManager = new BuildingExtrusionManager(leafMap, L, {
			interactive: false,
			selectedBuildingId: activeBuilding?.id || null,
		});

		// Map click handler to add new vertices
		leafMap.on("click", (e: any) => {
			if (!activeBuilding) return;
			const newPt: [number, number] = [e.latlng.lat, e.latlng.lng];
			currentFootprint = [...currentFootprint, newPt];
			updateMapDisplay();
		});

		updateMapDisplay();
		panToActiveBuilding();

		// Invalidate size after modal render animation completes
		setTimeout(() => {
			if (leafMap) leafMap.invalidateSize();
		}, 300);
	}

	function switchBaseLayer(layer: "satellite" | "osm") {
		if (!leafMap || currentBaseLayer === layer) return;
		currentBaseLayer = layer;
		if (layer === "satellite") {
			if (leafMap.hasLayer(osmLayer)) leafMap.removeLayer(osmLayer);
			satelliteLayer.addTo(leafMap);
		} else {
			if (leafMap.hasLayer(satelliteLayer)) leafMap.removeLayer(satelliteLayer);
			osmLayer.addTo(leafMap);
		}
	}

	function panToActiveBuilding() {
		if (!leafMap || !activeBuilding) return;

		let targetCoords: [number, number] = [9.894414, 123.88258];
		if (currentFootprint.length > 0) {
			targetCoords = calculatePolygonCentroid(currentFootprint);
		} else if (activeBuilding.lat || activeBuilding.xCoord) {
			targetCoords = [
				activeBuilding.lat || activeBuilding.xCoord || 9.894414,
				activeBuilding.lng || activeBuilding.yCoord || 123.88258,
			];
		}

		leafMap.setView(targetCoords, 19, { animate: true });
	}

	function updateMapDisplay() {
		if (!leafMap || !L || !extrusionManager) return;

		// 1. Re-render 2.5D vector buildings on map
		const previewBuildings: Building[] = buildings.map((b) => {
			if (b.id === activeBuilding?.id) {
				return {
					...b,
					footprint: currentFootprint.length >= 3 ? currentFootprint : undefined,
					floors: Math.min(4, Math.max(1, currentFloors)),
					elevation: currentElevation,
					color: currentColor,
				};
			}
			return b;
		});

		extrusionManager.updateOptions({ selectedBuildingId: activeBuilding?.id || null });
		extrusionManager.renderBuildings(previewBuildings);

		// 2. Clear previous vertex drag markers
		vertexMarkers.forEach((m) => leafMap.removeLayer(m));
		vertexMarkers = [];

		if (centroidMarker) {
			leafMap.removeLayer(centroidMarker);
			centroidMarker = null;
		}

		// 3. Render vertex drag handles for active footprint
		currentFootprint.forEach(([lat, lng], idx) => {
			const markerHtml = `
				<div class="size-6 -ml-3 -mt-3 rounded-full bg-background border-2 border-primary shadow-md flex items-center justify-center cursor-move hover:scale-125 transition-transform select-none">
					<span class="text-[9px] font-black text-primary font-mono">${idx + 1}</span>
				</div>
			`;

			const marker = L.marker([lat, lng], {
				draggable: true,
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: markerHtml,
					iconSize: [24, 24],
					iconAnchor: [12, 12],
				}),
				zIndexOffset: 1000,
			}).addTo(leafMap);

			marker.on("drag", (e: any) => {
				const pos = e.target.getLatLng();
				currentFootprint[idx] = [pos.lat, pos.lng];
				currentFootprint = [...currentFootprint];

				// Dynamically re-render 3D model during dragging
				const livePreview = buildings.map((b) =>
					b.id === activeBuilding?.id
						? {
								...b,
								footprint: currentFootprint,
								floors: Math.min(4, Math.max(1, currentFloors)),
								elevation: currentElevation,
								color: currentColor,
						  }
						: b
				);
				extrusionManager?.renderBuildings(livePreview);
			});

			marker.on("dragend", () => {
				updateMapDisplay();
			});

			vertexMarkers.push(marker);
		});

		// 4. Centroid marker with entrance pin label
		if (currentFootprint.length >= 3) {
			const centroid = calculatePolygonCentroid(currentFootprint);
			const centroidHtml = `
				<div class="px-2 py-0.5 rounded-full bg-primary text-primary-foreground border border-white/50 shadow-md text-[9px] font-bold tracking-wider font-mono uppercase whitespace-nowrap flex items-center gap-1 select-none">
					<span class="size-1.5 rounded-full bg-white animate-pulse"></span>
					<span>Center Pin</span>
				</div>
			`;

			centroidMarker = L.marker(centroid, {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: centroidHtml,
					iconSize: [80, 20],
					iconAnchor: [40, 10],
				}),
				interactive: false,
				zIndexOffset: 900,
			}).addTo(leafMap);
		}
	}

	function generateDefaultBoxFootprint() {
		if (!activeBuilding) return;

		const centerLat = activeBuilding.lat || activeBuilding.xCoord || 9.894414;
		const centerLng = activeBuilding.lng || activeBuilding.yCoord || 123.88258;

		// 22m x 16m box around current location
		const dLat = (16 / 2 / 111000);
		const dLng = (22 / 2 / 109350);

		currentFootprint = [
			[centerLat - dLat, centerLng - dLng],
			[centerLat + dLat, centerLng - dLng],
			[centerLat + dLat, centerLng + dLng],
			[centerLat - dLat, centerLng + dLng],
		];

		updateMapDisplay();
		panToActiveBuilding();
		toast.info("Created standard 4-point box outline.");
	}

	function removeVertex(index: number) {
		currentFootprint = currentFootprint.filter((_, i) => i !== index);
		updateMapDisplay();
	}

	function clearAllVertices() {
		currentFootprint = [];
		updateMapDisplay();
		toast.info("Cleared outline points.");
	}

	async function handleSave() {
		if (!activeBuilding) return;
		isSaving = true;

		const centroid =
			currentFootprint.length >= 3
				? calculatePolygonCentroid(currentFootprint)
				: [activeBuilding.lat || activeBuilding.xCoord || 9.894414, activeBuilding.lng || activeBuilding.yCoord || 123.88258];

		const formData = new FormData();
		formData.set("id", activeBuilding.id);
		formData.set(
			"footprint",
			currentFootprint.length >= 3 ? JSON.stringify(currentFootprint) : ""
		);
		formData.set("floors", String(Math.min(4, Math.max(1, currentFloors))));
		formData.set("elevation", String(currentElevation));
		formData.set("color", currentColor);
		formData.set("xCoord", String(centroid[0]));
		formData.set("yCoord", String(centroid[1]));

		try {
			const res = await fetch("?/saveBuildingFootprint", {
				method: "POST",
				body: formData,
			});

			if (res.ok) {
				toast.success(`Saved map outline for ${activeBuilding.name}`);
				if (onSaved) onSaved();
			} else {
				const err = await res.json();
				toast.error(err?.message || "Failed to save building outline.");
			}
		} catch (e: any) {
			console.error("Save building geometry error:", e);
			toast.error("Error saving building outline.");
		} finally {
			isSaving = false;
		}
	}

	onDestroy(() => {
		if (extrusionManager) extrusionManager.destroy();
		if (leafMap) leafMap.remove();
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) { leafMap?.invalidateSize(); } }}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-7xl w-[96vw] h-[92vh] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
				<div class="flex items-center gap-3">
					<div class="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
						<BoxIcon class="size-5 pointer-events-none" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<Dialog.Title class="font-black text-lg text-foreground tracking-tight">
								Campus Map Studio
							</Dialog.Title>
							<Badge variant="outline" class="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
								2.5D Vectors
							</Badge>
						</div>
						<Dialog.Description class="text-xs text-muted-foreground font-semibold">
							Draw building outlines, customize colors, and set floor heights directly on the campus map.
						</Dialog.Description>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onclick={() => (open = false)}
						class="size-8 rounded-full hover:bg-muted cursor-pointer"
					>
						<XIcon class="size-4 pointer-events-none" />
					</Button>
				</div>
			</div>

			<!-- Main Studio Workspace (Left: Leaflet Map, Right: Control Sidebar) -->
			<div class="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
				<!-- Map Canvas Container (Desktop 68% width) -->
				<div class="relative flex-grow h-[50vh] lg:h-full bg-muted/30 overflow-hidden">
					<div bind:this={mapContainer} class="size-full"></div>

					<!-- Floating Map Toolbar (Top Left) -->
					<div class="absolute top-4 left-4 z-[500] flex items-center gap-1.5 p-1 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-lg">
						<Button
							variant={currentBaseLayer === "satellite" ? "default" : "ghost"}
							size="sm"
							onclick={() => switchBaseLayer("satellite")}
							class="text-xs font-bold h-8 px-3 rounded-lg gap-1.5 cursor-pointer"
						>
							<SatelliteIcon class="size-3.5" />
							<span>Satellite</span>
						</Button>
						<Button
							variant={currentBaseLayer === "osm" ? "default" : "ghost"}
							size="sm"
							onclick={() => switchBaseLayer("osm")}
							class="text-xs font-bold h-8 px-3 rounded-lg gap-1.5 cursor-pointer"
						>
							<MapIcon class="size-3.5" />
							<span>Street</span>
						</Button>
						<div class="h-4 w-px bg-border mx-0.5"></div>
						<Button
							variant="ghost"
							size="sm"
							onclick={panToActiveBuilding}
							class="text-xs font-bold h-8 px-2.5 rounded-lg gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
							title="Center on Building"
						>
							<FocusIcon class="size-3.5" />
							<span class="hidden sm:inline">Center</span>
						</Button>
					</div>

					<!-- Desktop Instruction Helper Bar (Bottom Left) -->
					<div class="absolute bottom-4 left-4 z-[500] pointer-events-none max-w-md hidden sm:block">
						<div class="px-3.5 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 text-xs text-muted-foreground font-medium shadow-md flex items-center gap-2">
							<span class="size-2 rounded-full bg-primary animate-pulse shrink-0"></span>
							<span>Click map to add points • Drag points to shape building • 3+ points form a building</span>
						</div>
					</div>
				</div>

				<!-- Desktop Parameters Sidebar (Desktop 32% width) -->
				<div class="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-border/70 bg-card flex flex-col shrink-0 overflow-y-auto">
					<div class="p-6 flex flex-col gap-5 text-xs font-semibold">
						<!-- 1. Select Active Building -->
						<div class="flex flex-col gap-1.5">
							<label for="select-building-trigger" class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
								Select Building
							</label>
							<Select.Root
								type="single"
								value={selectedBuildingId || ""}
								onValueChange={(val) => {
									selectedBuildingId = val;
								}}
							>
								<Select.Trigger id="select-building-trigger" class="h-10 rounded-xl font-bold cursor-pointer border-border">
									<span class="truncate flex items-center gap-2">
										<span class="size-2.5 rounded-full shrink-0" style="background-color: {activeBuilding?.color || '#3b82f6'};"></span>
										<span class="text-xs font-bold">{activeBuilding ? `${activeBuilding.name} (${activeBuilding.code})` : "Select a building"}</span>
									</span>
								</Select.Trigger>
								<Select.Content class="rounded-xl border border-border bg-card z-[2700] max-h-72">
									<Select.Group>
										{#each buildings as b}
											<Select.Item value={b.id} label={`${b.name} (${b.code})`}>
												<div class="flex items-center gap-2">
													<span class="size-2.5 rounded-full shrink-0" style="background-color: {b.color || '#3b82f6'};"></span>
													<span class="font-bold">{b.name}</span>
													<span class="text-muted-foreground font-mono text-[10px]">({b.code})</span>
												</div>
											</Select.Item>
										{/each}
									</Select.Group>
								</Select.Content>
							</Select.Root>
						</div>

						<!-- 2. Outline Points Manager -->
						<div class="p-4 rounded-2xl bg-muted/20 border border-border/70 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
									<MapPinIcon class="size-3.5 text-primary" />
									<span>Outline Points ({currentFootprint.length})</span>
								</span>
								{#if currentFootprint.length >= 3}
									<Badge variant="outline" class="text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
										Active 3D Shape
									</Badge>
								{:else}
									<Badge variant="outline" class="text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
										Need 3+ Points
									</Badge>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="grid grid-cols-2 gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={generateDefaultBoxFootprint}
									class="text-xs font-bold h-8 rounded-xl gap-1.5 cursor-pointer border-border hover:bg-muted"
								>
									<Wand2Icon class="size-3.5 text-primary" />
									<span>Default Box</span>
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={clearAllVertices}
									disabled={currentFootprint.length === 0}
									class="text-xs font-bold h-8 rounded-xl gap-1.5 cursor-pointer border-border text-destructive hover:bg-destructive/10"
								>
									<RotateCcwIcon class="size-3.5" />
									<span>Clear</span>
								</Button>
							</div>

							<!-- Points coordinates chips -->
							{#if currentFootprint.length > 0}
								<div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-background/60 rounded-xl border border-border/50">
									{#each currentFootprint as pt, i}
										<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono border border-border/60">
											<span class="font-bold text-primary">#{i + 1}</span>
											<span>{pt[0].toFixed(5)}, {pt[1].toFixed(5)}</span>
											<button
												type="button"
												onclick={() => removeVertex(i)}
												class="hover:text-destructive cursor-pointer ml-1"
												title="Remove Point"
											>
												<XIcon class="size-3" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- 3. Floors & Height (Max 4 Floors) -->
						<div class="p-4 rounded-2xl bg-muted/20 border border-border/70 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
									<LayersIcon class="size-3.5 text-primary" />
									<span>Floors & Height</span>
								</span>
								<span class="text-xs font-mono font-black text-primary">
									{currentFloors} {currentFloors === 1 ? 'Floor' : 'Floors'} • ~{(currentFloors * 3.5).toFixed(1)}m
								</span>
							</div>

							<div class="flex flex-col gap-1.5">
								<div class="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
									<span>Number of Floors (Max 4)</span>
									<span class="font-bold text-foreground">{currentFloors} of 4</span>
								</div>
								<input
									type="range"
									min="1"
									max="4"
									step="1"
									bind:value={currentFloors}
									oninput={() => updateMapDisplay()}
									class="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
								/>
							</div>

							<div class="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
								<div class="flex flex-col gap-1">
									<label for="base-elevation-input" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">
										Ground Elevation (m)
									</label>
									<Input
										id="base-elevation-input"
										type="number"
										min="0"
										max="30"
										step="0.5"
										bind:value={currentElevation}
										oninput={() => updateMapDisplay()}
										class="h-8 rounded-lg text-xs font-mono"
									/>
								</div>
								<div class="flex flex-col gap-1">
									<span class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide">
										Total Height
									</span>
									<div class="h-8 px-2.5 rounded-lg bg-background border border-border flex items-center font-mono text-xs font-bold text-muted-foreground">
										{(currentFloors * 3.5 + Number(currentElevation || 0)).toFixed(1)} m
									</div>
								</div>
							</div>
						</div>

						<!-- 4. Color Theme -->
						<div class="p-4 rounded-2xl bg-muted/20 border border-border/70 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
									<PaletteIcon class="size-3.5 text-primary" />
									<span>Building Color</span>
								</span>
								<div class="flex items-center gap-1.5">
									<span class="size-3 rounded-full border border-white/60 shadow-xs" style="background-color: {currentColor};"></span>
									<span class="text-[10px] font-mono font-bold text-muted-foreground uppercase">{currentColor}</span>
								</div>
							</div>

							<div class="grid grid-cols-4 gap-2">
								{#each COLOR_PRESETS as preset}
									<button
										type="button"
										onclick={() => {
											currentColor = preset.value;
											updateMapDisplay();
										}}
										class="h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer {currentColor === preset.value ? 'ring-2 ring-primary border-primary scale-105' : 'border-border/60 hover:opacity-90'}"
										style="background-color: {preset.value};"
										title={preset.label}
									>
										{#if currentColor === preset.value}
											<CheckIcon class="size-3.5 text-white drop-shadow-xs" />
										{/if}
									</button>
								{/each}
							</div>

							<div class="flex items-center gap-2 pt-1 border-t border-border/50">
								<label for="custom-hex-input" class="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wide shrink-0">
									Custom Hex
								</label>
								<Input
									id="custom-hex-input"
									type="text"
									bind:value={currentColor}
									oninput={() => updateMapDisplay()}
									class="h-8 rounded-lg text-xs font-mono uppercase"
									maxlength={7}
								/>
							</div>
						</div>
					</div>

					<!-- Bottom Sticky Save Bar -->
					<div class="mt-auto p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3 shrink-0">
						<Button
							type="button"
							variant="outline"
							onclick={() => (open = false)}
							class="text-xs font-bold rounded-xl h-10 px-4 cursor-pointer"
						>
							Cancel
						</Button>

						<Button
							type="button"
							onclick={handleSave}
							disabled={isSaving || !activeBuilding}
							class="text-xs font-black rounded-xl h-10 px-5 gap-2 cursor-pointer shadow-md shadow-primary/20"
						>
							{#if isSaving}
								<span class="size-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
								<span>Saving...</span>
							{:else}
								<SaveIcon class="size-4" />
								<span>Save Changes</span>
							{/if}
						</Button>
					</div>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
