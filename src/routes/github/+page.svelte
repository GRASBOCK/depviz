<script lang="ts">
	import { onMount } from "svelte";
	import { base } from "$app/paths";

    let owner = "octocat";
	let repo = "Hello-World";
    let issue_number = "3094";
    $: url = `${base}/github/${owner}/${repo}/${issue_number}`
    let valid_input = false
    function validate_issue_number(){
        valid_input = issue_number.match(/^-?\d+$/) != null
    }
    validate_issue_number()

    let access_token: string|null = null
    let authenticate = false
    function store_access_token(access_token: string) {
        localStorage.setItem("access_token", access_token); 
        authenticate = false;
    }
    onMount(()=>{
        access_token = localStorage.getItem("access_token")
        if(!access_token){
            authenticate = true   
        }
    })
</script>

<main>
    
    {#if authenticate}
        Fill in your access ACCESS_TOKEN.<br>
        <input bind:value={access_token} ><button on:click={() => {if (access_token) {store_access_token(access_token)}}}>Submit</button><br>

        Authentication using GitHub Apps or Device Code is not possible purely client side with github due to their <a href="https://github.com/isaacs/github/issues/330">security limitations</a>. If this changes, <a href="https://github.com/GRASBOCK/depviz/issues/3">let me know</a>. 
    {:else}    
        <p>Choose your root issue</p>
        <input bind:value={owner}/>
        <input bind:value={repo}/>
        <input bind:value={issue_number} min="0" on:change={validate_issue_number}/>
        {#if valid_input}
            <a href={url}>GitHub</a>
        {/if}
        <br>
        <button on:click={()=>{localStorage.removeItem("access_token"); authenticate = true}}>re-authenticate</button>
    {/if}
	
    
</main>