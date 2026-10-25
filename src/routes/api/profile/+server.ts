import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { uploadLocalImage } from "$lib/supabase";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user: authUser } = await locals.safeGetSession();
	const session = locals.session;

	if (!authUser && !session) {
		return json({ error: "Unauthorized session." }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const fullName = (formData.get("fullName") as string || "").trim();
		let avatarUrl = (formData.get("avatarUrl") as string || "").trim();
		const removeAvatar = formData.get("removeAvatar") === "true";
		const avatarFile = formData.get("avatarFile") as File | null;

		if (!fullName) {
			return json({ error: "Full Name cannot be empty." }, { status: 400 });
		}

		const userId = authUser?.id || "user";

		if (avatarFile && avatarFile.size > 0) {
			try {
				const buffer = await avatarFile.arrayBuffer();
				const fileExt = avatarFile.name.split(".").pop() || "png";
				const fileName = `avatars/${userId}_${Date.now()}.${fileExt}`;
				const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
				avatarUrl = await uploadLocalImage(buffer, fileName, avatarFile.type || "image/png", serviceRoleKey);
			} catch (uploadErr: any) {
				console.error("[API Profile] Failed to upload avatar to Supabase Storage:", uploadErr);
				return json({ error: `Avatar upload failed: ${uploadErr?.message || "Storage error"}` }, { status: 500 });
			}
		} else if (removeAvatar) {
			avatarUrl = "";
		}

		if (locals.supabase) {
			const { data: updated, error } = await locals.supabase.auth.updateUser({
				data: {
					full_name: fullName,
					avatar_url: avatarUrl
				}
			});

			if (error) {
				return json({ error: error.message }, { status: 400 });
			}

			return json({
				success: true,
				message: "Profile updated successfully!",
				user: updated.user,
				avatarUrl
			});
		}

		return json({
			success: true,
			message: "Profile updated locally.",
			avatarUrl
		});
	} catch (err: any) {
		console.error("[API Profile] Server error:", err);
		return json({ error: err?.message || "An unexpected error occurred while updating profile." }, { status: 500 });
	}
};
