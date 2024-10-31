<script lang="ts">
	import { Octokit } from 'octokit';
	import { GitHubHandler, new_github_handler } from '$lib/github';
	import Spinner from '$lib/Spinner.svelte';
	import DepViz from '$lib/DepViz.svelte';
	import { onMount } from 'svelte';
	import { construct_graph, Graph } from '$lib/graph';
	import { base } from '$app/paths';
	import { Client } from '$lib/client';
	import { type Issue, IssueData } from '$lib/issue';
	import { new_gitlab_handler } from '$lib/gitlab';

	let github_access_token: string | null = null;
	let gitlab_access_token: string | null = null;
	let graph: Graph;

	let octokit: Octokit;
	const client = new Client();

	let issues: Map<string, Issue|null|Error> = new Map<string, Issue>();

	let loading: Promise<any> = Promise.resolve();
	let loading_text = '';

	async function update() {
		loading_text = 'updating issue graph';
		const promises = Array.from(issues.entries())
			.filter((pair) => pair[1] === null)
			.map(async (pair) => {
				const url = pair[0]
				try {
					const new_issue = await client.fetch_issue(url);
					issues.set(url, new_issue);
					function add_if_new(b_url: string) {
						if (!issues.has(b_url)) {
							issues.set(b_url, null);
						}
					}
					new_issue.is_blocked_by().forEach(add_if_new);
					new_issue.relates_to().forEach(add_if_new);
					new_issue.blocks().forEach(add_if_new);
				}catch(error){
					if(error instanceof Error){
						issues.set(url, error);
					}
					console.error(error)
				}
			});
		loading = Promise.allSettled(promises).then(async () => {
			graph = construct_graph(issues);
		});
		await loading;
		if (Array.from(issues.values()).filter((issue) => issue === null).length > 0) {
			new Promise((resolve) => setTimeout(resolve, 1)).then(update);
		} else {
			new Promise((resolve) => setTimeout(resolve, 10000)).then(update);
		}
	}
	onMount(async () => {
		github_access_token = localStorage.getItem('github_access_token');
		gitlab_access_token = localStorage.getItem('gitlab_access_token');
		console.log('github_access_token: ', github_access_token);
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const urls = urlParams.getAll('url');
		if (urls.length > 0) {
			loading_text = 'loading handlers';
			const handler_promises = [];
			if (github_access_token) {
				handler_promises.push(new_github_handler(github_access_token));
			}
			if (gitlab_access_token) {
				handler_promises.push(new_gitlab_handler(gitlab_access_token));
			}
			loading = Promise.all(
				handler_promises.map(async (handler_promise) => {
					const handler = await handler_promise;
					client.handlers.push(handler);
				})
			).then(() => {
				console.log('handlers registered:', client.handlers.length);
				urls.forEach((url) => {
					issues.set(url, null);
				});
				graph = construct_graph(issues);
				new Promise((resolve) => setTimeout(resolve, 1)).then(update);
			});
		} else {
			loading = new Promise(() => {
				throw Error('url parameter missing');
			});
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
