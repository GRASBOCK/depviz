<script lang="ts">
	import { Octokit } from "octokit";

	import Spinner from './lib/Spinner.svelte';
    import DepViz from './lib/DepViz.svelte';

	function get_code_param(){
		const queryString = window.location.search;
		const urlparam = new URLSearchParams(queryString)
		const codeParam = urlparam.get("code")
		return codeParam
	}

	let authorization_code: string|null = get_code_param() // = "blabla"
	let access_token: string|undefined// = "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"
	let host = "github"
	let owner = "octocat"
	let repo = "Hello-World"
	let issue_number = 3094

	let octokit : Octokit

	let loading: Promise<any> = Promise.resolve()
	let loading_text = ""
		
	async function fetch_access_token(){
		loading_text = "fetching access token"
		await new Promise((resolve) => setTimeout(resolve, 3000));
        access_token = "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";
	}

	async function authenticate_client(){
		// authenticates as app based on request URLs
		loading_text = "authenticating the client"
		let octokit = new Octokit({ auth: access_token });   
		const { data: { login } } = await octokit.rest.users.getAuthenticated();
        console.log("loaded");
	}

	let client_id = "Ov23li6GSVgimy2efmMK"

	function loginWithGithub(){
		window.location.assign(`http://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${window.location.href}`)
	}

	if(access_token){
		loading = authenticate_client()
	} 
	else if(authorization_code){
		loading = fetch_access_token().then(()=>{
			loading = authenticate_client()
		})
	} 
	
</script>

<main>
	{#await loading}
		{loading_text}<br>
		<Spinner/>
	{:then number}
		{#if access_token}
			<DepViz authorized_client={octokit} bind:access_token={access_token} owner={owner} repo={repo} issue_number={issue_number} />
		{:else}
			<button on:click={loginWithGithub}>
				Login with Github
			</button>
		{/if}
	{:catch error}
		❌ {error}
	{/await}
</main>