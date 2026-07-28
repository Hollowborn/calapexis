import { createClient } from "@supabase/supabase-js";
import type {
	Building,
	Room,
	Visitor,
	MapNode,
	VerificationStatus,
	Profile,
} from "./types";

import {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} from "$env/static/public";

// Read env variables (optional - will fall back to local store if unconfigured)
const supabaseUrl = PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;

// Initial Mock Buildings & Rooms Data
export const MOCK_BUILDINGS: Building[] = [
	{
		id: "off-1",
		name: "Administration Building",
		code: "ADMIN",
		floors: 3,
		description: "Main administrative services including registrar, cashier, and admissions counters.",
		headPerson: "Dr. Maria Santos",
		contactEmail: "registrar@university.edu",
		xCoord: 450,
		yCoord: 350,
	},
	{
		id: "off-3",
		name: "Technology Complex",
		code: "TECH",
		floors: 4,
		description: "Dean office, IT laboratories, and engineering workstation complexes.",
		headPerson: "Engr. Robert Lee",
		contactEmail: "ccs@university.edu",
		xCoord: 300,
		yCoord: 600,
	},
	{
		id: "off-4",
		name: "Student Activity Center",
		code: "SAC",
		floors: 2,
		description: "Student organizations, services, and guidance counseling suites.",
		headPerson: "Prof. Ana Reyes",
		contactEmail: "sds@university.edu",
		xCoord: 720,
		yCoord: 480,
	},
	{
		id: "off-5",
		name: "Academic Hall A",
		code: "ACAD-A",
		floors: 3,
		description: "Lecture halls, classrooms, and teacher education faculty offices.",
		headPerson: "Dr. Elizabeth Cruz",
		contactEmail: "cte@university.edu",
		xCoord: 220,
		yCoord: 250,
	},
];

export const MOCK_ROOMS: Room[] = [
	{
		id: "rm-101",
		buildingId: "off-1",
		roomNumber: "Room 101",
		roomName: "Admissions & Records Counter",
		floor: "1st Floor",
		xCoord: 450,
		yCoord: 350,
		description: "Window counter for visitor inquiry and document submission.",
	},
	{
		id: "rm-102",
		buildingId: "off-1",
		roomNumber: "Room 102",
		roomName: "Payment Counter 1 & 2",
		floor: "1st Floor",
		xCoord: 580,
		yCoord: 320,
		description: "Official student payment processing desks.",
	},
	{
		id: "rm-201",
		buildingId: "off-3",
		roomNumber: "Lab 201",
		roomName: "Software Engineering Laboratory",
		floor: "2nd Floor",
		xCoord: 310,
		yCoord: 590,
		description: "Computer workstation lab for programming classes.",
	},
	{
		id: "rm-202",
		buildingId: "off-3",
		roomNumber: "Room 205",
		roomName: "Dean Office - CCS",
		floor: "2nd Floor",
		xCoord: 290,
		yCoord: 610,
		description: "Dean executive office and consultation room.",
	},
	{
		id: "rm-105",
		buildingId: "off-4",
		roomNumber: "Room 105",
		roomName: "Guidance & Counseling Suite",
		floor: "1st Floor",
		xCoord: 720,
		yCoord: 480,
		description: "Confidential student consultation rooms.",
	},
];

export const MOCK_MAP_NODES: MapNode[] = [
	{
		id: "node-entrance",
		name: "Main Campus Gate Entrance",
		x: 100,
		y: 400,
		type: "entrance",
		neighbors: ["node-h1"],
	},
	{
		id: "node-h1",
		name: "Central Quadrangle Walkway",
		x: 300,
		y: 400,
		type: "hallway",
		neighbors: ["node-entrance", "node-admin", "node-tech", "node-sac"],
	},
	{
		id: "node-admin",
		name: "Administration Building Entrance",
		x: 450,
		y: 350,
		type: "office",
		neighbors: ["node-h1", "node-cashier"],
	},
	{
		id: "node-cashier",
		name: "Cashier Counter Area",
		x: 580,
		y: 320,
		type: "room",
		neighbors: ["node-admin"],
	},
	{
		id: "node-tech",
		name: "Technology Complex Gate",
		x: 300,
		y: 550,
		type: "hallway",
		neighbors: ["node-h1", "node-ccs"],
	},
	{
		id: "node-ccs",
		name: "College of Computer Studies",
		x: 300,
		y: 600,
		type: "office",
		neighbors: ["node-tech"],
	},
	{
		id: "node-sac",
		name: "Student Activity Center Entrance",
		x: 650,
		y: 450,
		type: "hallway",
		neighbors: ["node-h1", "node-sds"],
	},
	{
		id: "node-sds",
		name: "Student Affairs Office",
		x: 720,
		y: 480,
		type: "office",
		neighbors: ["node-sac"],
	},
];

