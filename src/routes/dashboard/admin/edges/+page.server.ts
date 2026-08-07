import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
	getLocalBuildings,
	getLocalMapEdges,
	addLocalMapEdge,
	updateLocalMapEdge,
	deleteLocalMapEdge
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [buildings, mapEdges] = await Promise.all([
		getLocalBuildings(locals.supabase),
		getLocalMapEdges(locals.supabase)
	]);

	return {
		buildings,
		mapEdges
	};
};

export const actions: Actions = {
	createEdge: async ({ request, locals }) => {
		const data = await request.formData();
		const fromNode = (data.get("fromNode") as string || "").trim();
		const toNode = (data.get("toNode") as string || "").trim();
		const pathRaw = (data.get("path") as string || "").trim();

		if (!fromNode || !toNode || !pathRaw) {
			return fail(400, { message: "From Node, To Node, and Path coordinates are required." });
		}

		let parsedPath: [number, number][] = [];
		try {
			parsedPath = JSON.parse(pathRaw);
			if (!Array.isArray(parsedPath) || parsedPath.length < 2) {
				return fail(400, { message: "Path must contain at least 2 coordinate points." });
			}
		} catch (e) {
			return fail(400, { message: "Invalid path JSON payload format." });
		}

		try {
			await addLocalMapEdge({
				fromNode,
				toNode,
				path: parsedPath
			}, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to create map edge pathway." });
		}
	},

	updateEdge: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;
		const fromNode = (data.get("fromNode") as string || "").trim();
		const toNode = (data.get("toNode") as string || "").trim();
		const pathRaw = (data.get("path") as string || "").trim();

		if (!id || !fromNode || !toNode || !pathRaw) {
			return fail(400, { message: "Edge ID, From Node, To Node, and Path coordinates are required." });
		}

		let parsedPath: [number, number][] = [];
		try {
			parsedPath = JSON.parse(pathRaw);
			if (!Array.isArray(parsedPath) || parsedPath.length < 2) {
				return fail(400, { message: "Path must contain at least 2 coordinate points." });
			}
		} catch (e) {
			return fail(400, { message: "Invalid path JSON payload format." });
		}

		try {
			await updateLocalMapEdge(id, {
				fromNode,
				toNode,
				path: parsedPath
			}, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to update map edge pathway." });
		}
	},

	deleteEdge: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		if (!id) {
			return fail(400, { message: "Edge ID is required for deletion." });
		}

		try {
			await deleteLocalMapEdge(id, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to delete map edge pathway." });
		}
	}
};
