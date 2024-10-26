import { Issue } from '$lib/issue';

export class Node {
	url: string;
	issue: Issue; // issue data = successful, null = broken link, undefined = not fetched yet

	constructor(url: string, issue: Issue) {
		this.url = url;
		this.issue = issue;
	}

	static compare(a: Node, b: Node) {
		return a.url.localeCompare(b.url);
	}

	static same(x: Node, y: Node) {
		return x.url == y.url;
	}
}

export class IssueData {}

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

export function construct_graph(issues: Issue[]): Graph {
	const nodes = Array.from(issues, (issue) => new Node(issue.url, issue));
	const edges: Edge[] = [];
	for (let i = 0; i < issues.length; i++) {
		const issue = issues[i];
		issue.is_blocked_by.forEach((b_url) => {
			const b_index = issues.findIndex((n) => b_url == n.url);
			if (b_index < 0) {
				console.error(`is_blocked_by url not found in nodes; url: ${b_url}`);
			} else {
				const circular_dependency_edge_index = edges.findIndex((e) => e.a === i && e.b === b_index);
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
		issue.blocks.forEach((b_url) => {
			const b_index = issues.findIndex((n) => b_url == n.url);
			if (b_index < 0) {
				console.error(`is_blocked_by url not found in nodes; url: ${b_url}`);
			} else {
				const circular_dependency_edge_index = edges.findIndex((e) => e.a === i && e.b === b_index);
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
		issue.relates_to.forEach((b_url) => {
			const b_index = issues.findIndex((n) => b_url == n.url);
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
	return new Graph(nodes, edges);
}
