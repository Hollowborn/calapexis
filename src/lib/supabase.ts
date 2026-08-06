import { createClient } from "@supabase/supabase-js";
import type {
  Building,
  Room,
  Office,
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
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: typeof window === "undefined",
        autoRefreshToken: typeof window === "undefined",
        detectSessionInUrl: typeof window === "undefined",
      },
    })
  : null;

// Get the appropriate database client
export function getDbClient(overrideClient?: any) {
  if (overrideClient) return overrideClient;
  return supabase;
}

// Initial Mock Buildings & Rooms Data
export const MOCK_BUILDINGS: Building[] = [
  {
    id: "off-1",
    name: "Administration Building",
    code: "ADMIN",
    floors: 3,
    description:
      "Main administrative services including registrar, cashier, and admissions counters.",
    headPerson: "Dr. Maria Santos",
    contactEmail: "registrar@university.edu",
    xCoord: 450,
    yCoord: 350,
    lat: 9.894414,
    lng: 123.88258,
  },
  {
    id: "off-3",
    name: "Technology Complex",
    code: "TECH",
    floors: 4,
    description:
      "Dean office, IT laboratories, and engineering workstation complexes.",
    headPerson: "Engr. Robert Lee",
    contactEmail: "ccs@university.edu",
    xCoord: 300,
    yCoord: 600,
    lat: 9.89392,
    lng: 123.88204,
  },
  {
    id: "off-4",
    name: "Student Activity Center",
    code: "SAC",
    floors: 2,
    description:
      "Student organization offices, cafeteria, and guidance services.",
    headPerson: "Prof. Ana Reyes",
    contactEmail: "sds@university.edu",
    xCoord: 700,
    yCoord: 450,
    lat: 9.89485,
    lng: 123.88312,
  },
  {
    id: "off-5",
    name: "Academic Hall A",
    code: "ACAD-A",
    floors: 3,
    description:
      "Lecture halls, general education classrooms, and faculty lounges.",
    headPerson: "Dr. Elena Cruz",
    contactEmail: "academic@university.edu",
    xCoord: 200,
    yCoord: 200,
    lat: 9.89512,
    lng: 123.88225,
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
export const MOCK_VISITORS: Visitor[] = [
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
    lat: 9.89445,
    lng: 123.88261,
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
    lat: 9.89438,
    lng: 123.88248,
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
    lat: 9.89396,
    lng: 123.88208,
  },
];

export const MOCK_PROFILES: (Profile & { password?: string })[] = [
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
    officeId: "of-101",
    roomId: "rm-101",
    createdAt: new Date().toISOString(),
  },
];

// Global HMR-persistent state store (survives Vite code re-evaluations during development)
const g = globalThis as any;
export function getCalapexisStore() {
  if (!g.__CALAPEXIS_STORE__) {
    g.__CALAPEXIS_STORE__ = {
      buildings: [...MOCK_BUILDINGS],
      rooms: [...MOCK_ROOMS],
      offices: [...MOCK_OFFICES],
      visitors: [...MOCK_VISITORS],
      profiles: [...MOCK_PROFILES],
    };
  }
  return g.__CALAPEXIS_STORE__;
}

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
    officeId: db.office_id,
    roomId: db.room_id,
    createdAt: db.created_at,
  };
}

export function mapDbVisitorToVisitor(db: any): Visitor {
  return {
    id: db.id,
    fullName: db.full_name,
    firstName: db.first_name || "",
    middleName: db.middle_name || "",
    lastName: db.last_name || "",
    email: db.email,
    phone: db.phone,
    purpose: db.purpose,
    officeId: db.office_id || "",
    officeName: db.office_name || "",
    buildingId: db.building_id || "",
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
    visitorId: db.visitor_id || "",
    lastLatitude:
      db.last_latitude !== undefined && db.last_latitude !== null
        ? Number(db.last_latitude)
        : undefined,
    lastLongitude:
      db.last_longitude !== undefined && db.last_longitude !== null
        ? Number(db.last_longitude)
        : undefined,
    lastLocatedAt: db.last_located_at || undefined,
    lat:
      db.last_latitude !== undefined && db.last_latitude !== null
        ? Number(db.last_latitude)
        : db.lat,
    lng:
      db.last_longitude !== undefined && db.last_longitude !== null
        ? Number(db.last_longitude)
        : db.lng,
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
    office_id: v.officeId || null,
    office_name: v.officeName || null,
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
    visitor_id: v.visitorId || null,
  };
}

