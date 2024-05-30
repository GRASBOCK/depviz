<script lang="ts">
    import { fetch_issue } from "./github"
    import { onMount } from 'svelte';
    import type { IssueGraph } from "./issuegraph";

    let graph: IssueGraph
    onMount(async () => {
        
		const node = await fetch_issue("octocat", "Hello-World", 3094);
        if(node === undefined){
            return
        }
        graph.nodes = [node]
        console.log("node:", node)
	});
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
    {node.issue.number} -> 
    {#each node.dependencies as dependency, i}
        <p>{dependency.number} </p>
    {/each}
{/each}

<style>
    p { display: inline; }
</style>