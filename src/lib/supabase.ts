import { createClient } from '@supabase/supabase-js';
import type { Office, Room, Visitor, MapNode } from './types';

// Read env variables (optional - will fall back to local store if unconfigured)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;

// Initial Mock Offices & Rooms Data
export const MOCK_OFFICES: Office[] = [
	{
		id: 'off-1',
		name: 'Registrar & Admissions Office',
		code: 'REG',
		building: 'Administration Building',
		floor: '1st Floor',
		description: 'Student registration, transcripts, enrollment, and diploma requests.',
		headPerson: 'Dr. Maria Santos',
		contactEmail: 'registrar@university.edu',
		xCoord: 450,
		yCoord: 350
	},
	{
		id: 'off-2',
		name: 'Cashier & Finance Office',
		code: 'CASH',
		building: 'Administration Building',
		floor: '1st Floor',
		description: 'Tuition payment processing, cashier transactions, and financial aid.',
		headPerson: 'Mr. Juan Dela Cruz',
		contactEmail: 'cashier@university.edu',
		xCoord: 580,
		yCoord: 320
	},
	{
		id: 'off-3',
		name: 'College of Computer Studies (CCS)',
		code: 'CCS',
		building: 'Technology Complex',
		floor: '2nd Floor',
		description: 'Dean office, faculty rooms, and IT research laboratories.',
		headPerson: 'Engr. Robert Lee',
		contactEmail: 'ccs@university.edu',
		xCoord: 300,
		yCoord: 600
	},
	{
		id: 'off-4',
		name: 'Student Affairs & Services (SDS)',
		code: 'SDS',
		building: 'Student Activity Center',
		floor: '1st Floor',
		description: 'Student organization permits, counseling, discipline, and campus activities.',
		headPerson: 'Prof. Ana Reyes',
		contactEmail: 'sds@university.edu',
		xCoord: 720,
		yCoord: 480
	},
	{
		id: 'off-5',
		name: 'College of Teacher Education (CTE)',
		code: 'CTE',
		building: 'Academic Hall A',
		floor: '2nd Floor',
		description: 'Faculty office for Education and Pedagogy programs.',
		headPerson: 'Dr. Elizabeth Cruz',
		contactEmail: 'cte@university.edu',
		xCoord: 220,
		yCoord: 250
	}
];

export const MOCK_ROOMS: Room[] = [
	{
		id: 'rm-101',
		officeId: 'off-1',
		roomNumber: 'Room 101',
		roomName: 'Admissions & Records Counter',
		building: 'Administration Building',
		floor: '1st Floor',
		xCoord: 450,
		yCoord: 350,
		description: 'Window counter for visitor inquiry and document submission.'
	},
	{
		id: 'rm-102',
		officeId: 'off-2',
		roomNumber: 'Room 102',
		roomName: 'Payment Counter 1 & 2',
		building: 'Administration Building',
		floor: '1st Floor',
		xCoord: 580,
		yCoord: 320,
		description: 'Official student payment processing desks.'
	},
	{
		id: 'rm-201',
		officeId: 'off-3',
		roomNumber: 'Lab 201',
		roomName: 'Software Engineering Laboratory',
		building: 'Technology Complex',
		floor: '2nd Floor',
		xCoord: 310,
		yCoord: 590,
		description: 'Computer workstation lab for programming classes.'
	},
	{
		id: 'rm-202',
		officeId: 'off-3',
		roomNumber: 'Room 205',
		roomName: 'Dean Office - CCS',
		building: 'Technology Complex',
		floor: '2nd Floor',
		xCoord: 290,
		yCoord: 610,
		description: 'Dean executive office and consultation room.'
	},
	{
		id: 'rm-105',
		officeId: 'off-4',
		roomNumber: 'Room 105',
		roomName: 'Guidance & Counseling Suite',
		building: 'Student Activity Center',
		floor: '1st Floor',
		xCoord: 720,
		yCoord: 480,
		description: 'Confidential student consultation rooms.'
	}
];

