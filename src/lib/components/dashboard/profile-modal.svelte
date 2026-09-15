<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { supabase, getLocalOffices, getLocalBuildings, getLocalProfiles } from "$lib/supabase";
	import { toast } from "svelte-sonner";
	import BrandLogo from "$lib/components/brand-logo.svelte";

	// Icons
	import UserIcon from "@lucide/svelte/icons/user";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import MailIcon from "@lucide/svelte/icons/mail";
	import CheckIcon from "@lucide/svelte/icons/check";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import LockIcon from "@lucide/svelte/icons/lock";
	import BadgeCheckIcon from "@lucide/svelte/icons/badge-check";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import CameraIcon from "@lucide/svelte/icons/camera";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import DoorClosedIcon from "@lucide/svelte/icons/door-closed";
	import InfoIcon from "@lucide/svelte/icons/info";
	import CodeIcon from "@lucide/svelte/icons/code";
	import ServerIcon from "@lucide/svelte/icons/server";
	import CpuIcon from "@lucide/svelte/icons/cpu";

	let {
		open = $bindable(false),
		user
	}: {
		open: boolean;
		user: {
			name: string;
			email: string;
			avatar: string;
			role?: string;
			officeId?: string;
			roomId?: string;
		};
	} = $props();

	let activeTab = $state("profile");
	let fullName = $state(user.name || "");
	let avatarUrl = $state(user.avatar || "");
	let isSavingProfile = $state(false);

	// Security / Password Change State
	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPassword = $state("");
	let isUpdatingPassword = $state(false);

	// Assigned Workspace Info
	let officeInfo = $state<{
		name: string;
		code: string;
		buildingName?: string;
		roomNumber?: string;
		hours?: string;
	} | null>(null);

	$effect(() => {
		if (open) {
			fullName = user.name || "";
			avatarUrl = user.avatar || "";
			loadWorkspaceDetails();
		}
	});

	async function loadWorkspaceDetails() {
		try {
			const offices = await getLocalOffices();
			const buildings = await getLocalBuildings();
			const profiles = await getLocalProfiles();

			let targetOfficeId = user.officeId;
			if (!targetOfficeId && user.email) {
				const matchedProfile = profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase());
				if (matchedProfile?.officeId) {
					targetOfficeId = matchedProfile.officeId;
				}
			}

			if (targetOfficeId) {
				const off = offices.find((o) => o.id === targetOfficeId);
				if (off) {
					const bld = buildings.find((b) => b.id === off.buildingId);
					officeInfo = {
						name: off.name,
						code: off.code,
						buildingName: bld?.name || "Campus Structure",
						hours: off.operatingHours || "8:00 AM - 5:00 PM"
					};
				}
			}
		} catch (e) {
			console.error("Failed to load user workspace details:", e);
		}
	}

	async function handleSaveProfile() {
		isSavingProfile = true;
		const formData = new FormData();
		formData.append("fullName", fullName);
		formData.append("avatarUrl", avatarUrl);

		const savePromise = (async () => {
			const res = await fetch('/dashboard?/updateProfile', {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			if (result.type === 'failure' || result.status >= 400) {
				throw new Error(result.data?.message || 'Failed to update profile.');
			}
			if (supabase) {
				await supabase.auth.updateUser({
					data: { full_name: fullName, avatar_url: avatarUrl }
				});
			}
			if (user) {
				user.name = fullName;
				user.avatar = avatarUrl;
			}
			return result;
		})();

		toast.promise(savePromise, {
			loading: 'Updating profile on server...',
			success: 'Profile updated successfully!',
			error: (err: any) => err?.message || 'Failed to update profile.'
		});

		try {
			await savePromise;
		} catch (e) {
			// handled in toast
		} finally {
			isSavingProfile = false;
		}
	}

	async function handlePasswordChange() {
		if (!newPassword || newPassword.length < 6) {
			toast.error("Password must be at least 6 characters long.");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("New password and confirm password do not match.");
			return;
		}

		isUpdatingPassword = true;
		const formData = new FormData();
		formData.append("newPassword", newPassword);
		formData.append("confirmPassword", confirmPassword);

		const passPromise = (async () => {
			const res = await fetch('/dashboard?/updatePassword', {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			if (result.type === 'failure' || result.status >= 400) {
				throw new Error(result.data?.message || 'Failed to update password.');
			}
			if (supabase) {
				await supabase.auth.updateUser({ password: newPassword });
			}
			newPassword = "";
			confirmPassword = "";
			currentPassword = "";
			return result;
		})();

		toast.promise(passPromise, {
			loading: 'Updating password on server...',
			success: 'Password updated successfully!',
			error: (err: any) => err?.message || 'Failed to update password.'
		});

		try {
			await passPromise;
		} catch (e) {
			// handled in toast
		} finally {
			isUpdatingPassword = false;
		}
	}

	const roleLabel = $derived(
		user.role === "admin"
			? "System Administrator"
			: user.role === "security"
				? "Campus Security Guard"
				: "Department Office Staff"
	);

	const roleBadgeVariant = $derived(
		user.role === "admin"
			? "default"
			: user.role === "security"
				? "secondary"
				: "outline"
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[540px] max-h-[85vh] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border-border/70">
		<!-- Modal Header -->
		<div class="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Avatar.Root class="size-10 rounded-xl border border-primary/20 shadow-xs">
					<Avatar.Image src={avatarUrl || user.avatar} alt={fullName || user.name} />
					<Avatar.Fallback class="rounded-xl bg-primary/10 text-primary font-black text-sm">
						{(fullName || user.name || "U").substring(0, 2).toUpperCase()}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="flex flex-col">
					<div class="flex items-center gap-2">
						<Dialog.Title class="text-base font-bold text-foreground">
							{fullName || user.name || "User Profile"}
						</Dialog.Title>
						<Badge variant={roleBadgeVariant} class="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0 rounded-md">
							{user.role || "Staff"}
						</Badge>
					</div>
					<Dialog.Description class="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
						<MailIcon class="size-3 text-muted-foreground shrink-0" />
						<span>{user.email}</span>
					</Dialog.Description>
				</div>
			</div>
		</div>

		<!-- Navigation Tabs -->
		<Tabs.Root bind:value={activeTab} class="flex-1 flex flex-col min-h-0">
			<div class="px-5 pt-3 pb-2 border-b border-border/50 bg-background flex items-center justify-between">
				<Tabs.List class="grid grid-cols-3 h-8 w-72 bg-muted/60 p-0.5 rounded-lg">
					<Tabs.Trigger
						value="profile"
						class="text-xs font-semibold rounded-md gap-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
					>
						<UserIcon class="size-3.5" />
						<span>Profile</span>
					</Tabs.Trigger>
					<Tabs.Trigger
						value="security"
						class="text-xs font-semibold rounded-md gap-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
					>
						<KeyRoundIcon class="size-3.5" />
						<span>Security</span>
					</Tabs.Trigger>
					<Tabs.Trigger
						value="about"
						class="text-xs font-semibold rounded-md gap-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
					>
						<InfoIcon class="size-3.5" />
						<span>About</span>
					</Tabs.Trigger>
				</Tabs.List>
			</div>

			<!-- Tab 1: Profile & Workspace Info -->
			<Tabs.Content value="profile" class="flex-1 overflow-y-auto min-h-[300px] max-h-[420px] p-5 space-y-4 m-0">
				<form onsubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} class="space-y-4">
					<Field.FieldGroup class="flex flex-col gap-4">
						<Field.Field>
							<Field.Label for="fullName" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
								Full Name
							</Field.Label>
							<Input
								id="fullName"
								type="text"
								bind:value={fullName}
								placeholder="e.g. Juan De La Cruz"
								class="rounded-xl h-10 text-xs font-semibold"
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="avatarUrl" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
								Avatar Photo URL (Optional)
							</Field.Label>
							<Input
								id="avatarUrl"
								type="url"
								bind:value={avatarUrl}
								placeholder="https://example.com/avatar.jpg"
								class="rounded-xl h-10 text-xs font-semibold"
							/>
						</Field.Field>
					</Field.FieldGroup>

					<!-- Assigned Desk & Building Card (Role-Aware) -->
					{#if user.role === 'admin'}
						<div class="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
									<ShieldCheckIcon class="size-3.5 text-primary pointer-events-none" />
									<span>System Administration Access</span>
								</span>
								<Badge variant="default" class="text-[9px] font-mono font-bold">
									FULL SYSTEM
								</Badge>
							</div>

							<div class="grid grid-cols-2 gap-3 text-xs">
								<div class="flex flex-col">
									<span class="text-[10px] text-muted-foreground font-semibold">Console Scope</span>
									<span class="font-extrabold text-foreground">Central Campus Administration</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] text-muted-foreground font-semibold">Permissions</span>
									<span class="font-extrabold text-foreground">All Offices & Infrastructure</span>
								</div>
								<div class="flex flex-col col-span-2 pt-1 border-t border-border/60">
									<span class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
										<ClockIcon class="size-3 pointer-events-none text-muted-foreground" />
										<span>Operating Hours</span>
									</span>
									<span class="font-semibold text-foreground text-xs">24/7 System Management Operations</span>
								</div>
							</div>
						</div>
					{:else if user.role === 'security'}
						<div class="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
									<ShieldCheckIcon class="size-3.5 text-blue-500 pointer-events-none" />
									<span>Campus Security Terminal</span>
								</span>
								<Badge variant="secondary" class="text-[9px] font-mono font-bold">
									SECURITY GATE
								</Badge>
							</div>

							<div class="grid grid-cols-2 gap-3 text-xs">
								<div class="flex flex-col">
									<span class="text-[10px] text-muted-foreground font-semibold">Assigned Post</span>
									<span class="font-extrabold text-foreground">Main Entrance Security Desk</span>
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] text-muted-foreground font-semibold">Console Scope</span>
									<span class="font-extrabold text-foreground">Gate Visitor Verification & QR</span>
								</div>
								<div class="flex flex-col col-span-2 pt-1 border-t border-border/60">
									<span class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
										<ClockIcon class="size-3 pointer-events-none text-muted-foreground" />
										<span>Monitoring Hours</span>
									</span>
									<span class="font-semibold text-foreground text-xs">Campus Operational Gate Hours</span>
								</div>
							</div>
						</div>
					{:else}
						<div class="p-4 rounded-2xl border border-border/80 bg-muted/30 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
									<Building2Icon class="size-3.5 text-primary pointer-events-none" />
									<span>Assigned Office / Desk</span>
								</span>
								<Badge variant={officeInfo ? "outline" : "secondary"} class="text-[9px] font-mono font-bold">
									{officeInfo?.code || "UNASSIGNED"}
								</Badge>
							</div>

							{#if officeInfo}
								<div class="grid grid-cols-2 gap-3 text-xs">
									<div class="flex flex-col">
										<span class="text-[10px] text-muted-foreground font-semibold">Office Desk</span>
										<span class="font-extrabold text-foreground">{officeInfo.name}</span>
									</div>
									<div class="flex flex-col">
										<span class="text-[10px] text-muted-foreground font-semibold">Building</span>
										<span class="font-extrabold text-foreground">{officeInfo.buildingName}</span>
									</div>
									<div class="flex flex-col col-span-2 pt-1 border-t border-border/60">
										<span class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
											<ClockIcon class="size-3 pointer-events-none text-muted-foreground" />
											<span>Operating Hours</span>
										</span>
										<span class="font-semibold text-foreground text-xs">{officeInfo.hours}</span>
									</div>
								</div>
							{:else}
								<div class="text-xs text-muted-foreground font-semibold py-1">
									No specific office desk assigned yet. Contact System Administrator to configure your office desk binding.
								</div>
							{/if}
						</div>
					{/if}

					<Dialog.Footer class="pt-2">
						<Button
							type="submit"
							disabled={isSavingProfile}
							class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
						>
							<CheckIcon data-icon="inline-start" />
							<span>{isSavingProfile ? "Saving..." : "Save Profile Changes"}</span>
						</Button>
					</Dialog.Footer>
				</form>
			</Tabs.Content>

			<!-- Tab 2: Security & Password Change -->
			<Tabs.Content value="security" class="flex-1 overflow-y-auto min-h-[300px] max-h-[420px] p-5 space-y-4 m-0">
				<form onsubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} class="space-y-4">
					<div class="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground font-semibold flex items-center gap-2.5">
						<ShieldCheckIcon class="size-4 text-primary shrink-0 pointer-events-none" />
						<span>Password updates are immediately applied to your Supabase credentials.</span>
					</div>

					<Field.FieldGroup class="flex flex-col gap-4">
						<Field.Field>
							<Field.Label for="newPassword" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
								New Password
							</Field.Label>
							<Input
								id="newPassword"
								type="password"
								required
								minlength={6}
								bind:value={newPassword}
								placeholder="Enter new password (min. 6 chars)"
								class="rounded-xl h-10 text-xs font-semibold"
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="confirmPassword" class="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
								Confirm New Password
							</Field.Label>
							<Input
								id="confirmPassword"
								type="password"
								required
								minlength={6}
								bind:value={confirmPassword}
								placeholder="Re-enter new password"
								class="rounded-xl h-10 text-xs font-semibold"
							/>
						</Field.Field>
					</Field.FieldGroup>

					<Dialog.Footer class="pt-2">
						<Button
							type="submit"
							disabled={isUpdatingPassword}
							class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
						>
							<LockIcon class="size-3.5" />
							<span>{isUpdatingPassword ? "Updating Password..." : "Update Password"}</span>
						</Button>
					</Dialog.Footer>
				</form>
			</Tabs.Content>

			<!-- Tab 3: About System Information -->
			<Tabs.Content value="about" class="flex-1 overflow-y-auto min-h-[300px] max-h-[420px] p-5 space-y-4 m-0">
				<!-- App Branding Box -->
				<div class="p-4 rounded-2xl border border-border/80 bg-muted/30 flex flex-col gap-3">
					<div class="flex items-center gap-3">
						<div class="size-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-mono font-black text-sm shadow-md shadow-primary/20 shrink-0">
							<BrandLogo class="ml-0.5 mt-0.5" />
						</div>
						<div class="flex flex-col min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="text-sm font-black text-foreground truncate">Calapexis Platform</h3>
								<Badge variant="outline" class="text-[9px] font-mono font-bold bg-background shrink-0">
									v1.2.0
								</Badge>
							</div>
							<p class="text-[11px] text-muted-foreground font-semibold truncate">
								Campus Visitor Management & Waypoint Navigation
							</p>
						</div>
					</div>
					<p class="text-xs text-muted-foreground font-medium leading-relaxed border-t border-border/60 pt-2.5">
						Calapexis is the official digital visitor logbook, desk check-in system, and interactive campus map pathfinding engine designed for Bohol Island State University (BISU) Calape Campus.
					</p>
				</div>

				<!-- System Architecture Badges -->
				<div class="grid grid-cols-2 gap-2 text-xs">
					<div class="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1">
						<span class="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
							<ServerIcon class="size-3 text-primary pointer-events-none" />
							<span>Backend & Auth</span>
						</span>
						<span class="font-extrabold text-foreground text-xs">Supabase SSR & RLS</span>
					</div>

					<div class="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1">
						<span class="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
							<CpuIcon class="size-3 text-emerald-500 pointer-events-none" />
							<span>Map Navigation</span>
						</span>
						<span class="font-extrabold text-foreground text-xs">Dijkstra Routing</span>
					</div>

					<div class="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1">
						<span class="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
							<CodeIcon class="size-3 text-purple-500 pointer-events-none" />
							<span>UI Framework</span>
						</span>
						<span class="font-extrabold text-foreground text-xs">Svelte 5 & shadcn</span>
					</div>

					<div class="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1">
						<span class="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
							<SparklesIcon class="size-3 text-amber-500 pointer-events-none" />
							<span>Campus Scope</span>
						</span>
						<span class="font-extrabold text-foreground text-xs">BISU Calape Campus</span>
					</div>
				</div>

				<!-- Copyright Footer -->
				<div class="pt-2 border-t border-border/60 text-center">
					<p class="text-[10px] text-muted-foreground/70 font-semibold">
						© 2026 Bohol Island State University - Calape Campus. All rights reserved.
					</p>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
