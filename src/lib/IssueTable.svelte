<script lang="ts">
    import { Graph } from "./graph";

    export let graph: Graph
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
    <li>
    {node.link.number}
    {#if node.data === null}❓{/if}
    {#if node.related.length > 0}->{/if}
    {#each node.related as r, i}
        <a href={r.link.url()}>{r.link.number}{#if r.dependency}⤵️{:else}🔗{/if}</a>&nbsp
    {/each}
    </li>
{/each}