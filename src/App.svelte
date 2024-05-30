<script lang="ts">
	import IssueTable from './lib/IssueTable.svelte';
	import IssueGraph from './lib/IssueGraph.svelte';
	import { fetch_issuenode, update_issuegraph } from "./lib/github"
	import { onMount } from "svelte";
	import { Graph } from "./lib/graph";
	import { Octokit } from "octokit";

	import Spinner from './lib/Spinner.svelte';

	const octokit = new Octokit({
		auth: "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"
	});    

	let graph: Graph

	function update(){
		loading = update_issuegraph(octokit, graph).then(async (g) => {
			graph = g
			console.log("graph:", graph)
			loading = Promise.resolve()
			await new Promise((resolve) => setTimeout(resolve, 10000));
			
			update()
		})
	}

	// authenticates as app based on request URLs
	let loading: Promise<any> = octokit.rest.users.getAuthenticated().then(({ data: { login } }) => {
		console.log("authenticated")
		loading = fetch_issuenode(octokit, "octocat", "Hello-World", 3094).then((n)=>{
			if(n){
				graph = new Graph([n])
				update()
			}else{
				console.error("Initial node does not exist")
			}
			
		})
	});
	
	
	let tabs = [
		{ name: "Table", comp: IssueTable },
		{ name: "Graph", comp: IssueGraph },
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
	{#await loading}
		<Spinner/>
	{:then number}
		✅
	{:catch error}
		❌
	{/await}
	{#if graph !== undefined}
		<svelte:component this={cur.comp} graph={graph} />
	{/if}
	
	
</main>

<style>
	button {
		cursor: pointer;
		padding: 0.5rem 1rem;
		border: 1px solid transparent;
		margin-bottom: -1px;
		background-color: #131313;
		margin: 2px;
	}
	button.selected {
		border-top-right-radius: 8px;
		border-top-left-radius: 8px;
		border-top-width: 8px;
		border-color: #b0b #abc #fff;
	}
	main {
		font-size: 1rem;
		padding: 2rem;
	}
</style>