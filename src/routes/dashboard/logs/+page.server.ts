import type { PageServerLoad } from "./$types";
import { getDbClient, isSupabaseConfigured, supabase, mapDbVisitorToVisitor } from "$lib/supabase";

export const load: PageServerLoad = async ({ url }) => {
	const selectedDate = url.searchParams.get("date") || null;
	let serverLogs: any[] | null = null;

	if (selectedDate && isSupabaseConfigured && supabase) {
		try {
			const startDateIso = new Date(`${selectedDate}T00:00:00`).toISOString();
			const endDateIso = new Date(`${selectedDate}T23:59:59.999`).toISOString();

			const { data, error } = await getDbClient()
				.from("visitors")
				.select("*")
				.gte("check_in_time", startDateIso)
				.lte("check_in_time", endDateIso)
				.order("check_in_time", { ascending: false });

			if (!error && data) {
				serverLogs = data.map(mapDbVisitorToVisitor);
			}
		} catch (e) {
			console.warn("Error fetching date logs:", e);
		}
	}

	return {
		selectedDate,
		serverLogs
	};
};
