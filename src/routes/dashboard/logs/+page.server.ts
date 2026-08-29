import type { PageServerLoad } from "./$types";
import { getDbClient, isSupabaseConfigured, supabase, mapDbVisitorToVisitor } from "$lib/supabase";

export const load: PageServerLoad = async ({ url, locals }) => {
	const session = locals.session;
	const selectedDate = url.searchParams.get("date") || null;
	let serverLogs: any[] | null = null;

	if (selectedDate && isSupabaseConfigured && supabase) {
		try {
			const startDateIso = new Date(`${selectedDate}T00:00:00`).toISOString();
			const endDateIso = new Date(`${selectedDate}T23:59:59.999`).toISOString();

			let query = getDbClient()
				.from("visitors")
				.select("*")
				.gte("check_in_time", startDateIso)
				.lte("check_in_time", endDateIso);

			if (session?.role === "staff" && session?.officeId) {
				query = query.eq("office_id", session.officeId);
			}

			const { data, error } = await query.order("check_in_time", { ascending: false });

			if (!error && data) {
				serverLogs = data.map(mapDbVisitorToVisitor);
			}
		} catch (e) {
			console.warn("Error fetching date logs:", e);
		}
	}

	return {
		selectedDate,
		serverLogs,
		role: session?.role || null,
		officeId: session?.officeId || null
	};
};
