import type { Building } from "$lib/types";

export interface ExtrusionOptions {
	sunAngle?: number;          // Sun azimuth angle in degrees (default 135: South-East)
	heightPerFloor?: number;    // Height in meters per floor (default 4.0m)
	tiltAngle?: number;         // Projection tilt angle in degrees (default 115: towards North-North-West)
	tiltMagnitude?: number;     // Multiplier for visual extrusion prominence (default 1.25)
	interactive?: boolean;      // Whether building facets respond to mouse events
	selectedBuildingId?: string | null;
	highlightedBuildingId?: string | null;
	onBuildingClick?: (building: Building) => void;
	onBuildingHover?: (building: Building | null) => void;
	showLabels?: boolean;
}

/**
 * Calculates the polygon centroid (center latitude and longitude)
 */
export function calculatePolygonCentroid(pts: [number, number][]): [number, number] {
	if (!pts || pts.length === 0) return [9.894414, 123.88258];
	if (pts.length === 1) return [pts[0][0], pts[0][1]];

	let totalLat = 0;
	let totalLng = 0;
	pts.forEach(([lat, lng]) => {
		totalLat += lat;
		totalLng += lng;
	});

	return [totalLat / pts.length, totalLng / pts.length];
}

/**
 * Adjusts a hex color by a lighting percentage (-100 to +100)
 */
