<script lang="ts">
	import { getContext, onDestroy } from "svelte";
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "@sveltejs/kit";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldSeparator,
		FieldDescription,
	} from "$lib/components/ui/field/index.js";
	import * as Carousel from "$lib/components/ui/carousel/index.js";
	import type { CarouselAPI } from "$lib/components/ui/carousel/context.js";
	import ThemeToggle from "$lib/components/theme-toggle.svelte";
	import { signInWithGoogle } from "$lib/supabase";
	import { toast } from "svelte-sonner";
	import { fade, slide } from "svelte/transition";
	import * as Alert from "$lib/components/ui/alert/index.js";

	// Icons
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
	import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import XIcon from "@lucide/svelte/icons/x";
	import MapIcon from "@lucide/svelte/icons/map";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import GridIcon from "@lucide/svelte/icons/grid";
	import CalendarIcon from "@lucide/svelte/icons/calendar";
	import BarChart2Icon from "@lucide/svelte/icons/bar-chart-2";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import BarChart3Icon from "@lucide/svelte/icons/bar-chart-3";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import NavigationIcon from "@lucide/svelte/icons/navigation";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import CheckIcon from "@lucide/svelte/icons/check";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";

	let { data, form } = $props();

	let username = $state("");
	let password = $state("");
	let isGuideOpen = $state(false);

	// Carousel state & Embla API binding
	let api = $state<CarouselAPI>();
	let currentSlide = $state(0);
	let isHovered = $state(false);

	const slideDetails = [
		{
			tag: "Live Security Desk",
			title: "Security Gate Console",
			subtitle:
				"Real-time visitor queue, ID photo verification, and rapid gate approvals.",
			color: "from-emerald-500/15 via-primary/10 to-transparent",
		},
		{
			tag: "Interactive GPS Map",
			title: "Interactive Campus Navigation",
			subtitle:
				"High-accuracy GPS pathfinding and turn-by-turn waypoint routing.",
			color: "from-blue-500/15 via-indigo-500/10 to-transparent",
		},
		{
			tag: "Traffic Analytics",
			title: "Real-Time Campus Analytics",
			subtitle:
				"Live density telemetry, visitor duration insights, and peak hours.",
			color: "from-purple-500/15 via-pink-500/10 to-transparent",
		},
		{
			tag: "Digital Passbook",
			title: "Digital Passes & QR Check-In",
			subtitle:
				"Seamless self-service mobile passbook with automated geofence checkout.",
			color: "from-amber-500/15 via-orange-500/10 to-transparent",
		},
	];

	$effect(() => {
		if (!api) return;

		currentSlide = api.selectedScrollSnap();
		api.on("select", () => {
			if (api) {
				currentSlide = api.selectedScrollSnap();
			}
		});

		const timer = setInterval(() => {
			if (!isHovered && api) {
				api.scrollNext();
			}
		}, 5000);

		return () => clearInterval(timer);
	});

	async function handleGoogleSignIn() {
		try {
			toast.promise(signInWithGoogle(data.supabase), {
				loading: "Connecting to Google OAuth...",
				success: "Redirecting to Google...",
				error: (err: any) =>
					err?.message || "Failed to launch Google authentication.",
			});
		} catch (e: any) {
			toast.error(e?.message || "Google Authentication unavailable.");
		}
	}

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
			error: (err: any) => err.message || "Verification failed.",
		});

		return async ({ result, update }) => {
			if (result.type === "redirect") {
				resolveLogin();
				await update();
			} else if (result.type === "failure") {
				rejectLogin(
					new Error(
						(result.data as any)?.message ||
							"Invalid username or password.",
					),
				);
			} else {
				rejectLogin(new Error("An unexpected server error occurred."));
			}
		};
	};

	// Trigger Sonner toast notifications with action buttons for error cases
	$effect(() => {
		if (data?.error === "unprovisioned_google_account") {
			toast.error("Unprovisioned Google Account", {
				description:
					"Your Google Account is not provisioned with system access roles. Contact system admin for access.",
				action: {
					label: "Contact Admin",
					onClick: () => {
						window.location.href =
							"mailto:admin@bisu.edu.ph?subject=Account%20Access%20Request";
					},
				},
				duration: 10000,
			});
		} else if (data?.error === "oauth_failed") {
			toast.error("Google OAuth Failed", {
				description:
					"The Google OAuth authentication process encountered an error or was canceled.",
				action: {
					label: "Retry Sign In",
					onClick: () => handleGoogleSignIn(),
				},
				duration: 8000,
			});
		} else if (data?.error) {
			const reason = data.error
				.replace("unauthorized_", "")
				.toUpperCase();
			toast.error("Portal Access Restricted", {
				description: `Permission Denied: Log in as a verified ${reason} account to view that portal.`,
				duration: 8000,
			});
		}

		if ((form as any)?.code === "unprovisioned_account") {
			toast.error("Account Profile Not Provisioned", {
				description:
					form?.message ||
					"Access profile role mapping is not configured for your account.",
				action: {
					label: "Contact Admin",
					onClick: () => {
						window.location.href =
							"mailto:admin@bisu.edu.ph?subject=Account%20Access%20Request";
					},
				},
				duration: 10000,
			});
		}

		if (data?.login === "google_success") {
			toast.success("Google Authentication successful! Welcome back.");
		}
		if (data?.logout) {
			toast.success("Logged out successfully!");
		}
	});
