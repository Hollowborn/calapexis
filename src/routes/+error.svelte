<script lang="ts">
	import { page } from "$app/state";
	import * as Empty from "$lib/components/ui/empty/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { toast } from "svelte-sonner";

	// Icons
	import FileQuestionIcon from "@lucide/svelte/icons/file-question";
	import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import ServerCrashIcon from "@lucide/svelte/icons/server-crash";
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";

	// Derive SvelteKit error state
	let status = $derived(page.status);
	let message = $derived(page.error?.message || "An unexpected error occurred.");

	// Determine title, description, and icon dynamically based on status code
	let errorTitle = $derived(
		status === 404 ? "404 - Page Not Found" :
		status === 403 ? "403 - Forbidden Access" :
		status === 401 ? "401 - Unauthorized" :
		status === 500 ? "500 - Server Exception" :
		`${status} - Error`
	);

	let errorDescription = $derived(
		status === 404 ? "The page you're looking for doesn't exist or has been relocated." :
		status === 403 ? "You do not have the necessary security credentials to view this resource." :
		status === 401 ? "Access denied. Please authenticate to view this page." :
		status === 500 ? `A server-side exception occurred: ${message}` :
		message
	);

	let CurrentIcon = $derived(
		status === 404 ? FileQuestionIcon :
		status === 403 ? ShieldAlertIcon :
		status === 401 ? KeyRoundIcon :
		status === 500 ? ServerCrashIcon :
		AlertCircleIcon
	);
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
	<Empty.Root>
		<Empty.Media variant="icon" class="size-16 rounded-2xl bg-muted/40 text-primary border border-border/80 mb-4">
			<CurrentIcon class="size-8" />
		</Empty.Media>
		<Empty.Header>
			<Empty.Title class="text-2xl font-bold text-foreground">
				{errorTitle}
			</Empty.Title>
			<Empty.Description class="max-w-md leading-relaxed font-semibold">
				{errorDescription}
			</Empty.Description>
		</Empty.Header>
		<Empty.Content class="mt-4">
			<div class="flex flex-col gap-4 items-center">
					<div class="flex w-full items-center gap-2">
						<Button onclick={() => window.history.back()} variant="outline" class="text-xs font-extrabold rounded-xl shadow-md cursor-pointer h-10 px-5">
							Go Back
						</Button>
						<Button href="/" variant="default" class="text-xs font-extrabold rounded-xl shadow-md cursor-pointer h-10 px-5">
							Return to Homepage
						</Button>
				</div>
				<Empty.Description class="text-xs font-medium">
					Need help? <Button variant="link" onclick={() => toast.message('Support contacts: admin@calapexis.local')} class="p-0 h-auto font-bold text-primary hover:underline cursor-pointer text-xs">Contact support</Button>
				</Empty.Description>
			</div>
		</Empty.Content>
	</Empty.Root>
</div>