// Local Data Access Helper Functions
export async function getLocalVisitors(
  todayOnly: boolean = false,
): Promise<Visitor[]> {
  if (isSupabaseConfigured && supabase) {
    let query = getDbClient().from("visitors").select("*");

    if (todayOnly) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      query = query.or(
        `status.eq.checked_in,check_in_time.gte.${startOfToday.toISOString()}`,
      );
    }

    const { data, error } = await query.order("check_in_time", {
      ascending: false,
    });
    if (error) {
      console.error("[Supabase Error] Failed to fetch visitors:", error);
      throw new Error(`[Database Error] ${error.message}`);
    }
    const mapped = (data || []).map(mapDbVisitorToVisitor);
    getCalapexisStore().visitors = mapped;
    return mapped;
  }
  return [...getCalapexisStore().visitors];
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
    try {
      const dbClient = getDbClient();
      // 1. Upsert / Insert into registered_visitors
      let regData: any = null;
      let regErr: any = null;

      if (newVisitor.email && newVisitor.email.trim()) {
        const res = await dbClient
          .from("registered_visitors")
          .upsert(
            {
              full_name: newVisitor.fullName,
              first_name: newVisitor.firstName || null,
              middle_name: newVisitor.middleName || null,
              last_name: newVisitor.lastName || null,
              email: newVisitor.email,
              phone: newVisitor.phone || null,
              photo_url: newVisitor.photoUrl || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "email" },
          )
          .select()
          .single();
        regData = res.data;
        regErr = res.error;
      } else {
        const res = await dbClient
          .from("registered_visitors")
          .insert([
            {
              full_name: newVisitor.fullName,
              first_name: newVisitor.firstName || null,
              middle_name: newVisitor.middleName || null,
              last_name: newVisitor.lastName || null,
              email: null,
              phone: newVisitor.phone || null,
              photo_url: newVisitor.photoUrl || null,
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        regData = res.data;
        regErr = res.error;
      }

      if (!regErr && regData) {
        newVisitor.visitorId = regData.id;
        // 2. Insert Visitor Log entry referencing visitor_id and office_id
        const { data: logData, error: logErr } = await dbClient
          .from("visitor_logs")
          .insert([
            {
              id: newVisitor.id,
              visitor_id: regData.id,
              office_id: newVisitor.officeId || null,
              purpose: newVisitor.purpose,
              host_person: newVisitor.hostPerson || null,
              check_in_time: newVisitor.checkInTime,
              status: newVisitor.status,
              verification_status: newVisitor.verificationStatus,
              pass_code: newVisitor.passCode,
            },
          ])
          .select()
          .single();

        if (!logErr && logData) {
          return {
            ...newVisitor,
            ...mapDbVisitorToVisitor({ ...logData, ...regData }),
          };
        }
      }
    } catch (e) {
      console.warn(
        "Supabase normalized visitor insert error, using fallback:",
        e,
      );
    }
  }

  getCalapexisStore().visitors = [newVisitor, ...getCalapexisStore().visitors];
  return newVisitor;
}

export async function verifyVisitor(
  id: string,
  status: VerificationStatus,
  reason?: string,
): Promise<Visitor | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await getDbClient()
      .from("visitors")
      .update({
        verification_status: status,
        rejection_reason: reason || null,
      })
      .eq("id", id)
      .select();
    if (!error && data && data.length > 0) {
      return mapDbVisitorToVisitor(data[0]);
    }
    if (error) {
      console.warn(
        "Supabase verify visitor error, using mock fallback:",
        error,
      );
    }
  }

  let target: Visitor | null = null;
  getCalapexisStore().visitors = getCalapexisStore().visitors.map(
    (v: Visitor) => {
      if (v.id === id) {
        target = {
          ...v,
          verificationStatus: status,
          rejectionReason: reason || undefined,
        };
        return target;
      }
      return v;
    },
  );
  return target;
}

