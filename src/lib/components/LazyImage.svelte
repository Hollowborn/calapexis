<script lang="ts">
	import { Skeleton } from "$lib/components/ui/skeleton";
	import ImageIcon from "@lucide/svelte/icons/image";

	let {
		src = "",
		alt = "",
		class: className = "",
		onclick = undefined
	}: {
		src?: string;
		alt?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
	} = $props();

	let isLoaded = $state(false);
	let hasError = $state(false);
</script>

<div 
	role={onclick ? "button" : undefined}
	tabindex={onclick ? 0 : undefined}
	{onclick}
	onkeydown={(e) => { if (onclick && (e.key === 'Enter' || e.key === ' ')) onclick(e as any); }}
	class="relative overflow-hidden bg-muted/50 rounded-2xl group transition-all {onclick ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : ''} {className}"
>
	{#if !isLoaded && !hasError}
		<Skeleton class="absolute inset-0 size-full rounded-2xl z-10" />
	{/if}

	{#if hasError || !src}
		<div class="absolute inset-0 size-full bg-muted flex flex-col items-center justify-center text-muted-foreground p-2 text-center z-10">
			<ImageIcon class="size-6 mb-1 opacity-50" />
			<span class="text-[10px] font-semibold">Image unavailable</span>
		</div>
	{:else}
		<img
			{src}
			{alt}
			loading="lazy"
			decoding="async"
			onload={() => (isLoaded = true)}
			onerror={() => (hasError = true)}
			class="size-full object-cover transition-opacity duration-300 {isLoaded ? 'opacity-100' : 'opacity-0'}"
		/>
	{/if}
</div>
