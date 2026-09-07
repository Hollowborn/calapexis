<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { notificationState } from "$lib/notifications.svelte";
	import BellIcon from "@lucide/svelte/icons/bell";
	import BellOffIcon from "@lucide/svelte/icons/bell-off";
	import Volume2Icon from "@lucide/svelte/icons/volume-2";
	import VolumeXIcon from "@lucide/svelte/icons/volume-x";
	import CheckCheckIcon from "@lucide/svelte/icons/check-check";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";
	import DoorOpenIcon from "@lucide/svelte/icons/door-open";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import InfoIcon from "@lucide/svelte/icons/info";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";

	let activeTab = $state("all");

	function timeAgo(dateString: string): string {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

			if (seconds < 60) return "Just now";
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return `${minutes}m ago`;
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return `${hours}h ago`;
			const days = Math.floor(hours / 24);
			return `${days}d ago`;
		} catch {
			return "Recently";
		}
	}

	let displayList = $derived(
		activeTab === "unread" ? notificationState.unreadNotifications : notificationState.notifications
	);
</script>

<Dialog.Root bind:open={notificationState.isModalOpen}>
	<Dialog.Content class="sm:max-w-[540px] max-h-[85vh] p-0 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl border-border/70">
		<!-- Modal Header -->
		<div class="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
			<div class="flex items-center gap-2.5">
				<div class="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
					<BellIcon class="size-4.5" />
				</div>
				<div>
					<Dialog.Title class="text-base font-bold text-foreground flex items-center gap-2">
						Notifications Center
						{#if notificationState.unreadCount > 0}
							<Badge variant="destructive" class="px-1.5 py-0 text-[10px] font-bold rounded-full">
								{notificationState.unreadCount} unread
							</Badge>
						{/if}
					</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground mt-0.5">
						Real-time campus arrivals, desk check-ins, and security alerts.
					</Dialog.Description>
				</div>
			</div>

			<div class="flex items-center gap-1.5">
				{#if notificationState.unreadCount > 0}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => notificationState.markAllAsRead()}
						class="h-8 px-2.5 text-xs text-primary font-medium hover:bg-primary/10 gap-1.5 rounded-lg cursor-pointer"
					>
						<CheckCheckIcon class="size-3.5" />
						<span class="hidden sm:inline">Mark all read</span>
					</Button>
				{/if}
			</div>
		</div>

		<!-- Tabs Bar -->
		<Tabs.Root bind:value={activeTab} class="flex-1 flex flex-col min-h-0">
			<div class="px-5 pt-3 pb-2 border-b border-border/50 bg-background flex items-center justify-between">
				<Tabs.List class="grid grid-cols-3 h-8 w-64 bg-muted/60 p-0.5 rounded-lg">
					<Tabs.Trigger value="all" class="text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
						All ({notificationState.notifications.length})
					</Tabs.Trigger>
					<Tabs.Trigger value="unread" class="text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
						Unread ({notificationState.unreadCount})
					</Tabs.Trigger>
					<Tabs.Trigger value="settings" class="text-xs font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
						Settings
					</Tabs.Trigger>
				</Tabs.List>

				{#if activeTab !== 'settings' && notificationState.notifications.length > 0}
					<button
						onclick={() => notificationState.clearAll()}
						class="text-[11px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer"
					>
						<Trash2Icon class="size-3" />
						<span>Clear</span>
					</button>
				{/if}
			</div>

			<!-- Tab 1 & 2: Notifications List -->
			<div class="flex-1 overflow-y-auto min-h-[300px] max-h-[420px] p-3 space-y-2">
				{#if activeTab === 'settings'}
					<!-- Settings View -->
					<div class="p-4 space-y-4">
						<div class="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card">
							<div class="flex items-center gap-3">
								<div class="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
									{#if notificationState.isSoundEnabled}
										<Volume2Icon class="size-4" />
									{:else}
										<VolumeXIcon class="size-4 text-muted-foreground" />
									{/if}
								</div>
								<div>
									<h4 class="text-xs font-semibold text-foreground">Audio Chimes</h4>
									<p class="text-[11px] text-muted-foreground">Play a melodious tone on new real-time alerts</p>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => notificationState.testChime()}
									class="h-7 px-2 text-[11px] rounded-md font-medium cursor-pointer"
								>
									<SparklesIcon class="size-3 mr-1 text-amber-500" />
									Test Tone
								</Button>

								<Button
									variant={notificationState.isSoundEnabled ? "default" : "secondary"}
									size="sm"
									onclick={() => notificationState.toggleSound()}
									class="h-7 px-3 text-xs font-semibold rounded-md cursor-pointer"
								>
									{notificationState.isSoundEnabled ? "Enabled" : "Muted"}
								</Button>
							</div>
						</div>

						<div class="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-2">
							<h4 class="text-xs font-semibold text-foreground flex items-center gap-1.5">
								<InfoIcon class="size-3.5 text-primary" />
								Real-Time Synchronization
							</h4>
							<p class="text-[11px] text-muted-foreground leading-relaxed">
								Notifications are delivered via Supabase Realtime WebSockets. When gate visitors register, scan office QR codes, or check out, alerts update instantly across all active dashboard windows.
							</p>
						</div>
					</div>
				{:else if displayList.length === 0}
					<!-- Empty State -->
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div class="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
							<BellOffIcon class="size-6 opacity-60" />
						</div>
						<p class="text-sm font-semibold text-foreground">No notifications</p>
						<p class="text-xs text-muted-foreground mt-1 max-w-[240px]">
							{activeTab === 'unread' ? 'You have read all your alerts.' : 'New activity on campus will appear here.'}
						</p>
					</div>
				{:else}
					<!-- Notification Items -->
					{#each displayList as notif (notif.id)}
						<div
							class="group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 {notif.isRead
								? 'bg-card/50 border-border/40 text-muted-foreground hover:bg-muted/30'
								: 'bg-primary/5 border-primary/25 text-foreground shadow-2xs hover:bg-primary/8'}"
						>
							<!-- Unread Dot Indicator -->
							{#if !notif.isRead}
								<span class="absolute top-3 right-3 size-2 rounded-full bg-primary ring-2 ring-primary/20"></span>
							{/if}

							<!-- Type Icon Badge -->
							<div class="size-8 rounded-lg shrink-0 flex items-center justify-center {notif.type === 'pass_registered'
								? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
								: notif.type === 'desk_arrival'
								? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
								: notif.type === 'checkout'
								? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
								: 'bg-primary/10 text-primary'}">
								{#if notif.type === 'pass_registered'}
									<ShieldAlertIcon class="size-4" />
								{:else if notif.type === 'desk_arrival'}
									<DoorOpenIcon class="size-4" />
								{:else if notif.type === 'checkout'}
									<UserCheckIcon class="size-4" />
								{:else}
									<InfoIcon class="size-4" />
								{/if}
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0 pr-4">
								<div class="flex items-center gap-2">
									<h4 class="text-xs font-bold truncate {notif.isRead ? 'text-foreground/80' : 'text-foreground'}">
										{notif.title}
									</h4>
								</div>
								<p class="text-[11px] leading-snug mt-0.5 {notif.isRead ? 'text-muted-foreground' : 'text-foreground/90'}">
									{notif.message}
								</p>
								
								<div class="flex items-center gap-3 mt-2">
									<span class="text-[10px] text-muted-foreground font-medium">
										{timeAgo(notif.createdAt)}
									</span>

									{#if notif.linkUrl}
										<a
											href={notif.linkUrl}
											onclick={() => {
												notificationState.markAsRead(notif.id);
												notificationState.closeModal();
											}}
											class="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
										>
											View details <ExternalLinkIcon class="size-2.5" />
										</a>
									{/if}

									{#if !notif.isRead}
										<button
											onclick={() => notificationState.markAsRead(notif.id)}
											class="text-[10px] text-muted-foreground hover:text-foreground font-medium ml-auto cursor-pointer"
										>
											Mark read
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
