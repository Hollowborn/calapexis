import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
	getLocalBuildings,
	getLocalRooms,
	getLocalOffices,
	addLocalOffice,
	updateLocalOffice,
	deleteLocalOffice
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [buildings, rooms, offices] = await Promise.all([
		getLocalBuildings(),
		getLocalRooms(),
		getLocalOffices()
	]);

	return {
		buildings,
		rooms,
		offices
	};
};

export const actions: Actions = {
	createOffice: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get("name") as string || "").trim();
		const code = (data.get("code") as string || "").trim().toUpperCase();
		const buildingId = data.get("buildingId") as string;
		const roomId = (data.get("roomId") as string || "").trim();
		const headPerson = (data.get("headPerson") as string || "").trim();
		const contactEmail = (data.get("contactEmail") as string || "").trim();
		const operatingHours = (data.get("operatingHours") as string || "").trim();
		const description = (data.get("description") as string || "").trim();

		if (!name || !code || !buildingId) {
			return fail(400, { message: "Office Name, Code, and Building are required." });
		}

		try {
			await addLocalOffice({
				name,
				code,
				buildingId,
				roomId: roomId || undefined,
				headPerson: headPerson || undefined,
				contactEmail: contactEmail || undefined,
				operatingHours: operatingHours || undefined,
				description: description || undefined,
				isActive: true
			});
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to create office desk." });
		}
	},

	updateOffice: async ({ request }) => {
		const data = await request.formData();
		const id = data.get("id") as string;
		const name = (data.get("name") as string || "").trim();
		const code = (data.get("code") as string || "").trim().toUpperCase();
		const buildingId = data.get("buildingId") as string;
		const roomId = (data.get("roomId") as string || "").trim();
		const headPerson = (data.get("headPerson") as string || "").trim();
		const contactEmail = (data.get("contactEmail") as string || "").trim();
		const operatingHours = (data.get("operatingHours") as string || "").trim();
		const description = (data.get("description") as string || "").trim();
		const isActive = data.get("isActive") === "true";

		if (!id || !name || !code || !buildingId) {
			return fail(400, { message: "ID, Office Name, Code, and Building are required." });
		}

		try {
			await updateLocalOffice(id, {
				name,
				code,
				buildingId,
				roomId: roomId || undefined,
				headPerson: headPerson || undefined,
				contactEmail: contactEmail || undefined,
				operatingHours: operatingHours || undefined,
				description: description || undefined,
				isActive
			});
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to update office desk." });
		}
	},

	deleteOffice: async ({ request }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		if (!id) {
			return fail(400, { message: "Office ID is required for deletion." });
		}

		try {
			await deleteLocalOffice(id);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to delete office desk." });
		}
	}
};
