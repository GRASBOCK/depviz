<script lang="ts">
	import Spinner from '$lib/Spinner.svelte';
	import DepViz from '$lib/DepViz.svelte';
	import { onMount } from 'svelte';
	import { construct_graph, Graph } from '$lib/graph';
	import { distinguish, Status, type Task } from '$lib/task';

	let graph: Graph;
	const access_tokens = new Map<string, string>();
	let tasks: Map<string, Task> = new Map<string, Task>();

	let loading: Promise<any> = Promise.resolve();
	let loading_text = '';
	async function add_task_relations(task: Task) {
		const relations = task.is_blocked_by().concat(task.relates_to(), task.blocks());
		relations.map((url) => {
			const result = distinguish(access_tokens, url);
			if (result instanceof Promise) {
				console.error('tasks blocked by group tasks are not supported');
			} else {
				const dependency_url = result.url();
				if (!tasks.has(dependency_url)) {
					tasks.set(dependency_url, result);
				}
			}
		});
	}

	async function update() {
		loading_text = 'updating issue graph';
		const promises: Promise<void>[] = [];
		tasks.forEach((task) => {
			if (task.fetched() === Status.TO_BE_FETCHED) {
				promises.push(task.fetch());
			}
		});

		loading = Promise.allSettled(promises).then(async () => {
			tasks.forEach(async (task) => {
				add_task_relations(task);
			});
			graph = construct_graph(tasks);
		});
		await loading;
		if (
			Array.from(tasks.values()).filter((task) => task.fetched() === Status.TO_BE_FETCHED).length >
			0
		) {
			new Promise((resolve) => setTimeout(resolve, 1)).then(update);
		} else {
			new Promise((resolve) => setTimeout(resolve, 1000*60)).then(update);
		}
	}
	onMount(async () => {
		const github_access_token = localStorage.getItem('github_access_token');
		const gitlab_access_token = localStorage.getItem('gitlab_access_token');
		if (gitlab_access_token) {
			access_tokens.set('gitlab', gitlab_access_token);
		}
		if (github_access_token) {
			access_tokens.set('github', github_access_token);
		}
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const urls = urlParams.getAll('url');
		if (urls.length > 0) {
			const promises: Promise<void>[] = [];
			urls.map((url) => {
				const result = distinguish(access_tokens, url);
				if (result instanceof Promise) {
					const p = result.then((new_tasks) => {
						new_tasks.forEach((task) => {
							if (!tasks.has(task.url())) {
								tasks.set(task.url(), task);
							}
						});
					});
					promises.push(p);
				} else {
					if (!tasks.has(result.url())) {
						tasks.set(result.url(), result);
					}
				}
			});
			loading = Promise.all(promises).then(() => {
				graph = construct_graph(tasks);
				new Promise((resolve) => setTimeout(resolve, 1)).then(update);
			});
			loading_text = 'loading input urls';
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
