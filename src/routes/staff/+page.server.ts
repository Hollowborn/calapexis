import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const path = url.pathname;

	if (!session || !['staff', 'security', 'admin'].includes(session.role)) {
		throw redirect(303, `/login?error=unauthorized_staff&redirect=${encodeURIComponent(path)}`);
	}

	return {
		sessionRole: session.role,
		assignedOfficeId: session.officeId || null
	};
};
