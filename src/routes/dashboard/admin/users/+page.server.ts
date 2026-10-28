import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { 
	getLocalProfiles, 
	addLocalProfile, 
	updateLocalProfile,
	toggleLocalProfileStatus,
	deleteLocalProfile,
	getLocalOffices,
	getLocalRooms, 
	getLocalBuildings 
} from "$lib/supabase";
import { supabaseAdmin } from "$lib/server/supabase";
import { validatePassword, validateEmailDomain } from "$lib/password-rules";

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
		const fullName = (data.get('fullName') as string || '').trim();

		if (!email || !password || !role) {
			return fail(400, { message: 'Username/Email, Password, and Role are required.' });
		}

		// Enforce allowed email domains (@gmail.com and @bisu.edu.ph)
		const emailCheck = validateEmailDomain(email);
		if (!emailCheck.isValid) {
			return fail(400, { message: emailCheck.errorMessage || 'Invalid email address or domain.' });
		}
		const normalizedEmail = emailCheck.normalizedEmail;

		const passwordCheck = validatePassword(password);
		if (!passwordCheck.isValid) {
			return fail(400, { message: passwordCheck.errorMessage || 'Invalid password.' });
		}

		// Check if username already exists
		const profiles = await getLocalProfiles(supabaseAdmin);
		if (profiles.some(p => p.email.toLowerCase() === normalizedEmail.toLowerCase())) {
			return fail(400, { message: 'An account with this email already exists.' });
		}

		if (role === 'staff' && !officeId) {
			return fail(400, { message: 'Check-in Office Desk binding is required for staff role.' });
		}

		try {
			const profile = await addLocalProfile(
				normalizedEmail, 
				role, 
				password, 
				role === 'staff' ? officeId : undefined,
				undefined,
				supabaseAdmin,
				fullName || undefined
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
		const role = data.get('role') as 'admin' | 'security' | 'staff';
		const officeId = (data.get('officeId') as string || '').trim();
		const fullName = (data.get('fullName') as string || '').trim();

		if (!id || !role) {
			return fail(400, { message: 'Account ID and Role are required.' });
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
			// Note: email is purposefully omitted from updates to keep email immutable
			await updateLocalProfile(
				id, 
				{
					role,
					officeId: role === 'staff' ? officeId : undefined,
					fullName: fullName || undefined
				},
				supabaseAdmin
			);
			const updatedProfiles = await getLocalProfiles(supabaseAdmin);
			return { success: true, profiles: updatedProfiles };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to update system user account." });
		}
	},

	toggleUserStatus: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const isActiveStr = data.get('isActive') as string;
		const isActive = isActiveStr === 'true' || isActiveStr === '1';

		if (!id) {
			return fail(400, { message: 'Account ID is required.' });
		}

		// Server-side protection check: Protect administrator accounts
		const profiles = await getLocalProfiles(supabaseAdmin);
		const targetProfile = profiles.find(p => p.id === id);
		if (targetProfile && targetProfile.role === 'admin') {
			return fail(403, { message: 'Administrator accounts are protected and cannot be archived or modified.' });
		}

		try {
			await toggleLocalProfileStatus(id, isActive, supabaseAdmin);
			const updatedProfiles = await getLocalProfiles(supabaseAdmin);
			return { success: true, profiles: updatedProfiles, isActive };
		} catch (error: any) {
			return fail(400, { message: error.message || `Failed to ${isActive ? 'restore' : 'archive'} user account.` });
		}
	},

	deleteUser: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;

		if (!id) {
			return fail(400, { message: 'Account ID is required.' });
		}

		// Server-side protection check: Protect administrator accounts
		const profiles = await getLocalProfiles(supabaseAdmin);
		const targetProfile = profiles.find(p => p.id === id);
		if (targetProfile && targetProfile.role === 'admin') {
			return fail(403, { message: 'Administrator accounts are protected and cannot be archived.' });
		}

		try {
			// Soft-archive instead of permanent destruction
			await toggleLocalProfileStatus(id, false, supabaseAdmin);
			const updatedProfiles = await getLocalProfiles(supabaseAdmin);
			return { success: true, profiles: updatedProfiles, isActive: false };
		} catch (error: any) {
			return fail(400, { message: error.message || "Failed to archive system user account." });
		}
	}
};
