import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getLocalProfiles, addLocalProfile, getLocalRooms, getLocalBuildings } from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [rooms, buildings] = await Promise.all([
		getLocalRooms(),
		getLocalBuildings()
	]);

	return {
		rooms,
		buildings
	};
};

export const actions: Actions = {
	createUser: async ({ request }) => {
		const data = await request.formData();
		const email = (data.get('email') as string || '').trim();
		const password = data.get("password") as string;
		const role = data.get('role') as 'security' | 'staff';
		const roomId = data.get('roomId') as string;

		if (!email || !password || !role) {
			return fail(400, { message: 'All fields are required.' });
		}

		// Basic validation: Check if email (username) already exists
		const profiles = await getLocalProfiles();
		if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
			return fail(400, { message: 'Username is already taken.' });
		}

		if (role === 'staff' && !roomId) {
			return fail(400, { message: 'Office room binding is required for staff role.' });
		}

		// Provision user profile locally
		try {
			const profile = await addLocalProfile(email, role, password, role === 'staff' ? roomId : undefined);
			return { success: true, newUserId: profile.id };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to provision system user account." });
		}
	}
};
