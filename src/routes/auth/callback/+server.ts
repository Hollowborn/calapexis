import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next');

	if (code) {
		const { error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);

		if (exchangeError) {
			console.error('[OAuth Callback Error] Code exchange failed:', exchangeError.message);
		} else {
			const { user } = await locals.safeGetSession();

			// If visitor is performing Google Fill-Up on /v
			if (next && next.startsWith('/v')) {
				const separator = next.includes('?') ? '&' : '?';
				throw redirect(303, `${next}${separator}google_fill=true`);
			}

			if (user?.email) {
				// Verify membership in public.profiles table by id or email
				let { data: profile } = await locals.supabase
					.from('profiles')
					.select('*')
					.eq('id', user.id)
					.maybeSingle();

				if (!profile) {
					const { data: byEmail } = await locals.supabase
						.from('profiles')
						.select('*')
						.ilike('email', user.email)
						.maybeSingle();
					profile = byEmail;

					// Synchronize profile ID to match Auth user ID if profile was created prior
					if (profile && profile.id !== user.id) {
						await locals.supabase
							.from('profiles')
							.update({ id: user.id })
							.eq('email', user.email);
					}
				}

				if (profile) {
					// Account exists in BOTH auth.users and public.profiles -> Allow login
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
						cookies.set('session_room_id', officeId, {
							path: '/',
							httpOnly: true,
							sameSite: 'lax',
							secure: false,
							maxAge: 60 * 60 * 24
						});
					}

					const targetPath = profile.role === 'admin'
						? '/dashboard'
						: profile.role === 'security'
							? '/dashboard/security'
							: '/dashboard/staff';

					throw redirect(303, `${targetPath}?login=google_success`);
				} else {
					// User exists in auth.users BUT NOT in public.profiles -> Revoke access!
					console.warn(
						`[OAuth Security Alert] Google user "${user.email}" authenticated via Auth but missing in public.profiles. Revoking access.`
					);
					await locals.supabase.auth.signOut();
					cookies.delete('session_role', { path: '/' });
					cookies.delete('session_office_id', { path: '/' });
					cookies.delete('session_room_id', { path: '/' });
					throw redirect(303, '/login?error=unprovisioned_google_account');
				}
			}
		}
	}

	throw redirect(303, '/login?error=oauth_failed');
};
