import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Redirect security personnel to their gate console
	if (session) {
		if (session.role === "security") {
			throw redirect(303, "/dashboard/security");
		}
		if (session.role === "admin" || session.role === "staff") {
			let officeName: string | null = null;
			if (session.role === "staff" && session.officeId && locals.supabase) {
				const { data: office } = await locals.supabase
					.from("offices")
					.select("name, code")
					.eq("id", session.officeId)
					.maybeSingle();
				if (office?.name) {
					officeName = office.name;
				}
			}

			return {
				role: session.role,
				officeId: session.officeId || null,
				officeName
			};
		}
		throw redirect(303, "/login?error=unauthorized_dashboard");
	}

	throw redirect(303, "/login");
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { message: "Unauthorized session." });
		}

		const formData = await request.formData();
		const fullName = (formData.get("fullName") as string || "").trim();
		const avatarUrl = (formData.get("avatarUrl") as string || "").trim();

		if (!fullName) {
			return fail(400, { message: "Full Name cannot be empty." });
		}

		try {
			if (locals.supabase) {
				const { data: updated, error } = await locals.supabase.auth.updateUser({
					data: {
						full_name: fullName,
						avatar_url: avatarUrl
					}
				});

				if (error) {
					return fail(400, { message: error.message });
				}

				return { success: true, message: "Profile updated successfully!", user: updated.user };
			}

			return { success: true, message: "Profile details updated locally." };
		} catch (err: any) {
			return fail(500, { message: err?.message || "An error occurred while updating profile." });
		}
	},

	updatePassword: async ({ request, locals }) => {
		const session = locals.session;
		if (!session) {
			return fail(401, { message: "Unauthorized session." });
		}

		const formData = await request.formData();
		const newPassword = (formData.get("newPassword") as string || "");
		const confirmPassword = (formData.get("confirmPassword") as string || "");

		if (!newPassword || newPassword.length < 6) {
			return fail(400, { message: "Password must be at least 6 characters long." });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: "New password and confirmation password do not match." });
		}

		try {
			if (locals.supabase) {
				const { error } = await locals.supabase.auth.updateUser({
					password: newPassword
				});

				if (error) {
					return fail(400, { message: error.message });
				}

				return { success: true, message: "Password updated successfully!" };
			}

			return { success: true, message: "Password updated locally." };
		} catch (err: any) {
			return fail(500, { message: err?.message || "An error occurred while updating password." });
		}
	}
};
