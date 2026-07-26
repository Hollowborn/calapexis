import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce session and roles validation for Staff Desk
	if (!session || !["admin", "staff"].includes(session.role)) {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	return {
		assignedOfficeId: session.officeId || null
	};
};
