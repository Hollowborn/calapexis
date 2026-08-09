import { fail } from "@sveltejs/kit";
import {
	getDbClient,
	isSupabaseConfigured,
	supabase,
	mapDbVisitorToVisitor,
	getLocalMapEdges
} from "$lib/supabase";
import type { Actions, PageServerLoad } from "./$types";
import type { Visitor } from "$lib/types";

async function resolveValidOfficeUuid(dbClient: any, rawOfficeId: string): Promise<string | null> {
	if (!rawOfficeId) return null;
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawOfficeId);
	if (isUuid) {
		const { data: match } = await dbClient
			.from("offices")
			.select("id")
			.eq("id", rawOfficeId)
			.maybeSingle();
		if (match) return match.id;
	}
	const { data: codeMatch } = await dbClient
		.from("offices")
		.select("id")
		.ilike("code", rawOfficeId)
		.maybeSingle();
	if (codeMatch) return codeMatch.id;

	const { data: fallback } = await dbClient
		.from("offices")
		.select("id")
		.eq("is_active", true)
		.limit(1)
		.maybeSingle();
	return fallback ? fallback.id : null;
}

export const load: PageServerLoad = async ({ locals }) => {
	let offices: any[] = [];
	let buildings: any[] = [];
	let rooms: any[] = [];
	let googleVisitorData: {
		fullName: string;
		firstName: string;
		middleName: string;
		lastName: string;
		email: string;
		photoUrl: string;
		phone?: string;
	} | null = null;

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

			if (locals.safeGetSession) {
				const { user } = await locals.safeGetSession();
				if (user?.email) {
					let email = user.email;
					let fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
					let photoUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
					let phone = user.user_metadata?.phone || "";

					let firstName = "";
					let middleName = "";
					let lastName = "";

					// Query registered_visitors table in database for matching email
					if (isSupabaseConfigured) {
						try {
							const dbClient = getDbClient();
							const { data: regVisitor } = await dbClient
								.from("registered_visitors")
								.select("*")
								.ilike("email", email)
								.maybeSingle();

							if (regVisitor) {
								fullName = regVisitor.full_name || fullName;
								firstName = regVisitor.first_name || "";
								middleName = regVisitor.middle_name || "";
								lastName = regVisitor.last_name || "";
								email = regVisitor.email || email;
								phone = regVisitor.phone || phone;
								photoUrl = regVisitor.photo_url || photoUrl;
							}
						} catch (e) {
							console.warn("Failed to lookup registered_visitors by email on /v:", e);
						}
					}

					if (!firstName && fullName) {
						const nameParts = fullName.trim().split(/\s+/);
						if (nameParts.length === 1) {
							firstName = nameParts[0];
						} else if (nameParts.length === 2) {
							firstName = nameParts[0];
							lastName = nameParts[1];
						} else if (nameParts.length >= 3) {
							firstName = nameParts[0];
							middleName = nameParts.slice(1, -1).join(" ");
							lastName = nameParts[nameParts.length - 1];
						}
					}

					googleVisitorData = {
						fullName,
						firstName,
						middleName,
						lastName,
						email,
						photoUrl,
						phone
					};
				}
			}
		} catch (e) {
			console.warn("Supabase load offices/buildings/rooms error on /v, using fallback:", e);
		}
	}

	let mapEdges: any[] = [];
	try {
		mapEdges = await getLocalMapEdges(locals.supabase);
	} catch (e) {
		console.warn("Failed to load mapEdges on /v:", e);
	}

	return {
		offices,
		buildings,
		rooms,
		mapEdges,
		googleVisitorData
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
		const latStr = (formData.get("lat") as string) || "";
		const lngStr = (formData.get("lng") as string) || "";
		const lat = latStr ? parseFloat(latStr) : 9.894144489361919;
		const lng = lngStr ? parseFloat(lngStr) : 123.88273758838274;

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
		let initialLogId = "vis-" + Math.floor(100000 + Math.random() * 900000);
		let passCode = "VP-" + Math.floor(1000 + Math.random() * 9000);

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
				let existingVisitor: any = null;

				if (email) {
					const { data: matchByEmail } = await dbClient
						.from("registered_visitors")
						.select("*")
						.ilike("email", email)
						.maybeSingle();
					existingVisitor = matchByEmail;
				}

				if (!existingVisitor) {
					const { data: matchByName } = await dbClient
						.from("registered_visitors")
						.select("*")
						.ilike("first_name", firstName)
						.ilike("last_name", lastName)
						.limit(1)
						.maybeSingle();
					existingVisitor = matchByName;
				}

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

					const validOfficeUuid = await resolveValidOfficeUuid(dbClient, officeId);
					let officeLat = lat;
					let officeLng = lng;

					if (validOfficeUuid) {
						const { data: officeWithBuilding } = await dbClient
							.from("offices")
							.select("id, building_id, buildings(x_coord, y_coord, lat, lng)")
							.eq("id", validOfficeUuid)
							.maybeSingle();

						if (officeWithBuilding?.buildings) {
							const b = officeWithBuilding.buildings;
							officeLat = b.x_coord || b.lat || lat;
							officeLng = b.y_coord || b.lng || lng;
						}
					}

					// 3. Reuse existing preliminary log or create a new Session Log in visitor_logs
					const { data: existingPrelimLog } = await dbClient
						.from("visitor_logs")
						.select("id, pass_code")
						.eq("visitor_id", registeredVisitorId)
						.eq("status", "preliminary")
						.order("check_in_time", { ascending: false })
						.limit(1)
						.maybeSingle();

					let sessionLogData: any = null;
					let sessionLogErr: any = null;

					if (existingPrelimLog) {
						// Update existing preliminary session
						const { data: updatedLog, error: updateErr } = await dbClient
							.from("visitor_logs")
							.update({
								office_id: validOfficeUuid,
								purpose: purpose || "Campus Visit",
								check_in_time: new Date().toISOString(),
								last_latitude: officeLat,
								last_longitude: officeLng,
								last_located_at: new Date().toISOString()
							})
							.eq("id", existingPrelimLog.id)
							.select()
							.single();

						sessionLogData = updatedLog || existingPrelimLog;
						sessionLogErr = updateErr;
					} else {
						// Create new preliminary session
						const { data: insertedLog, error: insertErr } = await dbClient
							.from("visitor_logs")
							.insert([{
								visitor_id: registeredVisitorId,
								office_id: validOfficeUuid,
								purpose: purpose || "Campus Visit",
								check_in_time: new Date().toISOString(),
								status: "preliminary",
								verification_status: "approved",
								pass_code: passCode,
								last_latitude: officeLat,
								last_longitude: officeLng,
								last_located_at: new Date().toISOString()
							}])
							.select()
							.single();

						sessionLogData = insertedLog;
						sessionLogErr = insertErr;
					}

					if (sessionLogErr) {
						console.error("visitor_logs preliminary session error:", sessionLogErr.message);
					} else if (sessionLogData) {
						initialLogId = sessionLogData.id;
						passCode = sessionLogData.pass_code;
					}
				}
			} catch (e) {
				console.warn("Supabase registered_visitors process error:", e);
			}
		}

		// Query target office metadata directly from live Supabase DB
		let officeName = "Designated Office";
		let officeCode = "OFFICE";
		let buildingId = "";
		let buildingName = "Campus Building";

		if (isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				const validUuid = await resolveValidOfficeUuid(dbClient, officeId);
				if (validUuid) {
					const { data: dbOffice } = await dbClient
						.from("offices")
						.select("id, name, code, building_id, buildings(name)")
						.eq("id", validUuid)
						.maybeSingle();

					if (dbOffice) {
						officeName = dbOffice.name;
						officeCode = dbOffice.code;
						buildingId = dbOffice.building_id || "";
						if (dbOffice.buildings) {
							buildingName = dbOffice.buildings.name || buildingName;
						}
					}
				}
			} catch (err) {
				console.warn("Error looking up target office metadata on register:", err);
			}
		}

		const prePassData = {
			logId: initialLogId,
			registeredVisitorId,
			fullName,
			firstName,
			middleName,
			lastName,
			email,
			phone,
			purpose,
			officeId,
			officeName,
			officeCode,
			buildingId,
			buildingName,
			photoUrl: storedPhotoUrl,
			passCode,
			lat,
			lng
		};

		return {
			success: true,
			prePassData
		};
	},

	checkIn: async ({ request }) => {
		const formData = await request.formData();
		const logId = ((formData.get("logId") as string) || "").trim();
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
		const latStr = (formData.get("lat") as string) || "";
		const lngStr = (formData.get("lng") as string) || "";
		let lat = latStr ? parseFloat(latStr) : null;
		let lng = lngStr ? parseFloat(lngStr) : null;

		if (!registeredVisitorId && !fullName && !logId) {
			return fail(400, { message: "Visitor profile details missing." });
		}

		let finalPassCode = "VP-" + Math.floor(1000 + Math.random() * 9000);

		if (isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				const validOfficeUuid = await resolveValidOfficeUuid(dbClient, officeId || officeCode);

				if (validOfficeUuid) {
					const { data: officeWithBuilding } = await dbClient
						.from("offices")
						.select("id, building_id, buildings(x_coord, y_coord, lat, lng)")
						.eq("id", validOfficeUuid)
						.maybeSingle();

					if (officeWithBuilding?.buildings) {
						const b = officeWithBuilding.buildings;
						lat = b.x_coord || b.lat || lat || 9.894144489361919;
						lng = b.y_coord || b.lng || lng || 123.88273758838274;
					}
				}

				let logData: any = null;

				// 1. Prioritize updating existing preliminary log by logId
				if (logId) {
					const { data: updatedLog } = await dbClient
						.from("visitor_logs")
						.update({
							status: "checked_in",
							check_in_time: new Date().toISOString(),
							office_id: validOfficeUuid || undefined,
							last_latitude: lat || 9.894144489361919,
							last_longitude: lng || 123.88273758838274,
							last_located_at: new Date().toISOString()
						})
						.eq("id", logId)
						.select()
						.maybeSingle();

					if (updatedLog) {
						logData = updatedLog;
					}
				}

				// 2. Fall back to updating any preliminary log for this visitor
				if (!logData && registeredVisitorId) {
					const { data: prelimLog } = await dbClient
						.from("visitor_logs")
						.update({
							status: "checked_in",
							check_in_time: new Date().toISOString(),
							office_id: validOfficeUuid || undefined,
							last_latitude: lat || 9.894144489361919,
							last_longitude: lng || 123.88273758838274,
							last_located_at: new Date().toISOString()
						})
						.eq("visitor_id", registeredVisitorId)
						.eq("status", "preliminary")
						.select()
						.maybeSingle();

					if (prelimLog) {
						logData = prelimLog;
					}
				}

				// 3. Fall back to inserting a new row only if no existing log row was found
				if (!logData) {
					const newVisitorLog = {
						visitor_id: registeredVisitorId || null,
						office_id: validOfficeUuid,
						purpose: purpose || "Campus Visit",
						check_in_time: new Date().toISOString(),
						status: "checked_in",
						verification_status: "approved",
						pass_code: finalPassCode,
						last_latitude: lat || 9.894144489361919,
						last_longitude: lng || 123.88273758838274,
						last_located_at: new Date().toISOString()
					};

					const { data: insertedLog, error: logErr } = await dbClient
						.from("visitor_logs")
						.insert([newVisitorLog])
						.select()
						.single();

					if (insertedLog) logData = insertedLog;
				}

				if (logData) {
					const mappedVisitor = mapDbVisitorToVisitor({ ...logData });
					return {
						success: true,
						activeOfficialPass: {
							id: logData.id,
							visitorId: registeredVisitorId,
							fullName,
							firstName,
							middleName,
							lastName,
							email,
							phone,
							purpose,
							officeId: validOfficeUuid || officeId,
							officeName: mappedVisitor.officeName || "Designated Office",
							buildingId: mappedVisitor.buildingId || "off-1",
							photoUrl,
							checkInTime: logData.check_in_time,
							checkOutTime: null,
							status: "checked_in",
							verificationStatus: "approved",
							passCode: logData.pass_code,
							lastLatitude: lat || undefined,
							lastLongitude: lng || undefined,
							lastLocatedAt: logData.last_located_at
						}
					};
				}
			} catch (e) {
				console.warn("Supabase visitor_logs insert error:", e);
			}
		}

		const fallbackVisitor: Visitor = {
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
			passCode: finalPassCode,
			lastLatitude: lat || undefined,
			lastLongitude: lng || undefined,
			lastLocatedAt: new Date().toISOString()
		};

		return {
			success: true,
			activeOfficialPass: fallbackVisitor
		};
	},

	updateLocation: async ({ request }) => {
		const formData = await request.formData();
		const logId = (formData.get("logId") as string) || "";
		const latStr = (formData.get("lat") as string) || "";
		const lngStr = (formData.get("lng") as string) || "";
		const lat = parseFloat(latStr);
		const lng = parseFloat(lngStr);

		if (logId && !isNaN(lat) && !isNaN(lng) && isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				await dbClient
					.from("visitor_logs")
					.update({
						last_latitude: lat,
						last_longitude: lng,
						last_located_at: new Date().toISOString()
					})
					.eq("id", logId);
			} catch (e) {
				console.warn("Supabase updateLocation error:", e);
			}
		}

		return { success: true };
	}
};
