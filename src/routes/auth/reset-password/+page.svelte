<svelte:head>
	<title>Reset Account Password | Calapexis</title>
	<meta name="description" content="Set a new password for your Calapexis staff or admin account." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Alert from "$lib/components/ui/alert/index.js";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import BrandLogo from "$lib/components/brand-logo.svelte";
	import { toast } from "svelte-sonner";

	// Icons
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import CheckCircleIcon from "@lucide/svelte/icons/circle-check";
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";

	let { data } = $props();

	let newPassword = $state("");
	let confirmPassword = $state("");
	let isUpdating = $state(false);
	let isSuccess = $state(false);
	let isAuthenticated = $state(data.hasServerSession);
	let activeUserEmail = $state(data.userEmail || "");
	let isCheckingSession = $state(!data.hasServerSession);

	onMount(() => {
		// Listen for recovery event if user came via hash fragment
		const { data: authListener } = data.supabase.auth.onAuthStateChange(
			(event: string, session: any) => {
				if (event === "PASSWORD_RECOVERY" || session?.user) {
					isAuthenticated = true;
					activeUserEmail = session?.user?.email || activeUserEmail;
					isCheckingSession = false;
				}
			}
		);

		// Also verify active session directly in client
		data.supabase.auth
			.getSession()
			.then(({ data: { session } }: any) => {
				if (session?.user) {
					isAuthenticated = true;
					activeUserEmail = session.user.email || activeUserEmail;
				}
			})
			.catch((e: any) => {
				console.warn("Could not check client auth session:", e);
			})
			.finally(() => {
				isCheckingSession = false;
			});

		return () => {
			authListener.subscription.unsubscribe();
		};
	});

	async function handleUpdatePassword(e: Event) {
		e.preventDefault();

		if (!newPassword || newPassword.length < 6) {
			toast.error("Password must be at least 6 characters long.");
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error("Passwords do not match. Please re-enter.");
			return;
		}

		isUpdating = true;
		try {
			const { error } = await data.supabase.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				throw error;
			}

			isSuccess = true;
			toast.success("Password updated successfully!");

			setTimeout(() => {
				goto("/login?reset=success");
			}, 2500);
		} catch (err: any) {
			toast.error(err?.message || "Failed to update password. Please try again.");
		} finally {
			isUpdating = false;
		}
	}
</script>