export async function updateOfficeCheckIn(
  id: string,
  checkIn: boolean,
  roomId?: string,
  roomNumber?: string,
): Promise<Visitor | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await getDbClient()
      .from("visitors")
      .update({
        room_check_in_time: checkIn ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select();
    if (!error && data && data.length > 0) {
      return mapDbVisitorToVisitor(data[0]);
    }
    if (error) {
      console.warn(
        "Supabase office check-in update error, using mock fallback:",
        error,
      );
    }
  }

  let target: Visitor | null = null;
  getCalapexisStore().visitors = getCalapexisStore().visitors.map(
    (v: Visitor) => {
      if (v.id === id) {
        target = {
          ...v,
          roomId: roomId || undefined,
          roomNumber: roomNumber || undefined,
          roomCheckInTime: new Date().toISOString(),
        };
        return target;
      }
      return v;
    },
  );
  return target;
}

export async function checkoutLocalVisitor(
  idOrPassCode: string,
  staffOfficeId?: string | null,
  isStaffOnly?: boolean,
): Promise<Visitor | null> {
  if (isSupabaseConfigured && supabase) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrPassCode,
      );

    if (isStaffOnly && staffOfficeId) {
      const selectQuery = getDbClient()
        .from("visitor_logs")
        .select("office_id");
      const { data: targetLog } = isUuid
        ? await selectQuery.eq("id", idOrPassCode).maybeSingle()
        : await selectQuery.eq("pass_code", idOrPassCode).maybeSingle();

      if (
        targetLog &&
        targetLog.office_id &&
        targetLog.office_id !== staffOfficeId
      ) {
        throw new Error(
          "Access Denied: Staff can only check out visitors assigned to their managed office desk.",
        );
      }
    }

    const query = getDbClient().from("visitor_logs").update({
      status: "checked_out",
      check_out_time: new Date().toISOString(),
    });

    const { data, error } = isUuid
      ? await query.eq("id", idOrPassCode).select()
      : await query.eq("pass_code", idOrPassCode).select();

    if (!error && data && data.length > 0) {
      const { data: fullData } = await getDbClient()
        .from("visitors")
        .select("*")
        .eq("id", data[0].id)
        .maybeSingle();

      if (fullData) {
        return mapDbVisitorToVisitor(fullData);
      }
    }
    if (error) {
      throw new Error(error.message);
    }
  }

  let target: Visitor | null = null;
  getCalapexisStore().visitors = getCalapexisStore().visitors.map(
    (v: Visitor) => {
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
    },
  );
  return target;
}

export async function getLocalProfiles(
  overrideAdminClient?: any,
): Promise<(Profile & { password?: string })[]> {
  if (isSupabaseConfigured && supabase) {
    const dbClient = overrideAdminClient || getDbClient();
    const { data, error } = await dbClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Supabase Error] Failed to fetch profiles:", error);
      throw new Error(`[Database Error] ${error.message}`);
    }
    const mapped = (data || []).map(mapDbProfileToProfile);
    getCalapexisStore().profiles = mapped;
    return mapped;
  }
  return [...getCalapexisStore().profiles];
}

export const DEFAULT_EMAIL_DOMAIN = "bisu.edu.ph";

