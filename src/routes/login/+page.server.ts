import { redirect, fail } from "@sveltejs/kit";
import {
  getLocalProfiles,
  supabase,
  isSupabaseConfigured,
} from "$lib/supabase";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const sessionRole = cookies.get("session_role");
  const error = url.searchParams.get("error");
  const logout = url.searchParams.get("logout");

  // If already logged in, redirect to respective portal
  if (sessionRole && !error) {
    throw redirect(303, "/dashboard");
  }

  return {
    error,
    logout,
  };
};

function setSessionCookies(
  cookies: any,
  role: string,
  roomId?: string | null,
) {
  cookies.set("session_role", role, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: false, // Set true in production with HTTPS
    maxAge: 60 * 60 * 24, // 1 day
  });

  if (roomId) {
    cookies.set("session_room_id", roomId, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 60 * 60 * 24,
    });
  } else {
    cookies.delete("session_room_id", { path: "/" });
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
    const username = ((data.get("username") as string) || "").trim();
    const password = data.get("password") as string;

    if (!username || !password) {
      return fail(400, { message: "Username and password are required." });
    }

    // Try logging in using Supabase Auth client if configured
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: username.includes("@")
            ? username
            : `${username}@calapexis.local`, // Format email if missing domain
          password: password,
        });

      if (!authError && authData.user) {
        // Sign-in succeeded. Get roles and department mappings from the profiles table
        let { data: profile, error: profileError } = await supabase
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

          const defaultRoomId = resolvedRole === "staff" ? "rm-105" : null;

          let insertResult = await supabase
            .from("profiles")
            .insert([
              {
                id: authData.user.id,
                email: username,
                role: resolvedRole,
                room_id: defaultRoomId,
              },
            ])
            .select()
            .maybeSingle();

          if (
            insertResult.error &&
            (insertResult.error.message.includes("room_id") ||
              insertResult.error.code === "P0002" ||
              insertResult.error.code === "42703")
          ) {
            // Fallback: Insert without room_id if the column doesn't exist yet
            console.warn(
              "room_id column not found in database, retrying insert without it",
            );
            insertResult = await supabase
              .from("profiles")
              .insert([
                {
                  id: authData.user.id,
                  email: username,
                  role: resolvedRole,
                },
              ])
              .select()
              .maybeSingle();
          }

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

        setSessionCookies(cookies, profile.role, profile.room_id);
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

  logout: async ({ cookies }) => {
    cookies.delete("session_role", { path: "/" });
    cookies.delete("session_room_id", { path: "/" });
    throw redirect(303, "/login?logout=success");
  },
};
