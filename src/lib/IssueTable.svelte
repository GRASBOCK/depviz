<script lang="ts">
    import { Graph } from "./graph";

    export let graph: Graph
</script>

<p>Issues:</p>
{#each graph.nodes as node, i}
    <li>
    {node.issue.number} -> 
    {#each node.dependencies as dependency, i}
        {dependency.number}&nbsp;
    {/each}
    </li>
{/each}