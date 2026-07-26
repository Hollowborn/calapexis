<script lang="ts">
	import { getContext } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';
	import { fade, slide } from 'svelte/transition';
	
	// Icons
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import XIcon from '@lucide/svelte/icons/x';
	import MapIcon from '@lucide/svelte/icons/map';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import GridIcon from '@lucide/svelte/icons/grid';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import BarChart2Icon from '@lucide/svelte/icons/bar-chart-2';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';

	let { data, form } = $props();

	let username = $state('');
	let password = $state('');
	let isGuideOpen = $state(false);

	let resolveLogin: (val?: any) => void;
	let rejectLogin: (err: any) => void;

	// SvelteKit use:enhance form submission promise hook
	const handleLoginEnhance: SubmitFunction = () => {
		const loginPromise = new Promise((resolve, reject) => {
			resolveLogin = resolve;
			rejectLogin = reject;
		});

		toast.promise(loginPromise, {
			loading: "Verifying credentials...",
			success: "Authentication successful! Redirecting...",
			error: (err: any) => err.message || "Verification failed."
		});

		return async ({ result, update }) => {
			if (result.type === "redirect") {
				resolveLogin();
				await update();
			} else if (result.type === "failure") {
				rejectLogin(new Error((result.data as any)?.message || "Invalid username or password."));
			} else {
				rejectLogin(new Error("An unexpected server error occurred."));
			}
		};
	};

	// Trigger error notification if redirect auth flags error
	$effect(() => {
		if (data?.error) {
			const reason = data.error.replace('unauthorized_', '');
			toast.error(`Unauthorized: Log in as a verified ${reason} to view that portal.`);
		}
		if (data?.logout) {
			toast.success('Logged out successfully!');
		}
	});
</script>

<div class="bg-background text-foreground font-sans min-h-screen flex w-full">
	<!-- Left Side: Branding / Phone Mockup (Hidden on mobile) -->
	<div class="hidden md:flex md:w-1/2 bg-muted/30 border-r border-border flex-col items-center justify-center p-8 relative overflow-hidden">
		<!-- Decorative background elements -->
		<div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
		<div class="absolute -bottom-24 -right-24 w-96 h-96 bg-muted rounded-full blur-3xl"></div>

		<!-- Text Header -->
		<div class="relative z-10 text-center mb-8 flex flex-col items-center">
			<h1 class="text-3xl font-black tracking-tight text-foreground mb-2">
				Calapexis - Campus Visitor Guide
			</h1>
			<p class="text-muted-foreground text-xs font-semibold max-w-sm leading-relaxed">
				Manage live visitors, verify IDs, and track campus hotspots in real-time.
			</p>
		</div>

		<!-- Phone Mockup Container -->
		<div class="relative z-10 w-72 h-[560px] bg-zinc-950 rounded-[3rem] border-[10px] border-zinc-950 shadow-2xl overflow-hidden ring-1 ring-zinc-800 flex items-center justify-center">
			<!-- Phone Notch -->
			<div class="absolute top-0 inset-x-0 h-5 bg-zinc-950 rounded-b-2xl mx-16 z-20 flex justify-center items-end pb-1">
				<div class="w-12 h-1 bg-zinc-800 rounded-full mb-1"></div>
			</div>

			<img
				src="/screenshot.png"
				class="w-full h-full bg-zinc-50 border-0 object-cover"
				alt="Campus Map Preview"
			/>
		</div>

		<a
			href="/"
			class="relative z-10 mt-8 inline-flex items-center justify-center rounded-full bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 px-5 py-2.5 transition-colors shadow-xs"
		>
			<ArrowLeftIcon class="w-3.5 h-3.5 mr-2 pointer-events-none" />
			<span>Back to Map</span>
		</a>
	</div>

	<!-- Right Side: Login Form -->
	<div class="w-full md:w-1/2 flex items-center justify-center p-8 bg-background">
		<div class="w-full max-w-md flex flex-col gap-8">
			<div class="flex flex-col gap-2 relative">
				<Button
					onclick={() => (isGuideOpen = true)}
					variant="outline"
					size="sm"
					class="absolute right-0 top-0 text-xs font-semibold gap-1.5 rounded-xl border-border/80"
				>
					<BookOpenIcon class="w-3.5 h-3.5" />
					<span>Guide</span>
				</Button>
				<h2 class="text-3xl font-black tracking-tight text-foreground">
					Welcome back
				</h2>
				<p class="text-xs text-muted-foreground font-semibold leading-relaxed">
					Enter your credentials to access the security dashboard.
				</p>
			</div>

			<!-- Error Alert display -->
			{#if data?.error || form?.message}
				<div class="rounded-xl bg-destructive/10 p-4 border border-destructive/20 transition-all">
					<div class="flex items-start gap-3">
						<AlertCircleIcon class="h-5 w-5 text-destructive pointer-events-none shrink-0" />
						<div class="space-y-0.5">
							<h3 class="text-xs font-bold text-destructive">
								Authentication Error
							</h3>
							<p class="text-[11px] text-destructive/80 font-medium">
								{form?.message || "Invalid login credentials."}
							</p>
						</div>
					</div>
				</div>
			{/if}

			<form method="POST" action="?/login" use:enhance={handleLoginEnhance} class="flex flex-col gap-5">
				<div class="flex flex-col gap-2">
					<label
						for="email"
						class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
					>
						Username / Email
					</label>
					<Input
						type="text"
						id="email"
						name="username"
						required
						maxlength={35}
						placeholder="admin"
						bind:value={username}
						class="rounded-xl h-10 border-border bg-background shadow-xs focus-visible:ring-primary/20 text-xs font-semibold"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<label
						for="password"
						class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
					>
						Password
					</label>
					<Input
						type="password"
						id="password"
						name="password"
						required
						maxlength={15}
						placeholder="••••••••"
						bind:value={password}
						class="rounded-xl h-10 border-border bg-background shadow-xs focus-visible:ring-primary/20 text-xs font-semibold"
					/>
				</div>

				<Button
					type="submit"
					class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 mt-2 shadow-md shadow-primary/10 transition-all cursor-pointer"
				>
					<KeyRoundIcon class="size-4 pointer-events-none" />
					<span>Sign In</span>
				</Button>
			</form>

			<!-- Dev Quick Fill helpers -->
			{#if import.meta.env.DEV}
				<div class="border border-border/80 bg-card rounded-2xl p-4 shadow-sm">
					<div class="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
						<span>Dev Quick Fill Credentials</span>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => { username = 'admin'; password = 'admin123'; }}
							class="text-[10px] font-bold h-8 rounded-lg cursor-pointer"
						>
							Admin
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => { username = 'security'; password = 'security123'; }}
							class="text-[10px] font-bold h-8 rounded-lg cursor-pointer"
						>
							Security
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => { username = 'staff'; password = 'staff123'; }}
							class="text-[10px] font-bold h-8 rounded-lg cursor-pointer"
						>
							Staff
						</Button>
					</div>
				</div>
			{/if}

			<p class="text-center text-[10px] text-muted-foreground/60 font-medium">
				Powered by Supabase Authentication
			</p>
		</div>
	</div>
