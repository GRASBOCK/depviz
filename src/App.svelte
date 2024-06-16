<script lang="ts">
	import { Octokit } from "octokit";

	import Spinner from './lib/Spinner.svelte';
    import DepViz from './lib/DepViz.svelte';

	let access_token: string|null = "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"
	let owner = "octocat"
	let repo = "Hello-World"
	let issue_number = 3094

	const octokit = new Octokit({ auth: access_token });   

	// authenticates as app based on request URLs
	let loading: Promise<any> = octokit.rest.users.getAuthenticated().then(({ data: { login } }) => {
		console.log("loaded")
	});
</script>

<main>
	{#await loading}
		Authenticating<br>
		<Spinner/>
	{:then number}
		{#if access_token}
			<DepViz bind:access_token={access_token} owner={owner} repo={repo} issue_number={issue_number} />
		{:else}
			Access token missing
		{/if}
	{:catch error}
		❌ {error}
	{/await}
</main>