<script lang="ts">
	import CompassIcon from "@lucide/svelte/icons/compass";
	import type { Component } from "svelte";

	let {
		class: className = "size-7",
		alt = "Calapexis Logo",
		src = "/favicon.png",
		fallbackIcon: FallbackIcon = CompassIcon
	}: {
		class?: string;
		alt?: string;
		src?: string;
		fallbackIcon?: Component<any>;
	} = $props();

	let hasError = $state(false);
</script>

{#if !hasError}
	<img
		{src}
		{alt}
		class={className}
		onerror={() => (hasError = true)}
	/>
{:else}
	<FallbackIcon class={className} />
{/if}
