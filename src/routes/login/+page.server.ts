import { redirect, fail } from "@sveltejs/kit";
import { getLocalProfiles, supabase, isSupabaseConfigured } from "$lib/supabase";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
	const sessionRole = cookies.get("session_role");
	const error = url.searchParams.get("error");

	// If already logged in, redirect to respective portal
	if (sessionRole && !error) {
		if (sessionRole === "admin") throw redirect(303, "/admin");
		if (sessionRole === "security") throw redirect(303, "/security");
		if (sessionRole === "staff") throw redirect(303, "/staff");
	}

	return {
		error,
	};
};

function setSessionCookies(cookies: any, role: string, officeId?: string | null) {
	cookies.set("session_role", role, {
		path: "/",
		httpOnly: true,
		sameSite: "strict",
		secure: false, // Set true in production with HTTPS
		maxAge: 60 * 60 * 24, // 1 day
	});

	if (officeId) {
		cookies.set("session_office_id", officeId, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: false,
			maxAge: 60 * 60 * 24,
		});
	} else {
		cookies.delete("session_office_id", { path: "/" });
	}
}

function getRedirectUrl(role: string, url: URL): string {
	const redirectUrl = url.searchParams.get("redirect");
	if (redirectUrl) {
		return decodeURIComponent(redirectUrl);
	}
	if (role === "admin") return "/admin";
	if (role === "security") return "/security";
	return "/staff";
}

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const username = (data.get("username") as string || "").trim();
		const password = data.get("password") as string;

		if (!username || !password) {
			return fail(400, { message: "Username and password are required." });
		}

		// Try logging in using Supabase Auth client if configured
		if (isSupabaseConfigured && supabase) {
			const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
				email: username.includes("@") ? username : `${username}@calapexis.local`, // Format email if missing domain
				password: password
			});

			if (!authError && authData.user) {
				// Sign-in succeeded. Get roles and department mappings from the profiles table
				const { data: profile, error: profileError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", authData.user.id)
					.single();

				if (profileError || !profile) {
					return fail(400, { message: "Access profile role mapping not configured." });
				}

				setSessionCookies(cookies, profile.role, profile.office_id);
				throw redirect(303, getRedirectUrl(profile.role, url));
			}

			// If auth fails, try checking mock profiles fallback (e.g. for offline local dev support)
			const profiles = await getLocalProfiles();
			const mockProfile = profiles.find(p => p.email.toLowerCase() === username.toLowerCase());
			if (mockProfile && mockProfile.password === password) {
				setSessionCookies(cookies, mockProfile.role, mockProfile.officeId);
				throw redirect(303, getRedirectUrl(mockProfile.role, url));
			}

			return fail(400, { message: authError?.message || "Invalid account credentials." });
		}

		// Offline fallback lookup in mock localProfilesStore database
		const profiles = await getLocalProfiles();
		const userProfile = profiles.find(p => p.email.toLowerCase() === username.toLowerCase());

		if (!userProfile) {
			return fail(400, { message: "Account username unrecognized." });
		}

		if (userProfile.password !== password) {
			return fail(400, { message: "Invalid password." });
		}

		setSessionCookies(cookies, userProfile.role, userProfile.officeId);
		throw redirect(303, getRedirectUrl(userProfile.role, url));
	},

	logout: async ({ cookies }) => {
		cookies.delete("session_role", { path: "/" });
		cookies.delete("session_office_id", { path: "/" });
		throw redirect(303, "/login");
	},
};
