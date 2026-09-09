<script lang="ts">
	import BadgeCheckIcon from "@lucide/svelte/icons/badge-check";
	import BellIcon from "@lucide/svelte/icons/bell";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import UserIcon from "@lucide/svelte/icons/user";
	import { enhance } from "$app/forms";
	import { invalidate } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import ProfileModal from "./profile-modal.svelte";
	import { notificationState } from "$lib/notifications.svelte";

	let { user }: { user: { name: string; email: string; avatar: string; role?: string; officeId?: string; roomId?: string } } = $props();

	const sidebar = useSidebar();
	let isProfileModalOpen = $state(false);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
					>
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">{user.name.substring(0, 2).toUpperCase()}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="truncate text-xs text-muted-foreground">{user.email}</span>
						</div>
						<ChevronsUpDownIcon class="ms-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? "bottom" : "right"}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Image src={user.avatar} alt={user.name} />
							<Avatar.Fallback class="rounded-lg">{user.name.substring(0, 2).toUpperCase()}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{user.name}</span>
							<span class="truncate text-xs text-muted-foreground">{user.email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item onclick={() => (isProfileModalOpen = true)} class="cursor-pointer">
						<UserIcon class="size-4 mr-2" />
						My Profile
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => notificationState.openModal()} class="cursor-pointer">
					
							<BellIcon class="size-4 mr-2" />
					
							Notifications
						{#if notificationState.unreadCount > 0}
						<div class="flex justify-end">
							<span class="size-2 rounded-full bg-destructive animate-pulse"></span>
							 </div>
							<!-- <BellIcon class="inline-end size-4 mr-2 animate-pulse" color="red"/> -->
						{/if}
						
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<form
					method="POST"
					action="/login?/logout"
					use:enhance={() => {
						return async ({ update }) => {
							await invalidate('supabase:auth');
							await update();
						};
					}}
					class="w-full"
				>
					<button type="submit" class="w-full text-start">
						<DropdownMenu.Item class="cursor-pointer w-full text-destructive hover:bg-destructive/15">
							<LogOutIcon class="size-4 mr-2" />
							Log out
						</DropdownMenu.Item>
					</button>
				</form>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<!-- Global Profile Manager Modal -->
<ProfileModal bind:open={isProfileModalOpen} {user} />
