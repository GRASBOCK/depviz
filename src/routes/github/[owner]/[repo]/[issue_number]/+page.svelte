<script lang="ts">
	import { Octokit } from "octokit";

    import { fetch_issuenode, update_issuegraph, want_links } from "$lib/github"
	import Spinner from '$lib/Spinner.svelte';
    import DepViz from '$lib/DepViz.svelte';
	import { onMount } from "svelte";
    import { Graph } from "$lib/graph";
    export let data: {owner: string, repo: string, issue_number: number};

    const client_id = "Ov23li6GSVgimy2efmMK"
    const client_secret = "058b818696f69fa50166939c1949c6a581e86ddd" // github does not support PKCE
	let access_token: string|null = null
    let graph: Graph

	let octokit : Octokit

	let loading: Promise<any> = Promise.resolve()
	let loading_text = ""
		
	async function fetch_access_token(authorization_code: string){
		loading_text = "fetching access token"
        let resp = await fetch(`https://github.com/login/oauth/access_token?client_id=${client_id}&code=${authorization_code}&client_secret=${client_secret}`, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            }
        })
        let data = await resp.json()
        if(data.error_description){
            if(data.error == "bad_verification_code"){
                window.location.assign(window.location.href.split("?")[0])
                return Promise.reject(data.error_description);
            }
            return Promise.reject(data.error_description);
        }
		await new Promise((resolve) => setTimeout(resolve, 3000));
        if(data.access_token){
            access_token = data.access_token;
            localStorage.setItem("access_token", data.access_token)
        }else{
            return Promise.reject("access token missing in reponse");
        }
	}

	async function authenticate_client(){
		// authenticates as app based on request URLs
		loading_text = "authenticating the client"
		octokit = new Octokit({ auth: access_token });   
		const { data: { login } } = await octokit.rest.users.getAuthenticated();
        console.log("loaded");
	}

	function loginWithGithub(){
		window.location.assign(`https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${window.location.href.split(/&code=/)[0]}`)
	}
	
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
        const queryString = window.location.search;
		const urlparam = new URLSearchParams(queryString)
        const authorization_code = urlparam.get("code")
        
        access_token = localStorage.getItem("access_token")
        console.log("access_token: ", access_token)
        if(access_token){
		    loading = authenticate_client().then(() => {
                loading = init_graph(data.owner, data.repo, data.issue_number)
            })
        } 
        else{
            if(authorization_code){
                loading = fetch_access_token(authorization_code).then(()=>{
                    loading = authenticate_client().then(() => {
                        loading = init_graph(data.owner, data.repo, data.issue_number)
                    })
                })
            }else{
                console.log("redirect_uri",window.location.href.split(/&code=/)[0])
            }
        }
    })
</script>

<main>
	{#await loading}
        {loading_text}<br>
        <Spinner/>
    {:then number}
        {#if access_token}
            ✅
        {:else}
            <button on:click={loginWithGithub}>
                Login with Github
            </button>
        {/if}
    {:catch error}
        ❌ {error}
    {/await}
    {#if access_token}
        {#if graph !== undefined}
            <DepViz bind:graph={graph} />
        {/if}
    {/if}
</main>