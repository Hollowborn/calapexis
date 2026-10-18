import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	return {
		hasServerSession: !!session,
		userEmail: user?.email || ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const password = (data.get('password') as string) || '';
		const confirmPassword = (data.get('confirmPassword') as string) || '';

		if (!password || password.length < 6) {
			return fail(400, { message: 'Password must be at least 6 characters long.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		if (locals.supabase) {
			const { error } = await locals.supabase.auth.updateUser({ password });
			if (error) {
				return fail(400, { message: error.message });
			}
			return { success: true };
		}

		return fail(500, { message: 'Authentication service unavailable.' });
	}
};
