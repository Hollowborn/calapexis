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

export type VisitorStatus = 'checked_in' | 'checked_out' | 'expired';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Visitor {
	id: string;
	fullName: string;
	firstName?: string;
	middleName?: string;
	lastName?: string;
	email: string;
	phone: string;
	purpose: string;
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
	roomId?: string;
	createdAt?: string;
}
