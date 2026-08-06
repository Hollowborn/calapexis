import { redirect, fail } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import type { PageServerLoad, Actions } from "./$types";
import { 
	getLocalBuildings, 
	getLocalRooms, 
	addLocalBuilding, 
	updateLocalBuilding,
	deleteLocalBuilding, 
	addLocalRoom, 
	updateLocalRoom,
	deleteLocalRoom,
	uploadLocalImage
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [buildings, rooms] = await Promise.all([
		getLocalBuildings(locals.supabase),
		getLocalRooms(locals.supabase)
	]);

	return {
		buildings,
		rooms
	};
};

export const actions: Actions = {
	createBuilding: async ({ request, locals }) => {
		const data = await request.formData();
		const name = (data.get("name") as string || "").trim();
		const code = (data.get("code") as string || "").trim().toUpperCase();
		const floorsVal = data.get("floors");
		const floors = floorsVal ? Number(floorsVal) : 1;
		const description = (data.get("description") as string || "").trim();
		const headPerson = (data.get("headPerson") as string || "").trim();
		const contactEmail = (data.get("contactEmail") as string || "").trim();
		const color = (data.get("color") as string || "").trim();
		const imageUrl = (data.get("imageUrl") as string || "").trim();

		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : undefined;
		const yCoord = yCoordVal ? Number(yCoordVal) : undefined;

		if (!name || !code || floors < 1) {
			return fail(400, { message: "Name, Code, and Floors are required fields." });
		}

		let finalImageUrl = imageUrl;
		const buildingImage = data.get("buildingImage") as File;
		if (buildingImage && buildingImage.size > 0) {
			try {
				const buffer = await buildingImage.arrayBuffer();
				const fileExt = buildingImage.name.split('.').pop();
				const fileName = `building-images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
				const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
				finalImageUrl = await uploadLocalImage(buffer, fileName, buildingImage.type, serviceRoleKey);
			} catch (uploadError: any) {
				console.error("Server-side building image upload error:", uploadError);
				return fail(500, { message: "Failed to upload image: " + uploadError.message });
			}
		}

		try {
			await addLocalBuilding({
				name,
				code,
				floors,
				description,
				headPerson: headPerson || undefined,
				contactEmail: contactEmail || undefined,
				xCoord,
				yCoord,
				color: color || undefined,
				imageUrl: finalImageUrl || undefined
			}, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to create building." });
		}
	},

	updateBuilding: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;
		const name = (data.get("name") as string || "").trim();
		const code = (data.get("code") as string || "").trim().toUpperCase();
		const floorsVal = data.get("floors");
		const floors = floorsVal ? Number(floorsVal) : 1;
		const description = (data.get("description") as string || "").trim();
		const headPerson = (data.get("headPerson") as string || "").trim();
		const contactEmail = (data.get("contactEmail") as string || "").trim();
		const color = (data.get("color") as string || "").trim();
		const imageUrl = (data.get("imageUrl") as string || "").trim();

		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : undefined;
		const yCoord = yCoordVal ? Number(yCoordVal) : undefined;

		if (!id || !name || !code || floors < 1) {
			return fail(400, { message: "ID, Name, Code, and Floors are required fields." });
		}

		let finalImageUrl = imageUrl;
		const editBuildingImage = data.get("editBuildingImage") as File;
		const keepExistingImage = data.get("keepExistingImage") === "true";

		if (editBuildingImage && editBuildingImage.size > 0) {
			try {
				const buffer = await editBuildingImage.arrayBuffer();
				const fileExt = editBuildingImage.name.split('.').pop();
				const fileName = `building-images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
				const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
				finalImageUrl = await uploadLocalImage(buffer, fileName, editBuildingImage.type, serviceRoleKey);
			} catch (uploadError: any) {
				console.error("Server-side edit building image upload error:", uploadError);
				return fail(500, { message: "Failed to upload image: " + uploadError.message });
			}
		} else if (!keepExistingImage) {
			finalImageUrl = "";
		}

		try {
			await updateLocalBuilding(id, {
				name,
				code,
				floors,
				description,
				headPerson: headPerson || undefined,
				contactEmail: contactEmail || undefined,
				xCoord,
				yCoord,
				color: color || undefined,
				imageUrl: finalImageUrl || undefined
			}, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to update building." });
		}
	},

	deleteBuilding: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		if (!id) {
			return fail(400, { message: "Building ID is required for deletion." });
		}

		try {
			await deleteLocalBuilding(id, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to delete building." });
		}
	},

	createRoom: async ({ request, locals }) => {
		const data = await request.formData();
		const buildingId = data.get("buildingId") as string;
		const roomNumber = (data.get("roomNumber") as string || "").trim();
		const roomName = (data.get("roomName") as string || "").trim();
		const floor = (data.get("floor") as string || "").trim();
		const description = (data.get("description") as string || "").trim();
		const imageUrl = (data.get("imageUrl") as string || "").trim();

		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : 0;
		const yCoord = yCoordVal ? Number(yCoordVal) : 0;

		if (!buildingId || !roomNumber || !roomName || !floor) {
			return fail(400, { message: "Building ID, Room Number, Room Name, and Floor are required fields." });
		}

		let finalImageUrl = imageUrl;
		const roomImage = data.get("roomImage") as File;
		if (roomImage && roomImage.size > 0) {
			try {
				const buffer = await roomImage.arrayBuffer();
				const fileExt = roomImage.name.split('.').pop();
				const fileName = `room-images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
				const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
				finalImageUrl = await uploadLocalImage(buffer, fileName, roomImage.type, serviceRoleKey);
			} catch (uploadError: any) {
				console.error("Server-side room image upload error:", uploadError);
				return fail(500, { message: "Failed to upload image: " + uploadError.message });
			}
		}

		try {
			await addLocalRoom({
				buildingId,
				roomNumber,
				roomName,
				floor,
				xCoord,
				yCoord,
				description: description || undefined,
				imageUrl: finalImageUrl || undefined
			}, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to create room." });
		}
	},

	deleteRoom: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;

		if (!id) {
			return fail(400, { message: "Room ID is required for deletion." });
		}

		try {
			await deleteLocalRoom(id, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to delete room." });
		}
	},

	updateRoom: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get("id") as string;
		const roomNumber = (data.get("roomNumber") as string || "").trim();
		const roomName = (data.get("roomName") as string || "").trim();
		const floor = (data.get("floor") as string || "").trim();
		const description = (data.get("description") as string || "").trim();
		const imageUrl = (data.get("imageUrl") as string || "").trim();

		const xCoordVal = data.get("xCoord");
		const yCoordVal = data.get("yCoord");
		const xCoord = xCoordVal ? Number(xCoordVal) : 0;
		const yCoord = yCoordVal ? Number(yCoordVal) : 0;

		if (!id || !roomNumber || !roomName || !floor) {
			return fail(400, { message: "Room ID, Room Number, Room Name, and Floor are required fields." });
		}

		let finalImageUrl = imageUrl;
		const editRoomImage = data.get("editRoomImage") as File;
		const keepExistingImage = data.get("keepExistingImage") === "true";

		if (editRoomImage && editRoomImage.size > 0) {
			try {
				const buffer = await editRoomImage.arrayBuffer();
				const fileExt = editRoomImage.name.split('.').pop();
				const fileName = `room-images/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
				const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
				finalImageUrl = await uploadLocalImage(buffer, fileName, editRoomImage.type, serviceRoleKey);
			} catch (uploadError: any) {
				console.error("Server-side edit room image upload error:", uploadError);
				return fail(500, { message: "Failed to upload image: " + uploadError.message });
			}
		} else if (!keepExistingImage) {
			finalImageUrl = "";
		}

		try {
			await updateLocalRoom(id, {
				roomNumber,
				roomName,
				floor,
				xCoord,
				yCoord,
				description: description || undefined,
				imageUrl: finalImageUrl || undefined
			}, locals.supabase);
			return { success: true };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to update room." });
		}
	}
};