export async function addLocalProfile(
  email: string,
  role: "admin" | "security" | "staff",
  password?: string,
  officeId?: string,
  roomId?: string,
  overrideClient?: any,
): Promise<Profile> {
  const formattedEmail = email.includes("@")
    ? email.trim()
    : `${email.trim()}@${DEFAULT_EMAIL_DOMAIN}`;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(officeId || "");
  const validOfficeId = isUuid ? officeId : null;

  console.log(
    `[User Creation] Provisioning user account for "${formattedEmail}" (${role}, officeId: ${validOfficeId})...`,
  );

  if (isSupabaseConfigured && supabase) {
    const client = overrideClient || supabase;

    // 1. If admin client is available, create user in Auth first (clean, no metadata trigger crash)
    if (client?.auth?.admin) {
      if (!password) {
        throw new Error("Password is required to create a new user account.");
      }

      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: formattedEmail,
        password: password,
        email_confirm: true
      });

      if (authError) {
        console.error("[Supabase Auth Admin Create User Error]", authError);
        throw new Error(authError.message || "Failed to create user account in Supabase Auth.");
      }

      const newAuthUser = authData?.user;
      if (!newAuthUser) {
        throw new Error("Supabase Auth returned no user object.");
      }

      // Step 2: Insert corresponding profile into public.profiles
      const dbRow: any = {
        id: newAuthUser.id,
        email: formattedEmail,
        role,
        office_id: validOfficeId,
      };

      const { data: profileData, error: profileErr } = await client
        .from("profiles")
        .upsert([dbRow], { onConflict: "id" })
        .select()
        .maybeSingle();

      if (profileErr) {
        // Rollback: If profile creation fails, delete the created Auth user
        console.error("[Profile Creation Error] Rolling back Auth user:", profileErr.message);
        await client.auth.admin.deleteUser(newAuthUser.id);
        throw new Error(`Profile creation failed: ${profileErr.message}`);
      }

      const mapped = profileData ? mapDbProfileToProfile(profileData) : {
        id: newAuthUser.id,
        email: formattedEmail,
        role,
        officeId: validOfficeId || undefined,
        createdAt: new Date().toISOString(),
      };

      getCalapexisStore().profiles = [...getCalapexisStore().profiles, mapped];
      return mapped;
    }

    // Direct database fallback insert into public.profiles if admin client is unconfigured
    const dbRow: any = {
      email: formattedEmail,
      role,
      office_id: validOfficeId,
    };

    const { data, error } = await client
      .from("profiles")
      .insert([dbRow])
      .select()
      .maybeSingle();

    if (error) {
      console.error("[Database Profile Insert Error]", error);
      if (error.message?.includes("duplicate key") || error.code === "23505") {
        throw new Error(
          `An account with email "${formattedEmail}" already exists.`,
        );
      }
      throw new Error(`[Database Insert Error] ${error.message}`);
    }

    if (data) {
      const mapped = mapDbProfileToProfile(data);
      getCalapexisStore().profiles = [...getCalapexisStore().profiles, mapped];
      return mapped;
    }
  }

  // Offline mock mode if Supabase is unconfigured
  const mockProfile: Profile & { password?: string } = {
    id: "usr-" + Math.floor(1000 + Math.random() * 9000),
    email: formattedEmail,
    role,
    password,
    officeId,
    roomId,
    createdAt: new Date().toISOString(),
  };

  getCalapexisStore().profiles = [...getCalapexisStore().profiles, mockProfile];
  return mockProfile;
}

