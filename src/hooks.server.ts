import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	const sessionRole = event.cookies.get("session_role");
	const sessionOfficeId = event.cookies.get("session_office_id");
	const path = event.url.pathname;

	// Populate server execution context session
	if (sessionRole) {
		event.locals.session = {
			role: sessionRole,
			officeId: sessionOfficeId
		};
	}

	// Protect Admin routes (Only 'admin' role allowed)
	if (path.startsWith('/admin')) {
		if (sessionRole !== 'admin') {
			throw redirect(303, `/login?error=unauthorized_admin&redirect=${encodeURIComponent(path)}`);
		}
	}

	// Protect Security routes ('security' and 'admin' allowed)
	if (path.startsWith('/security')) {
		if (sessionRole !== 'security' && sessionRole !== 'admin') {
			throw redirect(303, `/login?error=unauthorized_security&redirect=${encodeURIComponent(path)}`);
		}
	}

	// Protect Staff routes ('staff', 'security', and 'admin' allowed)
	if (path.startsWith('/staff')) {
		if (!sessionRole || !['staff', 'security', 'admin'].includes(sessionRole)) {
			throw redirect(303, `/login?error=unauthorized_staff&redirect=${encodeURIComponent(path)}`);
		}
	}

	event.locals.sessionRole = sessionRole;

	return await resolve(event);
};
