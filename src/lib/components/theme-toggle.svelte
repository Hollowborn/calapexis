<script lang="ts">
	import { toggleMode } from "mode-watcher";
	import SunIcon from "@lucide/svelte/icons/sun";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import { Button } from "$lib/components/ui/button/index.js";
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleMode}
	class="relative size-9 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-center"
	aria-label="Toggle Theme"
>
	<!-- Sun icon displays in light mode, rotates and hides in dark mode -->
	<SunIcon class="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground pointer-events-none" />
	
	<!-- Moon icon rotates and displays in dark mode, hides in light mode -->
	<MoonIcon class="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground pointer-events-none" />
</Button>