export const MOCK_MAP_NODES: MapNode[] = [
	{ id: 'node-entrance', name: 'Main Campus Gate Entrance', x: 100, y: 400, type: 'entrance', neighbors: ['node-h1'] },
	{ id: 'node-h1', name: 'Central Quadrangle Walkway', x: 300, y: 400, type: 'hallway', neighbors: ['node-entrance', 'node-admin', 'node-tech', 'node-sac'] },
	{ id: 'node-admin', name: 'Administration Building Entrance', x: 450, y: 350, type: 'office', neighbors: ['node-h1', 'node-cashier'] },
	{ id: 'node-cashier', name: 'Cashier Counter Area', x: 580, y: 320, type: 'room', neighbors: ['node-admin'] },
	{ id: 'node-tech', name: 'Technology Complex Gate', x: 300, y: 550, type: 'hallway', neighbors: ['node-h1', 'node-ccs'] },
	{ id: 'node-ccs', name: 'College of Computer Studies', x: 300, y: 600, type: 'office', neighbors: ['node-tech'] },
	{ id: 'node-sac', name: 'Student Activity Center Entrance', x: 650, y: 450, type: 'hallway', neighbors: ['node-h1', 'node-sds'] },
	{ id: 'node-sds', name: 'Student Affairs Office', x: 720, y: 480, type: 'office', neighbors: ['node-sac'] }
];

// Initial Visitors Dataset
let localVisitorsStore: Visitor[] = [
	{
		id: 'vis-1001',
		fullName: 'Alex Morgan',
		email: 'alex.m@gmail.com',
		phone: '+63 917 123 4567',
		purpose: 'Transcript of Records Request',
		officeId: 'off-1',
		officeName: 'Registrar & Admissions Office',
		roomId: 'rm-101',
		roomNumber: 'Room 101',
		hostPerson: 'Dr. Maria Santos',
		checkInTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
		checkOutTime: null,
		status: 'checked_in',
		passCode: 'VP-8921'
	},
	{
		id: 'vis-1002',
		fullName: 'Sarah Jenkins',
		email: 'sjenkins@outlook.com',
		phone: '+63 918 987 6543',
		purpose: 'Tuition Payment Inquiry',
		officeId: 'off-2',
		officeName: 'Cashier & Finance Office',
		roomId: 'rm-102',
		roomNumber: 'Room 102',
		hostPerson: 'Mr. Juan Dela Cruz',
		checkInTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
		checkOutTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
		status: 'checked_out',
		passCode: 'VP-3412'
	},
	{
		id: 'vis-1003',
		fullName: 'Carlos Rodriguez',
		email: 'carlos.rod@yahoo.com',
		phone: '+63 922 456 7890',
		purpose: 'Faculty Research Consultation',
		officeId: 'off-3',
		officeName: 'College of Computer Studies (CCS)',
		roomId: 'rm-202',
		roomNumber: 'Room 205',
		hostPerson: 'Engr. Robert Lee',
		checkInTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
		checkOutTime: null,
		status: 'checked_in',
		passCode: 'VP-7561'
	}
];

// Local Data Access Helper Functions
export function getLocalVisitors(): Visitor[] {
	return [...localVisitorsStore];
}

export function addLocalVisitor(visitor: Omit<Visitor, 'id' | 'passCode' | 'checkInTime' | 'status'>): Visitor {
	const newVisitor: Visitor = {
		...visitor,
		id: 'vis-' + Math.floor(100000 + Math.random() * 900000),
		checkInTime: new Date().toISOString(),
		checkOutTime: null,
		status: 'checked_in',
		passCode: 'VP-' + Math.floor(1000 + Math.random() * 9000)
	};
	localVisitorsStore = [newVisitor, ...localVisitorsStore];
	return newVisitor;
}

export function checkoutLocalVisitor(idOrPassCode: string): Visitor | null {
	let target: Visitor | null = null;
	localVisitorsStore = localVisitorsStore.map((v) => {
		if ((v.id === idOrPassCode || v.passCode === idOrPassCode) && v.status === 'checked_in') {
			target = {
				...v,
				status: 'checked_out',
				checkOutTime: new Date().toISOString()
			};
			return target;
		}
		return v;
	});
	return target;
}
