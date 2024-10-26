<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	let url = `https://github.com/octocat/Hello-World/issues/3094`;
	let valid_input = false;

	let access_token: string | null = null;
	let authenticate = false;
	function store_access_token(access_token: string) {
		localStorage.setItem('access_token', access_token);
		authenticate = false;
	}
	onMount(() => {
		access_token = localStorage.getItem('access_token');
		if (!access_token) {
			authenticate = true;
		}
	});
</script>

<main>
	{#if authenticate}
		Fill in your access ACCESS_TOKEN.<br />
		<input bind:value={access_token} /><button
			on:click={() => {
				if (access_token) {
					store_access_token(access_token);
				}
			}}>Submit</button
		><br />

		Authentication using GitHub Apps or Device Code is not possible purely client side with github
		due to their <a href="https://github.com/isaacs/github/issues/330">security limitations</a>. If
		this changes, <a href="https://github.com/GRASBOCK/depviz/issues/3">let me know</a>.
	{:else}
		<p>Choose your root issue</p>
		<input bind:value={url} />
		<a href={`${base}/graph?url=${encodeURIComponent(url)}`}>GitHub</a>
		<br />
		<button
			on:click={() => {
				localStorage.removeItem('access_token');
				authenticate = true;
			}}>re-authenticate</button
		>
	{/if}
</main>
