import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	getDbClient,
	isSupabaseConfigured,
	supabase,
	MOCK_OFFICES,
	MOCK_BUILDINGS,
	mapDbVisitorToVisitor
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce session and roles validation for Security Desk
	if (!session || !["admin", "security"].includes(session.role)) {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	let offices = MOCK_OFFICES;
	let buildings = MOCK_BUILDINGS;

	if (isSupabaseConfigured && supabase) {
		try {
			const dbClient = getDbClient();
			const [officesRes, buildingsRes] = await Promise.all([
				dbClient.from("offices").select("*").eq("is_active", true),
				dbClient.from("buildings").select("*")
			]);

			if (!officesRes.error && officesRes.data && officesRes.data.length > 0) {
				offices = officesRes.data.map((o: any) => ({
					id: o.id,
					name: o.name,
					code: o.code,
					buildingId: o.building_id || "",
					roomId: o.room_id || "",
					headPerson: o.head_person || "",
					contactEmail: o.contact_email || "",
					description: o.description || "",
					isActive: o.is_active ?? true
				}));
			}

			if (!buildingsRes.error && buildingsRes.data && buildingsRes.data.length > 0) {
				buildings = buildingsRes.data.map((b: any) => ({
					id: b.id,
					name: b.name,
					code: b.code,
					floors: b.floors,
					description: b.description || "",
					headPerson: b.head_person || "",
					contactEmail: b.contact_email || "",
					imageUrl: b.image_url || "",
					color: b.color || "#3b82f6",
					lat: b.lat || b.x_coord,
					lng: b.lng || b.y_coord
				}));
			}
		} catch (e) {
			console.warn("Security load error:", e);
		}
	}

	return {
		offices,
		buildings
	};
};

export const actions: Actions = {
	registerVisitorManual: async ({ request }) => {
		const formData = await request.formData();
		const firstName = ((formData.get("firstName") as string) || "").trim();
		const middleName = ((formData.get("middleName") as string) || "").trim();
		const lastName = ((formData.get("lastName") as string) || "").trim();
		const email = ((formData.get("email") as string) || "").trim();
		const phone = ((formData.get("phone") as string) || "").trim();
		const photoUrl = (formData.get("photoUrl") as string) || "";
		const officeId = (formData.get("officeId") as string) || "";
		const purpose = ((formData.get("purpose") as string) || "").trim();

		if (!firstName || !lastName || !officeId || !purpose) {
			return fail(400, { message: "Please complete all required fields (First Name, Last Name, Office, Purpose)." });
		}

		const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, " ");
		let registeredVisitorId = "reg-" + Math.floor(100000 + Math.random() * 900000);
		let passCode = "VP-" + Math.floor(1000 + Math.random() * 9000);
		let storedPhotoUrl = photoUrl;

		if (isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();

				// Upload photo if base64 data URI
				if (photoUrl && photoUrl.startsWith("data:image/")) {
					try {
						const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, "");
						const binaryString = atob(base64Data);
						const imageBuffer = Uint8Array.from(binaryString, c => c.charCodeAt(0));
						const filename = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
						const storagePath = `verification-images/${filename}`;

						const { error: uploadError } = await dbClient.storage
							.from("campus-assets")
							.upload(storagePath, imageBuffer, { contentType: "image/jpeg", upsert: true });

						if (!uploadError) {
							const { data: publicUrlData } = dbClient.storage.from("campus-assets").getPublicUrl(storagePath);
							if (publicUrlData?.publicUrl) storedPhotoUrl = publicUrlData.publicUrl;
						}
					} catch (e) {}
				}

				// Deduplication by first_name and last_name
				let regData: any = null;
				const { data: existingVisitor } = await dbClient
					.from("registered_visitors")
					.select("*")
					.ilike("first_name", firstName)
					.ilike("last_name", lastName)
					.limit(1)
					.maybeSingle();

				if (existingVisitor) {
					const { data: updatedData } = await dbClient
						.from("registered_visitors")
						.update({
							full_name: fullName,
							middle_name: middleName || existingVisitor.middle_name,
							email: email || existingVisitor.email,
							phone: phone || existingVisitor.phone,
							photo_url: storedPhotoUrl || existingVisitor.photo_url,
							updated_at: new Date().toISOString()
						})
						.eq("id", existingVisitor.id)
						.select()
						.single();
					regData = updatedData || existingVisitor;
				} else {
					const { data: insertedData } = await dbClient
						.from("registered_visitors")
						.insert([{
							full_name: fullName,
							first_name: firstName,
							middle_name: middleName || null,
							last_name: lastName,
							email: email || null,
							phone: phone || null,
							photo_url: storedPhotoUrl || null,
							updated_at: new Date().toISOString()
						}])
						.select()
						.single();
					regData = insertedData;
				}

				if (regData) {
					registeredVisitorId = regData.id;

					let validOfficeUuid: string | null = null;
					if (officeId) {
						const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(officeId);
						if (isUuid) {
							const { data: match } = await dbClient.from("offices").select("id").eq("id", officeId).maybeSingle();
							if (match) validOfficeUuid = match.id;
						}
						if (!validOfficeUuid) {
							const { data: fallback } = await dbClient.from("offices").select("id").eq("is_active", true).limit(1).maybeSingle();
							if (fallback) validOfficeUuid = fallback.id;
						}
					}

					const { data: logData, error: logErr } = await dbClient
						.from("visitor_logs")
						.insert([{
							visitor_id: registeredVisitorId,
							office_id: validOfficeUuid,
							purpose,
							check_in_time: new Date().toISOString(),
							status: "checked_in",
							verification_status: "approved",
							pass_code: passCode,
							last_latitude: 9.894144489361919,
							last_longitude: 123.88273758838274,
							last_located_at: new Date().toISOString()
						}])
						.select()
						.single();

					if (logErr) {
						console.error("Manual visitor_logs insert error:", logErr.message);
					}
				}
			} catch (e) {
				console.warn("Manual visitor registration error:", e);
			}
		}

		return {
			success: true,
			message: `Visitor ${fullName} registered successfully! Pass code: ${passCode}`
		};
	}
};
