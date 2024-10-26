<script lang="ts">
	import IssueTable from './IssueTable.svelte';
	import IssueGraph from './IssueGraph.svelte';
	import { Graph } from './graph';

	export let graph: Graph;

	let tabs = [
		{ name: 'Table', comp: IssueTable },
		{ name: 'Graph', comp: IssueGraph }
	];

	let cur = tabs[0];
</script>

<div class="tabs">
	{#each tabs as tab}
		<button class:selected={cur === tab} on:click={() => (cur = tab)}>
			{tab.name}
		</button>
	{/each}
</div>
<main>
	<svelte:component this={cur.comp} {graph} />
</main>

<style>
	button {
		cursor: pointer;
		padding: 0.5rem 1rem;
		border: 1px solid transparent;
		margin-bottom: -1px;
		margin: 2px;
	}
	button.selected {
		border-top-right-radius: 8px;
		border-top-left-radius: 8px;
		border-top-width: 8px;
		border-color: #b0b;
	}
	main {
		font-size: 1rem;
		padding: 2rem;
	}
</style>
