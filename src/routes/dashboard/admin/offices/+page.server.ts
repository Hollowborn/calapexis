import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { 
	getLocalOffices, 
	getLocalRooms, 
	addLocalOffice, 
	deleteLocalOffice, 
	addLocalRoom, 
	deleteLocalRoom 
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [offices, rooms] = await Promise.all([
		getLocalOffices(),
		getLocalRooms()
	]);

	return {
		offices,
		rooms
	};
};

export const actions: Actions = {
	createOffice: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get("name") as string || "").trim();
		const code = (data.get("code") as string || "").trim().toUpperCase();
		const building = (data.get("building") as string || "").trim();
		const floor = (data.get("floor") as string || "").trim();
		const description = (data.get("description") as string || "").trim();
		const headPerson = (data.get("headPerson") as string || "").trim();
		const contactEmail = (data.get("contactEmail") as string || "").trim();
		const color = (data.get("color") as string || "").trim();
		const imageUrl = (data.get("imageUrl") as string || "").trim();

		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : undefined;
		const yCoord = yCoordVal ? Number(yCoordVal) : undefined;

		if (!name || !code || !building || !floor) {
			return fail(400, { message: "Name, Code, Building, and Floor are required fields." });
		}

		try {
			await addLocalOffice({
				name,
				code,
				building,
				floor,
				description,
				headPerson: headPerson || undefined,
				contactEmail: contactEmail || undefined,
				xCoord,
				yCoord,
				color: color || undefined,
				imageUrl: imageUrl || undefined
			});
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to create office." });
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
			return fail(500, { message: error.message || "Failed to delete office." });
		}
	},

	createRoom: async ({ request }) => {
		const data = await request.formData();
		const officeId = data.get("officeId") as string;
		const roomNumber = (data.get("roomNumber") as string || "").trim();
		const roomName = (data.get("roomName") as string || "").trim();
		const building = (data.get("building") as string || "").trim();
		const floor = (data.get("floor") as string || "").trim();
		const description = (data.get("description") as string || "").trim();
		const imageUrl = (data.get("imageUrl") as string || "").trim();

		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : 0;
		const yCoord = yCoordVal ? Number(yCoordVal) : 0;

		if (!officeId || !roomNumber || !roomName || !building || !floor) {
			return fail(400, { message: "Office ID, Room Number, Room Name, Building, and Floor are required fields." });
		}

		try {
			await addLocalRoom({
				officeId,
				roomNumber,
				roomName,
				building,
				floor,
				xCoord,
				yCoord,
				description: description || undefined,
				imageUrl: imageUrl || undefined
			});
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to create room." });
		}
	},

	deleteRoom: async ({ request }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		if (!id) {
			return fail(400, { message: "Room ID is required for deletion." });
		}

		try {
			await deleteLocalRoom(id);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to delete room." });
		}
	}
};
