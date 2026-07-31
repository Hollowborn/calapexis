import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { 
	addLocalVisitor, 
	checkoutLocalVisitor, 
	getLocalBuildings, 
	getLocalRooms 
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce session and roles validation for Staff Desk
	if (!session || !["admin", "staff"].includes(session.role)) {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	return {
		assignedRoomId: session.roomId || null
	};
};

export const actions: Actions = {
	checkInVisitor: async ({ request }) => {
		const data = await request.formData();
		const fullName = (data.get("fullName") as string || "").trim();
		const email = (data.get("email") as string || "").trim();
		const phone = (data.get("phone") as string || "").trim();
		const purpose = (data.get("purpose") as string || "").trim();
		const buildingId = data.get("buildingId") as string;
		const roomId = (data.get("roomId") as string || "").trim();
		const hostPerson = (data.get("hostPerson") as string || "").trim();

		if (!fullName || !buildingId || !purpose) {
			return fail(400, { message: "Visitor Full Name, Building, and Purpose are required." });
		}

		const [buildings, rooms] = await Promise.all([
			getLocalBuildings(),
			getLocalRooms()
		]);

		const targetBuilding = buildings.find(b => b.id === buildingId);
		const targetRoom = rooms.find(r => r.id === roomId);

		const parts = fullName.trim().split(/\s+/);
		const firstName = parts[0] || '';
		const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
		const middleName = parts.length > 2 ? parts.slice(1, parts.length - 1).join(' ') : '';

		try {
			const visitor = await addLocalVisitor({
				fullName,
				firstName,
				middleName,
				lastName,
				email: email || 'walkin@campus.visitor',
				phone: phone || 'No Mobile Phone',
				purpose,
				buildingId,
				buildingName: targetBuilding?.name,
				roomId: roomId || undefined,
				roomNumber: targetRoom?.roomNumber || undefined,
				hostPerson: hostPerson || targetBuilding?.headPerson,
				verificationStatus: 'approved'
			});
			return { success: true, visitor };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to register visitor check-in." });
		}
	},

	checkOutVisitor: async ({ request }) => {
		const data = await request.formData();
		const idOrPassCode = (data.get("idOrPassCode") as string || "").trim();

		if (!idOrPassCode) {
			return fail(400, { message: "Visitor Pass Code or ID is required for check-out." });
		}

		try {
			const updated = await checkoutLocalVisitor(idOrPassCode);
			if (!updated) {
				return fail(404, { message: "Visitor pass code not found or already checked out." });
			}
			return { success: true, visitor: updated };
		} catch (error: any) {
			return fail(500, { message: error.message || "Failed to check out visitor." });
		}
	}
};
