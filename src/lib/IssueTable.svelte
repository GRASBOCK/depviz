<script lang="ts">
    import { Graph } from "./graph";

    export let graph: Graph
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
    <li>
    {node.link.number}
    {#if node.data === null}❓{/if}
    {#if node.dependencies.length > 0}->{/if}
    {#each node.dependencies as dependency, i}
        <a href={node.link.url()}>{dependency.number}</a>&nbsp
    {/each}
    </li>
{/each}