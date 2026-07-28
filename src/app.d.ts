declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			sessionRole?: string;
			session?: {
				role: string;
				roomId?: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
