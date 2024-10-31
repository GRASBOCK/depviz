<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	let github_access_token: string;
	let gitlab_access_token: string;
	let authenticate = false;
	onMount(() => {
		function access_token(key: string): string {
			const token = localStorage.getItem(key);
			return token ? token : '';
		}
		github_access_token = access_token('github_access_token');
		gitlab_access_token = access_token('gitlab_access_token');
	});

	let urls: string[] = ['https://github.com/octocat/Hello-World/issues/3094'];
	let url_next = '';
	$: url_params = new URLSearchParams(
		Array.from(urls.filter((v) => v !== '').map((v) => ['url', v]))
	);
</script>

<h1>DepViz</h1>
<p>A tool to visualize work dependencies of Github</p>

<h2>1. Fill in your access ACCESS_TOKEN</h2>
<p>
	GitHub: <input
		bind:value={github_access_token}
		on:change={() => localStorage.setItem('github_access_token', github_access_token)}
		size="50"
	/><br />
	Authentication using GitHub Apps or Device Code is not possible purely client side with github due
	to their <a href="https://github.com/isaacs/github/issues/330">security limitations</a>. If this
	changes, <a href="https://github.com/GRASBOCK/depviz/issues/3">let me know</a>.
</p>

<p>
	GitLab: <input
		bind:value={gitlab_access_token}
		on:change={() => localStorage.setItem('gitlab_access_token', gitlab_access_token)}
		size="50"
	/>
</p>

<h2>2. Choose your root issue</h2>
{#each urls as url}
	<input bind:value={url} size="50" /><br />
{/each}
<input
	bind:value={url_next}
	on:change={() => {
		urls.push(url_next);
		urls = urls;
		url_next = '';
	}}
	size="50"
/><br />
<a href={`${base}/graph?${url_params}`}>Graph</a>
