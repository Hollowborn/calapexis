<script lang="ts">
	import { getContext } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { MOCK_OFFICES, supabase, isSupabaseConfigured } from '$lib/supabase';
	
	// DataTable imports
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import { createColumnHelper } from "@tanstack/table-core";

	// Icons
	import UsersIcon from "@lucide/svelte/icons/users";

	const dashboardContext = getContext<any>("dashboard-state");
	let profiles = $derived(dashboardContext.profiles);

	// Accounts Provisioning Dialog modal states
	let isCreatingUser = $state(false);
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state('staff');
	let newOfficeId = $state('off-1');

	// Submit hook hooks
	let resolveUser: (val?: any) => void;
	let rejectUser: (err: any) => void;

	const handleCreateUserEnhance: SubmitFunction = () => {
		const createPromise = new Promise((resolve, reject) => {
			resolveUser = resolve;
			rejectUser = reject;
		});

		toast.promise(createPromise, {
			loading: "Provisioning account...",
			success: "Account created successfully!",
			error: (err: any) => err.message || "Failed to create account."
		});

		return async ({ result, update }) => {
			if (result.type === "success") {
				const newUserId = (result.data as any)?.newUserId;
				if (newUserId && isSupabaseConfigured && supabase) {
					const { error: profileError } = await supabase
						.from("profiles")
						.update({
							role: newRole,
							office_id: newRole === 'staff' ? newOfficeId : null
						})
						.eq("id", newUserId);

					if (profileError) {
						rejectUser(new Error(profileError.message || "Failed to configure database role mapping."));
						return;
					}
				}

				resolveUser();
				isCreatingUser = false;
				newEmail = '';
				newPassword = '';
				newRole = 'staff';
				newOfficeId = 'off-1';
				await dashboardContext.loadData();
				await update();
			} else if (result.type === "failure") {
				rejectUser(new Error((result.data as any)?.message || "Failed to create user."));
			} else {
				rejectUser(new Error("Unexpected authentication error."));
			}
		};
	};

	// Setup TanStack Columns for Profiles Table
	const columnHelper = createColumnHelper<any>();

	const columns = [
		columnHelper.accessor("email", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Username (Email)" }),
			cell: ({ getValue }) => renderSnippet(emailCell, { email: getValue() })
		}),
		columnHelper.accessor("role", {
			header: "Access Role",
			cell: ({ getValue }) => renderSnippet(roleCell, { role: getValue() })
		}),
		columnHelper.accessor("officeId", {
			header: "Assigned Department",
			cell: ({ row }) => renderSnippet(departmentCell, { profile: row.original })
		}),
		columnHelper.accessor("createdAt", {
			header: ({ column }) => renderComponent(DataTable.ColumnHeader, { column: column as any, title: "Created Date" }),
			cell: ({ getValue }) => renderSnippet(dateCell, { date: getValue() })
		})
	];
</script>

<!-- Cell Snippets -->
{#snippet emailCell({ email }: { email: string })}
	<span class="font-mono font-bold text-foreground text-sm select-all">{email}</span>
{/snippet}

{#snippet roleCell({ role }: { role: string })}
	{#if role === 'admin'}
		<Badge class="bg-red-500/10 text-red-600 hover:bg-red-500/10 border-red-500/20 text-[10px] font-bold rounded-full">Admin</Badge>
	{:else if role === 'security'}
		<Badge class="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px] font-bold rounded-full">Security</Badge>
	{:else}
		<Badge class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold rounded-full">Staff</Badge>
	{/if}
{/snippet}

{#snippet departmentCell({ profile }: { profile: any })}
	{#if profile.role === 'staff' && profile.officeId}
		{@const office = MOCK_OFFICES.find(o => o.id === profile.officeId)}
		<span class="text-xs font-semibold text-foreground">{office?.name || profile.officeId}</span>
	{:else}
		<span class="italic text-muted-foreground/60 text-[10px] font-medium">Global Access</span>
	{/if}
{/snippet}

{#snippet dateCell({ date }: { date: string })}
	<span class="font-mono text-muted-foreground font-semibold text-xs">
		{new Date(date || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
	</span>
{/snippet}

<!-- Custom Toolbar Snippet -->
{#snippet customToolbarSnippet()}
	<Button onclick={() => (isCreatingUser = true)} class="text-xs font-bold gap-2 rounded-xl h-9 cursor-pointer">
		<UsersIcon class="size-4 pointer-events-none" />
		<span>Provision User Account</span>
	</Button>
{/snippet}

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header block -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div>
			<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">System User Accounts</h1>
			<p class="text-xs text-muted-foreground leading-relaxed">Monitor system access profiles and bind staff to departments.</p>
		</div>
	</div>

	<!-- Users List Panel -->
	<Card.Root class="border-border/80 shadow-sm rounded-2xl bg-card p-6">
		<div class="space-y-1 mb-4">
			<Card.Title class="text-base font-bold text-foreground">User Accounts & Portals Provisioning</Card.Title>
			<Card.Description class="text-xs text-muted-foreground">Provision security and staff portals access credentials.</Card.Description>
		</div>

		<DataTable.Root
			data={profiles}
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
			<Dialog.Description class="text-xs">Create credentials and assign system roles.</Dialog.Description>
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
					<div class="grid grid-cols-2 gap-1.5 bg-muted p-1 rounded-xl text-xs font-bold">
						<button
							type="button"
							onclick={() => { newRole = 'staff'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'staff' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Office Staff
						</button>
						<button
							type="button"
							onclick={() => { newRole = 'security'; }}
							class="py-1.5 rounded-lg transition-all text-center cursor-pointer {newRole === 'security' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'}"
						>
							Security Guard
						</button>
					</div>
				</Field.Field>

				{#if newRole === 'staff'}
					<Field.Field>
						<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bound Department Office</Field.FieldLabel>
						<input type="hidden" name="officeId" value={newOfficeId} />
						<Select.Root
							type="single"
							value={newOfficeId}
							onValueChange={(val) => newOfficeId = val}
						>
							<Select.Trigger class="w-full h-10 rounded-xl cursor-pointer hover:bg-muted/30">
								<span class="text-xs font-semibold text-foreground">
									{MOCK_OFFICES.find(o => o.id === newOfficeId)?.name || 'Select Department'}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card">
								<Select.Group>
									{#each MOCK_OFFICES as office}
										<Select.Item value={office.id} label={office.name}>
											{office.name} ({office.code})
										</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				{/if}
			</Field.FieldGroup>

			<Dialog.Footer class="pt-4 border-t border-border flex gap-2">
				<Button type="button" onclick={() => (isCreatingUser = false)} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 cursor-pointer">
					Cancel
				</Button>
				<Button type="submit" class="flex-1 text-xs font-extrabold rounded-xl h-10 cursor-pointer">
					Create Account
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