</div>

<!-- Admin Guide Slide-over Panel -->
{#if isGuideOpen}
	<!-- Backdrop overlay -->
	<div
		transition:fade={{ duration: 150 }}
		onclick={() => (isGuideOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isGuideOpen = false)}
		role="button"
		tabindex="0"
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 cursor-pointer"
		aria-label="Close guide panel"
	></div>

	<!-- Slide-over container -->
	<div
		transition:slide={{ axis: 'x', duration: 250 }}
		class="fixed inset-y-0 right-0 max-w-md w-full bg-card border-l border-border shadow-2xl flex flex-col z-50"
	>
		<div class="flex items-center justify-between p-6 border-b border-border">
			<div>
				<h2 class="text-base font-black text-foreground">Dashboard Guide</h2>
				<p class="text-[11px] text-muted-foreground font-semibold leading-relaxed">How to use the admin features</p>
			</div>
			<Button
				onclick={() => (isGuideOpen = false)}
				variant="ghost"
				size="icon"
				class="rounded-full hover:bg-muted/60"
			>
				<XIcon class="w-4 h-4 text-muted-foreground hover:text-foreground" />
			</Button>
		</div>

		<div class="flex-1 overflow-y-auto p-6 space-y-6 font-medium">
			<!-- Feature 1 -->
			<div class="flex gap-4">
				<div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
					<MapIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">Live Campus Tracking</h3>
					<p class="text-xs text-muted-foreground leading-relaxed font-semibold">
						Toggle between a Data Table and a Live Map to monitor currently active visitors. The map automatically plots active visitors on the campus layout and updates their location in real-time.
					</p>
				</div>
			</div>

			<!-- Feature 2 -->
			<div class="flex gap-4">
				<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
					<ShieldCheckIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">ID Verification</h3>
					<p class="text-xs text-muted-foreground leading-relaxed font-semibold">
						Review newly checked-in visitors. Inspect their submitted ID photos and either Approve them (granting them active status) or Reject them (removing them from the system).
					</p>
				</div>
			</div>

			<!-- Feature 3 -->
			<div class="flex gap-4">
				<div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
					<GridIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">Room Activity</h3>
					<p class="text-xs text-muted-foreground leading-relaxed font-semibold">
						View today's visit counts grouped by college/category. Click on any room card to drill down and see the exact entry and exit times of every visitor for any selected date.
					</p>
				</div>
			</div>

			<!-- Feature 4 -->
			<div class="flex gap-4">
				<div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
					<CalendarIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">Historical Logs</h3>
					<p class="text-xs text-muted-foreground leading-relaxed font-semibold">
						Browse and filter complete records of all past visitors by selecting a specific date. You can see their check-in time, check-out time, and purpose.
					</p>
				</div>
			</div>

			<!-- Feature 5 -->
			<div class="flex gap-4">
				<div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
					<BarChart2Icon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">User Analytics</h3>
					<p class="text-xs text-muted-foreground leading-relaxed font-semibold">
						View a leaderboard of frequent visitors, tracking how many times a unique individual has visited the campus over time.
					</p>
				</div>
			</div>
		</div>

		<div class="p-6 bg-muted/40 border-t border-border">
			<p class="text-[10px] text-muted-foreground/60 text-center font-bold">
				BISU Calape - Campus Guide Security System Manual
			</p>
		</div>
	</div>
{/if}
