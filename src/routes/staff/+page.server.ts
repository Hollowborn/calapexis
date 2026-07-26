import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	if (!session || !['staff', 'security', 'admin'].includes(session.role)) {
		throw redirect(303, `/login?error=unauthorized_staff&redirect=%2Fdashboard`);
	}

	throw redirect(303, '/dashboard');
};
