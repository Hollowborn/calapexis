import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	getDbClient,
	isSupabaseConfigured,
	supabase,
	mapDbVisitorToVisitor
} from "$lib/supabase";

export const load: PageServerLoad = async ({ locals }) => {
	const session = locals.session;

	// Enforce session and roles validation for Staff Desk
	if (!session || !["admin", "staff"].includes(session.role)) {
		throw redirect(303, "/dashboard?error=unauthorized_role");
	}

	let offices: any[] = [];
	let recentOfficeVisitors: any[] = [];
	let assignedOfficeId: string | null = (session as any)?.officeId || session.roomId || null;

	if (isSupabaseConfigured && supabase) {
		try {
			const dbClient = getDbClient();
			const { data: officesData, error } = await dbClient
				.from("offices")
				.select("*")
				.eq("is_active", true);

			if (!error && officesData && officesData.length > 0) {
				offices = officesData.map((o: any) => ({
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

			// If staff role, try to resolve assigned office UUID if needed
			if (session.role === "staff" && !assignedOfficeId && offices.length > 0) {
				assignedOfficeId = offices[0].id;
			}

			// Query visitor_logs joining registered_visitors to get office visitor history
			let logsQuery = dbClient
				.from("visitor_logs")
				.select(`
					id,
					purpose,
					check_in_time,
					status,
					visitor:registered_visitors (
						id,
						full_name,
						first_name,
						middle_name,
						last_name,
						email,
						phone,
						photo_url
					)
				`)
				.order("check_in_time", { ascending: false })
				.limit(100);

			if (session.role === "staff" && assignedOfficeId) {
				logsQuery = logsQuery.eq("office_id", assignedOfficeId);
			}

			const { data: logsData, error: logsError } = await logsQuery;

			if (!logsError && logsData && logsData.length > 0) {
				const seenVisitorIds = new Set<string>();
				for (const log of logsData) {
					const v = (log as any).visitor;
					if (v && v.id && !seenVisitorIds.has(v.id)) {
						seenVisitorIds.add(v.id);
						recentOfficeVisitors.push({
							id: v.id,
							fullName: v.full_name,
							firstName: v.first_name || "",
							middleName: v.middle_name || "",
							lastName: v.last_name || "",
							email: v.email || "",
							phone: v.phone || "",
							photoUrl: v.photo_url || "",
							lastPurpose: log.purpose || "",
							lastVisitTime: log.check_in_time
						});
					}
				}
			}

			// Fallback: If no office-specific logs exist yet, load top registered visitors
			if (recentOfficeVisitors.length === 0) {
				const { data: regData } = await dbClient
					.from("registered_visitors")
					.select("id, full_name, first_name, middle_name, last_name, email, phone, photo_url, updated_at")
					.order("updated_at", { ascending: false })
					.limit(20);

				if (regData) {
					recentOfficeVisitors = regData.map((v: any) => ({
						id: v.id,
						fullName: v.full_name,
						firstName: v.first_name || "",
						middleName: v.middle_name || "",
						lastName: v.last_name || "",
						email: v.email || "",
						phone: v.phone || "",
						photoUrl: v.photo_url || "",
						lastPurpose: "",
						lastVisitTime: v.updated_at
					}));
				}
			}
		} catch (e) {
			console.warn("Staff page server load error:", e);
		}
	}

	return {
		role: session.role,
		offices,
		assignedOfficeId,
		recentOfficeVisitors
	};
};

export const actions: Actions = {
	registerVisitorManual: async ({ request, locals }) => {
		const session = locals.session;
		const formData = await request.formData();
		const firstName = ((formData.get("firstName") as string) || "").trim();
		const middleName = ((formData.get("middleName") as string) || "").trim();
		const lastName = ((formData.get("lastName") as string) || "").trim();
		const email = ((formData.get("email") as string) || "").trim();
		const phone = ((formData.get("phone") as string) || "").trim();
		const photoUrl = (formData.get("photoUrl") as string) || "";
		let officeId = (formData.get("officeId") as string) || "";
		const purpose = ((formData.get("purpose") as string) || "").trim();

		// Enforce staff office locking
		const staffOfficeId = (session as any)?.officeId || session?.roomId;
		if (session?.role === "staff" && staffOfficeId) {
			officeId = staffOfficeId;
		}

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

				if (!storedPhotoUrl) {
					storedPhotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0284c7&color=ffffff&bold=true&size=256`;
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

					let officeLat = 9.894144489361919;
					let officeLng = 123.88273758838274;

					if (validOfficeUuid) {
						const { data: officeWithBuilding } = await dbClient
							.from("offices")
							.select("id, building_id, buildings(x_coord, y_coord, lat, lng)")
							.eq("id", validOfficeUuid)
							.maybeSingle();

						if (officeWithBuilding?.buildings) {
							const b = officeWithBuilding.buildings;
							officeLat = b.x_coord || b.lat || 9.894144489361919;
							officeLng = b.y_coord || b.lng || 123.88273758838274;
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
							last_latitude: officeLat,
							last_longitude: officeLng,
							last_located_at: new Date().toISOString()
						}])
						.select()
						.single();

					if (logErr) {
						console.error("Staff assisted visitor_logs insert error:", logErr.message);
					} else if (logData) {
						const { data: fullVisitor } = await dbClient
							.from("visitors")
							.select("*")
							.eq("id", logData.id)
							.maybeSingle();

						if (fullVisitor) {
							return {
								success: true,
								message: `Visitor ${fullName} registered successfully! Pass Code: ${passCode}`,
								visitor: mapDbVisitorToVisitor(fullVisitor)
							};
						}
					}
				}
			} catch (e) {
				console.warn("Staff assisted visitor registration error:", e);
			}
		}

		return {
			success: true,
			message: `Visitor ${fullName} registered successfully! Pass Code: ${passCode}`,
			visitor: {
				id: registeredVisitorId,
				passCode,
				fullName,
				firstName,
				middleName,
				lastName,
				email: email || undefined,
				phone: phone || undefined,
				purpose,
				officeId,
				photoUrl: storedPhotoUrl,
				status: "checked_in",
				verificationStatus: "approved",
				checkInTime: new Date().toISOString()
			}
		};
	},

	checkOutVisitor: async ({ request, locals }) => {
		const session = locals.session;
		const formData = await request.formData();
		const idOrPassCode = ((formData.get("idOrPassCode") as string) || "").trim();

		if (!idOrPassCode) {
			return fail(400, { message: "Visitor Pass Code or ID is required for check-out." });
		}

		if (isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrPassCode);

				// Staff office verification
				if (session?.role === "staff") {
					const staffOfficeId = (session as any)?.officeId || session?.roomId;
					if (staffOfficeId) {
						const selectQuery = dbClient.from("visitor_logs").select("office_id");
						const { data: logEntry } = isUuid
							? await selectQuery.eq("id", idOrPassCode).maybeSingle()
							: await selectQuery.eq("pass_code", idOrPassCode).maybeSingle();

						if (logEntry && logEntry.office_id && logEntry.office_id !== staffOfficeId) {
							return fail(403, { message: "Access Denied: Staff can only check out visitors assigned to their managed office desk." });
						}
					}
				}

				const query = dbClient
					.from("visitor_logs")
					.update({
						status: "checked_out",
						check_out_time: new Date().toISOString()
					});

				const { data, error } = isUuid
					? await query.eq("id", idOrPassCode).select()
					: await query.eq("pass_code", idOrPassCode).select();

				if (!error && data && data.length > 0) {
					return { success: true, message: "Visitor checked out successfully." };
				}
			} catch (e: any) {
				return fail(500, { message: e.message || "Staff checkout error." });
			}
		}

		return { success: true, message: "Visitor checked out." };
	}
};
