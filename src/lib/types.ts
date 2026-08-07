export interface Building {
	id: string;
	name: string;
	code: string;
	floors: number;
	description: string;
	headPerson?: string;
	contactEmail?: string;
	xCoord?: number;
	yCoord?: number;
	color?: string;
	imageUrl?: string;
	lat?: number;
	lng?: number;
}

export interface Room {
	id: string;
	buildingId: string;
	roomNumber: string;
	roomName: string;
	floor: string;
	xCoord: number;
	yCoord: number;
	description?: string;
	imageUrl?: string;
}

export interface Office {
	id: string;
	name: string;
	code: string;
	buildingId: string;
	buildingName?: string;
	roomId?: string;
	roomNumber?: string;
	headPerson?: string;
	contactEmail?: string;
	operatingHours?: string;
	description?: string;
	isActive: boolean;
}

export type VisitorStatus = 'checked_in' | 'checked_out' | 'expired';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface RegisteredVisitor {
	id: string;
	fullName: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	email: string;
	phone: string;
	photoUrl?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface VisitorLog {
	id: string;
	visitorId: string;
	purpose: string;
	officeId?: string;
	officeName?: string;
	buildingId?: string;
	buildingName?: string;
	roomId?: string;
	roomNumber?: string;
	hostPerson?: string;
	checkInTime: string;
	checkOutTime?: string | null;
	roomCheckInTime?: string | null;
	status: VisitorStatus;
	verificationStatus: VerificationStatus;
	rejectionReason?: string;
	passCode: string;
	lastLatitude?: number;
	lastLongitude?: number;
	lastLocatedAt?: string;
}

export interface Visitor {
	id: string;
	fullName: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	email: string;
	phone: string;
	purpose: string;
	officeId?: string;
	officeName?: string;
	buildingId: string;
	buildingName?: string;
	roomId?: string;
	roomNumber?: string;
	hostPerson?: string;
	photoUrl?: string; // Visitor face snapshot URL
	checkInTime: string;
	checkOutTime?: string | null;
	roomCheckInTime?: string | null; // Confirmation time when scanning room door QR code
	status: VisitorStatus;
	verificationStatus: VerificationStatus;
	rejectionReason?: string;
	passCode: string;
	lat?: number;
	lng?: number;
	visitorId?: string;
	lastLatitude?: number;
	lastLongitude?: number;
	lastLocatedAt?: string;
}

export interface MapNode {
	id: string;
	name: string;
	x: number;
	y: number;
	type: 'entrance' | 'hallway' | 'office' | 'room' | 'stairs' | 'elevator';
	neighbors: string[];
}

export interface NavigationRoute {
	fromNodeId: string;
	toNodeId: string;
	pathPoints: [number, number][];
	distanceMeters: number;
	instructions: string[];
}

export interface Profile {
	id: string;
	email: string;
	role: 'admin' | 'security' | 'staff';
	officeId?: string;
	roomId?: string;
	createdAt?: string;
}

export interface MapEdge {
	id: string;
	fromNode: string;
	toNode: string;
	path: [number, number][];
	createdAt?: string;
}