export async function updateLocalProfile(
  id: string,
  updates: Partial<Profile> & { password?: string },
  overrideAdminClient?: any,
): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const dbClient = overrideAdminClient || getDbClient();
    const dbRow: any = {};
    if (updates.email !== undefined) dbRow.email = updates.email;
    if (updates.role !== undefined) dbRow.role = updates.role;
    if (updates.officeId !== undefined)
      dbRow.office_id = updates.officeId || null;
    if (updates.roomId !== undefined) dbRow.room_id = updates.roomId || null;

    // 1. If admin client is available, update auth.users
    if (dbClient?.auth?.admin) {
      const authAdminUpdates: any = {};
      if (updates.email) authAdminUpdates.email = updates.email;
      if (updates.password) authAdminUpdates.password = updates.password;
      authAdminUpdates.user_metadata = {
        role: updates.role,
        office_id: updates.officeId || null,
        room_id: updates.roomId || null,
      };
      await dbClient.auth.admin
        .updateUserById(id, authAdminUpdates)
        .catch((err: any) => {
          console.warn("Supabase auth.admin updateUserById warning:", err);
        });
    }

    // 2. Update public.profiles table
    const { data, error } = await dbClient
      .from("profiles")
      .update(dbRow)
      .eq("id", id)
      .select();

    if (!error && data && data.length > 0) {
      return mapDbProfileToProfile(data[0]);
    }
    if (error) {
      console.error("Supabase update profile error:", error.message);
      throw new Error(error.message || "Failed to update profile in database.");
    }
  }

  let target: Profile | null = null;
  getCalapexisStore().profiles = getCalapexisStore().profiles.map(
    (p: Profile) => {
      if (p.id === id) {
        target = {
          ...p,
          ...updates,
        };
        return target;
      }
      return p;
    },
  );
  return target;
}

export async function deleteLocalProfile(
  id: string,
  overrideAdminClient?: any,
): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const dbClient = overrideAdminClient || getDbClient();

    // 1. Delete from auth.users via admin if available (cascades to profiles)
    if (dbClient?.auth?.admin) {
      const { error: adminAuthErr } = await dbClient.auth.admin.deleteUser(id);
      if (!adminAuthErr) {
        return true;
      }
      console.warn(
        "Supabase auth.admin deleteUser warning:",
        adminAuthErr.message,
      );
    }

    // 2. Delete directly from public.profiles table
    const { error } = await dbClient.from("profiles").delete().eq("id", id);
    if (!error) {
      return true;
    }
    console.error("Supabase delete profile error:", error.message);
    throw new Error(error.message || "Failed to delete profile from database.");
  }

  const initialLength = getCalapexisStore().profiles.length;
  getCalapexisStore().profiles = getCalapexisStore().profiles.filter(
    (p: Profile) => p.id !== id,
  );
  return getCalapexisStore().profiles.length < initialLength;
}

export async function signInWithGoogle(customClient?: any) {
  const client = customClient || supabase;
  if (!client) {
    throw new Error("Supabase is not configured for OAuth authentication.");
  }
  return await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
    },
  });
}

// Buildings local store fallback
export const MOCK_OFFICES: Office[] = [
  {
    id: "of-101",
    name: "Registrar & Admissions Desk",
    code: "OFF-REG",
    buildingId: "off-1",
    buildingName: "Administration Building",
    roomId: "rm-101",
    roomNumber: "Room 101",
    headPerson: "Dr. Maria Santos",
    contactEmail: "registrar@university.edu",
    operatingHours: "8:00 AM - 5:00 PM",
    description:
      "Official check-in desk for student transcripts, enrollment, and records inquiries.",
    isActive: true,
  },
  {
    id: "of-102",
    name: "Cashier & Finance Counter",
    code: "OFF-CASH",
    buildingId: "off-1",
    buildingName: "Administration Building",
    roomId: "rm-102",
    roomNumber: "Room 102",
    headPerson: "Mr. Juan Delgado",
    contactEmail: "cashier@university.edu",
    operatingHours: "8:00 AM - 4:00 PM",
    description: "Payment and tuition assessment desk.",
    isActive: true,
  },
  {
    id: "of-301",
    name: "College of Computer Studies Dean's Office",
    code: "OFF-CCS",
    buildingId: "off-3",
    buildingName: "Technology Complex",
    roomId: "rm-301",
    roomNumber: "Room 301",
    headPerson: "Engr. Robert Lee",
    contactEmail: "ccs@university.edu",
    operatingHours: "8:00 AM - 5:00 PM",
    description: "Faculty consultation and dean transaction reception desk.",
    isActive: true,
  },
  {
    id: "of-401",
    name: "Guidance & Student Services Counter",
    code: "OFF-GUIDE",
    buildingId: "off-4",
    buildingName: "Student Activity Center",
    headPerson: "Prof. Ana Reyes",
    contactEmail: "sds@university.edu",
    operatingHours: "8:00 AM - 5:00 PM",
    description: "Student welfare, counseling, and organizational permit desk.",
    isActive: true,
  },
];

