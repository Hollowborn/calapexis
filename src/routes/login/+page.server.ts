import { redirect, fail } from "@sveltejs/kit";
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

export const actions: Actions = {
  login: async ({ request, cookies, url }) => {
    const data = await request.formData();
    const role = data.get("role") as string;
    const username = data.get("username") as string;
    const password = data.get("password") as string;

    if (!role) {
      return fail(400, { message: "Role is required" });
    }

    // Mock validation rules:
    // admin -> pass: admin123
    // security -> pass: security123
    // staff -> pass: staff123
    if (role === "admin" && username === "admin" && password !== "admin123") {
      return fail(400, {
        message: "Invalid Admin credentials (hint: admin123)",
      });
    }
    if (
      role === "security" &&
      username === "security" &&
      password !== "security123"
    ) {
      return fail(400, {
        message: "Invalid Security credentials (hint: security123)",
      });
    }
    if (role === "staff" && username === "staff" && password !== "staff123") {
      return fail(400, {
        message: "Invalid Staff credentials (hint: staff123)",
      });
    }

    // Set secure role session cookie
    cookies.set("session_role", role, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: false, // Set true in production with HTTPS
      maxAge: 60 * 60 * 24, // 1 day
    });

    // Redirect to requested redirect URL or default portal path
    const redirectUrl = url.searchParams.get("redirect");
    if (redirectUrl) {
      throw redirect(303, decodeURIComponent(redirectUrl));
    }

    if (role === "admin") throw redirect(303, "/admin");
    if (role === "security") throw redirect(303, "/security");
    throw redirect(303, "/staff");
  },

  logout: async ({ cookies }) => {
    cookies.delete("session_role", { path: "/" });
    throw redirect(303, "/login");
  },
};
