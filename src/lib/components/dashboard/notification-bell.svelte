<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { notificationState } from "$lib/notifications.svelte";
	import BellIcon from "@lucide/svelte/icons/bell";
</script>

<Button
	variant="outline"
	size="icon"
	onclick={() => notificationState.openModal()}
	class="relative size-9 rounded-xl border-border/80 hover:bg-accent/60 cursor-pointer shadow-2xs"
	aria-label="Open notifications center"
>
	<BellIcon class="size-4 text-foreground/80" />

	{#if notificationState.unreadCount > 0}
		<!-- Glowing Pulse Animation -->
		<span class="absolute -top-1 -right-1 flex size-4 items-center justify-center">
			<span class="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-60"></span>
			<span class="relative inline-flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-extrabold text-destructive-foreground shadow-xs">
				{notificationState.unreadCount > 9 ? "9+" : notificationState.unreadCount}
			</span>
		</span>
	{/if}
</Button>
