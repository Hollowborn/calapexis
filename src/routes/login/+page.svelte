<script lang="ts">
	import LoginForm from "$lib/components/login-form.svelte";

	let { data, form } = $props();
</script>

<div class="bg-[radial-gradient(ellipse_at_top,_var(--color-primary-foreground),_var(--color-background))] dark:bg-[radial-gradient(ellipse_at_top,_oklch(from_var(--color-primary)_l_c_h_/_0.15),_var(--color-background))] flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm md:max-w-3xl">
		<LoginForm {data} {form} />
	</div>
</div>