export async function getLocalBuildings(): Promise<Building[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await getDbClient()
      .from("buildings")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("[Supabase Error] Failed to fetch buildings:", error);
      throw new Error(`[Database Error] ${error.message}`);
    }
    const mapped = (data || []).map(mapDbBuildingToBuilding);
    getCalapexisStore().buildings = mapped;
    return mapped;
  }
  return [...getCalapexisStore().buildings];
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

    const { data, error } = await getDbClient()
      .from("buildings")
      .insert([dbRow])
      .select()
      .single();

    if (!error && data) {
      return mapDbBuildingToBuilding(data);
    }
    console.warn("Supabase insert building error, using mock fallback:", error);
  }

  getCalapexisStore().buildings = [
    ...getCalapexisStore().buildings,
    newBuilding,
  ];
  return newBuilding;
}

export async function updateLocalBuilding(
  id: string,
  updates: Partial<Omit<Building, "id">>,
): Promise<Building | null> {
  if (isSupabaseConfigured && supabase) {
    const dbRow: any = {};
    if (updates.name !== undefined) dbRow.name = updates.name;
    if (updates.code !== undefined) dbRow.code = updates.code;
    if (updates.floors !== undefined) dbRow.floors = updates.floors;
    if (updates.description !== undefined)
      dbRow.description = updates.description;
    if (updates.headPerson !== undefined)
      dbRow.head_person = updates.headPerson || null;
    if (updates.contactEmail !== undefined)
      dbRow.contact_email = updates.contactEmail || null;
    if (updates.xCoord !== undefined) dbRow.x_coord = updates.xCoord || null;
    if (updates.yCoord !== undefined) dbRow.y_coord = updates.yCoord || null;
    if (updates.color !== undefined) dbRow.color = updates.color || null;
    if (updates.imageUrl !== undefined)
      dbRow.image_url = updates.imageUrl || null;

    const { data, error } = await getDbClient()
      .from("buildings")
      .update(dbRow)
      .eq("id", id)
      .select();

    if (!error && data && data.length > 0) {
      return mapDbBuildingToBuilding(data[0]);
    }
    if (error) {
      console.warn(
        "Supabase update building error, using mock fallback:",
        error,
      );
    }
  }

  let target: Building | null = null;
  getCalapexisStore().buildings = getCalapexisStore().buildings.map(
    (b: Building) => {
      if (b.id === id) {
        target = {
          ...b,
          ...updates,
        };
        return target;
      }
      return b;
    },
  );
  return target;
}

export async function deleteLocalBuilding(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await getDbClient()
      .from("buildings")
      .delete()
      .eq("id", id);
    if (!error) {
      return true;
    }
    console.warn("Supabase delete building error, using mock fallback:", error);
  }

  const initialLength = getCalapexisStore().buildings.length;
  getCalapexisStore().buildings = getCalapexisStore().buildings.filter(
    (b: Building) => b.id !== id,
  );
  return getCalapexisStore().buildings.length < initialLength;
}

export async function getLocalRooms(): Promise<Room[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await getDbClient()
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true });
    if (error) {
      console.error("[Supabase Error] Failed to fetch rooms:", error);
      throw new Error(`[Database Error] ${error.message}`);
    }
    const mapped = (data || []).map(mapDbRoomToRoom);
    getCalapexisStore().rooms = mapped;
    return mapped;
  }
  return [...getCalapexisStore().rooms];
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

    const { data, error } = await getDbClient()
      .from("rooms")
      .insert([dbRow])
      .select()
      .single();

    if (!error && data) {
      return mapDbRoomToRoom(data);
    }
    console.warn("Supabase insert room error, using mock fallback:", error);
  }

  getCalapexisStore().rooms = [...getCalapexisStore().rooms, newRoom];
  return newRoom;
}