// Initial Visitors Dataset
let localVisitorsStore: Visitor[] = [
	{
		id: "vis-1001",
		fullName: "Alex Morgan",
		firstName: "Alex",
		lastName: "Morgan",
		email: "alex.m@gmail.com",
		phone: "+63 917 123 4567",
		purpose: "Transcript of Records Request",
		buildingId: "off-1",
		buildingName: "Administration Building",
		roomId: "rm-101",
		roomNumber: "Room 101",
		hostPerson: "Dr. Maria Santos",
		checkInTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
		checkOutTime: null,
		status: "checked_in",
		verificationStatus: "approved",
		passCode: "VP-8921",
	},
	{
		id: "vis-1002",
		fullName: "Sarah Jenkins",
		firstName: "Sarah",
		lastName: "Jenkins",
		email: "sjenkins@outlook.com",
		phone: "+63 918 987 6543",
		purpose: "Tuition Payment Inquiry",
		buildingId: "off-1",
		buildingName: "Administration Building",
		roomId: "rm-102",
		roomNumber: "Room 102",
		hostPerson: "Mr. Juan Dela Cruz",
		checkInTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
		checkOutTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
		status: "checked_out",
		verificationStatus: "approved",
		passCode: "VP-3412",
	},
	{
		id: "vis-1003",
		fullName: "Carlos Rodriguez",
		firstName: "Carlos",
		lastName: "Rodriguez",
		email: "carlos.rod@yahoo.com",
		phone: "+63 922 456 7890",
		purpose: "Faculty Research Consultation",
		buildingId: "off-3",
		buildingName: "Technology Complex",
		roomId: "rm-202",
		roomNumber: "Room 205",
		hostPerson: "Engr. Robert Lee",
		checkInTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
		checkOutTime: null,
		status: "checked_in",
		verificationStatus: "approved",
		passCode: "VP-7561",
	},
];

// Mock Profiles Database Store for offline RBAC
export let localProfilesStore: (Profile & { password?: string })[] = [
	{
		id: "usr-1",
		email: "admin",
		role: "admin",
		password: "admin123",
		createdAt: new Date().toISOString(),
	},
	{
		id: "usr-2",
		email: "security",
		role: "security",
		password: "security123",
		createdAt: new Date().toISOString(),
	},
	{
		id: "usr-3",
		email: "staff",
		role: "staff",
		password: "staff123",
		roomId: "rm-105",
		createdAt: new Date().toISOString(),
	},
];

// --- DB-to-Frontend Converter Mappers ---

function mapDbBuildingToBuilding(db: any): Building {
	return {
		id: db.id,
		name: db.name,
		code: db.code,
		floors: Number(db.floors || 1),
		description: db.description || "",
		headPerson: db.head_person,
		contactEmail: db.contact_email,
		xCoord: db.x_coord ? Number(db.x_coord) : undefined,
		yCoord: db.y_coord ? Number(db.y_coord) : undefined,
		color: db.color || undefined,
		imageUrl: db.image_url || undefined,
	};
}

function mapDbRoomToRoom(db: any): Room {
	return {
		id: db.id,
		buildingId: db.building_id,
		roomNumber: db.room_number,
		roomName: db.room_name,
		floor: db.floor,
		xCoord: Number(db.x_coord),
		yCoord: Number(db.y_coord),
		description: db.description || "",
		imageUrl: db.image_url || undefined,
	};
}

function mapDbProfileToProfile(db: any): Profile {
	return {
		id: db.id,
		email: db.email,
		role: db.role,
		roomId: db.room_id,
		createdAt: db.created_at,
	};
}

function mapDbVisitorToVisitor(db: any): Visitor {
	return {
		id: db.id,
		fullName: db.full_name,
		firstName: db.first_name || "",
		middleName: db.middle_name || "",
		lastName: db.last_name || "",
		email: db.email,
		phone: db.phone,
		purpose: db.purpose,
		buildingId: db.building_id,
		buildingName: db.building_name || "",
		roomId: db.room_id || "",
		roomNumber: db.room_number || "",
		hostPerson: db.host_person || "",
		photoUrl: db.photo_url || "",
		checkInTime: db.check_in_time,
		checkOutTime: db.check_out_time,
		roomCheckInTime: db.room_check_in_time,
		status: db.status,
		verificationStatus: db.verification_status,
		rejectionReason: db.rejection_reason || "",
		passCode: db.pass_code,
	};
}

