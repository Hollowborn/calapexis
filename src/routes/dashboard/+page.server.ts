import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const session = locals.session;

  // Redirect non-admin roles to their respective portals
  if (session) {
    if (session.role === "security") {
      throw redirect(303, "/dashboard/security");
    }
    if (session.role === "staff") {
      throw redirect(303, "/dashboard/staff");
    }
    if (session.role === "admin") {
      // /dashboard IS the Admin Dashboard page — do not redirect!

      return {
        role: session.role,
      };
    }
    throw redirect(303, "/login?error=unauthorized_dashboard");
  }

  throw redirect(303, "/login");
};
