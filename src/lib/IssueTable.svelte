<script lang="ts">
    import { fetch_issuenode, update_issuegraph } from "./github"
    import { onMount } from 'svelte';
    import { Issue, IssueGraph, IssueNode } from "./issuegraph";
    import { Octokit } from "octokit";

    let graph = new IssueGraph([])
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
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
    <li>
    {node.issue.number} -> 
    {#each node.dependencies as dependency, i}
        {dependency.number}&nbsp;
    {/each}
    </li>
{/each}