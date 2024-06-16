<script lang="ts">
	import IssueTable from './IssueTable.svelte';
	import IssueGraph from './IssueGraph.svelte';
	import { fetch_issuenode, update_issuegraph, want_links } from "./github"
	import { Graph } from "./graph";
	import { Octokit } from "octokit";

	import Spinner from './Spinner.svelte';

	export let access_token: string|null
	export let owner : string
	export let repo : string
	export let issue_number : number

	const octokit = new Octokit({ auth: access_token });    

	let graph: Graph

	function update(){
		let want = want_links(graph)
		if(want.length > 0 && access_token){
			loading = update_issuegraph(octokit, graph, want).then(async (g) => {
				graph = g
				update()
			})
		}else{
			loading = Promise.resolve()
			new Promise((resolve) => setTimeout(resolve, 10000)).then(update);
		}
	}

	// authenticates as app based on request URLs
	let loading: Promise<any> = fetch_issuenode(octokit, owner, repo, issue_number).then((n) => {
		if(n){
			graph = new Graph([n])
			update()
		}else{
			console.error("Initial node does not exist")
		}
		
	})
	
	
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
        fetching Issues<br>
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