<script lang="ts">
	import { Octokit } from 'octokit';
	import { GitHubHandler } from '$lib/github';
	import Spinner from '$lib/Spinner.svelte';
	import DepViz from '$lib/DepViz.svelte';
	import { onMount } from 'svelte';
	import { construct_graph, Graph } from '$lib/graph';
	import { base } from '$app/paths';
	import { Client } from '$lib/client';
	import { Issue, IssueData } from '$lib/issue';

	let access_token: string | null = null;
	let graph: Graph;

	let octokit: Octokit;
	const client = new Client();

	let issues: Map<string, Issue> = new Map<string, Issue>();

	let loading: Promise<any> = Promise.resolve();
	let loading_text = '';

	async function update() {
		loading_text = 'updating issue graph';
		const promises = Array.from(issues.values())
			.filter((issue) => issue.data === undefined)
			.map(async (issue) => {
				const issue_data = await client.fetch_issuedata(issue.url);
				issue.data = issue_data;
				issues.set(issue.url, issue);
				if (issue_data instanceof IssueData) {
					function add_if_new(b_url: string) {
						if (!issues.has(b_url)) {
							issues.set(b_url, new Issue(b_url));
						}
					}
					issue_data.is_blocked_by.forEach(add_if_new);
					issue_data.relates_to.forEach(add_if_new);
					issue_data.blocks.forEach(add_if_new);
				}
			});
		loading = Promise.allSettled(promises).then(async () => {
			graph = construct_graph(Array.from(issues.values()));
		});
		await loading;
		if (Array.from(issues.values()).filter((issue) => issue.data === undefined).length > 0) {
			new Promise((resolve) => setTimeout(resolve, 1)).then(update);
		} else {
			new Promise((resolve) => setTimeout(resolve, 10000)).then(update);
		}
	}
	onMount(() => {
		access_token = localStorage.getItem('access_token');
		console.log('access_token: ', access_token);
		if (access_token) {
			const queryString = window.location.search;
			const urlParams = new URLSearchParams(queryString);
			const urls = urlParams.getAll('url');
			if (urls.length > 0) {
				octokit = new Octokit({ auth: access_token });
				client.handlers.push(new GitHubHandler(octokit));
				loading_text = 'authenticating the client';
				loading = octokit.rest.users.getAuthenticated().then(async () => {
					loading_text = 'fetching root issue';
					urls.forEach((url) => {
						issues.set(url, new Issue(url));
					});
					graph = construct_graph(Array.from(issues.values()));
					new Promise((resolve) => setTimeout(resolve, 1)).then(update);
				});
			} else {
				loading = new Promise(() => {
					throw Error('url parameter mkissing');
				});
			}
		} else {
			window.location.assign(`${base}/github/`);
		}
	});
</script>

<main>
	{#await loading}
		{loading_text}<br />
		<Spinner />
	{:catch error}
		❌ {error}
	{/await}
	{#if graph !== undefined}
		<DepViz bind:graph />
	{/if}
</main>
