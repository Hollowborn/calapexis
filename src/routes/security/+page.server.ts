import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const sessionRole = cookies.get('session_role');
	const path = url.pathname;

	if (sessionRole !== 'security' && sessionRole !== 'admin') {
		throw redirect(303, `/login?error=unauthorized_security&redirect=${encodeURIComponent(path)}`);
	}
};
