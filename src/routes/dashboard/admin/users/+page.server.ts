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

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	const [offices, rooms, buildings] = await Promise.all([
		getLocalOffices(),
		getLocalRooms(),
		getLocalBuildings()
	]);

	return {
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

		// Check if username already exists
		const profiles = await getLocalProfiles();
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
				role === 'staff' ? officeId : undefined
			);
			return { success: true, newUserId: profile.id };
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

		if (role === 'staff' && !officeId) {
			return fail(400, { message: 'Check-in Office Desk binding is required for staff role.' });
		}

		try {
			await updateLocalProfile(id, {
				email,
				role,
				officeId: role === 'staff' ? officeId : undefined
			});
			return { success: true };
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

		try {
			await deleteLocalProfile(id);
			return { success: true };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to delete system user account." });
		}
	}
};
