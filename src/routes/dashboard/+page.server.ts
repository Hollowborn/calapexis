import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const path = url.pathname;

	// Enforce session check on dashboard
	if (!session || !["admin", "security", "staff"].includes(session.role)) {
		throw redirect(303, `/login?error=unauthorized_dashboard&redirect=${encodeURIComponent(path)}`);
	}

	return {
		role: session.role,
		email: locals.sessionRole === "admin" ? "admin@university.edu" : (locals.sessionRole === "security" ? "security@university.edu" : "staff@university.edu"), // Simulated email representation
		assignedOfficeId: session.officeId || null
	};
};
