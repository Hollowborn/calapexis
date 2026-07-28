import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getLocalProfiles, addLocalProfile } from '$lib/supabase';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionRole = cookies.get('session_role');

	if (sessionRole !== 'admin') {
		throw redirect(303, `/login?error=unauthorized_admin&redirect=%2Fdashboard`);
	}

	throw redirect(303, '/dashboard');
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
			return fail(400, { message: 'Room office binding is required for staff role.' });
		}

		// Provision user profile locally
		await addLocalProfile(email, role, password, role === 'staff' ? roomId : undefined);

		return { success: true };
	}
};
