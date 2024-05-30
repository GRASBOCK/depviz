<script lang="ts">
    import { Graph, IssueLink } from "./graph";
    import * as vis from 'vis-network'
    import {DataSet} from 'vis-data'
    import { onMount } from "svelte";

    export let graph: Graph
    var network: vis.Network | null = null;

    $: draw(graph)

    onMount(()=>{
        draw(graph)
    })

    function draw(graph: Graph) {
        // create an array with nodes
        var nodes = new DataSet(graph.nodes.map((n, ni) => {
            let label = `#${n.link.number}`
            if(n.data == null) label = `${label} ❓`
            return { id: ni, label: label }; 
        }));

        // create an array with edges
        let vis_edges: vis.DataInterfaceEdges
        let edges: { id: number, from: number, to: number, arrows: string}[] = []
        let i = 0
        graph.nodes.forEach((n, ni) => {
            n.dependencies.forEach((d) => {
                let di = graph.nodes.findIndex(b => IssueLink.same(d, b.link))
                edges.push({ id: i, from: di, to: ni, arrows: "to" })
                i++
            })
        })
        vis_edges = new DataSet(edges);

        var data: vis.Data = {
            nodes: nodes,
            edges: edges,
        };

        // create a network
        var container = document.getElementById("mynetwork");
        if(container == null){
            return
        }
        var directionInput = "UD";
        var options: vis.Options = {
            interaction: {
                dragNodes: false
            },
            edges: {
                smooth: {
                    enabled: true,
                    type: "cubicBezier",
                    roundness: 0.4,
                },
            },
            nodes: {
                shape: "box",
            },
            layout: {
                hierarchical: {
                    direction: directionInput,
                },
            },
        };
        network = new vis.Network(container, data, options);
        console.log("redraw")
        network.redraw()
    }
</script>

<div id="mynetwork"></div>

<style>
    #mynetwork {
        width: 100%;
        height: 100vh;
    }
</style>