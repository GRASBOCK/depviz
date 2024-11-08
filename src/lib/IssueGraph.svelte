<script lang="ts">
	import { EdgeType, Graph, Node } from './graph';
	import * as vis from 'vis-network';
	import { DataSet } from 'vis-data';
	import { onMount } from 'svelte';

	export let graph: Graph;
	var network: vis.Network | null = null;

	$: {
		try {
			draw(graph);
		} catch (error) {
			alert(error);
		}
	}

	onMount(() => {
		try {
			draw(graph);
		} catch (error) {
			alert(error);
		}
	});

	export let on_select = function (node: Node) {
		window.open(node.url, '_blank');
		console.log('Selection: ' + node.url);
	};

	function draw(graph: Graph) {
		// create an array with nodes
		var nodes = new DataSet(
			graph.nodes.map((n, ni) => {
				return {
					id: ni,
					label: n.graph_label + n.status,
					color: {
						border: n.completed ? '#6d9eeb' : '#93c47d',
						background: n.completed ? '#c9daf8' : '#d9ead3'
					}
				};
			})
		);

		// create an array with edges
		let edges: {
			id: number;
			from: number;
			to: number;
			arrows: string;
			dashes: boolean;
			color: string;
		}[] = [];
		graph.edges.forEach((e, i) => {
			let arrows = '';
			let color = 'black';
			switch (e.type) {
				case EdgeType.RelatesTo:
					arrows = '';
					break;
				case EdgeType.DependsOn:
					arrows = 'from';
					break;
				case EdgeType.CircularDependency:
					{
						color = 'red';
						arrows = 'to, from';
					}
					break;
			}
			edges.push({
				id: i,
				from: e.b,
				to: e.a,
				arrows: arrows,
				dashes: e.type == EdgeType.RelatesTo,
				color: color
			});
		});

		var data: vis.Data = {
			nodes: nodes,
			edges: edges
		};

		// create a network
		var container = document.getElementById('mynetwork');
		if (container == null) {
			return;
		}
		var options: vis.Options = {
			interaction: {
				dragNodes: false
			},
			edges: {
				smooth: {
					enabled: true,
					type: 'cubicBezier',
					roundness: 0.4
				}
			},
			nodes: {
				widthConstraint: {maximum: 150},
				shape: 'box'
			},
			layout: {
				randomSeed: 3,
				hierarchical: {
					direction: 'UD',
					sortMethod: 'directed',
					shakeTowards: 'leaves'
				}
			},
			physics: {
				hierarchicalRepulsion: {
					avoidOverlap: 0.7,
				}
			}
		};
		network = new vis.Network(container, data, options);

		// add event listeners
		network.on('select', function (params) {
			if (params.nodes.length > 0) {
				let node_index = params.nodes[0];
				let node = graph.nodes[node_index];
				on_select(node);
			}
		});
		console.log('redraw');
		network.redraw();
	}
</script>

<div id="mynetwork"></div>

<style>
	#mynetwork {
		width: 100%;
		height: 100vh;
	}
</style>
