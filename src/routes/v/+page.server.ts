import { fail } from "@sveltejs/kit";
import {
	getDbClient,
	isSupabaseConfigured,
	supabase,
	MOCK_OFFICES,
	MOCK_BUILDINGS,
	MOCK_ROOMS,
	mapDbVisitorToVisitor
} from "$lib/supabase";
import type { Actions, PageServerLoad } from "./$types";
import type { Visitor } from "$lib/types";

export const load: PageServerLoad = async () => {
	let offices = MOCK_OFFICES;
	let buildings = MOCK_BUILDINGS;
	let rooms = MOCK_ROOMS;

	if (isSupabaseConfigured && supabase) {
		try {
			const dbClient = getDbClient();
			const [officesRes, buildingsRes, roomsRes] = await Promise.all([
				dbClient.from("offices").select("*").eq("is_active", true),
				dbClient.from("buildings").select("*"),
				dbClient.from("rooms").select("*")
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
					lat: b.lat,
					lng: b.lng,
					xCoord: b.x_coord,
					yCoord: b.y_coord
				}));
			}

			if (!roomsRes.error && roomsRes.data && roomsRes.data.length > 0) {
				rooms = roomsRes.data.map((r: any) => ({
					id: r.id,
					buildingId: r.building_id || "",
					roomNumber: r.room_number || r.number || "",
					roomName: r.room_name || r.name || "",
					floor: r.floor || "1st Floor",
					description: r.description || "",
					imageUrl: r.image_url || ""
				}));
			}
		} catch (e) {
			console.warn("Supabase load offices/buildings/rooms error on /v, using fallback:", e);
		}
	}

	return {
		offices,
		buildings,
		rooms
	};
};

export const actions: Actions = {
	register: async ({ request }) => {
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
			const missing: string[] = [];
			if (!firstName) missing.push("First Name");
			if (!lastName) missing.push("Last Name");
			if (!officeId) missing.push("Office Destination");
			if (!purpose) missing.push("Purpose of Visit");
			return fail(400, { message: `Please complete all required fields: ${missing.join(", ")}.` });
		}

		const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, " ");

		let registeredVisitorId = "reg-" + Math.floor(100000 + Math.random() * 900000);
		let storedPhotoUrl = photoUrl;

		if (isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();

				// 1. Upload selfie / ID photo to campus-assets bucket under verification-images/
				if (photoUrl && photoUrl.startsWith("data:image/")) {
					try {
						const base64Data = photoUrl.replace(/^data:image\/\w+;base64,/, "");
						const binaryString = atob(base64Data);
						const imageBuffer = Uint8Array.from(binaryString, c => c.charCodeAt(0));
						const filename = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
						const storagePath = `verification-images/${filename}`;

						const { error: uploadError } = await dbClient.storage
							.from("campus-assets")
							.upload(storagePath, imageBuffer, {
								contentType: "image/jpeg",
								upsert: true
							});

						if (!uploadError) {
							const { data: publicUrlData } = dbClient.storage
								.from("campus-assets")
								.getPublicUrl(storagePath);
							if (publicUrlData?.publicUrl) {
								storedPhotoUrl = publicUrlData.publicUrl;
							}
						} else {
							console.warn("Supabase storage upload error:", uploadError.message);
						}
					} catch (err) {
						console.warn("Failed to process photo upload:", err);
					}
				}

				// 2. Name Matching & Deduplication in registered_visitors table
				let regData: any = null;
				const { data: existingVisitor } = await dbClient
					.from("registered_visitors")
					.select("*")
					.ilike("first_name", firstName)
					.ilike("last_name", lastName)
					.limit(1)
					.maybeSingle();

				if (existingVisitor) {
					// Update existing visitor entry to avoid multiple entries of the same visitor
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
					// Insert new visitor entry
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
				}
			} catch (e) {
				console.warn("Supabase registered_visitors process error:", e);
			}
		}

		// Find target office metadata
		const targetOffice = MOCK_OFFICES.find(o => o.id === officeId) || {
			id: officeId,
			name: "Designated Office",
			buildingId: "off-1",
			code: "OFFICE"
		};

		const prePassData = {
			registeredVisitorId,
			fullName,
			firstName,
			middleName,
			lastName,
			email,
			phone,
			purpose,
			officeId: targetOffice.id,
			officeName: targetOffice.name,
			buildingId: targetOffice.buildingId,
			buildingName: targetOffice.name,
			photoUrl
		};

		return {
			success: true,
			prePassData
		};
	},

	checkIn: async ({ request }) => {
		const formData = await request.formData();
		const registeredVisitorId = (formData.get("registeredVisitorId") as string) || "";
		const officeCode = ((formData.get("officeCode") as string) || "").trim();
		const fullName = (formData.get("fullName") as string) || "Visitor";
		const firstName = (formData.get("firstName") as string) || "";
		const middleName = (formData.get("middleName") as string) || "";
		const lastName = (formData.get("lastName") as string) || "";
		const email = (formData.get("email") as string) || "";
		const phone = (formData.get("phone") as string) || "";
		const officeId = (formData.get("officeId") as string) || "";
		const purpose = (formData.get("purpose") as string) || "";
		const photoUrl = (formData.get("photoUrl") as string) || "";

		if (!registeredVisitorId && !fullName) {
			return fail(400, { message: "Visitor profile details missing." });
		}

		const newVisitor: Visitor = {
			id: "vis-" + Math.floor(100000 + Math.random() * 900000),
			visitorId: registeredVisitorId,
			fullName,
			firstName,
			middleName,
			lastName,
			email,
			phone,
			purpose,
			officeId,
			officeName: "Designated Office",
			buildingId: "off-1",
			photoUrl,
			checkInTime: new Date().toISOString(),
			checkOutTime: null,
			status: "checked_in",
			verificationStatus: "approved",
			passCode: "VP-" + Math.floor(1000 + Math.random() * 9000)
		};

		if (isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				const { data: logData, error: logErr } = await dbClient
					.from("visitor_logs")
					.insert([{
						id: newVisitor.id,
						visitor_id: registeredVisitorId || null,
						office_id: officeId || null,
						purpose: purpose || "Campus Visit",
						check_in_time: newVisitor.checkInTime,
						status: "checked_in",
						verification_status: "approved",
						pass_code: newVisitor.passCode
					}])
					.select()
					.single();

				if (!logErr && logData) {
					return {
						success: true,
						activeOfficialPass: {
							...newVisitor,
							...mapDbVisitorToVisitor({ ...logData })
						}
					};
				}
			} catch (e) {
				console.warn("Supabase visitor_logs insert error:", e);
			}
		}

		return {
			success: true,
			activeOfficialPass: newVisitor
		};
	}
};
