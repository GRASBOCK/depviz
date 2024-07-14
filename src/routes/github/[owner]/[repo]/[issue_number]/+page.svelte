<script lang="ts">
	import { Octokit } from "octokit";

    import { fetch_issuenode, update_issuegraph, want_links } from "$lib/github"
	import Spinner from '$lib/Spinner.svelte';
    import DepViz from '$lib/DepViz.svelte';
	import { onMount } from "svelte";
    import { Graph } from "$lib/graph";
    export let data: {owner: string, repo: string, issue_number: number};
    
	let access_token: string|null = null
    let graph: Graph

	let octokit : Octokit

	let loading: Promise<any> = Promise.resolve()
	let loading_text = ""
	
    function update(){
		let want = want_links(graph)
		if(want.length > 0 && access_token){
            loading_text = "updating issue graph"
			loading = update_issuegraph(octokit, graph, want).then(async (g) => {
				graph = g
				update()
			})
		}else{
			loading = Promise.resolve()
			new Promise((resolve) => setTimeout(resolve, 10000)).then(update);
		}
	}
    
    async function init_graph(owner: string, repo: string, issue_number: number) {
        loading_text = "fetching root issue"
        const n = await fetch_issuenode(octokit, owner, repo, issue_number)
        if(n){
            graph = new Graph([n])
            update()
        }else{
            return Promise.reject("Initial node does not exist")
        }
    }
    onMount(()=>{
        access_token = localStorage.getItem("access_token")
        console.log("access_token: ", access_token)
        if(access_token){
            octokit = new Octokit({ auth: access_token });
		    loading_text = "authenticating the client"
		    loading = octokit.rest.users.getAuthenticated().then(async () => 
                init_graph(data.owner, data.repo, data.issue_number)
            )
        } 
        else{
            window.location.assign(`/github/`)
        }
    })
</script>

<main>
    {#await loading}
        {loading_text}<br>
        <Spinner/>
    {:catch error}
        ❌ {error}
    {/await}
    {#if graph !== undefined}
        <DepViz bind:graph={graph} />
    {/if}
</main>