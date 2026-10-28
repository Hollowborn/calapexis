import { redirect, fail } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { uploadLocalImage } from "$lib/supabase";
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
		let avatarUrl = (formData.get("avatarUrl") as string || "").trim();
		const removeAvatar = formData.get("removeAvatar") === "true";
		const avatarFile = formData.get("avatarFile") as File | null;

		if (!fullName) {
			return fail(400, { message: "Full Name cannot be empty." });
		}

		const { user: authUser } = await locals.safeGetSession();
		const userId = authUser?.id || "user";

		if (avatarFile && avatarFile.size > 0) {
			try {
				const buffer = await avatarFile.arrayBuffer();
				const fileExt = avatarFile.name.split('.').pop() || "png";
				const fileName = `avatars/${userId}_${Date.now()}.${fileExt}`;
				const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
				avatarUrl = await uploadLocalImage(buffer, fileName, avatarFile.type || "image/png", serviceRoleKey);
			} catch (uploadErr: any) {
				console.error("Failed to upload avatar to Supabase Storage:", uploadErr);
				return fail(500, { message: `Avatar upload failed: ${uploadErr?.message || "Storage error"}` });
			}
		} else if (removeAvatar) {
			avatarUrl = "";
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

				return { success: true, message: "Profile updated successfully!", user: updated.user, avatarUrl };
			}

			return { success: true, message: "Profile details updated locally.", avatarUrl };
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