function mapVisitorToDbVisitor(v: any): any {
	return {
		id: v.id,
		full_name: v.fullName,
		first_name: v.firstName || null,
		middle_name: v.middleName || null,
		last_name: v.lastName || null,
		email: v.email,
		phone: v.phone,
		purpose: v.purpose,
		building_id: v.buildingId || null,
		building_name: v.buildingName || null,
		room_id: v.roomId || null,
		room_number: v.roomNumber || null,
		host_person: v.hostPerson || null,
		photo_url: v.photoUrl || null,
		check_in_time: v.checkInTime,
		check_out_time: v.checkOutTime || null,
		room_check_in_time: v.roomCheckInTime || null,
		status: v.status,
		verification_status: v.verificationStatus,
		rejection_reason: v.rejectionReason || null,
		pass_code: v.passCode,
	};
}

// Local Data Access Helper Functions
export async function getLocalVisitors(): Promise<Visitor[]> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("visitors")
			.select("*")
			.order("check_in_time", { ascending: false });
		if (!error && data) {
			return data.map(mapDbVisitorToVisitor);
		}
		console.warn("Supabase fetch visitors error, using mock fallback:", error);
	}
	return [...localVisitorsStore];
}

export async function addLocalVisitor(
	visitor: Omit<
		Visitor,
		"id" | "passCode" | "checkInTime" | "status" | "verificationStatus"
	> & { verificationStatus?: VerificationStatus },
): Promise<Visitor> {
	const newVisitor: Visitor = {
		...visitor,
		id: "vis-" + Math.floor(100000 + Math.random() * 900000),
		checkInTime: new Date().toISOString(),
		checkOutTime: null,
		status: "checked_in",
		verificationStatus: visitor.verificationStatus || "approved",
		passCode: "VP-" + Math.floor(1000 + Math.random() * 9000),
	};

	if (isSupabaseConfigured && supabase) {
		const dbRow = mapVisitorToDbVisitor(newVisitor);
		const { data, error } = await supabase
			.from("visitors")
			.insert([dbRow])
			.select()
			.single();
		if (!error && data) {
			return mapDbVisitorToVisitor(data);
		}
		console.warn("Supabase insert visitor error, using mock fallback:", error);
	}

	localVisitorsStore = [newVisitor, ...localVisitorsStore];
	return newVisitor;
}

export async function verifyVisitor(
	id: string,
	status: VerificationStatus,
	reason?: string,
): Promise<Visitor | null> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("visitors")
			.update({
				verification_status: status,
				rejection_reason: reason || null,
			})
			.eq("id", id)
			.select()
			.single();
		if (!error && data) {
			return mapDbVisitorToVisitor(data);
		}
		console.warn("Supabase verify visitor error, using mock fallback:", error);
	}

	let target: Visitor | null = null;
	localVisitorsStore = localVisitorsStore.map((v) => {
		if (v.id === id) {
			target = {
				...v,
				verificationStatus: status,
				rejectionReason: reason || undefined,
			};
			return target;
		}
		return v;
	});
	return target;
}

export async function updateOfficeCheckIn(
	id: string,
	checkIn: boolean,
): Promise<Visitor | null> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("visitors")
			.update({
				room_check_in_time: checkIn ? new Date().toISOString() : null,
			})
			.eq("id", id)
			.select()
			.single();
		if (!error && data) {
			return mapDbVisitorToVisitor(data);
		}
		console.warn(
			"Supabase office check-in update error, using mock fallback:",
			error,
		);
	}

	let target: Visitor | null = null;
	localVisitorsStore = localVisitorsStore.map((v) => {
		if (v.id === id) {
			target = {
				...v,
				roomCheckInTime: checkIn ? new Date().toISOString() : null,
			};
			return target;
		}
		return v;
	});
	return target;
}

export async function checkoutLocalVisitor(
	idOrPassCode: string,
): Promise<Visitor | null> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("visitors")
			.update({
				status: "checked_out",
				check_out_time: new Date().toISOString(),
				room_check_in_time: null,
			})
			.or(`id.eq.${idOrPassCode},pass_code.eq.${idOrPassCode}`)
			.select();
		if (!error && data && data.length > 0) {
			return mapDbVisitorToVisitor(data[0]);
		}
		console.warn(
			"Supabase checkout visitor error, using mock fallback:",
			error,
		);
	}

	let target: Visitor | null = null;
	localVisitorsStore = localVisitorsStore.map((v) => {
		if (
			(v.id === idOrPassCode || v.passCode === idOrPassCode) &&
			v.status === "checked_in"
		) {
			target = {
				...v,
				status: "checked_out",
				checkOutTime: new Date().toISOString(),
				roomCheckInTime: null,
			};
			return target;
		}
		return v;
	});
	return target;
}

export async function getLocalProfiles(): Promise<
	(Profile & { password?: string })[]
> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("profiles")
			.select("*")
			.order("created_at", { ascending: true });
		if (!error && data) {
			return data.map(mapDbProfileToProfile);
		}
		console.warn("Supabase fetch profiles error, using mock fallback:", error);
	}
	return [...localProfilesStore];
}

