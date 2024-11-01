import { type Issue } from '$lib/issue';

export class Node {
	url: string; // issue data = successful, null = broken link, undefined = not fetched yet
	graph_label: string;
	table_label: string;
	status: string;

	constructor(url: string, graph_label: string, table_label: string, status: string) {
		this.url = url;
		this.table_label = table_label;
		this.graph_label = graph_label;
		this.status = status;
	}

	static compare(a: Node, b: Node) {
		return a.url.localeCompare(b.url);
	}

	static same(x: Node, y: Node) {
		return x.url == y.url;
	}
}

export enum EdgeType {
	RelatesTo,
	DependsOn,
	CircularDependency
}

export class Edge {
	a: number;
	b: number;
	type: EdgeType;
	constructor(a: number, b: number, type: EdgeType) {
		this.a = a;
		this.b = b;
		this.type = type;
	}
	connects(i: number): number | null {
		if (this.a == i) {
			return this.b;
		}
		if (this.b == i) {
			return this.a;
		}
		return null;
	}
}

export class Graph {
	nodes: Node[] = [];
	edges: Edge[] = [];

	constructor(nodes: Node[] = [], edges: Edge[] = []) {
		this.nodes = nodes;
		this.edges = edges;
	}

	relationships(node: Node): { node: Node; dependency: boolean }[] {
		const i = this.nodes.findIndex((n) => Node.same(n, node));
		if (i < 0) {
			throw `Node ${JSON.stringify(node)} not found in graph`;
		}

		const related: { node: Node; dependency: boolean }[] = [];
		this.edges.forEach((e) => {
			const connected_index = e.connects(i);
			if (connected_index) {
				const other_node = this.nodes[connected_index];
				const is_dependency = e.type == EdgeType.RelatesTo ? false : true;
				if (!other_node) {
					throw `connected index ${connected_index} is invalid for edge ${JSON.stringify(e)}; graph: ${JSON.stringify(this)}`;
				}
				related.push({ node: other_node, dependency: is_dependency });
			}
		});
		return related;
	}
}

export function construct_graph(issues: Map<string, Issue | null | Error>): Graph {
	function node_from_issue(issue: Issue) {
		return new Node(issue.url(), issue.graph_label(), issue.table_label(), '');
	}
	function node_from_null(url: string) {
		return new Node(url, url, url, '❓');
	}
	function node_from_error(url: string) {
		return new Node(url, url, url, '❌');
	}
	const nodes = Array.from(issues, (pair) =>
		pair[1] === null
			? node_from_null(pair[0])
			: pair[1] instanceof Error
				? node_from_error(pair[0])
				: node_from_issue(pair[1])
	);
	const edges: Edge[] = [];
	let i = 0;
	issues.forEach((issue) => {
		if (issue !== null && !(issue instanceof Error)) {
			const issue_data = issue.data();
			issue_data.is_blocked_by.forEach((b_url) => {
				const b_index = nodes.findIndex((n) => b_url == n.url);
				if (b_index < 0) {
					console.error(`is_blocked_by url not found in nodes; url: ${b_url}`);
				} else {
					const circular_dependency_edge_index = edges.findIndex(
						(e) => e.a === i && e.b === b_index
					);
					if (circular_dependency_edge_index < 0) {
						const existing_edge_index = edges.findIndex((e) => e.a === b_index && e.b === i);
						if (existing_edge_index < 0) {
							edges.push(new Edge(b_index, i, EdgeType.DependsOn));
						} else {
							// override relates to with depends on
							edges[existing_edge_index] = new Edge(b_index, i, EdgeType.DependsOn);
						}
					} else {
						edges[circular_dependency_edge_index].type = EdgeType.CircularDependency;
					}
				}
			});
			issue_data.blocks.forEach((b_url) => {
				const b_index = nodes.findIndex((n) => b_url == n.url);
				if (b_index < 0) {
					console.error(`is_blocked_by url not found in nodes; url: ${b_url}`);
				} else {
					const circular_dependency_edge_index = edges.findIndex(
						(e) => e.a === i && e.b === b_index
					);
					if (circular_dependency_edge_index < 0) {
						const existing_edge_index = edges.findIndex((e) => e.a === b_index && e.b === i);
						if (existing_edge_index < 0) {
							edges.push(new Edge(b_index, i, EdgeType.DependsOn));
						} else {
							// override relates to with depends on
							edges[existing_edge_index] = new Edge(b_index, i, EdgeType.DependsOn);
						}
					} else {
						edges[circular_dependency_edge_index].type = EdgeType.CircularDependency;
					}
				}
			});
			issue_data.relates_to.forEach((b_url) => {
				const b_index = nodes.findIndex((n) => b_url == n.url);
				if (b_index < 0) {
					console.error(`relates_to url not found in nodes; url: ${b_url}`);
				} else {
					const existing_edge_index = edges.findIndex(
						(e) => (e.a === i && e.b === b_index) || (e.a === b_index && e.b === i)
					);
					if (existing_edge_index < 0) {
						edges.push(new Edge(i, b_index, EdgeType.RelatesTo));
					}
				}
			});
		}
		i += 1;
	});
	return new Graph(nodes, edges);
}
