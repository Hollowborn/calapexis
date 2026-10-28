<script lang="ts">
	import { getContext } from 'svelte';
	import LogbookTable from '$lib/components/logbook/LogbookTable.svelte';

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(data?.serverLogs || dashboardContext?.visitors || []);
</script>

<div class="p-6 md:p-8">
	<LogbookTable
		{visitors}
		role={data?.role || 'admin'}
		title="Logbook Master"
		subtitle="Campus-wide visitor logbook compliance records and activity archive"
		showPageHeader={true}
	/>
</div>
