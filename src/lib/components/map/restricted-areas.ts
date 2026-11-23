import type { MapEdge, RestrictedArea } from "$lib/types";

const GEOMETRY_EPSILON = 1e-10;

function isPointOnSegment(
	point: [number, number],
	start: [number, number],
	end: [number, number],
): boolean {
	const [lat, lng] = point;
	const [startLat, startLng] = start;
	const [endLat, endLng] = end;
	const cross =
		(lng - startLng) * (endLat - startLat) -
		(lat - startLat) * (endLng - startLng);

	if (Math.abs(cross) > GEOMETRY_EPSILON) return false;

	return (
		lng >= Math.min(startLng, endLng) - GEOMETRY_EPSILON &&
		lng <= Math.max(startLng, endLng) + GEOMETRY_EPSILON &&
		lat >= Math.min(startLat, endLat) - GEOMETRY_EPSILON &&
		lat <= Math.max(startLat, endLat) + GEOMETRY_EPSILON
	);
}

function orientation(
	first: [number, number],
	second: [number, number],
	third: [number, number],
): number {
	return (
		(second[1] - first[1]) * (third[0] - first[0]) -
		(second[0] - first[0]) * (third[1] - first[1])
	);
}

function segmentsIntersect(
	firstStart: [number, number],
	firstEnd: [number, number],
	secondStart: [number, number],
	secondEnd: [number, number],
): boolean {
	const firstOrientation = orientation(firstStart, firstEnd, secondStart);
	const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
	const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
	const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

	if (
		((firstOrientation > GEOMETRY_EPSILON && secondOrientation < -GEOMETRY_EPSILON) ||
			(firstOrientation < -GEOMETRY_EPSILON && secondOrientation > GEOMETRY_EPSILON)) &&
		((thirdOrientation > GEOMETRY_EPSILON && fourthOrientation < -GEOMETRY_EPSILON) ||
			(thirdOrientation < -GEOMETRY_EPSILON && fourthOrientation > GEOMETRY_EPSILON))
	) {
		return true;
	}

	return (
		(Math.abs(firstOrientation) <= GEOMETRY_EPSILON &&
			isPointOnSegment(secondStart, firstStart, firstEnd)) ||
		(Math.abs(secondOrientation) <= GEOMETRY_EPSILON &&
			isPointOnSegment(secondEnd, firstStart, firstEnd)) ||
		(Math.abs(thirdOrientation) <= GEOMETRY_EPSILON &&
			isPointOnSegment(firstStart, secondStart, secondEnd)) ||
		(Math.abs(fourthOrientation) <= GEOMETRY_EPSILON &&
			isPointOnSegment(firstEnd, secondStart, secondEnd))
	);
}

export function pointInRestrictedArea(
	point: [number, number],
	polygon: [number, number][],
): boolean {
	if (polygon.length < 3) return false;

	const [lat, lng] = point;
	let isInside = false;

	for (let currentIndex = 0, previousIndex = polygon.length - 1;
		currentIndex < polygon.length;
		previousIndex = currentIndex++
	) {
		const current = polygon[currentIndex];
		const previous = polygon[previousIndex];

		if (isPointOnSegment(point, previous, current)) return true;

		const crossesLatitude = (current[0] > lat) !== (previous[0] > lat);
		if (
			crossesLatitude &&
			lng <
				((previous[1] - current[1]) * (lat - current[0])) /
					(previous[0] - current[0]) +
					current[1]
		) {
			isInside = !isInside;
		}
	}

	return isInside;
}

export function pathIntersectsRestrictedArea(
	path: [number, number][],
	polygon: [number, number][],
): boolean {
	if (path.length === 0 || polygon.length < 3) return false;
	if (path.some((point) => pointInRestrictedArea(point, polygon))) return true;

	for (let pathIndex = 0; pathIndex < path.length - 1; pathIndex++) {
		for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex++) {
			const nextPolygonIndex = (polygonIndex + 1) % polygon.length;
			if (
				segmentsIntersect(
					path[pathIndex],
					path[pathIndex + 1],
					polygon[polygonIndex],
					polygon[nextPolygonIndex],
				)
			) {
				return true;
			}
		}
	}

	return false;
}

export function isValidRestrictedPolygon(polygon: [number, number][]): boolean {
	if (
		polygon.length < 3 ||
		polygon.some(
			([lat, lng]) =>
				!Number.isFinite(lat) ||
				!Number.isFinite(lng) ||
				lat < -90 ||
				lat > 90 ||
				lng < -180 ||
				lng > 180,
		)
	) {
		return false;
	}

	let twiceArea = 0;
	for (let index = 0; index < polygon.length; index++) {
		const current = polygon[index];
		const next = polygon[(index + 1) % polygon.length];
		twiceArea += current[1] * next[0] - next[1] * current[0];
	}
	if (Math.abs(twiceArea) <= GEOMETRY_EPSILON) return false;

	for (let firstIndex = 0; firstIndex < polygon.length; firstIndex++) {
		const firstNextIndex = (firstIndex + 1) % polygon.length;
		for (let secondIndex = firstIndex + 1; secondIndex < polygon.length; secondIndex++) {
			const secondNextIndex = (secondIndex + 1) % polygon.length;
			if (
				firstIndex === secondIndex ||
				firstNextIndex === secondIndex ||
				secondNextIndex === firstIndex
			) {
				continue;
			}
			if (
				segmentsIntersect(
					polygon[firstIndex],
					polygon[firstNextIndex],
					polygon[secondIndex],
					polygon[secondNextIndex],
				)
			) {
				return false;
			}
		}
	}

	return true;
}

export function filterAccessibleMapEdges(
	edges: MapEdge[],
	restrictedAreas: RestrictedArea[],
): MapEdge[] {
	if (restrictedAreas.length === 0) return edges;

	return edges.filter(
		(edge) =>
			!restrictedAreas.some((area) =>
				pathIntersectsRestrictedArea(edge.path, area.polygon),
			),
	);
}

export function createRestrictedAreaLayer(
	leaflet: any,
	map: any,
	restrictedAreas: RestrictedArea[],
): any {
	if (!map.getPane("restrictedAreaPane")) {
		const pane = map.createPane("restrictedAreaPane");
		pane.style.zIndex = "430";
	}
	if (!map.getPane("restrictedAreaLabelPane")) {
		const pane = map.createPane("restrictedAreaLabelPane");
		pane.style.zIndex = "640";
		pane.style.pointerEvents = "none";
	}

	const layer = leaflet.layerGroup();
	for (const area of restrictedAreas) {
		if (area.polygon.length < 3) continue;

		layer.addLayer(
			leaflet.polygon(area.polygon, {
				pane: "restrictedAreaPane",
				color: "#dc2626",
				weight: 2,
				opacity: 0.95,
				fillColor: "#ef4444",
				fillOpacity: 0.25,
				dashArray: "6 4",
				interactive: false,
			}),
		);

		const label = document.createElement("span");
		label.textContent = area.name;
		const center = area.polygon.reduce(
			([lat, lng], point) => [lat + point[0], lng + point[1]] as [number, number],
			[0, 0] as [number, number],
		);
		center[0] /= area.polygon.length;
		center[1] /= area.polygon.length;
		layer.addLayer(
			leaflet
				.tooltip({
					pane: "restrictedAreaLabelPane",
					permanent: true,
					direction: "center",
					className: "restricted-area-label",
					interactive: false,
				})
				.setLatLng(center)
				.setContent(label),
		);
	}

	return layer.addTo(map);
}
