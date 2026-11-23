import assert from "node:assert/strict";
import test from "node:test";
import {
	filterAccessibleMapEdges,
	isValidRestrictedPolygon,
	pathIntersectsRestrictedArea,
	pointInRestrictedArea,
} from "../src/lib/components/map/restricted-areas.ts";

const area = {
	id: "construction",
	name: "Construction",
	polygon: [
		[9, 123],
		[9, 124],
		[10, 124],
		[10, 123],
	],
};

test("classifies interior, exterior, and boundary points", () => {
	assert.equal(pointInRestrictedArea([9.5, 123.5], area.polygon), true);
	assert.equal(pointInRestrictedArea([8.5, 123.5], area.polygon), false);
	assert.equal(pointInRestrictedArea([9.5, 123], area.polygon), true);
});

test("rejects degenerate and self-intersecting polygons", () => {
	assert.equal(isValidRestrictedPolygon(area.polygon), true);
	assert.equal(
		isValidRestrictedPolygon([[9, 123], [9.5, 123.5], [10, 124]]),
		false,
	);
	assert.equal(
		isValidRestrictedPolygon([[9, 123], [10, 124], [9, 124], [10, 123]]),
		false,
	);
});

test("detects paths entering or crossing a restricted polygon", () => {
	assert.equal(pathIntersectsRestrictedArea([[9.5, 123.5]], area.polygon), true);
	assert.equal(
		pathIntersectsRestrictedArea(
			[[8.5, 123.5], [10.5, 123.5]],
			area.polygon,
		),
		true,
	);
	assert.equal(
		pathIntersectsRestrictedArea(
			[[8.5, 122.5], [8.5, 124.5]],
			area.polygon,
		),
		false,
	);
});

test("filters only map edges that intersect active restricted areas", () => {
	const edges = [
		{
			id: "blocked",
			fromNode: "a",
			toNode: "b",
			path: [[8.5, 123.5], [10.5, 123.5]],
		},
		{
			id: "clear",
			fromNode: "a",
			toNode: "c",
			path: [[8.5, 122.5], [8.5, 124.5]],
		},
	];

	assert.deepEqual(
		filterAccessibleMapEdges(edges, [area]).map((edge) => edge.id),
		["clear"],
	);
	assert.deepEqual(filterAccessibleMapEdges(edges, []), edges);
});