</script>

<div
	class="bg-background text-foreground font-sans min-h-screen flex w-full relative"
>
	<!-- Left Side: shadcn-svelte Interactive Feature Carousel (Hidden on mobile) -->
	<div
		class="hidden md:flex md:w-1/2 bg-muted/20 border-r border-border/70 flex-col items-center justify-between p-8 lg:p-12 relative overflow-hidden"
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
		role="region"
		aria-label="Calapexis Platform Highlights"
	>
		<!-- Ambient Glow Accents -->
		<div
			class="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"
		></div>
		<div
			class="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"
		></div>

		<!-- Branding Header -->
		<div class="relative z-10 text-center flex flex-col items-center gap-2">
			<div
				class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-wide"
			>
				<SparklesIcon class="size-3.5" />
				<span>BISU CALAPE CAMPUS</span>
			</div>
			<h1 class="text-3xl font-black tracking-tight text-foreground">
				Calapexis Platform
			</h1>
			<p
				class="text-muted-foreground text-xs font-semibold max-w-sm leading-relaxed"
			>
				Intelligent visitor logs, real-time security management, and
				interactive GPS map navigation.
			</p>
		</div>

		<!-- shadcn-svelte Carousel Container -->
		<div class="relative z-10 w-full max-w-md my-4">
			<Carousel.Root
				setApi={(emblaApi) => (api = emblaApi)}
				opts={{ loop: true }}
				class="w-full"
			>
				<Carousel.Content>
					<!-- Slide 1: Security Gate Queue Simulation -->
					<Carousel.Item class="p-1">
						<div
							class="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col justify-between min-h-[420px]"
						>
							<div
								class="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-primary/10 to-transparent pointer-events-none"
							></div>

							<!-- Top Meta Badge -->
							<div
								class="relative z-10 flex items-center justify-between"
							>
								<div class="flex items-center gap-2">
									<div
										class="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
									>
										<ShieldCheckIcon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Live Security Desk
									</Badge>
								</div>
								<span
									class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1"
								>
									<span
										class="size-1.5 rounded-full bg-emerald-500 animate-pulse"
									></span>
									Active Queue
								</span>
							</div>

							<!-- Interactive Card Body -->
							<div
								class="relative z-10 my-4 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-lg backdrop-blur-md flex flex-col gap-3"
							>
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-3">
										<div
											class="size-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-black text-sm text-primary"
										>
											AM
										</div>
										<div>
											<div
												class="font-extrabold text-sm text-foreground flex items-center gap-1.5"
											>
												Alex Morgan
												<Badge
													variant="secondary"
													class="text-[9px] px-1.5 py-0 h-4 font-mono font-bold"
													>VP-8921</Badge
												>
											</div>
											<div
												class="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5"
											>
												<Building2Icon class="size-3" />
												<span
													>Registrar Counter (ADMIN)</span
												>
											</div>
										</div>
									</div>
									<span
										class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full"
									>
										<ClockIcon class="size-3" />
										Just now
									</span>
								</div>

								<div
									class="text-[11px] bg-muted/40 rounded-xl p-2.5 border border-border/50 text-muted-foreground"
								>
									<span class="font-bold text-foreground"
										>Purpose:</span
									> Official Transcript Request & Evaluation.
								</div>

								<div class="grid grid-cols-2 gap-2 pt-1">
									<div
										class="h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5"
									>
										<CheckIcon class="size-3.5" />
										<span>Approve Entry</span>
									</div>
									<div
										class="h-8 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-1.5"
									>
										<XIcon class="size-3.5" />
										<span>Reject</span>
									</div>
								</div>
							</div>

							<!-- Slide Description -->
							<div
								class="relative z-10 border-t border-border/60 pt-3"
							>
								<h3
									class="font-extrabold text-sm text-foreground"
								>
									Security Gate Console
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Verify visitor photo IDs and authorize
									physical desk passes instantly.
								</p>
							</div>
						</div>
					</Carousel.Item>

					<!-- Slide 2: Interactive Campus GPS Map & Pathfinding Simulation -->
					<Carousel.Item class="p-1">
						<div
							class="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col justify-between min-h-[420px]"
						>
							<div
								class="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent pointer-events-none"
							></div>

							<!-- Top Meta Badge -->
							<div
								class="relative z-10 flex items-center justify-between"
							>
								<div class="flex items-center gap-2">
									<div
										class="size-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center"
									>
										<MapPinIcon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Interactive GPS Map
									</Badge>
								</div>
								<Badge
									variant="secondary"
									class="font-mono text-[9px] font-extrabold"
								>
									GPS LOCKED
								</Badge>
							</div>

							<!-- Interactive Card Body: Vector Campus Map -->
							<div
								class="relative z-10 my-4 h-48 w-full rounded-2xl border border-border/80 bg-background/90 overflow-hidden shadow-lg p-3 flex flex-col justify-between"
							>
								<div
									class="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"
								></div>

								<!-- Waypoint Polyline SVG -->
								<svg
									class="absolute inset-0 w-full h-full pointer-events-none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M 40 140 Q 140 110 220 120 T 360 40"
										fill="none"
										stroke="oklch(0.491 0.27 292.581)"
										stroke-width="4"
										stroke-dasharray="6,4"
										class="animate-pulse"
									/>
								</svg>

								<!-- Landmarks -->
								<div
									class="relative z-10 flex justify-between items-start"
								>
									<div
										class="flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-border shadow-xs"
									>
										<span
											class="size-2 rounded-full bg-blue-500 animate-ping"
										></span>
										<span
											class="text-[10px] font-black text-foreground"
											>Main Campus Gate</span
										>
									</div>
									<div
										class="flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 rounded-xl shadow-md"
									>
										<MapPinIcon
											class="size-3 text-primary-foreground"
										/>
										<span class="text-[10px] font-black"
											>Admin Building</span
										>
									</div>
								</div>

								<!-- Live Navigation HUD -->
								<div
									class="relative z-10 bg-card/95 border border-border/80 rounded-xl p-2.5 backdrop-blur-md shadow-md flex items-center justify-between"
								>
									<div class="flex items-center gap-2.5">
										<div
											class="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black"
										>
											<NavigationIcon
												class="size-4 rotate-45"
											/>
										</div>
										<div>
											<div
												class="text-xs font-black text-foreground"
											>
												Turn Left at Quadrangle
											</div>
											<div
												class="text-[10px] text-muted-foreground font-semibold"
											>
												145 meters • 2 min walk
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Slide Description -->
							<div
								class="relative z-10 border-t border-border/60 pt-3"
							>
								<h3
									class="font-extrabold text-sm text-foreground"
								>
									Interactive Campus Navigation
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Turn-by-turn guidance and automated
									pathfinding across university buildings.
								</p>
							</div>
						</div>
					</Carousel.Item>

					<!-- Slide 3: Analytics & Realtime Hotspots -->
					<Carousel.Item class="p-1">
						<div
							class="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col justify-between min-h-[420px]"
						>
							<div
								class="absolute inset-0 bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent pointer-events-none"
							></div>

							<!-- Top Meta Badge -->
							<div
								class="relative z-10 flex items-center justify-between"
							>
								<div class="flex items-center gap-2">
									<div
										class="size-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center"
									>
										<BarChart3Icon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Traffic Analytics
									</Badge>
								</div>
								<span
									class="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20"
								>
									Live Hotspots
								</span>
							</div>

							<!-- Stat Counters & Chart Body -->
							<div
								class="relative z-10 my-4 flex flex-col gap-2.5"
							>
								<div class="grid grid-cols-3 gap-2">
									<div
										class="rounded-xl border border-border/80 bg-background/80 p-2.5 text-center shadow-xs"
									>
										<div
											class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
										>
											Visits
										</div>
										<div
											class="text-lg font-black text-foreground mt-0.5"
										>
											128
										</div>
										<span
											class="text-[8px] text-emerald-500 font-bold"
											>+18% vs avg</span
										>
									</div>
									<div
										class="rounded-xl border border-border/80 bg-background/80 p-2.5 text-center shadow-xs"
									>
										<div
											class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
										>
											Active
										</div>
										<div
											class="text-lg font-black text-primary mt-0.5"
										>
											34
										</div>
										<span
											class="text-[8px] text-muted-foreground font-medium"
											>8 desks</span
										>
									</div>
									<div
										class="rounded-xl border border-border/80 bg-background/80 p-2.5 text-center shadow-xs"
									>
										<div
											class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
										>
											Duration
										</div>
										<div
											class="text-lg font-black text-foreground mt-0.5"
										>
											24m
										</div>
										<span
											class="text-[8px] text-emerald-500 font-bold"
											>Fast turnover</span
										>
									</div>
								</div>

								<!-- Mini CSS Chart -->
								<div
									class="rounded-2xl border border-border/80 bg-background/80 p-3 shadow-md flex flex-col gap-1.5"
								>
									<div
										class="flex items-center justify-between text-[11px] font-bold"
									>
										<span class="text-foreground"
											>Peak Campus Activity</span
										>
										<span
											class="text-muted-foreground text-[10px]"
											>8 AM – 5 PM</span
										>
									</div>
									<div
										class="h-14 flex items-end gap-2 pt-2 px-1"
									>
										<div
											class="flex-1 flex flex-col items-center gap-1"
										>
											<div
												class="w-full bg-primary/20 rounded-t-md h-5"
											></div>
											<span
												class="text-[8px] text-muted-foreground font-semibold"
												>8A</span
											>
										</div>
										<div
											class="flex-1 flex flex-col items-center gap-1"
										>
											<div
												class="w-full bg-primary/40 rounded-t-md h-8"
											></div>
											<span
												class="text-[8px] text-muted-foreground font-semibold"
												>10A</span
											>
										</div>
										<div
											class="flex-1 flex flex-col items-center gap-1"
										>
											<div
												class="w-full bg-primary rounded-t-md h-12 shadow-sm shadow-primary/30"
											></div>
											<span
												class="text-[8px] font-black text-primary"
												>1P</span
											>
										</div>
										<div
											class="flex-1 flex flex-col items-center gap-1"
										>
											<div
												class="w-full bg-primary/70 rounded-t-md h-9"
											></div>
											<span
												class="text-[8px] text-muted-foreground font-semibold"
												>3P</span
											>
										</div>
										<div
											class="flex-1 flex flex-col items-center gap-1"
										>
											<div
												class="w-full bg-primary/30 rounded-t-md h-4"
											></div>
											<span
												class="text-[8px] text-muted-foreground font-semibold"
												>5P</span
											>
										</div>
									</div>
								</div>
							</div>

							<!-- Slide Description -->
							<div
								class="relative z-10 border-t border-border/60 pt-3"
							>
								<h3
									class="font-extrabold text-sm text-foreground"
								>
									Real-Time Campus Analytics
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Department traffic metrics, duration
									telemetry, and peak visit reporting.
								</p>
							</div>
						</div>
					</Carousel.Item>

					<!-- Slide 4: Digital Visitor Pass Hologram -->
					<Carousel.Item class="p-1">
						<div
							class="relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col justify-between min-h-[420px]"
						>
							<div
								class="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent pointer-events-none"
							></div>

							<!-- Top Meta Badge -->
							<div
								class="relative z-10 flex items-center justify-between"
							>
								<div class="flex items-center gap-2">
									<div
										class="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center"
									>
										<QrCodeIcon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Digital Passbook
									</Badge>
								</div>
								<Badge
									class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-bold"
								>
									OFFICIALLY VERIFIED
								</Badge>
							</div>

							<!-- Digital Pass Preview Card -->
							<div
								class="relative z-10 my-4 rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-card via-card/95 to-primary/5 p-4 shadow-xl flex flex-col gap-3"
							>
								<div
									class="flex items-center justify-between border-b border-border/60 pb-2"
								>
									<div class="flex items-center gap-2">
										<div
											class="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-mono font-black text-[10px]"
										>
											B
										</div>
										<span
											class="text-[11px] font-black text-foreground"
											>BISU DIGITAL PASS</span
										>
									</div>
									<span
										class="text-[9px] font-mono font-bold text-primary"
										>VP-7561</span
									>
								</div>

								<div
									class="flex items-center justify-between gap-3"
								>
									<div class="flex flex-col gap-0.5">
										<span
											class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
											>Visitor</span
										>
										<span
											class="text-sm font-extrabold text-foreground"
											>Carlos Rodriguez</span
										>
										<span
											class="text-[10px] text-muted-foreground font-medium"
											>Technology Complex</span
										>
									</div>
									<div
										class="size-14 rounded-xl bg-foreground/5 border border-border p-1 flex items-center justify-center"
									>
										<QrCodeIcon
											class="size-12 text-foreground/80"
										/>
									</div>
								</div>
							</div>

							<!-- Slide Description -->
							<div
								class="relative z-10 border-t border-border/60 pt-3"
							>
								<h3
									class="font-extrabold text-sm text-foreground"
								>
									Digital Passes & Desk QR Check-In
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Self-service mobile check-in passes with
									automated GPS gate check-out.
								</p>
							</div>
						</div>
					</Carousel.Item>
				</Carousel.Content>

				<!-- Controls: Previous, Next & Indicator Pills -->
				<div class="mt-4 flex items-center justify-between px-2">
					<div class="flex items-center gap-1.5">
						{#each slideDetails as _, idx}
							<button
								type="button"
								onclick={() => api?.scrollTo(idx)}
								class="h-2 rounded-full transition-all duration-300 cursor-pointer {currentSlide ===
								idx
									? 'w-7 bg-primary shadow-xs'
									: 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}"
								aria-label="Go to slide {idx + 1}"
							></button>
						{/each}
					</div>

					<div class="flex items-center gap-2">
						<Carousel.Previous
							class="static translate-y-0 size-8 rounded-full border-border bg-background shadow-xs hover:bg-muted"
						/>
						<Carousel.Next
							class="static translate-y-0 size-8 rounded-full border-border bg-background shadow-xs hover:bg-muted"
						/>
					</div>
				</div>
			</Carousel.Root>
		</div>

		<!-- Footer Link -->
		<a
			href="/"
			class="relative z-10 inline-flex items-center justify-center rounded-full bg-card border border-border/80 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 px-5 py-2.5 transition-colors shadow-xs"
		>
			<ArrowLeftIcon class="w-3.5 h-3.5 mr-2 pointer-events-none" />
			<span>Back to Home Page</span>
		</a>
	</div>

	<!-- Right Side: Login Form -->
	<div
		class="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background relative"
	>
		<!-- Top Action Bar with Theme Toggle & Guide Drawer Button -->
		<div class="absolute top-6 right-6 flex items-center gap-2.5 z-20">
			<ThemeToggle />
			<Button
				onclick={() => (isGuideOpen = true)}
				variant="outline"
				size="sm"
				class="text-xs font-semibold gap-1.5 rounded-xl border-border/80 bg-card hover:bg-muted/50 cursor-pointer shadow-xs"
			>
				<BookOpenIcon class="w-3.5 h-3.5" />
				<span>Guide</span>
			</Button>
		</div>

		<div class="w-full max-w-md flex flex-col gap-6 pt-10 md:pt-0">
			<!-- Header Title -->
			<div class="flex flex-col gap-2">
				<div
					class="size-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-xl font-black font-mono shadow-md shadow-primary/20 ring-4 ring-primary/10"
				>
					C
				</div>
				<h2
					class="text-3xl font-black tracking-tight text-foreground mt-2"
				>
					Welcome back
				</h2>
				<p
					class="text-xs text-muted-foreground font-semibold leading-relaxed"
				>
					Enter your university staff or admin credentials to access
					the operational portals.
				</p>
			</div>

			<!-- Inline Form Validation Error Alert -->
			{#if form?.message && (form as any)?.code !== "unprovisioned_account"}
				<Alert.Root
					variant="destructive"
					class="rounded-2xl border-destructive/50 bg-destructive/10 text-destructive"
				>
					<AlertCircleIcon
						class="size-4 shrink-0 pointer-events-none"
					/>
					<Alert.Title class="font-extrabold text-xs"
						>Authentication Error</Alert.Title
					>
					<Alert.Description
						class="text-xs leading-relaxed font-semibold"
					>
						{form.message}
					</Alert.Description>
				</Alert.Root>
			{/if}

			<!-- Authentication Form -->
			<form
				method="POST"
				action="?/login"
				use:enhance={handleLoginEnhance}
				class="flex flex-col gap-5"
			>
				<FieldGroup class="flex flex-col gap-4">
					<Field>
						<FieldLabel
							for="email"
							class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
						>
							Username or Email
						</FieldLabel>
						<Input
							type="text"
							id="email"
							name="username"
							required
							maxlength={50}
							placeholder="e.g. admin or staff@bisu.edu.ph"
							bind:value={username}
							class="rounded-xl h-10 border-border bg-background shadow-xs focus-visible:ring-primary/20 text-xs font-semibold"
						/>
					</Field>

					<Field>
						<FieldLabel
							for="password"
							class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
						>
							Password
						</FieldLabel>
						<Input
							type="password"
							id="password"
							name="password"
							required
							maxlength={50}
							placeholder="••••••••"
							bind:value={password}
							class="rounded-xl h-10 border-border bg-background shadow-xs focus-visible:ring-primary/20 text-xs font-semibold"
						/>
					</Field>

					<Button
						type="submit"
						class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 mt-2 shadow-md shadow-primary/10 transition-all cursor-pointer"
					>
						<span>Login</span>
					</Button>

					<FieldSeparator>Or continue with</FieldSeparator>

					<Field>
						<Button
							variant="outline"
							type="button"
							onclick={handleGoogleSignIn}
							class="w-full h-10 rounded-xl border-border bg-card hover:bg-muted/50 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer"
						>
							<svg
								class="h-4 w-4 shrink-0"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
								/>
							</svg>
							<span>Login with Google</span>
						</Button>

						<FieldDescription class="text-center text-xs mt-2">
							Need credentials?
							<a
								href="##"
								onclick={() => {
									toast.info(
										"Please contact the campus IT / system administrator to request access credentials.",
									);
								}}
								class="underline underline-offset-4 font-bold text-foreground hover:text-primary"
							>
								Contact System Admin
							</a>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>

			<p
				class="text-center text-[10px] text-muted-foreground/60 font-medium"
			>
				Protected by Supabase Authentication & Role-Based Access Control
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
		onkeydown={(e) => e.key === "Escape" && (isGuideOpen = false)}
		role="button"
		tabindex="0"
		class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 cursor-pointer"
		aria-label="Close guide panel"
	></div>

	<!-- Slide-over container -->
	<div
		transition:slide={{ axis: "x", duration: 250 }}
		class="fixed inset-y-0 right-0 max-w-md w-full bg-card border-l border-border shadow-2xl flex flex-col z-50"
	>
		<div
			class="flex items-center justify-between p-6 border-b border-border"
		>
			<div>
				<h2 class="text-base font-black text-foreground">
					Dashboard Guide
				</h2>
				<p
					class="text-[11px] text-muted-foreground font-semibold leading-relaxed"
				>
					How to use the admin and staff features
				</p>
			</div>
			<Button
				onclick={() => (isGuideOpen = false)}
				variant="ghost"
				size="icon"
				class="rounded-full hover:bg-muted/60"
			>
				<XIcon
					class="w-4 h-4 text-muted-foreground hover:text-foreground"
				/>
			</Button>
		</div>

		<div class="flex-1 overflow-y-auto p-6 space-y-6 font-medium">
			<!-- Feature 1 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"
				>
					<MapIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Live Campus Tracking
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Monitor active visitors on the university map in
						real-time with automated geofencing.
					</p>
				</div>
			</div>

			<!-- Feature 2 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"
				>
					<ShieldCheckIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Security Verification
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Inspect submitted ID photos at the security gate and
						approve or reject visitor passes.
					</p>
				</div>
			</div>

			<!-- Feature 3 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0"
				>
					<GridIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Department Desks
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Staff desks receive visitors, scan desk QR codes, and
						log visitor arrivals directly.
					</p>
				</div>
			</div>

			<!-- Feature 4 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0"
				>
					<CalendarIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Historical Logs
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Filter complete records of all campus visits and export
						compliance reports.
					</p>
				</div>
			</div>

			<!-- Feature 5 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0"
				>
					<BarChart2Icon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						User Analytics
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Track peak visiting hours, duration trends, and
						department activity distribution.
					</p>
				</div>
			</div>
		</div>

		<div class="p-6 bg-muted/40 border-t border-border">
			<p
				class="text-[10px] text-muted-foreground/60 text-center font-bold"
			>
				BISU Calape - Campus Guide Security System Manual
			</p>
		</div>
	</div>
{/if}