export async function addLocalProfile(
	email: string,
	role: "admin" | "security" | "staff",
	password?: string,
	roomId?: string,
): Promise<Profile> {
	const newProfile: Profile & { password?: string } = {
		id: "usr-" + Math.floor(1000 + Math.random() * 9000),
		email,
		role,
		password,
		roomId,
		createdAt: new Date().toISOString(),
	};

	if (isSupabaseConfigured && supabase) {
		// 1. Create a non-session-persisting temporary client to sign up the new user
		const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false,
			},
		});

		const { data: authData, error: authError } = await tempSupabase.auth.signUp(
			{
				email,
				password: password || "Default123456!",
				options: {
					data: {
						role,
						room_id: roomId || null
					}
				}
			},
		);

		if (authError || !authData.user) {
			throw new Error(
				authError?.message || "Failed to create authentication user.",
			);
		}

		const profile: Profile = {
			id: authData.user.id,
			email: authData.user.email || email,
			role,
			roomId,
			createdAt: authData.user.created_at,
		};

		return profile;
	}

	localProfilesStore = [...localProfilesStore, newProfile];
	return newProfile;
}

// Buildings local store fallback
let localBuildingsStore = [...MOCK_BUILDINGS];
let localRoomsStore = [...MOCK_ROOMS];

export async function getLocalBuildings(): Promise<Building[]> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("buildings")
			.select("*")
			.order("name", { ascending: true });
		if (!error && data) {
			return data.map(mapDbBuildingToBuilding);
		}
		console.warn("Supabase fetch buildings error, using mock fallback:", error);
	}
	return [...localBuildingsStore];
}

export async function addLocalBuilding(
	building: Omit<Building, "id">,
): Promise<Building> {
	const newBuilding: Building = {
		...building,
		id: "bld-" + Math.floor(1000 + Math.random() * 9000),
	};

	if (isSupabaseConfigured && supabase) {
		const dbRow = {
			name: building.name,
			code: building.code,
			floors: building.floors,
			description: building.description,
			head_person: building.headPerson || null,
			contact_email: building.contactEmail || null,
			x_coord: building.xCoord || null,
			y_coord: building.yCoord || null,
			color: building.color || null,
			image_url: building.imageUrl || null,
		};

		const { data, error } = await supabase
			.from("buildings")
			.insert([dbRow])
			.select()
			.single();

		if (!error && data) {
			return mapDbBuildingToBuilding(data);
		}
		console.warn("Supabase insert building error, using mock fallback:", error);
	}

	localBuildingsStore = [...localBuildingsStore, newBuilding];
	return newBuilding;
}

export async function deleteLocalBuilding(id: string): Promise<boolean> {
	if (isSupabaseConfigured && supabase) {
		const { error } = await supabase.from("buildings").delete().eq("id", id);
		if (!error) {
			return true;
		}
		console.warn("Supabase delete building error, using mock fallback:", error);
	}

	const initialLength = localBuildingsStore.length;
	localBuildingsStore = localBuildingsStore.filter((o) => o.id !== id);
	return localBuildingsStore.length < initialLength;
}

export async function getLocalRooms(): Promise<Room[]> {
	if (isSupabaseConfigured && supabase) {
		const { data, error } = await supabase
			.from("rooms")
			.select("*")
			.order("room_number", { ascending: true });
		if (!error && data) {
			return data.map(mapDbRoomToRoom);
		}
		console.warn("Supabase fetch rooms error, using mock fallback:", error);
	}
	return [...localRoomsStore];
}

export async function addLocalRoom(room: Omit<Room, "id">): Promise<Room> {
	const newRoom: Room = {
		...room,
		id: "rm-" + Math.floor(1000 + Math.random() * 9000),
	};

	if (isSupabaseConfigured && supabase) {
		const dbRow = {
			building_id: room.buildingId,
			room_number: room.roomNumber,
			room_name: room.roomName,
			floor: room.floor,
			x_coord: room.xCoord || 0,
			y_coord: room.yCoord || 0,
			description: room.description || null,
			image_url: room.imageUrl || null,
		};

		const { data, error } = await supabase
			.from("rooms")
			.insert([dbRow])
			.select()
			.single();

		if (!error && data) {
			return mapDbRoomToRoom(data);
		}
		console.warn("Supabase insert room error, using mock fallback:", error);
	}

	localRoomsStore = [...localRoomsStore, newRoom];
	return newRoom;
}

export async function deleteLocalRoom(id: string): Promise<boolean> {
	if (isSupabaseConfigured && supabase) {
		const { error } = await supabase.from("rooms").delete().eq("id", id);
		if (!error) {
			return true;
		}
		console.warn("Supabase delete room error, using mock fallback:", error);
	}

	const initialLength = localRoomsStore.length;
	localRoomsStore = localRoomsStore.filter((r) => r.id !== id);
	return localRoomsStore.length < initialLength;
}
