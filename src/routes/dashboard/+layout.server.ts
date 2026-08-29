import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	const path = url.pathname;

	// Enforce session check on dashboard layout root
	if (!session || !["admin", "security", "staff"].includes(session.role)) {
		throw redirect(303, `/login?error=unauthorized_dashboard&redirect=${encodeURIComponent(path)}`);
	}

	const { user: authUser } = await locals.safeGetSession();

	let email = authUser?.email;
	let name = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name;
	let avatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;

	// If missing profile email, query profiles table as fallback
	if (authUser && !email && locals.supabase) {
		const { data: profile } = await locals.supabase
			.from("profiles")
			.select("email")
			.eq("id", authUser.id)
			.maybeSingle();

		if (profile?.email) {
			email = profile.email;
		}
	}

	// Default fallbacks based on session role
	if (!email) {
		email = session.role === "admin"
			? "admin@university.edu"
			: (session.role === "security" ? "security@university.edu" : "staff@university.edu");
	}

	if (!name) {
		name = session.role === "admin"
			? "Administrator"
			: (session.role === "security" ? "Security Personnel" : "Office Staff");
	}

	if (!avatar) {
		avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=ffffff&bold=true`;
	}

	return {
		role: session.role,
		email,
		name,
		avatar,
		officeId: session.officeId || null,
		assignedRoomId: session.roomId || null
	};
};
