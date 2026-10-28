import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') || (type === 'recovery' ? '/auth/reset-password' : '/dashboard');

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			const { user } = await locals.safeGetSession();
			if (user?.email) {
				const { data: profile } = await locals.supabase
					.from('profiles')
					.select('*')
					.eq('id', user.id)
					.maybeSingle();

				if (profile) {
					cookies.set('session_role', profile.role, {
						path: '/',
						httpOnly: true,
						sameSite: 'lax',
						secure: false,
						maxAge: 60 * 60 * 24
					});
					const officeId = profile.office_id || profile.room_id;
					if (officeId) {
						cookies.set('session_office_id', officeId, {
							path: '/',
							httpOnly: true,
							sameSite: 'lax',
							secure: false,
							maxAge: 60 * 60 * 24
						});
					}
				}
			}
			throw redirect(303, next);
		}
	} else if (token_hash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash, type });
		if (!error) {
			const { user } = await locals.safeGetSession();
			if (user?.email) {
				const { data: profile } = await locals.supabase
					.from('profiles')
					.select('*')
					.eq('id', user.id)
					.maybeSingle();

				if (profile) {
					cookies.set('session_role', profile.role, {
						path: '/',
						httpOnly: true,
						sameSite: 'lax',
						secure: false,
						maxAge: 60 * 60 * 24
					});
					const officeId = profile.office_id || profile.room_id;
					if (officeId) {
						cookies.set('session_office_id', officeId, {
							path: '/',
							httpOnly: true,
							sameSite: 'lax',
							secure: false,
							maxAge: 60 * 60 * 24
						});
					}
				}
			}
			throw redirect(303, next);
		}
	}

	throw redirect(303, '/login?error=recovery_link_invalid');
};
