import { GITHUB_HOSTNAME } from "./github"

export class Node{
    host: string
    owner: string
    repo: string
    number: number
    data: IssueData | null | undefined // issue data = successful, null = broken link, undefined = not fetched yet

    constructor(host: string, owner: string, repo: string, number: number, data: IssueData | null | undefined = undefined){
        this.host = host
        this.owner = owner
        this.repo = repo
        this.number = number
        this.data = data
    }

    url(): string{
        switch(this.host){
        case GITHUB_HOSTNAME:
            return `https://github.com/${this.owner}/${this.repo}/issues/${this.number}`
        default:
            throw Error("host unsupported")
        }
    }

    static compare(a: Node, b: Node){
        let n = a.number - b.number
        if(n != 0){
            return n
        }
        n = a.repo.localeCompare(b.repo)
        if(n != 0){
            return n
        }
        return a.owner.localeCompare(b.owner)
    }

    static same(x: Node, y: Node){
        return x.number == y.number && x.owner == y.owner && x.repo == y.repo
    }
}

export class IssueData{

}

export enum EdgeType{
    RelatesTo,
    DependsOn,
    CircularDependency,
}

export class Edge{
    a: number
    b: number
    type: EdgeType
    constructor(a: number, b: number, type: EdgeType){
        this.a = a
        this.b = b
        this.type = type
    }
    connects(i: number): number | null{
        if(this.a == i){
        return this.b
        }
        if(this.b == i){
        return this.a
        }
        return null
    }
}

export class Graph{
    nodes: Node[]
    edges: Edge[] = []

    constructor(starting_node: Node){
        this.nodes = [starting_node]
    }

    relationships(node: Node): {node: Node, dependency: boolean}[]{
        let i = this.nodes.findIndex(n => Node.same(n, node));
        if(i < 0){
            throw `Node ${JSON.stringify(node)} not found in graph`
        }
        
        let related: {node: Node, dependency: boolean}[] = []
        this.edges.forEach(e => {
            const connected_index = e.connects(i)
            if(connected_index){
                const other_node = this.nodes[connected_index]
                const is_dependency = e.type == EdgeType.RelatesTo ? false : true
                if(!other_node){
                    throw  `connected index ${connected_index} is invalid for edge ${JSON.stringify(e)}; graph: ${JSON.stringify(this)}`
                }
                related.push({node: other_node, dependency: is_dependency})
            }
        });
        return related
    }
}