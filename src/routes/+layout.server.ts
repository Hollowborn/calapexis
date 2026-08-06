import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	const { session, user } = await safeGetSession();
	const sessionRole = cookies.get('session_role');
	const sessionRoomId = cookies.get('session_room_id');

	return {
		session,
		user,
		sessionRole,
		sessionRoomId
	};
};