export async function updateLocalRoom(
  id: string,
  updates: Partial<Room>,
): Promise<Room | null> {
  if (isSupabaseConfigured && supabase) {
    const dbRow: any = {};
    if (updates.buildingId !== undefined)
      dbRow.building_id = updates.buildingId;
    if (updates.roomNumber !== undefined)
      dbRow.room_number = updates.roomNumber;
    if (updates.roomName !== undefined) dbRow.room_name = updates.roomName;
    if (updates.floor !== undefined) dbRow.floor = updates.floor;
    if (updates.xCoord !== undefined) dbRow.x_coord = updates.xCoord;
    if (updates.yCoord !== undefined) dbRow.y_coord = updates.yCoord;
    if (updates.description !== undefined)
      dbRow.description = updates.description || null;
    if (updates.imageUrl !== undefined)
      dbRow.image_url = updates.imageUrl || null;

    const { data, error } = await getDbClient()
      .from("rooms")
      .update(dbRow)
      .eq("id", id)
      .select();

    if (!error && data && data.length > 0) {
      return mapDbRoomToRoom(data[0]);
    }
    if (error) {
      console.warn("Supabase update room error, using mock fallback:", error);
    }
  }

  let target: Room | null = null;
  getCalapexisStore().rooms = getCalapexisStore().rooms.map((r: Room) => {
    if (r.id === id) {
      target = {
        ...r,
        ...updates,
      };
      return target;
    }
    return r;
  });
  return target;
}

export async function deleteLocalRoom(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await getDbClient().from("rooms").delete().eq("id", id);
    if (!error) {
      return true;
    }
    console.warn("Supabase delete room error, using mock fallback:", error);
  }

  const initialLength = getCalapexisStore().rooms.length;
  getCalapexisStore().rooms = getCalapexisStore().rooms.filter(
    (r: Room) => r.id !== id,
  );
  return getCalapexisStore().rooms.length < initialLength;
}

