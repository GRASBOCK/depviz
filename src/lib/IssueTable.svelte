<script lang="ts">
	import { Graph } from './graph';

	export let graph: Graph;

	$: related = graph.nodes.map((n) => graph.relationships(n));
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
	<li>
		{node.url}
		{#if node.issue.data === null}❓{/if}
		{#if related[i].length > 0}->{/if}
		{#each related[i] as { node, dependency }}
			<a href={node.url}
				>{node.url}{#if dependency}⤵️{:else}🔗{/if}</a
			>&nbsp
		{/each}
	</li>
{/each}
