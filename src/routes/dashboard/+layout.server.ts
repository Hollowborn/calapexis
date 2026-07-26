import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const path = url.pathname;

	// Enforce session check on dashboard layout root
	if (!session || !["admin", "security", "staff"].includes(session.role)) {
		throw redirect(303, `/login?error=unauthorized_dashboard&redirect=${encodeURIComponent(path)}`);
	}

	// Simulated email representation for profile tags
	const email = session.role === "admin" 
		? "admin@university.edu" 
		: (session.role === "security" ? "security@university.edu" : "staff@university.edu");

	return {
		role: session.role,
		email: email,
		assignedOfficeId: session.officeId || null
	};
};
