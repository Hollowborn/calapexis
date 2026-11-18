<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/state";
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "@sveltejs/kit";
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
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import RotateCwIcon from "@lucide/svelte/icons/rotate-cw";

	let { data } = $props();
	let buildings: Building[] = $derived(data.buildings || []);

	// ── Reactive UI state ──────────────────────────────────────────────────────
	let selectedBuildingId = $state<string>(buildings[0]?.id || "");
	let currentFootprint = $state<[number, number][]>([]);
	let currentFloors = $state(1);
	let currentElevation = $state(0);
	let currentColor = $state("#3b82f6");
	let currentBaseLayer = $state<"satellite" | "osm">("satellite");
	let isSaving = $state(false);
	let isMapReady = $state(false);

	// ── Leaflet instances ──────────────────────────────────────────────────────
	let mapContainer = $state<HTMLDivElement | null>(null);
	let leafMap: any = null;
	let L: any = null;
	let extrusionManager: BuildingExtrusionManager | null = null;
	let osmLayer: any = null;
	let satelliteLayer: any = null;
	let vertexMarkers: any[] = [];
	let centroidMarker: any = null;

	// ── Derived ────────────────────────────────────────────────────────────────
	let activeBuilding = $derived(
		buildings.find((b) => b.id === selectedBuildingId) || buildings[0] || null
	);

	// ── Color Presets ──────────────────────────────────────────────────────────
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

	// ── Auto-select from URL query param ───────────────────────────────────────
	let didAutoSelect = $state(false);
	$effect(() => {
		if (!didAutoSelect && buildings.length > 0) {
			const urlId = page.url.searchParams.get("building");
			if (urlId && buildings.find((b) => b.id === urlId)) {
				selectedBuildingId = urlId;
			} else if (buildings[0]) {
				selectedBuildingId = buildings[0].id;
			}
			didAutoSelect = true;
		}
	});

	// ── Sync editing fields when active building changes ───────────────────────
	$effect(() => {
		if (!activeBuilding) return;

		currentFootprint = activeBuilding.footprint
			? (JSON.parse(JSON.stringify(activeBuilding.footprint)) as [number, number][])
			: [];
		currentFloors = Math.min(4, Math.max(1, activeBuilding.floors || 1));
		currentElevation = activeBuilding.elevation ?? 0;
		currentColor = activeBuilding.color || "#3b82f6";

		if (isMapReady) {
			updateMapDisplay();
			panToActiveBuilding();
		}
	});

	// ── Init Leaflet ───────────────────────────────────────────────────────────
	$effect(() => {
		if (mapContainer && !isMapReady) {
			initMap();
		}
	});

	function cleanupMap() {
		vertexMarkers.forEach((m) => { try { leafMap?.removeLayer(m); } catch {} });
		vertexMarkers = [];
		if (centroidMarker) {
			try { leafMap?.removeLayer(centroidMarker); } catch {}
			centroidMarker = null;
		}
		if (extrusionManager) {
			extrusionManager.destroy();
			extrusionManager = null;
		}
		if (leafMap) {
			leafMap.remove();
			leafMap = null;
		}
		isMapReady = false;
	}

	onDestroy(cleanupMap);

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

		leafMap = L.map(mapContainer, {
			center: [9.894414, 123.88258] as [number, number],
			zoom: 18.5,
			minZoom: 16,
			maxZoom: 22,
			zoomControl: false,
		});

		L.control.zoom({ position: "bottomright" }).addTo(leafMap);

		satelliteLayer = L.tileLayer(
			"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
			{ attribution: "Esri", maxNativeZoom: 18, maxZoom: 22 }
		);
		osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "OpenStreetMap",
			maxNativeZoom: 19,
			maxZoom: 22,
		});

		satelliteLayer.addTo(leafMap);

		extrusionManager = new BuildingExtrusionManager(leafMap, L, {
			interactive: false,
			selectedBuildingId: null,
		});

		leafMap.on("click", (e: any) => {
			if (!activeBuilding) return;
			currentFootprint = [...currentFootprint, [e.latlng.lat, e.latlng.lng] as [number, number]];
			updateMapDisplay();
		});

		setTimeout(() => {
			if (leafMap) leafMap.invalidateSize();
			isMapReady = true;
		}, 150);
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

	function resetZoom() {
		leafMap?.setView([9.894414, 123.88258], 18.5, { animate: true });
	}

	function panToActiveBuilding() {
		if (!leafMap || !activeBuilding) return;
		let target: [number, number] = [9.894414, 123.88258];
		if (currentFootprint.length > 0) {
			target = calculatePolygonCentroid(currentFootprint);
		} else if (activeBuilding.xCoord) {
			target = [activeBuilding.xCoord ?? 9.894414, activeBuilding.yCoord ?? 123.88258];
		}
		leafMap.setView(target, 19, { animate: true });
	}

	function updateMapDisplay() {
		if (!leafMap || !L || !extrusionManager) return;

		const previewBuildings: Building[] = buildings.map((b) =>
			b.id === activeBuilding?.id
				? {
						...b,
						footprint: currentFootprint.length >= 3 ? currentFootprint : undefined,
						floors: Math.min(4, Math.max(1, currentFloors)),
						elevation: Number(currentElevation) || 0,
						color: currentColor,
				  }
				: b
		);

		extrusionManager.updateOptions({ selectedBuildingId: null });
		extrusionManager.renderBuildings(previewBuildings);

		vertexMarkers.forEach((m) => { try { leafMap.removeLayer(m); } catch {} });
		vertexMarkers = [];
		if (centroidMarker) {
			try { leafMap.removeLayer(centroidMarker); } catch {}
			centroidMarker = null;
		}

		currentFootprint.forEach(([lat, lng], idx) => {
			const marker = L.marker([lat, lng], {
				draggable: true,
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: `<div class="size-6 -ml-3 -mt-3 rounded-full bg-background border-2 border-primary shadow-md flex items-center justify-center cursor-move hover:scale-125 transition-transform select-none"><span class="text-[9px] font-black text-primary font-mono">${idx + 1}</span></div>`,
					iconSize: [24, 24],
					iconAnchor: [12, 12],
				}),
				zIndexOffset: 1000,
			}).addTo(leafMap);

			marker.on("drag", (e: any) => {
				const pos = e.target.getLatLng();
				currentFootprint[idx] = [pos.lat, pos.lng];
				currentFootprint = [...currentFootprint];
				extrusionManager?.renderBuildings(
					buildings.map((b) =>
						b.id === activeBuilding?.id
							? { ...b, footprint: currentFootprint, floors: Math.min(4, Math.max(1, currentFloors)), elevation: Number(currentElevation) || 0, color: currentColor }
							: b
					)
				);
			});

			marker.on("dragend", () => updateMapDisplay());
			vertexMarkers.push(marker);
		});

		if (currentFootprint.length >= 3) {
			const centroid = calculatePolygonCentroid(currentFootprint);
			centroidMarker = L.marker(centroid, {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: `<div class="px-2 py-0.5 rounded-full bg-primary text-primary-foreground border border-white/50 shadow-md text-[9px] font-bold tracking-wider font-mono uppercase whitespace-nowrap flex items-center gap-1 select-none"><span class="size-1.5 rounded-full bg-white animate-pulse"></span><span>Center Pin</span></div>`,
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
		const centerLat = activeBuilding.xCoord ?? 9.894414;
		const centerLng = activeBuilding.yCoord ?? 123.88258;
		const dLat = 16 / 2 / 111000;
		const dLng = 22 / 2 / 109350;
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
		toast.info("Cleared all outline points.");
	}

	// ── Enhance Save Action ────────────────────────────────────────────────────
	const handleSaveEnhance: SubmitFunction = () => {
		isSaving = true;
		let resolveSave: (v?: any) => void = () => {};
		let rejectSave: (e: any) => void = () => {};
		const savePromise = new Promise((resolve, reject) => {
			resolveSave = resolve;
			rejectSave = reject;
		});

		toast.promise(savePromise, {
			loading: `Saving map outline for ${activeBuilding?.name || "building"}...`,
			success: `Saved map outline for ${activeBuilding?.name || "building"} successfully!`,
			error: (err: any) => err.message || "Failed to save building outline."
		});

		return async ({ result, update }: { result: any; update: any }) => {
			isSaving = false;
			if (result.type === "success") {
				resolveSave();
				await update();
			} else if (result.type === "failure") {
				rejectSave(new Error((result.data as any)?.message || "Failed to save building outline."));
			} else {
				rejectSave(new Error("Unexpected error occurred."));
			}
		};
	};
</script>

<svelte:head>
	<title>Campus Map Studio – Calapexis</title>
	<meta
		name="description"
		content="Draw 2.5D building outlines, adjust floor heights, and select building colors directly on the campus map."
	/>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="flex flex-1 flex-col min-h-0 overflow-hidden">
	<!-- Studio Header Bar -->
	<div class="shrink-0 px-6 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
				<BoxIcon class="size-4 pointer-events-none" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="font-black text-base text-foreground tracking-tight">Campus Map Studio</h1>
					<Badge variant="outline" class="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
						2.5D Vectors
					</Badge>
				</div>
				<p class="text-[11px] text-muted-foreground font-semibold hidden sm:block">
					Draw building outlines, customize colors, and set floor heights directly on the campus map.
				</p>
			</div>
		</div>
		<a
			href="/dashboard/admin/buildings"
			class="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground border border-border hover:border-border/80 hover:bg-muted/50 transition-all px-3 h-9 rounded-xl"
		>
			<ArrowLeftIcon class="size-3.5 pointer-events-none" />
			<span class="hidden sm:inline">Back to Buildings</span>
		</a>
	</div>

	<!-- Main Split Workspace -->
	<div class="flex flex-1 min-h-0 overflow-hidden">
		<!-- LEFT PANE: Leaflet Map Canvas -->
		<div class="relative flex-1 min-w-0 bg-muted/20 overflow-hidden">
			<div bind:this={mapContainer} class="absolute inset-0"></div>

			<!-- Floating Toolbar -->
			<div class="absolute top-4 left-4 z-[500] flex items-center gap-1.5 p-1 bg-card/90 backdrop-blur-md border border-border/80 rounded-xl shadow-lg">
				<Button
					variant={currentBaseLayer === "satellite" ? "default" : "ghost"}
					size="sm"
					onclick={() => switchBaseLayer("satellite")}
					class="text-xs font-bold h-8 px-3 rounded-lg gap-1.5 cursor-pointer"
				>
					<SatelliteIcon class="size-3.5 pointer-events-none" />
					<span>Satellite</span>
				</Button>
				<Button
					variant={currentBaseLayer === "osm" ? "default" : "ghost"}
					size="sm"
					onclick={() => switchBaseLayer("osm")}
					class="text-xs font-bold h-8 px-3 rounded-lg gap-1.5 cursor-pointer"
				>
					<MapIcon class="size-3.5 pointer-events-none" />
					<span>Street</span>
				</Button>

				<div class="h-4 w-px bg-border mx-0.5"></div>

				<Button
					variant="ghost"
					size="sm"
					onclick={panToActiveBuilding}
					class="text-xs font-bold h-8 px-2.5 rounded-lg gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
					title="Center on selected building"
				>
					<FocusIcon class="size-3.5 pointer-events-none" />
					<span class="hidden sm:inline">Center</span>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={resetZoom}
					class="text-xs font-bold h-8 px-2.5 rounded-lg gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
					title="Reset zoom to campus overview"
				>
					<RotateCwIcon class="size-3.5 pointer-events-none" />
					<span class="hidden sm:inline">Reset</span>
				</Button>
			</div>

			<!-- Instruction Pill -->
			<div class="absolute bottom-8 left-4 z-[500] pointer-events-none max-w-sm">
				<div class="px-3.5 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 text-xs text-muted-foreground font-medium shadow-md flex items-center gap-2">
					<span class="size-2 rounded-full bg-primary animate-pulse shrink-0"></span>
					{#if currentFootprint.length === 0}
						<span>Click anywhere on the map to place your first outline point</span>
					{:else if currentFootprint.length < 3}
						<span>Add {3 - currentFootprint.length} more point{3 - currentFootprint.length === 1 ? "" : "s"} to form a shape</span>
					{:else}
						<span>Drag numbered handles to reshape • Click map to add more points</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- RIGHT PANE: Parameter Panel -->
		<div class="w-[380px] shrink-0 border-l border-border/70 bg-card flex flex-col overflow-hidden">
			<div class="shrink-0 px-5 pt-5 pb-3 border-b border-border/50">
				<span class="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
					Building Configuration
				</span>
			</div>

			<div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 text-xs font-semibold">
				<!-- 1. Building Selector with Portal -->
				<div class="flex flex-col gap-1.5">
					<label for="select-building-trigger" class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
						Target Building
					</label>
					<Select.Root
						type="single"
						value={selectedBuildingId || ""}
						onValueChange={(val) => {
							if (val) selectedBuildingId = val;
						}}
					>
						<Select.Trigger id="select-building-trigger" class="h-10 rounded-xl font-bold cursor-pointer border-border">
							<span class="truncate flex items-center gap-2">
								<span
									class="size-2.5 rounded-full shrink-0"
									style="background-color: {activeBuilding?.color || '#3b82f6'};"
								></span>
								<span class="text-xs font-bold">
									{activeBuilding
										? `${activeBuilding.name} (${activeBuilding.code})`
										: "Select a building"}
								</span>
							</span>
						</Select.Trigger>
						<Select.Portal>
							<Select.Content class="rounded-xl border border-border bg-card z-[2600] max-h-72 shadow-2xl">
								<Select.Group>
									{#each buildings as b (b.id)}
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
						</Select.Portal>
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
								Active Shape ✓
							</Badge>
						{:else}
							<Badge variant="outline" class="text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
								Need 3+ Points
							</Badge>
						{/if}
					</div>

					<div class="grid grid-cols-2 gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={generateDefaultBoxFootprint}
							class="text-xs font-bold h-8 rounded-xl gap-1.5 cursor-pointer border-border hover:bg-muted"
						>
							<Wand2Icon class="size-3.5 text-primary pointer-events-none" />
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
							<RotateCcwIcon class="size-3.5 pointer-events-none" />
							<span>Clear</span>
						</Button>
					</div>

					{#if currentFootprint.length > 0}
						<div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-background/60 rounded-xl border border-border/50">
							{#each currentFootprint as pt, i (i)}
								<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono border border-border/60">
									<span class="font-bold text-primary">#{i + 1}</span>
									<span>{pt[0].toFixed(5)}, {pt[1].toFixed(5)}</span>
									<button
										type="button"
										onclick={() => removeVertex(i)}
										class="hover:text-destructive cursor-pointer ml-1 transition-colors"
										title="Remove point"
									>
										<XIcon class="size-3 pointer-events-none" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- 3. Floors & Height -->
				<div class="p-4 rounded-2xl bg-muted/20 border border-border/70 flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<span class="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
							<LayersIcon class="size-3.5 text-primary" />
							<span>Floors & Height</span>
						</span>
						<span class="text-xs font-mono font-black text-primary">
							{currentFloors} {currentFloors === 1 ? "Floor" : "Floors"} · ~{(currentFloors * 3.5).toFixed(1)}m
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
						<div class="flex justify-between text-[9px] text-muted-foreground font-mono px-0.5">
							<span>1</span><span>2</span><span>3</span><span>4</span>
						</div>
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
								{(currentFloors * 3.5 + (Number(currentElevation) || 0)).toFixed(1)} m
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
							<span class="size-3 rounded-full border border-white/60 shadow-sm" style="background-color: {currentColor};"></span>
							<span class="text-[10px] font-mono font-bold text-muted-foreground uppercase">{currentColor}</span>
						</div>
					</div>

					<div class="grid grid-cols-4 gap-2">
						{#each COLOR_PRESETS as preset (preset.value)}
							<button
								type="button"
								onclick={() => {
									currentColor = preset.value;
									updateMapDisplay();
								}}
								class="h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer {currentColor === preset.value
									? 'ring-2 ring-primary border-primary scale-105'
									: 'border-border/60 hover:opacity-90'}"
								style="background-color: {preset.value};"
								title={preset.label}
							>
								{#if currentColor === preset.value}
									<CheckIcon class="size-3.5 text-white drop-shadow-sm pointer-events-none" />
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
							placeholder="#3b82f6"
						/>
					</div>
				</div>
			</div>

			<!-- Sticky Bottom Action Bar with use:enhance Form -->
			<div class="shrink-0 p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
				<a
					href="/dashboard/admin/buildings"
					class="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground border border-border hover:border-border/80 hover:bg-muted/50 transition-all px-4 h-10 rounded-xl"
				>
					<ArrowLeftIcon class="size-3.5 pointer-events-none" />
					<span>Back</span>
				</a>

				<form method="POST" action="?/saveBuildingFootprint" use:enhance={handleSaveEnhance} class="flex flex-1 contents">
					<input type="hidden" name="id" value={activeBuilding?.id || ""} />
					<input type="hidden" name="footprint" value={currentFootprint.length >= 3 ? JSON.stringify(currentFootprint) : ""} />
					<input type="hidden" name="floors" value={String(Math.min(4, Math.max(1, currentFloors)))} />
					<input type="hidden" name="elevation" value={String(Number(currentElevation) || 0)} />
					<input type="hidden" name="color" value={currentColor} />
					<input type="hidden" name="xCoord" value={String(currentFootprint.length >= 3 ? calculatePolygonCentroid(currentFootprint)[0] : (activeBuilding?.xCoord ?? 9.894414))} />
					<input type="hidden" name="yCoord" value={String(currentFootprint.length >= 3 ? calculatePolygonCentroid(currentFootprint)[1] : (activeBuilding?.yCoord ?? 123.88258))} />

					<Button
						type="submit"
						disabled={isSaving || !activeBuilding}
						class="text-xs font-black rounded-xl h-10 px-5 gap-2 cursor-pointer shadow-md shadow-primary/20 w-full"
					>
						{#if isSaving}
							<span class="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0"></span>
							<span>Saving...</span>
						{:else}
							<SaveIcon class="size-4 pointer-events-none" />
							<span>Save Changes</span>
						{/if}
					</Button>
				</form>
			</div>
		</div>
	</div>
</div>

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