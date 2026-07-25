import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionRole = cookies.get('session_role');

	if (sessionRole !== 'security' && sessionRole !== 'admin') {
		throw redirect(303, `/login?error=unauthorized_security&redirect=%2Fdashboard`);
	}

	throw redirect(303, '/dashboard');
};
