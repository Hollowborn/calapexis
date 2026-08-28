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
	import SearchIcon from "@lucide/svelte/icons/search";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import NetworkIcon from "@lucide/svelte/icons/network";
	import DoorOpenIcon from "@lucide/svelte/icons/door-open";
	import LayersIcon from "@lucide/svelte/icons/layers";
	import ArrowRightLeftIcon from "@lucide/svelte/icons/arrow-right-left";

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
			tag: "Live Logbook",
			title: "Live Visitor Monitoring",
			subtitle:
				"Comprehensive audit trail of campus visitors with status filters, timestamps, and search.",
			color: "from-emerald-500/15 via-primary/10 to-transparent",
		},
		{
			tag: "Staff & Security",
			title: "Assisted Check-In & Check-Out",
			subtitle:
				"Fast walk-in registration, pass code lookup, and one-click desk check-outs.",
			color: "from-blue-500/15 via-indigo-500/10 to-transparent",
		},
		{
			tag: "Campus Infrastructure",
			title: "Buildings & Rooms Management",
			subtitle:
				"Configure campus landmarks, assign floor counts, upload photos, and manage department desks.",
			color: "from-purple-500/15 via-pink-500/10 to-transparent",
		},
		{
			tag: "Navigation Engine",
			title: "Map Edges & Waypoint Routing",
			subtitle:
				"Define pedestrian walking paths between campus landmarks for automated shortest-path routing.",
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
				Intelligent visitor management, desk check-ins, campus
				infrastructure, and pathfinding.
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
					<!-- Slide 1: Live Visitor Monitoring & Logbook (/dashboard/logs) -->
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
										<BookOpenIcon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Live Logbook
									</Badge>
								</div>
								<span
									class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1"
								>
									<span
										class="size-1.5 rounded-full bg-emerald-500 animate-pulse"
									></span>
									Real-Time Logs
								</span>
							</div>

							<!-- Interactive Card Body: Live Logbook Table Simulation -->
							<div
								class="relative z-10 my-4 rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-lg backdrop-blur-md flex flex-col gap-2.5"
							>
								<!-- Mini Filter Pill Bar -->
								<div
									class="flex items-center justify-between text-[11px]"
								>
									<div
										class="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg text-muted-foreground"
									>
										<SearchIcon class="size-3" />
										<span class="text-[10px] font-medium"
											>Filter by name or pass code...</span
										>
									</div>
									<Badge
										class="bg-primary/15 text-primary border-primary/20 text-[9px] font-bold"
									>
										Today's Visitors
									</Badge>
								</div>

								<!-- Mini Table Rows -->
								<div
									class="flex flex-col divide-y divide-border/60"
								>
									<!-- Visitor 1 -->
									<div
										class="py-2 flex items-center justify-between"
									>
										<div class="flex items-center gap-2.5">
											<div
												class="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center justify-center"
											>
												AM
											</div>
											<div>
												<div
													class="text-xs font-black text-foreground"
												>
													Juan Cruz
												</div>
												<div
													class="text-[10px] text-muted-foreground font-medium"
												>
													Registrar
												</div>
											</div>
										</div>
										<div
											class="flex flex-col items-end gap-0.5"
										>
											<Badge
												class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[8px] font-bold px-1.5 py-0 h-4"
											>
												CHECKED IN
											</Badge>
											<span
												class="text-[9px] text-muted-foreground font-mono"
												>10:45 AM</span
											>
										</div>
									</div>

									<!-- Visitor 2 -->
									<div
										class="py-2 flex items-center justify-between"
									>
										<div class="flex items-center gap-2.5">
											<div
												class="size-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-black text-xs flex items-center justify-center"
											>
												SJ
											</div>
											<div>
												<div
													class="text-xs font-black text-foreground"
												>
													Maria Santos
												</div>
												<div
													class="text-[10px] text-muted-foreground font-medium"
												>
													Cashier
												</div>
											</div>
										</div>
										<div
											class="flex flex-col items-end gap-0.5"
										>
											<Badge
												variant="outline"
												class="text-[8px] font-bold px-1.5 py-0 h-4 text-muted-foreground"
											>
												CHECKED OUT
											</Badge>
											<span
												class="text-[9px] text-muted-foreground font-mono"
												>09:15 AM</span
											>
										</div>
									</div>

									<!-- Visitor 3 -->
									<div
										class="py-2 flex items-center justify-between"
									>
										<div class="flex items-center gap-2.5">
											<div
												class="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center"
											>
												CR
											</div>
											<div>
												<div
													class="text-xs font-black text-foreground"
												>
													Pedro Matibay
												</div>
												<div
													class="text-[10px] text-muted-foreground font-medium"
												>
													SAC
												</div>
											</div>
										</div>
										<div
											class="flex flex-col items-end gap-0.5"
										>
											<Badge
												class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[8px] font-bold px-1.5 py-0 h-4"
											>
												CHECKED IN
											</Badge>
											<span
												class="text-[9px] text-muted-foreground font-mono"
												>11:20 AM</span
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
									Live Visitor Monitoring
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Full master logbook with live active counts,
									pass filtering, and audit history.
								</p>
							</div>
						</div>
					</Carousel.Item>

					<!-- Slide 2: Assisted Check-In & Check-Out (/dashboard/staff & /dashboard/security) -->
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
										<UserCheckIcon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Staff & Security Desks
									</Badge>
								</div>
								<Badge
									variant="secondary"
									class="font-mono text-[9px] font-extrabold"
								>
									DESK ASSIST
								</Badge>
							</div>

							<!-- Interactive Card Body: Walk-In & Quick Checkout Simulation -->
							<div
								class="relative z-10 my-4 rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-lg backdrop-blur-md flex flex-col gap-3"
							>
								<!-- Quick Walk-In Registration Preview -->
								<div
									class="bg-muted/40 rounded-xl p-2.5 border border-border/50 flex flex-col gap-2"
								>
									<div
										class="flex items-center justify-between"
									>
										<span
											class="text-[10px] font-black uppercase text-foreground flex items-center gap-1"
										>
											<UserCheckIcon
												class="size-3 text-primary"
											/>
											Walk-In Check-In Form
										</span>
										<span
											class="text-[9px] text-muted-foreground"
											>Department Locked</span
										>
									</div>
									<div
										class="grid grid-cols-2 gap-1.5 text-[10px]"
									>
										<div
											class="bg-background rounded-lg px-2 py-1 border border-border/60 text-muted-foreground"
										>
											Maria Santos
										</div>
										<div
											class="bg-background rounded-lg px-2 py-1 border border-border/60 text-muted-foreground"
										>
											Consultation
										</div>
									</div>
								</div>

								<!-- Quick Pass Code Checkout Preview -->
								<div
									class="rounded-xl border border-border/60 p-2.5 bg-background flex items-center justify-between gap-2"
								>
									<div class="flex flex-col gap-0.5">
										<span
											class="text-[9px] font-bold uppercase text-muted-foreground"
											>Pass Code Lookup</span
										>
										<span
											class="text-xs font-mono font-black text-primary"
											>VP-8921</span
										>
									</div>
									<div
										class="h-8 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-bold px-2.5 flex items-center gap-1 shadow-2xs"
									>
										<LogOutIcon class="size-3" />
										<span>Check Out</span>
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
									Assisted Check-In & Check-Out
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Assisted walk-in visitor entry and
									instantaneous desk departures by pass code.
								</p>
							</div>
						</div>
					</Carousel.Item>

					<!-- Slide 3: Buildings & Rooms Management (/dashboard/admin/buildings) -->
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
										<Building2Icon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Campus Infrastructure
									</Badge>
								</div>
								<span
									class="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20"
								>
									Landmarks & Desks
								</span>
							</div>

							<!-- Building & Room Card Body -->
							<div
								class="relative z-10 my-4 rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-lg backdrop-blur-md flex flex-col gap-3"
							>
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-2.5">
										<div
											class="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-black text-sm flex items-center justify-center shadow-xs"
										>
											ADM
										</div>
										<div>
											<div
												class="text-xs font-black text-foreground"
											>
												Administration Building
											</div>
											<div
												class="text-[10px] text-muted-foreground font-medium"
											>
												3 Floors • Dr. Maria Santos
											</div>
										</div>
									</div>
									<Badge
										variant="secondary"
										class="text-[9px] font-mono font-bold"
										>ADMIN</Badge
									>
								</div>

								<!-- Assigned Rooms Tags -->
								<div class="flex flex-col gap-1.5 pt-1">
									<span
										class="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1"
									>
										<DoorOpenIcon class="size-3" />
										Managed Rooms & Desks
									</span>
									<div class="flex flex-wrap gap-1.5">
										<span
											class="text-[9px] font-bold bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border/60"
										>
											Rm 101 - Admissions
										</span>
										<span
											class="text-[9px] font-bold bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border/60"
										>
											Rm 102 - Cashier
										</span>
										<span
											class="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20"
										>
											+3 Rooms
										</span>
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
									Buildings & Rooms Management
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Organize university landmarks, configure
									room floor levels, and bind staff desks.
								</p>
							</div>
						</div>
					</Carousel.Item>

					<!-- Slide 4: Map Edges & Pathfinding Network (/dashboard/admin/edges) -->
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
										<NetworkIcon class="size-4.5" />
									</div>
									<Badge
										variant="outline"
										class="font-bold text-[10px] uppercase tracking-wider bg-background/60"
									>
										Navigation Engine
									</Badge>
								</div>
								<Badge
									class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] font-bold"
								>
									GRAPH NETWORK
								</Badge>
							</div>

							<!-- Map Edges Connection Preview Body -->
							<div
								class="relative z-10 my-4 rounded-2xl border border-border/80 bg-background/80 p-3.5 shadow-lg backdrop-blur-md flex flex-col gap-2.5"
							>
								<!-- Edge 1 -->
								<div
									class="rounded-xl border border-border/60 p-2 bg-background flex items-center justify-between"
								>
									<div class="flex items-center gap-2">
										<ArrowRightLeftIcon
											class="size-3.5 text-primary"
										/>
										<div>
											<div
												class="text-[11px] font-black text-foreground"
											>
												Main Gate ↔ Admin Building
											</div>
											<div
												class="text-[9px] text-muted-foreground"
											>
												Primary Walkway Path
											</div>
										</div>
									</div>
									<Badge
										variant="secondary"
										class="text-[9px] font-mono font-bold"
										>120m</Badge
									>
								</div>

								<!-- Edge 2 -->
								<div
									class="rounded-xl border border-border/60 p-2 bg-background flex items-center justify-between"
								>
									<div class="flex items-center gap-2">
										<ArrowRightLeftIcon
											class="size-3.5 text-primary"
										/>
										<div>
											<div
												class="text-[11px] font-black text-foreground"
											>
												Admin Building ↔ Tech Complex
											</div>
											<div
												class="text-[9px] text-muted-foreground"
											>
												Quadrangle Pathway
											</div>
										</div>
									</div>
									<Badge
										variant="secondary"
										class="text-[9px] font-mono font-bold"
										>85m</Badge
									>
								</div>
							</div>

							<!-- Slide Description -->
							<div
								class="relative z-10 border-t border-border/60 pt-3"
							>
								<h3
									class="font-extrabold text-sm text-foreground"
								>
									Map Edges & Waypoint Routing
								</h3>
								<p
									class="text-xs text-muted-foreground font-medium"
								>
									Define pedestrian walking paths between
									campus landmarks for shortest-path routing.
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
					<img src="favicon.png" />
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
						<KeyRoundIcon class="size-4 pointer-events-none" />
						<span>Sign In to Portal</span>
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
					class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
				>
					<BookOpenIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Live Visitor Monitoring
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Track incoming and active visitors in real-time with
						comprehensive search and status filters.
					</p>
				</div>
			</div>

			<!-- Feature 2 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"
				>
					<UserCheckIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Assisted Check-In / Out
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Assisted walk-in desk registration and one-click visitor
						checkout by unique pass codes.
					</p>
				</div>
			</div>

			<!-- Feature 3 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"
				>
					<Building2Icon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Buildings & Rooms
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Manage university building structures, floor levels,
						landmark photos, and department rooms.
					</p>
				</div>
			</div>

			<!-- Feature 4 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"
				>
					<NetworkIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						Map Edges & Navigation
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Configure connected walking pathways between campus
						landmarks for pathfinding.
					</p>
				</div>
			</div>

			<!-- Feature 5 -->
			<div class="flex gap-4">
				<div
					class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"
				>
					<KeyRoundIcon class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-sm text-foreground mb-1">
						User Account Provisioning
					</h3>
					<p
						class="text-xs text-muted-foreground leading-relaxed font-semibold"
					>
						Provision admin, security guard, and office staff
						accounts bound to specific departments.
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
