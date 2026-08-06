import { redirect } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit";
import { createServerClient } from "@supabase/ssr";
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} from "$env/static/public";

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize per-request Supabase server client using @supabase/ssr
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: "/", sameSite: "lax" });
          });
        },
      },
    },
  );

  // Helper function to safely retrieve and validate Supabase auth session
  event.locals.safeGetSession = async () => {
    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();

    if (error || !user) {
      return { session: null, user: null };
    }

    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();

    return { session, user };
  };

  const sessionRole = event.cookies.get("session_role");
  const sessionOfficeId =
    event.cookies.get("session_office_id") ||
    event.cookies.get("session_room_id");
  const path = event.url.pathname;

  // Populate server execution context session
  if (sessionRole) {
    event.locals.session = {
      role: sessionRole,
      officeId: sessionOfficeId,
      roomId: sessionOfficeId,
    };
  }
  event.locals.sessionRole = sessionRole;

  // Protect Admin routes (Only 'admin' role allowed for /dashboard/admin sub-routes)
  if (path.startsWith("/dashboard/admin")) {
    if (sessionRole !== "admin") {
      if (sessionRole === "security") {
        throw redirect(303, "/dashboard/security?error=unauthorized_role");
      }
      if (sessionRole === "staff") {
        throw redirect(303, "/dashboard/staff?error=unauthorized_role");
      }
      throw redirect(
        303,
        `/login?error=unauthorized_admin&redirect=${encodeURIComponent(path)}`,
      );
    }
  }

  // Protect Security routes ('security' and 'admin' allowed)
  if (path.startsWith("/dashboard/security")) {
    if (sessionRole !== "security" && sessionRole !== "admin") {
      if (sessionRole === "staff") {
        throw redirect(303, "/dashboard/staff?error=unauthorized_role");
      }
      throw redirect(
        303,
        `/login?error=unauthorized_security&redirect=${encodeURIComponent(path)}`,
      );
    }
  }

  // Protect Staff routes ('staff', 'security', and 'admin' allowed)
  if (path.startsWith("/dashboard/staff")) {
    if (!sessionRole || !["staff", "security", "admin"].includes(sessionRole)) {
      throw redirect(
        303,
        `/login?error=unauthorized_staff&redirect=${encodeURIComponent(path)}`,
      );
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version";
    },
  });
};
