<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let username = $state('admin');
	let password = $state('');

	function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		goto('/admin');
	}
</script>

<div class="max-w-md mx-auto py-12 space-y-6">
	<div class="bg-card p-6 rounded-2xl border border-border shadow-xl space-y-4">
		<div class="text-center space-y-1">
			<div class="w-12 h-12 mx-auto rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold font-mono">
				V
			</div>
			<h1 class="text-xl font-bold tracking-tight text-foreground">Admin Portal Login</h1>
			<p class="text-xs text-muted-foreground">Log in to manage university visitor logs and campus offices.</p>
		</div>

		<form onsubmit={handleLogin} class="space-y-4 pt-2">
			<div>
				<label for="username" class="block text-xs font-medium text-foreground mb-1">Username</label>
				<Input id="username" type="text" bind:value={username} required class="w-full" />
			</div>

			<div>
				<label for="password" class="block text-xs font-medium text-foreground mb-1">Password</label>
				<Input id="password" type="password" placeholder="••••••••" bind:value={password} required class="w-full" />
			</div>

			<Button type="submit" class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs py-2 rounded-lg transition-colors">
				Log In to Admin Dashboard
			</Button>
		</form>
	</div>
</div>
