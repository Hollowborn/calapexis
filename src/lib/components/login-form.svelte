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
	});
</script>

<div class={cn("flex flex-col gap-6", className)} {...restProps}>
	<Card.Root class="overflow-hidden p-0 border-border shadow-2xl">
		<Card.Content class="grid p-0 md:grid-cols-2">
			<!-- Form Left Section -->
			<form method="POST" action="/login?/login" use:enhance={handleLoginEnhance} class="p-6 md:p-8 flex flex-col gap-4">
				<FieldGroup class="flex flex-col gap-4">
					<div class="flex flex-col items-center gap-2 text-center">
						<div class="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold font-mono shadow-xs">
							C
						</div>
						<h1 class="text-2xl font-bold tracking-tight">University Portal Access</h1>
						<p class="text-muted-foreground text-xs text-balance">
							Enter your credentials to access the digital logbooks and desks.
						</p>
					</div>

					<!-- Error alert notification panel -->
					{#if data?.error}
						<div class="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
							<ShieldAlertIcon class="size-4 pointer-events-none" />
							<span>Protected Desk. Authentication required.</span>
						</div>
					{/if}

					<Field>
						<FieldLabel for="username-{id}">Username</FieldLabel>
						<Input
							id="username-{id}"
							name="username"
							type="text"
							placeholder="Username"
							bind:value={username}
							required
						/>
					</Field>

					<Field>
						<div class="flex items-center">
							<FieldLabel for="password-{id}">Password</FieldLabel>
						</div>
						<Input
							id="password-{id}"
							name="password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							required
						/>
					</Field>

					<Field class="pt-2">
						<Button type="submit" class="w-full flex items-center justify-center gap-2 shadow-md">
							<KeyRoundIcon class="size-4 pointer-events-none" />
							<span>Sign In</span>
						</Button>
					</Field>
				</FieldGroup>
			</form>

			<!-- Right Illustration Banner -->
			<div class="bg-muted relative hidden md:block">
				<img
					src="/login_campus_mockup.jpg"
					alt="Campus illustration"
					class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.3]"
				/>
				<div class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none"></div>
				<div class="absolute bottom-6 left-6 right-6 text-white space-y-1">
					<div class="font-black text-lg tracking-tight text-white drop-shadow-md">Calapexis Logbook</div>
					<div class="text-[11px] text-zinc-300 drop-shadow-md">University Digital Visitor Verification & Pathfinding Navigator.</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Dev Environment Collapsible Quick Selection Bar -->
	{#if import.meta.env.DEV}
		<div class="px-6 text-center">
			<details class="group border border-border bg-card rounded-xl p-2.5 transition-all text-left">
				<summary class="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none flex items-center justify-between list-none">
					<span>🛠️ Dev Mode Quick Fill Accounts</span>
					<span class="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-md font-mono">Dev Only</span>
				</summary>
				<div class="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/60">
					<button
						type="button"
						onclick={() => { username = 'admin'; password = 'admin123'; }}
						class="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-[10px] font-bold rounded-lg transition-all text-center border border-border cursor-pointer"
					>
						Admin
					</button>
					<button
						type="button"
						onclick={() => { username = 'security'; password = 'security123'; }}
						class="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-[10px] font-bold rounded-lg transition-all text-center border border-border cursor-pointer"
					>
						Security
					</button>
					<button
						type="button"
						onclick={() => { username = 'staff'; password = 'staff123'; }}
						class="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground text-[10px] font-bold rounded-lg transition-all text-center border border-border cursor-pointer"
					>
						Staff
					</button>
				</div>
			</details>
		</div>
	{:else}
		<FieldDescription class="px-6 text-center text-[10px]">
			Calapexis visitor management system follows university safety and privacy guidelines.
		</FieldDescription>
	{/if}
</div>
