<script lang="ts">
	import IssueTable from './lib/IssueTable.svelte';
	import IssueGraph from './lib/IssueGraph.svelte';
	import { fetch_issuenode, update_issuegraph } from "./lib/github"
	import { onMount } from "svelte";
	import { Graph } from "./lib/graph";
	import { Octokit } from "octokit";

	let view = "graph"
	let graph = new Graph([])
	onMount(async () => {
		const octokit = new Octokit({
			auth: "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"
		});    

		// authenticates as app based on request URLs
		const { data: { login } } = await octokit.rest.users.getAuthenticated();
		console.log("authenticated")

		function update(){
			update_issuegraph(octokit, graph).then(async (g) => {
				graph = g
				console.log("graph:", graph)
				await new Promise((resolve) => setTimeout(resolve, 10000));
				update()
			})
		}
		fetch_issuenode(octokit, "octocat", "Hello-World", 3094).then((n)=>{
			if(n){
				graph.nodes.push(n)
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
	<svelte:component this={cur.comp} graph={graph} />
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
		border: 1px solid #abc;
	}
</style>