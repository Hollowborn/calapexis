<script lang="ts">
	import { page } from "$app/state";
	import * as Empty from "$lib/components/ui/empty/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { toast } from "svelte-sonner";

	// Derive SvelteKit error state
	let status = $derived(page.status);
	let message = $derived(page.error?.message || "An unexpected error occurred.");

	// Determine title and description dynamically
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
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
	<Empty.Root>
		<Empty.Header>
			<Empty.Title>{errorTitle}</Empty.Title>
			<Empty.Description class="max-w-md leading-relaxed font-semibold">
				{errorDescription}
			</Empty.Description>
		</Empty.Header>
		<Empty.Content class="mt-6">
			<div class="flex flex-col gap-4 items-center">
				<Button href="/" variant="default" class="text-xs font-extrabold rounded-xl shadow-md cursor-pointer h-10 px-5">
					Return to Homepage
				</Button>
				<Empty.Description class="text-xs font-medium">
					Need help? <Button variant="link" onclick={() => toast.message('Support contacts: admin@calapexis.local')} class="p-0 h-auto font-bold text-primary hover:underline cursor-pointer text-xs">Contact support</Button>
				</Empty.Description>
			</div>
		</Empty.Content>
	</Empty.Root>
</div>
