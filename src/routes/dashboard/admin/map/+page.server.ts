import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { isValidRestrictedPolygon } from "$lib/components/map/restricted-areas";
import {
	addLocalRestrictedArea,
	deleteLocalRestrictedArea,
	getLocalBuildings,
	getLocalRestrictedAreas,
	updateLocalBuilding,
} from "$lib/supabase";

function parseRestrictedPolygon(raw: FormDataEntryValue | null): [number, number][] | null {
	if (typeof raw !== "string") return null;

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed) || parsed.length < 3 || parsed.length > 200) return null;

		const polygon: [number, number][] = [];
		for (const point of parsed) {
			if (
				!Array.isArray(point) ||
				point.length !== 2 ||
				typeof point[0] !== "number" ||
				typeof point[1] !== "number" ||
				!Number.isFinite(point[0]) ||
				!Number.isFinite(point[1]) ||
				point[0] < -90 ||
				point[0] > 90 ||
				point[1] < -180 ||
				point[1] > 180
			) {
				return null;
			}
			polygon.push([point[0], point[1]]);
		}

		return isValidRestrictedPolygon(polygon) ? polygon : null;
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [buildings, restrictedAreas] = await Promise.all([
		getLocalBuildings(locals.supabase),
		getLocalRestrictedAreas(locals.supabase),
	]);

	return { buildings, restrictedAreas };
};

export const actions: Actions = {
	createRestrictedArea: async ({ request, locals }) => {
		if (locals.session?.role !== "admin") {
			return fail(403, { message: "Only administrators can add restricted areas." });
		}

		const formData = await request.formData();
		const nameValue = formData.get("name");
		const descriptionValue = formData.get("description");
		const name = typeof nameValue === "string" ? nameValue.trim() : "";
		const description =
			typeof descriptionValue === "string" ? descriptionValue.trim() : "";
		const polygon = parseRestrictedPolygon(formData.get("polygon"));

		if (!name || name.length > 100) {
			return fail(400, { message: "A restricted area name of 1–100 characters is required." });
		}
		if (description.length > 500) {
			return fail(400, { message: "The restricted area description must be 500 characters or fewer." });
		}
		if (!polygon) {
			return fail(400, { message: "Draw a valid area using at least 3 map points." });
		}

		try {
			await addLocalRestrictedArea({ name, description, polygon }, locals.supabase);
			return { success: true };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to create restricted area.";
			return fail(500, { message });
		}
	},

	deleteRestrictedArea: async ({ request, locals }) => {
		if (locals.session?.role !== "admin") {
			return fail(403, { message: "Only administrators can remove restricted areas." });
		}

		const formData = await request.formData();
		const id = formData.get("id");
		if (
			typeof id !== "string" ||
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
		) {
			return fail(400, { message: "A valid restricted area ID is required." });
		}

		try {
			await deleteLocalRestrictedArea(id, locals.supabase);
			return { success: true };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to delete restricted area.";
			return fail(500, { message });
		}
	},

	saveBuildingFootprint: async ({ request, locals }) => {
		if (locals.session?.role !== "admin") {
			return fail(403, { message: "Only administrators can update building map vectors." });
		}

		const data = await request.formData();
		const id = data.get("id") as string;
		const footprintRaw = data.get("footprint") as string;
		const elevationVal = data.get("elevation");
		const elevation =
			elevationVal !== null && elevationVal !== undefined ? Number(elevationVal) : 0;
		const floorsVal = data.get("floors");
		const floors = floorsVal ? Math.min(4, Math.max(1, Number(floorsVal))) : undefined;
		const updateCoordinatesFromFootprint =
			data.get("updateCoordinatesFromFootprint") === "on";

		if (!id) {
			return fail(400, { message: "Building ID is required." });
		}

		let parsedFootprint: [number, number][] | undefined = undefined;
		if (footprintRaw) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(footprintRaw);
			} catch (e) {
				return fail(400, { message: "Invalid footprint JSON data." });
			}

			if (!Array.isArray(parsed)) {
				return fail(400, { message: "Footprint must contain valid latitude/longitude points." });
			}

			parsedFootprint = [];
			for (const point of parsed) {
				if (
					!Array.isArray(point) ||
					point.length !== 2 ||
					typeof point[0] !== "number" ||
					typeof point[1] !== "number" ||
					!Number.isFinite(point[0]) ||
					!Number.isFinite(point[1]) ||
					point[0] < -90 ||
					point[0] > 90 ||
					point[1] < -180 ||
					point[1] > 180
				) {
					return fail(400, { message: "Footprint must contain valid latitude/longitude points." });
				}
				parsedFootprint.push([point[0], point[1]]);
			}
		}

		if (updateCoordinatesFromFootprint && (!parsedFootprint || parsedFootprint.length < 3)) {
			return fail(400, { message: "At least 3 valid footprint points are required to update building coordinates." });
		}

		const updates: Record<string, unknown> = {
			footprint: parsedFootprint || null,
			elevation,
		};
		if (floors !== undefined && floors > 0) updates.floors = floors;
		if (updateCoordinatesFromFootprint && parsedFootprint) {
			const [latTotal, lngTotal] = parsedFootprint.reduce(
				([latSum, lngSum], [lat, lng]) => [latSum + lat, lngSum + lng],
				[0, 0],
			);
			updates.xCoord = latTotal / parsedFootprint.length;
			updates.yCoord = lngTotal / parsedFootprint.length;
		}

		try {
			await updateLocalBuilding(id, updates, locals.supabase);
			return { success: true };
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : "Failed to update building footprint.";
			return fail(500, { message: msg });
		}
	},
};
