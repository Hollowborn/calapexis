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
	import { MOCK_ROOMS, MOCK_BUILDINGS } from '$lib/supabase';
	
	// DataTable imports
	import * as DataTable from "$lib/components/ui/data-table/index.js";
	import { renderComponent, renderSnippet } from "$lib/components/ui/data-table/index.js";
	import { createColumnHelper } from "@tanstack/table-core";

	// Icons
	import UsersIcon from "@lucide/svelte/icons/users";

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let profiles = $derived(dashboardContext.profiles);

	// Fallback to mock lists if DB is empty
	let roomsList = $derived(data.rooms && data.rooms.length > 0 ? data.rooms : MOCK_ROOMS);
	let buildingsList = $derived(data.buildings && data.buildings.length > 0 ? data.buildings : MOCK_BUILDINGS);

	// Accounts Provisioning Dialog modal states
	let isCreatingUser = $state(false);
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state('staff');
	let newRoomId = $state('');

	// Sync room select fallback on list update
	$effect(() => {
		if (roomsList.length > 0 && !newRoomId) {
			newRoomId = roomsList[0].id;
		}
	});

	// Submit handlers
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
				resolveUser();
				isCreatingUser = false;
				newEmail = '';
				newPassword = '';
				newRole = 'staff';
				newRoomId = roomsList.length > 0 ? roomsList[0].id : '';
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
		columnHelper.accessor("roomId", {
			header: "Assigned Office/Desk",
			cell: ({ row }) => renderSnippet(roomCell, { profile: row.original })
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
	{#if email === 'staff' || email === 'admin' || email === 'security'}
		<Badge variant="secondary" class="ml-2 font-bold text-[8px] px-1 py-0.5 rounded-sm uppercase tracking-wide opacity-80">Default Account</Badge>
	{/if}
{/snippet}

{#snippet roleCell({ role }: { role: string })}
	{#if role === 'admin'}
		<Badge class="bg-red-500/10 text-red-600 hover:bg-red-500/10 border-red-500/20 text-[10px] font-bold rounded-full">Admin</Badge>
	{:else if role === 'security'}
		<Badge class="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px] font-bold rounded-full">Security Guard</Badge>
	{:else}
		<Badge class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] font-bold rounded-full">Office Staff</Badge>
	{/if}
{/snippet}

{#snippet roomCell({ profile }: { profile: any })}
	{#if profile.role === 'staff' && profile.roomId}
		{@const room = roomsList.find(r => r.id === profile.roomId)}
		{@const building = buildingsList.find(b => b.id === room?.buildingId)}
		<span class="text-xs font-semibold text-foreground">
			{room ? `${room.roomNumber} - ${room.roomName}` : profile.roomId}
			{#if building}
				<span class="text-[10px] text-muted-foreground font-medium block">{building.name}</span>
			{/if}
		</span>
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
			<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Monitor system access profiles and bind staff to specific department rooms.</p>
		</div>
	</div>

	<!-- Users List Panel -->
	<Card.Root class="border-border/80 shadow-sm rounded-2xl bg-card p-6">
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
						<Field.FieldLabel class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bound Department Room</Field.FieldLabel>
						<input type="hidden" name="roomId" value={newRoomId} />
						<Select.Root
							type="single"
							value={newRoomId}
							onValueChange={(val) => newRoomId = val}
						>
							<Select.Trigger class="w-full h-10 rounded-xl cursor-pointer hover:bg-muted/30">
								<span class="text-xs font-semibold text-foreground">
									{#if newRoomId}
										{@const room = roomsList.find(r => r.id === newRoomId)}
										{@const building = buildingsList.find(b => b.id === room?.buildingId)}
										{room ? `${room.roomNumber} - ${room.roomName} (${building?.name || ''})` : 'Select Desk/Room'}
									{:else}
										Select Desk/Room
									{/if}
								</span>
							</Select.Trigger>
							<Select.Content class="rounded-xl border border-border bg-card">
								<Select.Group class="max-h-60 overflow-y-auto">
									{#each roomsList as room}
										<Select.Item value={room.id} label={`${room.roomNumber} - ${room.roomName}`}>
											{room.roomNumber} - {room.roomName} ({buildingsList.find(b => b.id === room.buildingId)?.code || ''})
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
