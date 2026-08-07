import type { PageServerLoad } from "./$types";
import { getDbClient, isSupabaseConfigured, supabase } from "$lib/supabase";

export const load: PageServerLoad = async () => {
	let buildings: any[] = [];
	let offices: any[] = [];
	let rooms: any[] = [];

	if (isSupabaseConfigured && supabase) {
		try {
			const dbClient = getDbClient();
			const [buildingsRes, officesRes, roomsRes] = await Promise.all([
				dbClient.from("buildings").select("*").order("name"),
				dbClient.from("offices").select("*, buildings(name, code)").eq("is_active", true).order("name"),
				dbClient.from("rooms").select("*, buildings(name, code)").order("room_number")
			]);

			if (!buildingsRes.error && buildingsRes.data) {
				buildings = buildingsRes.data.map((b: any) => ({
					id: b.id,
					name: b.name,
					code: b.code,
					floors: b.floors,
					description: b.description || "",
					imageUrl: b.image_url || "",
					lat: b.lat || b.x_coord,
					lng: b.lng || b.y_coord
				}));
			}

			if (!officesRes.error && officesRes.data) {
				offices = officesRes.data.map((o: any) => ({
					id: o.id,
					name: o.name,
					code: o.code,
					buildingId: o.building_id || "",
					buildingName: o.buildings?.name || "",
					buildingCode: o.buildings?.code || "",
					description: o.description || ""
				}));
			}

			if (!roomsRes.error && roomsRes.data) {
				rooms = roomsRes.data.map((r: any) => ({
					id: r.id,
					buildingId: r.building_id,
					buildingName: r.buildings?.name || "",
					roomNumber: r.room_number,
					roomName: r.room_name,
					floor: r.floor,
					description: r.description || ""
				}));
			}
		} catch (err) {
			console.warn("Home page load error:", err);
		}
	}

	return {
		buildings,
		offices,
		rooms
	};
};