export async function uploadLocalImage(
  fileBuffer: ArrayBuffer | Uint8Array,
  fileName: string,
  contentType: string,
  serviceRoleKey?: string,
): Promise<string> {
  const key =
    serviceRoleKey ||
    (typeof window === "undefined"
      ? (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY
      : "");

  if (isSupabaseConfigured && supabaseUrl) {
    const client = key
      ? createClient(supabaseUrl, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : getDbClient() || supabase;

    if (!client) {
      throw new Error("Supabase client is not configured.");
    }

    const { data, error } = await client.storage
      .from("campus-assets")
      .upload(fileName, fileBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Supabase Storage Upload Error details:", error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from("campus-assets").getPublicUrl(fileName);

    if (!publicUrl) {
      throw new Error("Failed to resolve public URL for uploaded asset.");
    }

    return publicUrl;
  }

  // Fallback mock image URL during offline development
  return `https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&auto=format&fit=crop&q=60`;
}

// Offices Database Mappers & Store Operations
function mapDbOfficeToOffice(row: any): Office {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    buildingId: row.building_id,
    buildingName: row.buildings?.name,
    roomId: row.room_id || undefined,
    roomNumber: row.rooms?.room_number || undefined,
    headPerson: row.head_person || undefined,
    contactEmail: row.contact_email || undefined,
    operatingHours: row.operating_hours || undefined,
    description: row.description || undefined,
    isActive: row.is_active ?? true,
  };
}

export async function getLocalOffices(): Promise<Office[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await getDbClient()
      .from("offices")
      .select("*, buildings(name), rooms(room_number)")
      .order("name", { ascending: true });
    if (error) {
      console.error("[Supabase Error] Failed to fetch offices:", error);
      throw new Error(`[Database Error] ${error.message}`);
    }
    const mapped = (data || []).map(mapDbOfficeToOffice);
    getCalapexisStore().offices = mapped;
    return mapped;
  }
  return [...getCalapexisStore().offices];
}

export async function addLocalOffice(
  office: Omit<Office, "id">,
): Promise<Office> {
  const building = getCalapexisStore().buildings.find(
    (b: Building) => b.id === office.buildingId,
  );
  const room = getCalapexisStore().rooms.find(
    (r: Room) => r.id === office.roomId,
  );

  const newOffice: Office = {
    ...office,
    id: "of-" + Math.floor(1000 + Math.random() * 9000),
    buildingName: building?.name,
    roomNumber: room?.roomNumber,
  };

  if (isSupabaseConfigured && supabase) {
    const dbRow = {
      name: office.name,
      code: office.code,
      building_id: office.buildingId,
      room_id: office.roomId || null,
      head_person: office.headPerson || null,
      contact_email: office.contactEmail || null,
      operating_hours: office.operatingHours || null,
      description: office.description || null,
      is_active: office.isActive ?? true,
    };

    const { data, error } = await getDbClient()
      .from("offices")
      .insert([dbRow])
      .select("*, buildings(name), rooms(room_number)");

    if (!error && data && data.length > 0) {
      return mapDbOfficeToOffice(data[0]);
    }
    console.warn("Supabase insert office error, using mock fallback:", error);
  }

  getCalapexisStore().offices = [...getCalapexisStore().offices, newOffice];
  return newOffice;
}

export async function updateLocalOffice(
  id: string,
  updates: Partial<Office>,
): Promise<Office | null> {
  if (isSupabaseConfigured && supabase) {
    const dbRow: any = {};
    if (updates.name !== undefined) dbRow.name = updates.name;
    if (updates.code !== undefined) dbRow.code = updates.code;
    if (updates.buildingId !== undefined)
      dbRow.building_id = updates.buildingId;
    if (updates.roomId !== undefined) dbRow.room_id = updates.roomId || null;
    if (updates.headPerson !== undefined)
      dbRow.head_person = updates.headPerson || null;
    if (updates.contactEmail !== undefined)
      dbRow.contact_email = updates.contactEmail || null;
    if (updates.operatingHours !== undefined)
      dbRow.operating_hours = updates.operatingHours || null;
    if (updates.description !== undefined)
      dbRow.description = updates.description || null;
    if (updates.isActive !== undefined) dbRow.is_active = updates.isActive;

    const { data, error } = await getDbClient()
      .from("offices")
      .update(dbRow)
      .eq("id", id)
      .select("*, buildings(name), rooms(room_number)");

    if (!error && data && data.length > 0) {
      return mapDbOfficeToOffice(data[0]);
    }
    if (error) {
      console.warn("Supabase update office error, using mock fallback:", error);
    }
  }

  let target: Office | null = null;
  getCalapexisStore().offices = getCalapexisStore().offices.map((o: Office) => {
    if (o.id === id) {
      const building = updates.buildingId
        ? getCalapexisStore().buildings.find(
            (b: Building) => b.id === updates.buildingId,
          )
        : undefined;
      const room = updates.roomId
        ? getCalapexisStore().rooms.find((r: Room) => r.id === updates.roomId)
        : undefined;

      target = {
        ...o,
        ...updates,
        buildingName: building?.name || o.buildingName,
        roomNumber: room?.roomNumber || o.roomNumber,
      };
      return target;
    }
    return o;
  });
  return target;
}

export async function deleteLocalOffice(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await getDbClient().from("offices").delete().eq("id", id);
    if (!error) {
      return true;
    }
    console.warn("Supabase delete office error, using mock fallback:", error);
  }

  const initialLength = getCalapexisStore().offices.length;
  getCalapexisStore().offices = getCalapexisStore().offices.filter(
    (o: Office) => o.id !== id,
  );
  return getCalapexisStore().offices.length < initialLength;
}
