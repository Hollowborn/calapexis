<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Profile, Office } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { validatePassword, validateEmailDomain } from "$lib/password-rules";
	
	// DataTable imports
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import { createColumnHelper } from "@tanstack/table-core";

	// Icons
	import UsersIcon from "@lucide/svelte/icons/users";
	import UserRound from "@lucide/svelte/icons/user-round";
	import PencilIcon from "@lucide/svelte/icons/pencil";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import FilterIcon from "@lucide/svelte/icons/filter";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import ShieldIcon from "@lucide/svelte/icons/shield";
	import UserIcon from "@lucide/svelte/icons/user";
	import LockIcon from "@lucide/svelte/icons/lock";
	import ArchiveIcon from "@lucide/svelte/icons/archive";
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import CheckIcon from "@lucide/svelte/icons/check";
	import XIcon from "@lucide/svelte/icons/x";
	import UserXIcon from "@lucide/svelte/icons/user-x";

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let actionProfiles = $state<Profile[] | null>(null);
	let profiles = $derived<Profile[]>(
		actionProfiles || (data.profiles && data.profiles.length > 0 ? data.profiles : dashboardContext.profiles)
	);

	let officesList = $derived(data.offices || []);

	// Accounts Provisioning Dialog modal states
	let isCreatingUser = $state(false);
	let newFullName = $state('');
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state<'admin' | 'security' | 'staff'>('staff');
	let newOfficeId = $state('');

	const passwordValidation = $derived(validatePassword(newPassword));
	const emailValidation = $derived(validateEmailDomain(newEmail));

	// Edit Account Dialog Modal states
	let activeEditingUser = $state<Profile | null>(null);
	let editEmail = $state('');
	let editFullName = $state('');
	let editRole = $state<'admin' | 'security' | 'staff'>('staff');
	let editOfficeId = $state('');

	// Archive & Restore Target States
	let archiveTargetUser = $state<Profile | null>(null);
	let restoreTargetUser = $state<Profile | null>(null);

	// Table Filter State
	let selectedRoleFilter = $state<string>('all');
	let selectedStatusFilter = $state<'all' | 'active' | 'archived'>('all');

	// Sync office select fallback on list update
	$effect(() => {
		if (officesList.length > 0 && !newOfficeId) {
			newOfficeId = officesList[0].id;
		}
	});

	function startEditUser(profile: Profile) {
		activeEditingUser = profile;
		editEmail = profile.email;
		editFullName = profile.fullName || '';
		editRole = profile.role;
		editOfficeId = profile.officeId || (officesList.length > 0 ? officesList[0].id : '');
	}

	// Filtered profiles for data table
	let filteredProfiles = $derived(
		profiles.filter((p) => {
			if (selectedRoleFilter !== 'all' && p.role !== selectedRoleFilter) return false;
			if (selectedStatusFilter === 'active' && p.isActive === false) return false;
			if (selectedStatusFilter === 'archived' && p.isActive !== false) return false;
			return true;
		})
	);

	function parseAuthErrorMessage(rawMsg: string): string {
		if (rawMsg.includes("already registered") || rawMsg.includes("already exists")) {
			return "User already exists! Delete old user from Supabase Dashboard ➔ Auth ➔ Users, or try another email.";
		}
		if (rawMsg.includes("Password") || rawMsg.includes("password")) {
			return "Password Error: Minimum 8 characters, at least 1 number and 1 special character required.";
		}
		if (rawMsg.includes("Bearer token")) {
			return "Missing Service Key: Please add SUPABASE_SERVICE_ROLE_KEY=your_key to your .env file.";
		}
		if (rawMsg.includes("email") || rawMsg.includes("format")) {
			return "Invalid Email: Please provide a valid email format (e.g. staff@bisu.edu.ph).";
		}
		return rawMsg;
	}

	// Submit handlers
	const handleCreateUserEnhance: SubmitFunction = () => {
		let resolveUser: (v?: any) => void = () => {};
		let rejectUser: (e: any) => void = () => {};
		const createPromise = new Promise((resolve, reject) => {
			resolveUser = resolve;
			rejectUser = reject;
		});

		toast.promise(createPromise, {
			loading: "Step 1/2: Provisioning credentials & database profile...",
			success: (data: any) => data?.message || "Account provisioned successfully!",
			error: (err: any) => {
				const raw = typeof err === "string" ? err : (err?.message || "Failed to create user account.");
				return parseAuthErrorMessage(raw);
			}
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				const successMsg = (result.data as any)?.email 
					? `Account ${(result.data as any).email} created successfully!`
					: "Account created and bound to desk successfully!";
				resolveUser({ message: successMsg });
				if ((result.data as any)?.profiles) {
					actionProfiles = (result.data as any).profiles;
				}
				isCreatingUser = false;
				newFullName = '';
				newEmail = '';
				newPassword = '';
				newRole = 'staff';
				newOfficeId = officesList.length > 0 ? officesList[0].id : '';
				await dashboardContext.loadData();
				await update();
			} else if (result.type === "failure") {
				const errMsg = (result.data as any)?.message || "User creation failed. Verify credentials format.";
				rejectUser(new Error(parseAuthErrorMessage(errMsg)));
			} else if (result.type === "error") {
				const errMsg = (result.error as any)?.message || "Server connection error during user creation.";
				rejectUser(new Error(parseAuthErrorMessage(errMsg)));
			} else {
				rejectUser(new Error("Unexpected authentication error occurred."));
			}
		};
	};

	const handleUpdateUserEnhance: SubmitFunction = () => {
		let resolveUpdate: (v?: any) => void = () => {};
		let rejectUpdate: (e: any) => void = () => {};
		const updatePromise = new Promise((resolve, reject) => {
			resolveUpdate = resolve;
			rejectUpdate = reject;
		});

		toast.promise(updatePromise, {
			loading: "Updating account profile...",
			success: "Account updated successfully!",
			error: (err: any) => typeof err === "string" ? err : (err?.message || "Failed to update account.")
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveUpdate();
				if ((result.data as any)?.profiles) {
					actionProfiles = (result.data as any).profiles;
				}
				activeEditingUser = null;
				await dashboardContext.loadData();
				await update();
			} else if (result.type === "failure") {
				const errMsg = (result.data as any)?.message || "Failed to update user.";
				rejectUpdate(new Error(errMsg));
			} else if (result.type === "error") {
				const errMsg = (result.error as any)?.message || "Server error updating user.";
				rejectUpdate(new Error(errMsg));
			} else {
				rejectUpdate(new Error("Unexpected error."));
			}
		};
	};

	const handleToggleStatusEnhance: SubmitFunction = ({ formData }) => {
		const willActivate = formData.get('isActive') === 'true';
		let resolveToggle: (v?: any) => void = () => {};
		let rejectToggle: (e: any) => void = () => {};
		const togglePromise = new Promise((resolve, reject) => {
			resolveToggle = resolve;
			rejectToggle = reject;
		});

		toast.promise(togglePromise, {
			loading: willActivate ? "Restoring user account..." : "Archiving user account...",
			success: willActivate ? "User account restored successfully!" : "User account archived successfully!",
			error: (err: any) => typeof err === "string" ? err : (err?.message || "Failed to update account status.")
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveToggle();
				if ((result.data as any)?.profiles) {
					actionProfiles = (result.data as any).profiles;
				}
				archiveTargetUser = null;
				restoreTargetUser = null;
				await dashboardContext.loadData();
				await update();
			} else if (result.type === "failure") {
				const errMsg = (result.data as any)?.message || "Failed to change account status.";
				rejectToggle(new Error(errMsg));
			} else if (result.type === "error") {
				const errMsg = (result.error as any)?.message || "Server error changing account status.";
				rejectToggle(new Error(errMsg));
			} else {
				rejectToggle(new Error("Unexpected error."));
			}
		};
	};

	// Setup TanStack Columns for Profiles Table
	const columnHelper = createColumnHelper<any>();

	const columns = [
		columnHelper.accessor("email", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "User / Account" }),
			cell: ({ row }) => renderSnippet(userCell, { profile: row.original })
		}),
		columnHelper.accessor("role", {
			header: "Access Role",
			cell: ({ getValue }) => renderSnippet(roleCell, { role: getValue() })
		}),
		columnHelper.accessor("isActive", {
			header: "Account Status",
			cell: ({ getValue }) => renderSnippet(statusCell, { isActive: getValue() ?? true })
		}),
		columnHelper.accessor("officeId", {
			header: "Assigned Check-In Office",
			cell: ({ row }) => renderSnippet(officeCell, { profile: row.original })
		}),
		columnHelper.display({
			id: "authProvider",
			header: "Auth Method",
			cell: ({ row }) => renderSnippet(providerCell, { email: row.original.email })
		}),
		columnHelper.accessor("createdAt", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Created Date" }),
			cell: ({ getValue }) => renderSnippet(dateCell, { date: getValue() })
		}),
		columnHelper.display({
			id: "actions",
			header: () => renderSnippet(headerRightSnippet, { title: "Actions" }),
			cell: ({ row }) => renderSnippet(actionsCell, { profile: row.original })
		})
	];
