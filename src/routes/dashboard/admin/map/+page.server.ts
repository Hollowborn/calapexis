import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getLocalBuildings, updateLocalBuilding } from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const buildings = await getLocalBuildings(locals.supabase);

	return { buildings };
};

export const actions: Actions = {
	saveBuildingFootprint: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;
		const footprintRaw = data.get("footprint") as string;
		const elevationVal = data.get("elevation");
		const elevation =
			elevationVal !== null && elevationVal !== undefined ? Number(elevationVal) : 0;
		const color = (data.get("color") as string || "").trim();
		const floorsVal = data.get("floors");
		const floors = floorsVal ? Math.min(4, Math.max(1, Number(floorsVal))) : undefined;
		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : undefined;
		const yCoord = yCoordVal ? Number(yCoordVal) : undefined;

		if (!id) {
			return fail(400, { message: "Building ID is required." });
		}

		let parsedFootprint: [number, number][] | undefined = undefined;
		if (footprintRaw) {
			try {
				parsedFootprint = JSON.parse(footprintRaw);
			} catch (e) {
				return fail(400, { message: "Invalid footprint JSON data." });
			}
		}

		const updates: Record<string, unknown> = {
			footprint: parsedFootprint || null,
			elevation,
		};
		if (color) updates.color = color;
		if (floors !== undefined && floors > 0) updates.floors = floors;
		if (xCoord !== undefined) updates.xCoord = xCoord;
		if (yCoord !== undefined) updates.yCoord = yCoord;

		try {
			await updateLocalBuilding(id, updates, locals.supabase);
			return { success: true };
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : "Failed to update building footprint.";
			return fail(500, { message: msg });
		}
	},
};
