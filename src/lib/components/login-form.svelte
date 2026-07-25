<script lang="ts">
	import { enhance } from "$app/forms";
	import type { SubmitFunction } from "@sveltejs/kit";
	import * as Card from "$lib/components/ui/card/index.js";
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
	} from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";
	import { toast } from 'svelte-sonner';
	import type { HTMLAttributes } from "svelte/elements";
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		data?: any;
		form?: any;
	}

	let { class: className, data, form, ...restProps }: Props = $props();

	const id = $props.id();

	let username = $state('');
	let password = $state('');

	let resolveLogin: (val?: any) => void;
	let rejectLogin: (err: any) => void;

	// SvelteKit use:enhance form submission promise hook
	const handleLoginEnhance: SubmitFunction = () => {
		const loginPromise = new Promise((resolve, reject) => {
			resolveLogin = resolve;
			rejectLogin = reject;
		});

		toast.promise(loginPromise, {
			loading: "Verifying credentials...",
			success: "Authentication successful! Redirecting...",
			error: (err: any) => err.message || "Verification failed."
		});

		return async ({ result, update }) => {
			if (result.type === "redirect") {
				resolveLogin();
				await update();
			} else if (result.type === "failure") {
				rejectLogin(new Error((result.data as any)?.message || "Invalid username or password."));
			} else {
				rejectLogin(new Error("An unexpected server error occurred."));
			}
		};
	};

	// Trigger error notification if redirect auth flags error
	$effect(() => {
		if (data?.error) {
			const reason = data.error.replace('unauthorized_', '');
			toast.error(`Unauthorized: Log in as a verified ${reason} to view that portal.`);
		}
		if (data?.logout) {
			toast.success('Logged out successfully!');
		}
	});
</script>

<div class={cn("flex flex-col gap-6", className)} {...restProps}>
	<Card.Root class="overflow-hidden p-0 border-border shadow-2xl bg-card/65 backdrop-blur-xl">
		<Card.Content class="grid p-0 md:grid-cols-2">
			<!-- Form Left Section -->
			<form method="POST" action="/login?/login" use:enhance={handleLoginEnhance} class="p-8 md:p-10 flex flex-col justify-center gap-6">
				<FieldGroup class="flex flex-col gap-4">
					<div class="flex flex-col items-center gap-2 text-center">
						<div class="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xl font-black font-mono shadow-md shadow-primary/20 ring-4 ring-primary/10">
							C
						</div>
						<h1 class="text-2xl font-black tracking-tight text-foreground mt-2">Welcome Back!</h1>
						<p class="text-muted-foreground text-xs leading-relaxed max-w-[280px]">
							Enter your credentials to access the digital logbooks and desks.
						</p>
					</div>

					<!-- Error alert notification panel -->
					{#if data?.error}
						<div class="p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2.5">
							<ShieldAlertIcon class="size-4 pointer-events-none text-destructive/80" />
							<span class="font-medium">Protected Desk. Authentication required.</span>
						</div>
					{/if}

					<div class="flex flex-col gap-4 mt-2">
						<Field>
							<FieldLabel for="username-{id}" class="text-xs font-bold tracking-wide uppercase text-muted-foreground">Username</FieldLabel>
							<Input
								id="username-{id}"
								name="username"
								type="text"
								placeholder="Username"
								bind:value={username}
								required
								class="h-10 rounded-xl border-border bg-background/50 hover:bg-background focus:bg-background transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-xs"
							/>
						</Field>

						<Field>
							<div class="flex items-center justify-between">
								<FieldLabel for="password-{id}" class="text-xs font-bold tracking-wide uppercase text-muted-foreground">Password</FieldLabel>
							</div>
							<Input
								id="password-{id}"
								name="password"
								type="password"
								placeholder="••••••••"
								bind:value={password}
								required
								class="h-10 rounded-xl border-border bg-background/50 hover:bg-background focus:bg-background transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-xs"
							/>
						</Field>
					</div>

					<Field class="pt-4">
						<Button type="submit" class="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer">
							<KeyRoundIcon class="size-4 pointer-events-none" />
							<span>Login</span>
						</Button>
					</Field>
				</FieldGroup>
			</form>

			<!-- Right Illustration Banner -->
			<div class="relative hidden md:block min-h-[420px] bg-slate-950 overflow-hidden">
				<img
					src="/mark_placeholder.jpg"
					alt="Campus illustration"
					class="absolute inset-0 h-full w-full object-cover opacity-90 dark:opacity-60 transition-transform duration-10000 hover:scale-105"
				/>
				<div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none"></div>
				
				<!-- Glassmorphic floating banner card -->
				<div class="absolute bottom-8 left-8 right-8 backdrop-blur-md bg-white/10 dark:bg-black/20 border border-white/20 p-5 rounded-2xl text-white space-y-1.5 shadow-2xl">
					<div class="font-black text-xl tracking-tight text-white flex items-center gap-2 drop-shadow-sm">
						<span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
						Calapexis Portal
					</div>
					<div class="text-xs text-white/80 leading-relaxed font-medium">
						University Digital Visitor Verification & Pathfinding Navigator.
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Dev Environment Collapsible Quick Selection Bar -->
	{#if import.meta.env.DEV}
		<div class="px-6 text-center">
			<details class="group border border-border/80 bg-card/65 backdrop-blur-md rounded-2xl p-3.5 transition-all text-left shadow-lg">
				<summary class="text-xs font-extrabold text-muted-foreground hover:text-foreground cursor-pointer select-none flex items-center justify-between list-none">
					<span class="flex items-center gap-1.5">
						<span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
						<span>🛠️ Dev Mode Quick Fill Accounts</span>
					</span>
					<span class="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Dev Only</span>
				</summary>
				<div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => { username = 'admin'; password = 'admin123'; }}
						class="text-[11px] font-bold h-8 rounded-xl border-border/80 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
					>
						Admin
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => { username = 'security'; password = 'security123'; }}
						class="text-[11px] font-bold h-8 rounded-xl border-border/80 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
					>
						Security
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => { username = 'staff'; password = 'staff123'; }}
						class="text-[11px] font-bold h-8 rounded-xl border-border/80 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
					>
						Staff
					</Button>
				</div>
			</details>
		</div>
	{:else}
		<FieldDescription class="px-6 text-center text-[10px] text-muted-foreground/60 font-medium">
			Calapexis visitor management system follows university safety and privacy guidelines.
		</FieldDescription>
	{/if}
</div>
