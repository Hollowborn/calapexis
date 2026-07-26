import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce admin-only access check
	if (!session || session.role !== "admin") {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	return {};
};
