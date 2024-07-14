<script lang="ts">
    import { Graph } from "./graph";

    export let graph: Graph
    
    $: related = graph.nodes.map((n) => graph.relationships(n))
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
    <li>
    {node.number}
    {#if node.data === null}❓{/if}
    {#if related[i].length > 0}->{/if}
    {#each related[i] as {node, dependency}, i}
        <a href={node.url()}>{node.number}{#if dependency}⤵️{:else}🔗{/if}</a>&nbsp
    {/each}
    </li>
{/each}