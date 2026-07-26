import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Session check is already validated at layout level, but verify role redirections
	if (session) {
		if (session.role === "security") {
			throw redirect(303, "/dashboard/security");
		}
		if (session.role === "staff") {
			throw redirect(303, "/dashboard/staff");
		}
		if (session.role !== "admin") {
			throw redirect(303, "/login?error=unauthorized_dashboard");
		}
	} else {
		throw redirect(303, "/login");
	}

	return {
		role: session.role
	};
};

