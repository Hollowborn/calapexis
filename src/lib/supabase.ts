import { createClient } from "@supabase/supabase-js";
import type {
  Office,
  Room,
  Visitor,
  MapNode,
  VerificationStatus,
  Profile,
} from "./types";

// Read env variables (optional - will fall back to local store if unconfigured)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial Mock Offices & Rooms Data
export const MOCK_OFFICES: Office[] = [
  {
    id: "off-1",
    name: "Registrar & Admissions Office",
    code: "REG",
    building: "Administration Building",
    floor: "1st Floor",
    description:
      "Student registration, transcripts, enrollment, and diploma requests.",
    headPerson: "Dr. Maria Santos",
    contactEmail: "registrar@university.edu",
    xCoord: 450,
    yCoord: 350,
  },
  {
    id: "off-2",
    name: "Cashier & Finance Office",
    code: "CASH",
    building: "Administration Building",
    floor: "1st Floor",
    description:
      "Tuition payment processing, cashier transactions, and financial aid.",
    headPerson: "Mr. Juan Dela Cruz",
    contactEmail: "cashier@university.edu",
    xCoord: 580,
    yCoord: 320,
  },
  {
    id: "off-3",
    name: "College of Computer Studies (CCS)",
    code: "CCS",
    building: "Technology Complex",
    floor: "2nd Floor",
    description: "Dean office, faculty rooms, and IT research laboratories.",
    headPerson: "Engr. Robert Lee",
    contactEmail: "ccs@university.edu",
    xCoord: 300,
    yCoord: 600,
  },
  {
    id: "off-4",
    name: "Student Affairs & Services (SDS)",
    code: "SDS",
    building: "Student Activity Center",
    floor: "1st Floor",
    description:
      "Student organization permits, counseling, discipline, and campus activities.",
    headPerson: "Prof. Ana Reyes",
    contactEmail: "sds@university.edu",
    xCoord: 720,
    yCoord: 480,
  },
  {
    id: "off-5",
    name: "College of Teacher Education (CTE)",
    code: "CTE",
    building: "Academic Hall A",
    floor: "2nd Floor",
    description: "Faculty office for Education and Pedagogy programs.",
    headPerson: "Dr. Elizabeth Cruz",
    contactEmail: "cte@university.edu",
    xCoord: 220,
    yCoord: 250,
  },
];

export const MOCK_ROOMS: Room[] = [
  {
    id: "rm-101",
    officeId: "off-1",
    roomNumber: "Room 101",
    roomName: "Admissions & Records Counter",
    building: "Administration Building",
    floor: "1st Floor",
    xCoord: 450,
    yCoord: 350,
    description: "Window counter for visitor inquiry and document submission.",
  },
  {
    id: "rm-102",
    officeId: "off-2",
    roomNumber: "Room 102",
    roomName: "Payment Counter 1 & 2",
    building: "Administration Building",
    floor: "1st Floor",
    xCoord: 580,
    yCoord: 320,
    description: "Official student payment processing desks.",
  },
  {
    id: "rm-201",
    officeId: "off-3",
    roomNumber: "Lab 201",
    roomName: "Software Engineering Laboratory",
    building: "Technology Complex",
    floor: "2nd Floor",
    xCoord: 310,
    yCoord: 590,
    description: "Computer workstation lab for programming classes.",
  },
  {
    id: "rm-202",
    officeId: "off-3",
    roomNumber: "Room 205",
    roomName: "Dean Office - CCS",
    building: "Technology Complex",
    floor: "2nd Floor",
    xCoord: 290,
    yCoord: 610,
    description: "Dean executive office and consultation room.",
  },
  {
    id: "rm-105",
    officeId: "off-4",
    roomNumber: "Room 105",
    roomName: "Guidance & Counseling Suite",
    building: "Student Activity Center",
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
    officeId: "off-1",
    officeName: "Registrar & Admissions Office",
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
    officeId: "off-2",
    officeName: "Cashier & Finance Office",
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
    officeId: "off-3",
    officeName: "College of Computer Studies (CCS)",
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
    officeId: "off-1",
    createdAt: new Date().toISOString(),
  },
];

// --- DB-to-Frontend Converter Mappers ---

function mapDbOfficeToOffice(db: any): Office {
  return {
    id: db.id,
    name: db.name,
    code: db.code,
    building: db.building,
    floor: db.floor,
    description: db.description || "",
    headPerson: db.head_person,
    contactEmail: db.contact_email,
    xCoord: db.x_coord ? Number(db.x_coord) : undefined,
    yCoord: db.y_coord ? Number(db.y_coord) : undefined,
  };
}

function mapDbRoomToRoom(db: any): Room {
  return {
    id: db.id,
    officeId: db.office_id,
    roomNumber: db.room_number,
    roomName: db.room_name,
    building: db.building,
    floor: db.floor,
    xCoord: Number(db.x_coord),
    yCoord: Number(db.y_coord),
    description: db.description || "",
  };
}

function mapDbProfileToProfile(db: any): Profile {
  return {
    id: db.id,
    email: db.email,
    role: db.role,
    officeId: db.office_id,
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
    officeId: db.office_id,
    officeName: db.office_name || "",
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
    office_id: v.officeId || null,
    office_name: v.officeName || null,
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
  officeId?: string,
): Promise<Profile> {
  const newProfile: Profile & { password?: string } = {
    id: "usr-" + Math.floor(1000 + Math.random() * 9000),
    email,
    role,
    password,
    officeId,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const dbRow = {
      id: newProfile.id,
      email,
      role,
      office_id: officeId || null,
    };
    const { data, error } = await supabase
      .from("profiles")
      .insert([dbRow])
      .select()
      .single();
    if (!error && data) {
      return mapDbProfileToProfile(data);
    }
    console.warn("Supabase insert profile error, using mock fallback:", error);
  }

  localProfilesStore = [...localProfilesStore, newProfile];
  return newProfile;
}
