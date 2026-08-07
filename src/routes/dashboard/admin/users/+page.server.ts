import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { 
	getLocalProfiles, 
	addLocalProfile, 
	updateLocalProfile,
	deleteLocalProfile,
	getLocalOffices,
	getLocalRooms, 
	getLocalBuildings 
} from "$lib/supabase";
import { supabaseAdmin } from "$lib/server/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [profiles, offices, rooms, buildings] = await Promise.all([
		getLocalProfiles(supabaseAdmin),
		getLocalOffices(),
		getLocalRooms(),
		getLocalBuildings()
	]);

	return {
		profiles,
		offices,
		rooms,
		buildings
	};
};

export const actions: Actions = {
	createUser: async ({ request }) => {
		const data = await request.formData();
		const email = (data.get('email') as string || '').trim();
		const password = data.get("password") as string;
		const role = data.get('role') as 'admin' | 'security' | 'staff';
		const officeId = (data.get('officeId') as string || '').trim();

		if (!email || !password || !role) {
			return fail(400, { message: 'Username/Email, Password, and Role are required.' });
		}

		if (password.length < 6) {
			return fail(400, { message: 'Password must be at least 6 characters long for Supabase Auth.' });
		}

		// Check if username already exists
		const profiles = await getLocalProfiles(supabaseAdmin);
		if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
			return fail(400, { message: 'Username is already taken.' });
		}

		if (role === 'staff' && !officeId) {
			return fail(400, { message: 'Check-in Office Desk binding is required for staff role.' });
		}

		try {
			const profile = await addLocalProfile(
				email, 
				role, 
				password, 
				role === 'staff' ? officeId : undefined,
				undefined,
				supabaseAdmin
			);
			const updatedProfiles = await getLocalProfiles(supabaseAdmin);
			return { success: true, newUserId: profile.id, profiles: updatedProfiles };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to provision system user account." });
		}
	},

	updateUser: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const email = (data.get('email') as string || '').trim();
		const role = data.get('role') as 'admin' | 'security' | 'staff';
		const officeId = (data.get('officeId') as string || '').trim();

		if (!id || !email || !role) {
			return fail(400, { message: 'Account ID, Username/Email, and Role are required.' });
		}

		// Server-side protection check: Protect administrator accounts
		const profiles = await getLocalProfiles(supabaseAdmin);
		const targetProfile = profiles.find(p => p.id === id);
		if (targetProfile && targetProfile.role === 'admin') {
			return fail(403, { message: 'Administrator accounts are protected and cannot be modified.' });
		}

		if (role === 'staff' && !officeId) {
			return fail(400, { message: 'Check-in Office Desk binding is required for staff role.' });
		}

		try {
			await updateLocalProfile(
				id, 
				{
					email,
					role,
					officeId: role === 'staff' ? officeId : undefined
				},
				supabaseAdmin
			);
			const updatedProfiles = await getLocalProfiles(supabaseAdmin);
			return { success: true, profiles: updatedProfiles };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to update system user account." });
		}
	},

	deleteUser: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) {
			return fail(400, { message: 'Account ID is required for deletion.' });
		}

		// Server-side protection check: Protect administrator accounts
		const profiles = await getLocalProfiles(supabaseAdmin);
		const targetProfile = profiles.find(p => p.id === id);
		if (targetProfile && targetProfile.role === 'admin') {
			return fail(403, { message: 'Administrator accounts are protected and cannot be deleted.' });
		}

		try {
			await deleteLocalProfile(id, supabaseAdmin);
			const updatedProfiles = await getLocalProfiles(supabaseAdmin);
			return { success: true, profiles: updatedProfiles };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to delete system user account." });
		}
	}
};