<div class="min-h-screen w-full flex flex-col justify-between bg-muted/20 text-foreground relative p-4 sm:p-8">
	<!-- Top Navigation Bar -->
	<header class="w-full max-w-4xl mx-auto flex items-center justify-between py-2">
		<Button
			href="/login"
			variant="outline"
			size="sm"
			class="rounded-xl text-xs font-bold gap-2 bg-card border-border/80 hover:bg-muted/50 cursor-pointer shadow-xs"
		>
			<ArrowLeftIcon data-icon="inline-start" />
			<span>Back to Login</span>
		</Button>
		<ThemeToggle />
	</header>

	<!-- Main Card Content -->
	<main class="w-full max-w-md mx-auto my-auto flex flex-col gap-6">
		<div class="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl flex flex-col gap-6">
			<!-- Header -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<div class="size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-black shadow-md shadow-primary/20 ring-4 ring-primary/10 shrink-0">
						<BrandLogo class="ml-0.5 mt-0.5" />
					</div>
					{#if activeUserEmail}
						<Badge variant="outline" class="text-[10px] font-mono font-bold max-w-[200px] truncate">
							{activeUserEmail}
						</Badge>
					{/if}
				</div>

				<div class="flex flex-col gap-1">
					<h1 class="text-2xl font-black tracking-tight text-foreground">
						Set New Password
					</h1>
					<p class="text-xs text-muted-foreground font-semibold leading-relaxed">
						Create a secure password to access your Calapexis staff or administrator portal.
					</p>
				</div>
			</div>

			{#if isCheckingSession}
				<!-- Loading State -->
				<div class="py-12 flex flex-col items-center justify-center gap-3 text-center">
					<div class="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
					<p class="text-xs font-semibold text-muted-foreground">
						Verifying password recovery session...
					</p>
				</div>
			{:else if isSuccess}
				<!-- Success State -->
				<div class="py-8 flex flex-col items-center justify-center gap-4 text-center">
					<div class="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
						<CheckCircleIcon class="size-7" />
					</div>
					<div class="flex flex-col gap-1">
						<h3 class="text-base font-black text-foreground">Password Updated!</h3>
						<p class="text-xs text-muted-foreground font-semibold leading-relaxed max-w-xs">
							Your new password has been saved. You can now use it to sign in directly.
						</p>
					</div>
					<Button
						href="/login"
						class="w-full rounded-xl text-xs font-bold mt-2 cursor-pointer shadow-xs"
					>
						<span>Proceed to Login</span>
					</Button>
				</div>
			{:else if !isAuthenticated}
				<!-- Expired / Invalid Session Alert -->
				<div class="flex flex-col gap-4">
					<Alert.Root variant="destructive" class="rounded-2xl">
						<AlertCircleIcon class="size-4 shrink-0 pointer-events-none" />
						<Alert.Title class="font-extrabold text-xs">Recovery Link Expired or Invalid</Alert.Title>
						<Alert.Description class="text-xs leading-relaxed font-semibold mt-1">
							This password reset link is invalid, has expired, or was already used. Please return to the login page and request a new password recovery link.
						</Alert.Description>
					</Alert.Root>

					<Button
						href="/login"
						class="w-full rounded-xl text-xs font-bold cursor-pointer"
					>
						<span>Return to Login</span>
					</Button>
				</div>
			{:else}
				<!-- Password Reset Form -->
				<form onsubmit={handleUpdatePassword} class="flex flex-col gap-4">
					<Field.FieldGroup class="flex flex-col gap-3.5">
						<Field.Field>
							<Field.Label for="new-password" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
								New Password
							</Field.Label>
							<Input
								type="password"
								id="new-password"
								name="password"
								required
								minlength={6}
								maxlength={50}
								placeholder="Enter at least 6 characters"
								bind:value={newPassword}
								class="rounded-xl h-10 border-border bg-background shadow-xs text-xs font-semibold"
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="confirm-password" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
								Confirm New Password
							</Field.Label>
							<Input
								type="password"
								id="confirm-password"
								name="confirmPassword"
								required
								minlength={6}
								maxlength={50}
								placeholder="Re-enter your password"
								bind:value={confirmPassword}
								class="rounded-xl h-10 border-border bg-background shadow-xs text-xs font-semibold"
							/>
						</Field.Field>
					</Field.FieldGroup>

					<div class="p-3 rounded-2xl border border-border bg-muted/30 flex items-start gap-2.5 mt-1">
						<ShieldCheckIcon class="size-4 text-primary shrink-0 mt-0.5" />
						<p class="text-[11px] text-muted-foreground font-medium leading-relaxed">
							Setting a direct password allows you to log in anytime, even when your connected Google account is temporarily unreachable.
						</p>
					</div>

					<Button
						type="submit"
						disabled={isUpdating}
						class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-2 mt-2 shadow-md shadow-primary/10 transition-all cursor-pointer"
					>
						{#if isUpdating}
							<div class="size-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin"></div>
							<span>Saving New Password...</span>
						{:else}
							<KeyRoundIcon data-icon="inline-start" />
							<span>Update & Save Password</span>
						{/if}
					</Button>
				</form>
			{/if}
		</div>
	</main>

	<!-- Footer -->
	<footer class="w-full max-w-4xl mx-auto py-4 text-center">
		<p class="text-[10px] text-muted-foreground/60 font-medium">
			Bohol Island State University - Calape Campus • Calapexis Security & Wayfinding Portal
		</p>
	</footer>
</div>
