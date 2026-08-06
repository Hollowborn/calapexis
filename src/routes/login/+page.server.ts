import { redirect, fail } from "@sveltejs/kit";
import {
  getLocalProfiles,
  supabase,
  isSupabaseConfigured,
} from "$lib/supabase";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const error = url.searchParams.get("error");
  const logout = url.searchParams.get("logout");
  const login = url.searchParams.get("login");

  const sessionRole = cookies.get("session_role");

  // If already logged in with valid session cookie, redirect to dashboard
  if (sessionRole && !error) {
    throw redirect(303, "/dashboard");
  }

  return {
    error,
    logout,
    login,
  };
};

function setSessionCookies(cookies: any, role: string, officeId?: string | null) {
  cookies.set("session_role", role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // Set true in production with HTTPS
    maxAge: 60 * 60 * 24, // 1 day
  });

  if (officeId) {
    cookies.set("session_office_id", officeId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 24,
    });
    cookies.set("session_room_id", officeId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 24,
    });
  } else {
    cookies.delete("session_office_id", { path: "/" });
    cookies.delete("session_room_id", { path: "/" });
  }
}

function getRedirectUrl(role: string, url: URL): string {
  const redirectUrl = url.searchParams.get("redirect");
  if (redirectUrl) {
    const decoded = decodeURIComponent(redirectUrl);
    return `${decoded}${decoded.includes("?") ? "&" : "?"}login=success`;
  }
  if (role === "admin") return "/dashboard?login=success";
  if (role === "security") return "/dashboard/security?login=success";
  return "/dashboard/staff?login=success";
}

export const actions: Actions = {
  login: async ({ request, cookies, url, locals }) => {
    const data = await request.formData();
    const username = ((data.get("username") as string) || "").trim();
    const password = data.get("password") as string;

    if (!username || !password) {
      return fail(400, { message: "Username and password are required." });
    }

    const formattedEmail = username.includes("@")
      ? username
      : `${username}@bisu.edu.ph`;

    // Try logging in using per-request Supabase Auth client (via @supabase/ssr)
    if (locals.supabase) {
      const { data: authData, error: authError } =
        await locals.supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: password,
        });

      if (!authError && authData.user) {
        // Sign-in succeeded. Get roles and department mappings from the profiles table
        let { data: profile, error: profileError } = await locals.supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("Error checking user profile table:", profileError);
        }

        if (!profile) {
          // Auto-provision profile mapping if missing in public.profiles table
          let resolvedRole: "admin" | "security" | "staff" = "staff";
          const namePart = username.split("@")[0].toLowerCase();
          if (namePart.includes("admin")) {
            resolvedRole = "admin";
          } else if (
            namePart.includes("security") ||
            namePart.includes("guard")
          ) {
            resolvedRole = "security";
          }

          let insertResult = await locals.supabase
            .from("profiles")
            .insert([
              {
                id: authData.user.id,
                email: formattedEmail,
                role: resolvedRole,
              },
            ])
            .select()
            .maybeSingle();

          if (insertResult.error || !insertResult.data) {
            console.error(
              "Failed to auto-provision profile on login:",
              insertResult.error,
            );
            return fail(400, {
              message:
                "Access profile role mapping not configured and auto-provisioning failed.",
            });
          }
          profile = insertResult.data;
        }

        setSessionCookies(cookies, profile.role, profile.room_id || profile.office_id);
        throw redirect(303, getRedirectUrl(profile.role, url));
      }


      // If auth fails, try checking mock profiles fallback (e.g. for offline local dev support)
      const profiles = await getLocalProfiles();
      const mockProfile = profiles.find(
        (p) => p.email.toLowerCase() === username.toLowerCase(),
      );
      if (mockProfile && mockProfile.password === password) {
        setSessionCookies(cookies, mockProfile.role, mockProfile.roomId);
        throw redirect(303, getRedirectUrl(mockProfile.role, url));
      }

      return fail(400, {
        message: authError?.message || "Invalid account credentials.",
      });
    }

    // Offline fallback lookup in mock localProfilesStore database
    const profiles = await getLocalProfiles();
    const userProfile = profiles.find(
      (p) => p.email.toLowerCase() === username.toLowerCase(),
    );

    if (!userProfile) {
      return fail(400, { message: "Account username unrecognized." });
    }

    if (userProfile.password !== password) {
      return fail(400, { message: "Invalid password." });
    }

    setSessionCookies(cookies, userProfile.role, userProfile.roomId);
    throw redirect(303, getRedirectUrl(userProfile.role, url));
  },

  logout: async ({ cookies, locals }) => {
    if (locals.supabase) {
      await locals.supabase.auth.signOut();
    }
    cookies.delete("session_role", { path: "/" });
    cookies.delete("session_office_id", { path: "/" });
    cookies.delete("session_room_id", { path: "/" });
    throw redirect(303, "/login?logout=success");
  },
};

