import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getLocalProfiles, addLocalProfile } from '$lib/supabase';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const sessionRole = cookies.get('session_role');
	const path = url.pathname;

	if (sessionRole !== 'admin') {
		throw redirect(303, `/login?error=unauthorized_admin&redirect=${encodeURIComponent(path)}`);
	}

	// Fetch all user profiles to render in accounts manager
	const profiles = (await getLocalProfiles()).map(({ password, ...profile }) => profile); // Exclude raw passwords from load payload

	return {
		profiles
	};
};

export const actions: Actions = {
	createUser: async ({ request }) => {
		const data = await request.formData();
		const email = (data.get('email') as string || '').trim();
		const password = data.get("password") as string;
		const role = data.get('role') as 'security' | 'staff';
		const officeId = data.get('officeId') as string;

		if (!email || !password || !role) {
			return fail(400, { message: 'All fields are required.' });
		}

		// Basic validation: Check if email (username) already exists
		const profiles = await getLocalProfiles();
		if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
			return fail(400, { message: 'Username is already taken.' });
		}

		if (role === 'staff' && !officeId) {
			return fail(400, { message: 'Office department binding is required for staff role.' });
		}

		// Provision user profile locally
		await addLocalProfile(email, role, password, role === 'staff' ? officeId : undefined);

		return { success: true };
	}
};
