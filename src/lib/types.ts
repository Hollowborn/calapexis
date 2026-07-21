export interface Office {
	id: string;
	name: string;
	code: string;
	building: string;
	floor: string;
	description: string;
	headPerson?: string;
	contactEmail?: string;
	xCoord?: number;
	yCoord?: number;
}

export interface Room {
	id: string;
	officeId: string;
	roomNumber: string;
	roomName: string;
	building: string;
	floor: string;
	xCoord: number;
	yCoord: number;
	description?: string;
}

export type VisitorStatus = 'checked_in' | 'checked_out' | 'expired';

export interface Visitor {
	id: string;
	fullName: string;
	email: string;
	phone: string;
	purpose: string;
	officeId: string;
	officeName?: string;
	roomId?: string;
	roomNumber?: string;
	hostPerson?: string;
	checkInTime: string;
	checkOutTime?: string | null;
	status: VisitorStatus;
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
	pathPoints: [number, number][]; // Leaflet lat/lng or x/y coordinates
	distanceMeters: number;
	instructions: string[];
}