function shadeColor(color: string, percent: number): string {
	let hex = color.replace(/^#/, "");
	if (hex.length === 3) {
		hex = hex.split("").map((c) => c + c).join("");
	}
	const num = parseInt(hex, 16);
	if (isNaN(num)) return color;

	let r = (num >> 16) + Math.round(255 * (percent / 100));
	let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
	let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

	r = Math.min(255, Math.max(0, r));
	g = Math.min(255, Math.max(0, g));
	b = Math.min(255, Math.max(0, b));

	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Computes roof vertex offset in geographic coordinates based on building height and elevation
 */
function computeRoofOffset(
	floors: number,
	elevation: number = 0,
	opts: ExtrusionOptions
): [number, number] {
	const heightPerFloor = opts.heightPerFloor ?? 4.0;
	const tiltAngle = (opts.tiltAngle ?? 115) * (Math.PI / 180);
	const magnitude = opts.tiltMagnitude ?? 1.25;

	const totalMeters = (Math.max(1, floors) * heightPerFloor + Math.max(0, elevation)) * magnitude;

	// Lat 1 deg ~ 111,000m, Lng 1 deg ~ 109,350m around Bohol / Calape (lat 9.89)
	const dLat = (totalMeters * Math.sin(tiltAngle)) / 111000;
	const dLng = (totalMeters * Math.cos(tiltAngle)) / 109350;

	return [dLat, dLng];
}

/**
 * 2.5D Building Extrusion Renderer for Leaflet
 */
export class BuildingExtrusionManager {
	private map: any;
	private L: any;
	private layerGroup: any;
	private labelGroup: any;
	private options: ExtrusionOptions;

	constructor(map: any, L: any, options: ExtrusionOptions = {}) {
		this.map = map;
		this.L = L;
		this.options = {
			sunAngle: 135,
			heightPerFloor: 4.0,
			tiltAngle: 115,
			tiltMagnitude: 1.25,
			interactive: true,
			showLabels: true,
			...options,
		};

		// Create dedicated high-priority panes for 2.5D structures below routing/user markers
		if (!this.map.getPane("building3dPane")) {
			const bPane = this.map.createPane("building3dPane");
			bPane.style.zIndex = "450";
		}
		if (!this.map.getPane("buildingLabelPane")) {
			const lPane = this.map.createPane("buildingLabelPane");
			lPane.style.zIndex = "460";
			lPane.style.pointerEvents = "none";
		}

		this.layerGroup = this.L.layerGroup([], { pane: "building3dPane" }).addTo(this.map);
		this.labelGroup = this.L.layerGroup([], { pane: "buildingLabelPane" }).addTo(this.map);
	}

	public updateOptions(newOpts: Partial<ExtrusionOptions>) {
		this.options = { ...this.options, ...newOpts };
	}

	public clear() {
		this.layerGroup.clearLayers();
		this.labelGroup.clearLayers();
	}

	public renderBuildings(buildings: Building[]) {
		this.clear();

		const activeBuildings = buildings.filter((b) => b.isActive !== false);

		activeBuildings.forEach((building) => {
			if (building.footprint && building.footprint.length >= 3) {
				this.renderSingleBuilding(building);
			}
		});
	}

	public renderSingleBuilding(building: Building) {
		const L = this.L;
		const footprint = building.footprint!;
		const floors = building.floors || 1;
		const elevation = building.elevation || 0;
		const baseColor = building.color || "#3b82f6";
		const isSelected = this.options.selectedBuildingId === building.id;
		const isHighlighted = this.options.highlightedBuildingId === building.id;

		const [dLat, dLng] = computeRoofOffset(floors, elevation, this.options);

		// 1. Calculate roof polygon points
		const roofPoints: [number, number][] = footprint.map(([lat, lng]) => [
			lat + dLat,
			lng + dLng,
		]);

		// 2. Base ground footprint shadow
		const groundPoly = L.polygon(footprint, {
			pane: "building3dPane",
			color: "transparent",
			fillColor: "#0f172a",
			fillOpacity: 0.35,
			weight: 0,
			interactive: false,
		});
		this.layerGroup.addLayer(groundPoly);

		// 3. Render wall facets between base and roof vertices
		const sunRad = ((this.options.sunAngle ?? 135) * Math.PI) / 180;
		const sunX = Math.cos(sunRad);
		const sunY = Math.sin(sunRad);

		const n = footprint.length;
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			const b1 = footprint[i];
			const b2 = footprint[j];
			const r1 = roofPoints[i];
			const r2 = roofPoints[j];

			// Wall facet quad
			const wallQuad = [b1, b2, r2, r1];

			// Compute wall normal to calculate lighting
			const dx = (b2[1] - b1[1]) * 109350;
			const dy = (b2[0] - b1[0]) * 111000;
			const len = Math.sqrt(dx * dx + dy * dy) || 1;
			// Outward normal in 2D
			const nx = -dy / len;
			const ny = dx / len;

			// Dot product with sun light direction
			const dot = nx * sunX + ny * sunY;
			// Brightness multiplier: range from -35% (in shadow) to +15% (facing sunlight)
			const shadeFactor = Math.round(dot * 25);
			const wallColor = shadeColor(baseColor, shadeFactor);

			const wall = L.polygon(wallQuad, {
				pane: "building3dPane",
				color: shadeColor(baseColor, -25),
				weight: 1,
				opacity: 0.8,
				fillColor: wallColor,
				fillOpacity: 0.92,
				interactive: this.options.interactive ?? true,
				className: "cursor-pointer transition-all",
			});

			this.attachInteractions(wall, building);
			this.layerGroup.addLayer(wall);

			// 4. Floor division tier lines along walls
			if (floors > 1) {
				for (let fl = 1; fl < floors; fl++) {
					const ratio = fl / floors;
					const flP1: [number, number] = [
						b1[0] + dLat * ratio,
						b1[1] + dLng * ratio,
					];
					const flP2: [number, number] = [
						b2[0] + dLat * ratio,
						b2[1] + dLng * ratio,
					];

					const floorLine = L.polyline([flP1, flP2], {
						pane: "building3dPane",
						color: shadeColor(baseColor, -40),
						weight: 1,
						opacity: 0.6,
						dashArray: "2, 3",
						interactive: false,
					});
					this.layerGroup.addLayer(floorLine);
				}
			}
		}

		// 5. Render colored roof polygon on top
		const roofFillColor = isSelected
			? "#fbbf24" // Amber highlight when selected
			: isHighlighted
			? "#10b981" // Emerald highlight when hovered
			: shadeColor(baseColor, 10);

		const roof = L.polygon(roofPoints, {
			pane: "building3dPane",
			color: isSelected ? "#f59e0b" : shadeColor(baseColor, -15),
			weight: isSelected ? 2.5 : 1.5,
			fillColor: roofFillColor,
			fillOpacity: 0.98,
			interactive: this.options.interactive ?? true,
			className: "cursor-pointer transition-all",
		});

		this.attachInteractions(roof, building);
		this.layerGroup.addLayer(roof);

		// 6. Rooftop Badge / Label
		if (this.options.showLabels) {
			const roofCentroid = calculatePolygonCentroid(roofPoints);
			const badgeHtml = `
				<div class="group relative flex items-center justify-center pointer-events-none select-none">
					<div class="px-2 py-0.5 rounded-lg bg-card/95 backdrop-blur-md border border-border/80 shadow-md flex items-center gap-1.5 transition-transform">
						<span class="size-2 rounded-full shrink-0" style="background-color: ${baseColor};"></span>
						<span class="text-[10px] font-black text-foreground tracking-tight whitespace-nowrap">${building.code}</span>
						<span class="text-[9px] font-bold text-muted-foreground bg-muted/60 px-1 py-0.2 rounded font-mono">${floors}F</span>
					</div>
				</div>
			`;

			const labelMarker = L.marker(roofCentroid, {
				pane: "buildingLabelPane",
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: badgeHtml,
					iconSize: [80, 24],
					iconAnchor: [40, 12],
				}),
				interactive: false,
			});
			this.labelGroup.addLayer(labelMarker);
		}
	}

	private attachInteractions(layer: any, building: Building) {
		if (!this.options.interactive) return;

		layer.on("click", (e: any) => {
			if (this.L.DomEvent) this.L.DomEvent.stopPropagation(e);
			if (this.options.onBuildingClick) {
				this.options.onBuildingClick(building);
			}
		});

		layer.on("mouseover", () => {
			if (this.options.onBuildingHover) {
				this.options.onBuildingHover(building);
			}
		});

		layer.on("mouseout", () => {
			if (this.options.onBuildingHover) {
				this.options.onBuildingHover(null);
			}
		});
	}

	public destroy() {
		this.clear();
		if (this.map.hasLayer(this.layerGroup)) this.map.removeLayer(this.layerGroup);
		if (this.map.hasLayer(this.labelGroup)) this.map.removeLayer(this.labelGroup);
	}
}
