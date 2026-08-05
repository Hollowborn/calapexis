<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { Profile, Office } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { MOCK_OFFICES } from '$lib/supabase';
	
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

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let profiles = $derived<Profile[]>(dashboardContext.profiles);

	// Fallback to mock lists if DB is empty
	let officesList = $derived(data.offices && data.offices.length > 0 ? data.offices : MOCK_OFFICES);

	// Accounts Provisioning Dialog modal states
	let isCreatingUser = $state(false);
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state<'admin' | 'security' | 'staff'>('staff');
	let newOfficeId = $state('');

	// Edit Account Dialog Modal states
	let activeEditingUser = $state<Profile | null>(null);
	let editEmail = $state('');
	let editRole = $state<'admin' | 'security' | 'staff'>('staff');
	let editOfficeId = $state('');

	// Deletion Account Target State
	let deletingUserTarget = $state<Profile | null>(null);

	// Table Filter State
	let selectedRoleFilter = $state<string>('all');

	// Sync office select fallback on list update
	$effect(() => {
		if (officesList.length > 0 && !newOfficeId) {
			newOfficeId = officesList[0].id;
		}
	});

	function startEditUser(profile: Profile) {
		activeEditingUser = profile;
		editEmail = profile.email;
		editRole = profile.role;
		editOfficeId = profile.officeId || (officesList.length > 0 ? officesList[0].id : '');
	}

	// Filtered profiles for data table
	let filteredProfiles = $derived(
		profiles.filter((p) => {
			if (selectedRoleFilter === 'all') return true;
			return p.role === selectedRoleFilter;
		})
	);

	// Submit handlers
	const handleCreateUserEnhance: SubmitFunction = () => {
		let resolveUser: (v?: any) => void = () => {};
		let rejectUser: (e: any) => void = () => {};
		const createPromise = new Promise((resolve, reject) => {
			resolveUser = resolve;
			rejectUser = reject;
		});

		toast.promise(createPromise, {
			loading: "Provisioning account...",
			success: "Account created successfully!",
			error: (err: any) => typeof err === "string" ? err : (err?.message || "Failed to create account.")
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveUser();
				isCreatingUser = false;
				newEmail = '';
				newPassword = '';
				newRole = 'staff';
				newOfficeId = officesList.length > 0 ? officesList[0].id : '';
				await dashboardContext.loadData();
				await update();
			} else if (result.type === "failure") {
				const errMsg = (result.data as any)?.message || "Failed to create user.";
				rejectUser(new Error(errMsg));
			} else if (result.type === "error") {
				const errMsg = (result.error as any)?.message || "Server error creating user.";
				rejectUser(new Error(errMsg));
			} else {
				rejectUser(new Error("Unexpected authentication error."));
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

	const handleDeleteUserEnhance: SubmitFunction = () => {
		let resolveDelete: (v?: any) => void = () => {};
		let rejectDelete: (e: any) => void = () => {};
		const deletePromise = new Promise((resolve, reject) => {
			resolveDelete = resolve;
			rejectDelete = reject;
		});

		toast.promise(deletePromise, {
			loading: "Deleting account...",
			success: "User account deleted successfully!",
			error: (err: any) => typeof err === "string" ? err : (err?.message || "Failed to delete account.")
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				resolveDelete();
				deletingUserTarget = null;
				await dashboardContext.loadData();
				await update();
			} else if (result.type === "failure") {
				const errMsg = (result.data as any)?.message || "Failed to delete user.";
				rejectDelete(new Error(errMsg));
			} else if (result.type === "error") {
				const errMsg = (result.error as any)?.message || "Server error deleting user.";
				rejectDelete(new Error(errMsg));
			} else {
				rejectDelete(new Error("Unexpected error."));
			}
		};
	};

	// Setup TanStack Columns for Profiles Table
	const columnHelper = createColumnHelper<any>();

	const columns = [
		columnHelper.accessor("email", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Username / Email" }),
			cell: ({ getValue }) => renderSnippet(emailCell, { email: getValue() })
		}),
		columnHelper.accessor("role", {
			header: "Access Role",
			cell: ({ getValue }) => renderSnippet(roleCell, { role: getValue() })
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

{#snippet emailCell({ email }: { email: string })}
	<span class="font-mono font-bold text-foreground text-sm select-all">{email}</span>
	{#if email === 'staff' || email === 'admin' || email === 'security'}
		<Badge variant="secondary" class="ml-2 font-bold text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide opacity-80">Default Account</Badge>
	{/if}
{/snippet}

{#snippet roleCell({ role }: { role: string })}
	{#if role === 'admin'}
		<Badge class="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/20 text-[10px] font-bold rounded-full">Administrator</Badge>
	{:else if role === 'security'}
		<Badge class="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px] font-bold rounded-full">Security Guard</Badge>
	{:else}
		<Badge class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold rounded-full">Office Staff</Badge>
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
		<Button 
			onclick={() => startEditUser(profile)} 
			variant="ghost" 
			size="icon" 
			class="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
		>
			<PencilIcon class="size-3.5 pointer-events-none" />
		</Button>
		<Button 
			onclick={() => (deletingUserTarget = profile)} 
			variant="ghost" 
			size="icon" 
			class="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
		>
			<Trash2Icon class="size-3.5 pointer-events-none" />
		</Button>
	</div>
{/snippet}

<!-- Custom Toolbar Snippet with Role Filter Bar -->
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
					<Field.FieldLabel for="new-email" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Username (Email)</Field.FieldLabel>
					<Input
						id="new-email"
						name="email"
						type="text"
						placeholder="e.g. registrar_staff"
						bind:value={newEmail}
						required
						class="rounded-xl h-10"
					/>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel for="new-password" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Password</Field.FieldLabel>
					<Input
						id="new-password"
						name="password"
						type="password"
						placeholder="Minimum 6 characters"
						bind:value={newPassword}
						required
						class="rounded-xl h-10"
					/>
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
							<Select.Trigger class="w-full h-10 rounded-xl cursor-pointer hover:bg-muted/30">
								<span class="text-xs font-semibold text-foreground truncate">
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
				<Button type="button" onclick={() => (isCreatingUser = false)} variant="outline" class="">
					Cancel
				</Button>
				<Button type="submit" >
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
					<Field.FieldLabel for="edit-email" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Username (Email)</Field.FieldLabel>
					<Input
						id="edit-email"
						name="email"
						type="text"
						placeholder="e.g. registrar_staff"
						bind:value={editEmail}
						required
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
							<Select.Trigger class="w-full h-10 rounded-xl cursor-pointer hover:bg-muted/30">
								<span class="text-xs font-semibold text-foreground">
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
				<Button type="button" onclick={() => (activeEditingUser = null)} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 cursor-pointer">
					Cancel
				</Button>
				<Button type="submit" class="flex-1 text-xs font-extrabold rounded-xl h-10 cursor-pointer">
					Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Account Confirmation Dialog -->
<Dialog.Root open={!!deletingUserTarget} onOpenChange={(open) => { if (!open) deletingUserTarget = null; }}>
	<Dialog.Content class="sm:max-w-md rounded-2xl p-6">
		<Dialog.Header class="space-y-2">
			<div class="flex items-center gap-2 text-destructive">
				<AlertTriangleIcon class="size-5 pointer-events-none" />
				<Dialog.Title class="text-base font-black">Delete System User Account?</Dialog.Title>
			</div>
			<Dialog.Description class="text-xs leading-relaxed font-medium">
				Are you sure you want to delete account <strong class="text-foreground">{deletingUserTarget?.email}</strong>?
				This user will no longer be able to log in to the portal.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="pt-4 flex items-center justify-end gap-2">
			<Button variant="outline" onclick={() => (deletingUserTarget = null)} class="text-xs font-bold rounded-xl h-9">
				Cancel
			</Button>
			<form method="POST" action="?/deleteUser" use:enhance={handleDeleteUserEnhance}>
				<input type="hidden" name="id" value={deletingUserTarget?.id} />
				<Button type="submit" variant="destructive" class="text-xs font-bold rounded-xl h-9 cursor-pointer">
					Confirm Delete
				</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