</script>

<!-- Cell Snippets -->
{#snippet headerRightSnippet({ title }: { title: string })}
	<div class="text-right font-bold">{title}</div>
{/snippet}

{#snippet userCell({ profile }: { profile: Profile })}
	<div class="flex items-center gap-3">
		<Avatar.Root class="size-9 rounded-xl border border-border/80 shrink-0 bg-muted/40 shadow-xs overflow-hidden">
			{#if profile.avatarUrl}
				<Avatar.Image src={profile.avatarUrl} alt={profile.fullName || profile.email} class="size-full object-cover" />
			{/if}
			<Avatar.Fallback class="rounded-xl text-xs font-black bg-primary/10 text-primary uppercase">
				{profile.email.substring(0, 2)}
			</Avatar.Fallback>
		</Avatar.Root>
		<div class="flex flex-col min-w-0">
			<div class="flex items-center gap-1.5 flex-wrap">
				<span class="font-mono font-bold text-foreground text-xs md:text-sm select-all truncate">{profile.email}</span>
				{#if profile.email === 'staff' || profile.email === 'admin' || profile.email === 'security'}
					<Badge variant="secondary" class="font-bold text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide opacity-80">Default Account</Badge>
				{/if}
			</div>
			{#if profile.fullName}
				<span class="text-[11px] text-muted-foreground font-semibold truncate">{profile.fullName}</span>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet statusCell({ isActive }: { isActive: boolean })}
	{#if isActive}
		<Badge variant="outline" class="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-bold rounded-md px-2 py-0.5">
			<span class="size-1.5 rounded-full bg-emerald-500 inline-block"></span>
			<span>Active</span>
		</Badge>
	{:else}
		<Badge variant="outline" class="gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold rounded-md px-2 py-0.5">
			<span class="size-1.5 rounded-full bg-amber-500 inline-block"></span>
			<span>Archived</span>
		</Badge>
	{/if}
{/snippet}

{#snippet roleCell({ role }: { role: string })}
	{#if role === 'admin'}
		<Badge variant="outline" class="gap-1.5 font-bold text-xs rounded-full px-2.5 py-0.5">
			<ShieldCheckIcon class="size-3.5 shrink-0 pointer-events-none" />
			<span>Administrator</span>
		</Badge>
	{:else if role === 'security'}
		<Badge variant="outline" class="gap-1.5 font-bold text-xs rounded-full px-2.5 py-0.5">
			<ShieldIcon class="size-3.5 shrink-0 pointer-events-none" />
			<span>Security Guard</span>
		</Badge>
	{:else}
		<Badge variant="outline" class="gap-1.5 font-bold text-xs rounded-full px-2.5 py-0.5">
			<UserIcon class="size-3.5 shrink-0 pointer-events-none" />
			<span>Office Staff</span>
		</Badge>
	{/if}
{/snippet}

{#snippet providerCell({ email }: { email: string })}
	{#if email.includes('@gmail.com') || email.includes('@google') || email.endsWith('.google.com')}
		<Badge variant="outline" class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[9px] font-bold rounded-md">
			Google OAuth
		</Badge>
	{:else}
		<Badge variant="outline" class="bg-muted text-muted-foreground border-border text-[9px] font-bold rounded-md">
			Email / Password
		</Badge>
	{/if}
{/snippet}

{#snippet officeCell({ profile }: { profile: any })}
	{#if profile.role === 'staff'}
		{@const office = officesList.find(o => o.id === profile.officeId)}
		{#if office}
			<div class="flex flex-col gap-0.5">
				<div class="flex items-center gap-1.5">
					<Badge variant="outline" class="font-mono font-black text-[9px] px-1.5 py-0 rounded-md border-primary/30 text-primary">
						{office.code}
					</Badge>
					<span class="text-xs font-bold text-foreground">{office.name}</span>
				</div>
				<span class="text-[10px] text-muted-foreground font-semibold">{office.buildingName || 'Campus Building'}</span>
			</div>
		{:else}
			<span class="text-xs font-semibold text-foreground">{profile.officeId || 'Unassigned Desk'}</span>
		{/if}
	{:else}
		<span class="italic text-muted-foreground/60 text-[10px] font-medium">Global Access</span>
	{/if}
{/snippet}

{#snippet dateCell({ date }: { date: string })}
	<span class="font-mono text-muted-foreground font-semibold text-xs">
		{new Date(date || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
	</span>
{/snippet}

{#snippet actionsCell({ profile }: { profile: Profile })}
	<div class="flex items-center justify-end gap-1">
		{#if profile.role === 'admin'}
			<Badge variant="outline" class="gap-1.5 font-bold text-[10px] py-1 px-2.5 rounded-lg border-border bg-muted/40 text-muted-foreground select-none">
				<LockIcon class="size-3 text-muted-foreground pointer-events-none" />
				<span>Protected Admin</span>
			</Badge>
		{:else}
			<Button 
				onclick={() => startEditUser(profile)} 
				variant="ghost" 
				size="icon" 
				class="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
				title="Edit user account"
			>
				<PencilIcon class="size-3.5 pointer-events-none" />
			</Button>
			{#if profile.isActive !== false}
				<Button 
					onclick={() => (archiveTargetUser = profile)} 
					variant="ghost" 
					size="icon" 
					class="size-8 rounded-lg text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
					title="Archive user account"
				>
					<UserXIcon class="size-3.5 pointer-events-none" />
				</Button>
			{:else}
				<Button 
					onclick={() => (restoreTargetUser = profile)} 
					variant="ghost" 
					size="icon" 
					class="size-8 rounded-lg text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
					title="Restore user account"
				>
					<RotateCcwIcon class="size-3.5 pointer-events-none" />
				</Button>
			{/if}
		{/if}
	</div>
{/snippet}

<!-- Custom Toolbar Snippet with Role & Status Filter Bar -->
{#snippet customToolbarSnippet()}
	<div class="flex items-center gap-2 flex-wrap">
		<Select.Root
			type="single"
			value={selectedRoleFilter}
			onValueChange={(val) => (selectedRoleFilter = val)}
		>
			<Select.Trigger class="h-9 min-w-36 text-xs font-bold rounded-xl cursor-pointer">
				<span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
					<FilterIcon class="size-3.5 text-primary pointer-events-none" />
					<span>
						{selectedRoleFilter === 'all' ? 'All Roles' : (selectedRoleFilter === 'admin' ? 'Admins' : (selectedRoleFilter === 'security' ? 'Security Guards' : 'Office Staff'))}
					</span>
				</span>
			</Select.Trigger>
			<Select.Content class="rounded-xl border border-border bg-card">
				<Select.Group>
					<Select.Item value="all" label="All Roles">All Roles ({profiles.length})</Select.Item>
					<Select.Item value="admin" label="Administrators">Administrators ({profiles.filter(p => p.role === 'admin').length})</Select.Item>
					<Select.Item value="security" label="Security Guards">Security Guards ({profiles.filter(p => p.role === 'security').length})</Select.Item>
					<Select.Item value="staff" label="Office Staff">Office Staff ({profiles.filter(p => p.role === 'staff').length})</Select.Item>
				</Select.Group>
			</Select.Content>
		</Select.Root>

		<Select.Root
			type="single"
			value={selectedStatusFilter}
			onValueChange={(val: any) => (selectedStatusFilter = val)}
		>
			<Select.Trigger class="h-9 min-w-32 text-xs font-bold rounded-xl cursor-pointer">
				<span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
					<ArchiveIcon class="size-3.5 text-muted-foreground pointer-events-none" />
					<span>
						{selectedStatusFilter === 'all' ? 'All Status' : (selectedStatusFilter === 'active' ? 'Active' : 'Archived')}
					</span>
				</span>
			</Select.Trigger>
			<Select.Content class="rounded-xl border border-border bg-card">
				<Select.Group>
					<Select.Item value="all" label="All Status">All Status ({profiles.length})</Select.Item>
					<Select.Item value="active" label="Active">Active ({profiles.filter(p => p.isActive !== false).length})</Select.Item>
					<Select.Item value="archived" label="Archived">Archived ({profiles.filter(p => p.isActive === false).length})</Select.Item>
				</Select.Group>
			</Select.Content>
		</Select.Root>

		<Button onclick={() => (isCreatingUser = true)} class="text-xs font-bold gap-2 rounded-xl h-9 cursor-pointer">
			<UsersIcon class="size-4 pointer-events-none" />
			<span>Provision Account</span>
		</Button>
	</div>
{/snippet}

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<UserRound class="size-6 pointer-events-none" />
			</div>
			<div>
				<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">System User Accounts</h1>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Monitor system access profiles and bind staff members to registered check-in reception desks.</p>
			</div>
		</div>
	</div>

	<!-- Users List Panel -->
	<Card.Root class="border-border/80 shadow-sm rounded-2xl bg-card p-6">
		<DataTable.Root
			data={filteredProfiles}
			columns={columns as any}
			searchColumn="email"
			searchPlaceholder="Search accounts by username..."
			customToolbar={customToolbarSnippet}
		/>
	</Card.Root>
</div>

<!-- Account Provisioning Dialog Modal -->
<Dialog.Root bind:open={isCreatingUser}>
	<Dialog.Content class="max-w-md border-border shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="font-black text-lg">Provision User Account</Dialog.Title>
			<Dialog.Description class="text-xs font-semibold text-muted-foreground">Create credentials and assign system roles.</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/createUser" use:enhance={handleCreateUserEnhance} class="flex flex-col gap-4 py-2">
			<Field.FieldGroup class="flex flex-col gap-4">
				<Field.Field>
					<Field.FieldLabel for="new-fullname" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Full Name (Optional)</Field.FieldLabel>
					<Input
						id="new-fullname"
						name="fullName"
						type="text"
						placeholder="e.g. Juan Dela Cruz"
						bind:value={newFullName}
						class="rounded-xl h-10"
					/>
				</Field.Field>

				<Field.Field>
					<div class="flex items-center justify-between">
						<Field.FieldLabel for="new-email" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Email Address *</Field.FieldLabel>
						<span class="text-[10px] text-muted-foreground font-semibold">@gmail.com or @bisu.edu.ph</span>
					</div>
					<Input
						id="new-email"
						name="email"
						type="text"
						placeholder="e.g. staff@bisu.edu.ph or user@gmail.com"
						bind:value={newEmail}
						required
						class="rounded-xl h-10 {newEmail && !emailValidation.isValid ? 'border-destructive focus-visible:ring-destructive' : ''}"
					/>
					<div class="mt-1 flex items-center gap-1.5 text-[11px]">
						{#if !newEmail}
							<span class="text-muted-foreground font-medium">Only accounts ending with @gmail.com or @bisu.edu.ph are valid.</span>
						{:else if emailValidation.isValid}
							<span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
								<CheckIcon class="size-3 text-emerald-500" />
								Valid {emailValidation.domain === 'bisu.edu.ph' ? 'BISU Institutional' : 'Google Mail'} domain
							</span>
						{:else}
							<span class="text-destructive font-bold flex items-center gap-1">
								<XIcon class="size-3 text-destructive" />
								{emailValidation.errorMessage}
							</span>
						{/if}
					</div>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel for="new-password" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Password</Field.FieldLabel>
					<Input
						id="new-password"
						name="password"
						type="password"
						placeholder="Min. 8 chars, 1 number & 1 special char"
						bind:value={newPassword}
						required
						class="rounded-xl h-10"
					/>
					<div class="mt-1.5 flex flex-col gap-1.5 rounded-xl bg-muted/40 p-3 text-[11px] border border-border/60">
						<span class="font-extrabold text-muted-foreground text-[10px] uppercase tracking-wider">Password Security Requirements</span>
						<div class="grid grid-cols-1 gap-1 text-xs">
							<div class="flex items-center gap-1.5 {passwordValidation.hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground font-medium'}">
								{#if passwordValidation.hasMinLength}
									<CheckIcon class="size-3.5 shrink-0 text-emerald-500" />
								{:else}
									<span class="size-1.5 rounded-full bg-muted-foreground/60 inline-block shrink-0 mx-1"></span>
								{/if}
								<span>At least 8 characters long</span>
							</div>
							<div class="flex items-center gap-1.5 {passwordValidation.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground font-medium'}">
								{#if passwordValidation.hasNumber}
									<CheckIcon class="size-3.5 shrink-0 text-emerald-500" />
								{:else}
									<span class="size-1.5 rounded-full bg-muted-foreground/60 inline-block shrink-0 mx-1"></span>
								{/if}
								<span>Contains at least one number (0-9)</span>
							</div>
							<div class="flex items-center gap-1.5 {passwordValidation.hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground font-medium'}">
								{#if passwordValidation.hasSpecialChar}
									<CheckIcon class="size-3.5 shrink-0 text-emerald-500" />
								{:else}
									<span class="size-1.5 rounded-full bg-muted-foreground/60 inline-block shrink-0 mx-1"></span>
								{/if}
								<span>Contains at least one special character (!@#$%^&*...)</span>
							</div>
						</div>
					</div>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">User Role</Field.FieldLabel>
					<input type="hidden" name="role" value={newRole} />
					<div class="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl text-xs font-bold">
						<button
							type="button"
							onclick={() => { newRole = 'staff'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Staff
						</button>
						<button
							type="button"
							onclick={() => { newRole = 'security'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'security' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Guard
						</button>
						<button
							type="button"
							onclick={() => { newRole = 'admin'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'admin' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Admin
						</button>
					</div>
				</Field.Field>

				{#if newRole === 'staff'}
					<Field.Field>
						<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bound Check-In Office Desk</Field.FieldLabel>
						<input type="hidden" name="officeId" value={newOfficeId} />
						<Select.Root
							type="single"
							value={newOfficeId}
							onValueChange={(val) => newOfficeId = val}
						>
							<Select.Trigger class="w-full h-10 rounded-xl cursor-pointer hover:bg-muted/30 truncate ">
								<span class="text-xs font-semibold text-foreground truncate ">
									{#if newOfficeId}
										{@const off = officesList.find(o => o.id === newOfficeId)}
										{off ? `${off.code} - ${off.name} (${off.buildingName || ''})` : 'Select Check-In Office'}
									{:else}
										Select Check-In Office
									{/if}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card">
								<Select.Group class="max-h-60 overflow-y-auto">
									{#each officesList as office}
										<Select.Item value={office.id} label={`${office.code} - ${office.name}`}>
											<div class="flex flex-col">
												<span class="font-bold text-foreground">{office.code} - {office.name}</span>
												<span class="text-[10px] text-muted-foreground">{office.buildingName || 'Main Building'}</span>
											</div>
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}
			</Field.FieldGroup>

			<Dialog.Footer class="pt-4 border-t border-border flex gap-2">
				<Button type="button" onclick={() => (isCreatingUser = false)} variant="outline">
					Cancel
				</Button>
				<Button type="submit" disabled={!emailValidation.isValid || !passwordValidation.isValid} class="cursor-pointer">
					Create Account
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit User Account Modal Dialog -->
<Dialog.Root open={!!activeEditingUser} onOpenChange={(open) => { if (!open) activeEditingUser = null; }}>
	<Dialog.Content class="max-w-md border-border shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="font-black text-lg">Edit User Account</Dialog.Title>
			<Dialog.Description class="text-xs font-semibold text-muted-foreground">Modify username, access role, or office binding.</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/updateUser" use:enhance={handleUpdateUserEnhance} class="flex flex-col gap-4 py-2">
			<input type="hidden" name="id" value={activeEditingUser?.id} />

			<Field.FieldGroup class="flex flex-col gap-4">
				<Field.Field>
					<div class="flex items-center justify-between">
						<Field.FieldLabel for="edit-email" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Email Address</Field.FieldLabel>
						<span class="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
							<LockIcon class="size-3 text-muted-foreground" />
							Locked
						</span>
					</div>
					<Input
						id="edit-email"
						type="text"
						bind:value={editEmail}
						disabled
						readonly
						class="rounded-xl h-10 bg-muted/60 text-muted-foreground font-mono font-semibold cursor-not-allowed select-all"
					/>
					<span class="text-[10px] text-muted-foreground font-medium">Email addresses cannot be modified after creation.</span>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel for="edit-fullname" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Full Name (Optional)</Field.FieldLabel>
					<Input
						id="edit-fullname"
						name="fullName"
						type="text"
						placeholder="e.g. Juan Dela Cruz"
						bind:value={editFullName}
						class="rounded-xl h-10"
					/>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">User Role</Field.FieldLabel>
					<input type="hidden" name="role" value={editRole} />
					<div class="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl text-xs font-bold">
						<button
							type="button"
							onclick={() => { editRole = 'staff'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {editRole === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Staff
						</button>
						<button
							type="button"
							onclick={() => { editRole = 'security'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {editRole === 'security' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Guard
						</button>
						<button
							type="button"
							onclick={() => { editRole = 'admin'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {editRole === 'admin' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Admin
						</button>
					</div>
				</Field.Field>

				{#if editRole === 'staff'}
					<Field.Field>
						<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bound Check-In Office Desk</Field.FieldLabel>
						<input type="hidden" name="officeId" value={editOfficeId} />
						<Select.Root
							type="single"
							value={editOfficeId}
							onValueChange={(val) => editOfficeId = val}
						>
							<Select.Trigger class="w-full h-10 rounded-xl cursor-pointer hover:bg-muted/30 ">
								<span class="text-xs font-semibold text-foreground truncate">
									{#if editOfficeId}
										{@const off = officesList.find(o => o.id === editOfficeId)}
										{off ? `${off.code} - ${off.name} (${off.buildingName || ''})` : 'Select Check-In Office'}
									{:else}
										Select Check-In Office
									{/if}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card">
								<Select.Group class="max-h-60 overflow-y-auto">
									{#each officesList as office}
										<Select.Item value={office.id} label={`${office.code} - ${office.name}`}>
											<div class="flex flex-col">
												<span class="font-bold text-foreground">{office.code} - {office.name}</span>
												<span class="text-[10px] text-muted-foreground">{office.buildingName || 'Main Building'}</span>
											</div>
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}
			</Field.FieldGroup>

			<Dialog.Footer class="pt-4 border-t border-border flex gap-2">
				<Button type="button" onclick={() => (activeEditingUser = null)} variant="outline" >
					Cancel
				</Button>
				<Button type="submit" >
					Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Archive Account Confirmation Dialog -->
<Dialog.Root open={!!archiveTargetUser} onOpenChange={(open) => { if (!open) archiveTargetUser = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
				<ArchiveIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Archive User Account?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Are you sure you want to archive and disable account <strong class="text-foreground">{archiveTargetUser?.email}</strong>?
				This user will no longer be able to log in to the portal. All past check-in logs and desk activities remain preserved, and you can restore this account at any time.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (archiveTargetUser = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleUserStatus" use:enhance={handleToggleStatusEnhance}>
				<input type="hidden" name="id" value={archiveTargetUser?.id} />
				<input type="hidden" name="isActive" value="false" />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5">
					<ArchiveIcon class="size-3.5" />
					<span>Confirm Archive</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Restore Account Confirmation Dialog -->
<Dialog.Root open={!!restoreTargetUser} onOpenChange={(open) => { if (!open) restoreTargetUser = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
				<RotateCcwIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Restore User Account?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium text-muted-foreground">
				Reactivate and restore account <strong class="text-foreground">{restoreTargetUser?.email}</strong>?
				The user will immediately regain access to log in with their existing credentials and assigned desk permissions.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2 border-t border-border mt-2">
			<Button variant="outline" onclick={() => (restoreTargetUser = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/toggleUserStatus" use:enhance={handleToggleStatusEnhance}>
				<input type="hidden" name="id" value={restoreTargetUser?.id} />
				<input type="hidden" name="isActive" value="true" />
				<Button type="submit" class="text-xs font-bold rounded-xl h-9 cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
					<RotateCcwIcon class="size-3.5" />
					<span>Confirm Restore</span>
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
