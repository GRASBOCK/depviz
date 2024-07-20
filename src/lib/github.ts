import { Octokit, App } from "octokit";
import { Node, Graph, IssueData, Edge, EdgeType} from "./graph"

export const GITHUB_HOSTNAME: string = "github"

export function extract_issue_numbers(line: string): number[]{
    let matches = [...line.matchAll(/#\d+/g)]
    return matches.map((m)=>{
        return parseInt(m[0].slice(1))
    })
}

export function extract_issue_urls(line: string): Node[]{
    const re : RegExp = /github\.com\/(?<OWNER>.+?)\/(?<REPO>.+?)\/issues\/(?<ISSUE_NUMBER>\d+)/g
    let matches = [...line.matchAll(re)]
    return matches.map((m)=>{
        let groups = m.groups
        if(groups === undefined){
            return
        }
        let owner = groups["OWNER"]
        let repo = groups["REPO"]
        let issue_number = groups["ISSUE_NUMBER"]
        if(owner === undefined || repo === undefined || issue_number === undefined){
            return
        }
        return new Node(GITHUB_HOSTNAME, owner, repo, parseInt(issue_number))
    }).filter((v): v is Node => !!v)
}

export function extract_dependency_lines(line: string): string[]{
    const re : RegExp = /depends on (?<DEPENDENCY_LINE>.*)/ig;
    let matches = [...line.matchAll(re)]
    return matches.map((m)=>{
        let groups = m.groups
        if(groups === undefined){
            return null
        }
        let dependency_line = groups["DEPENDENCY_LINE"]
        if(dependency_line === undefined){
            return null
        }
        return dependency_line
    }).filter((v): v is string => !!v)
}


export async function fetch_issuenode(octokit: Octokit, owner: string, repo: string, issue_number: number): Promise<{node: Node, relationships: {node: Node, dependency: boolean}[] }> {
    let node = new Node(GITHUB_HOSTNAME, owner, repo, issue_number)
    node = await octokit.rest.issues.get({owner: owner, repo: repo, issue_number: issue_number})
        .then(({data: issue})=> new Node(node.host, node.owner, node.repo, node.number, new IssueData()))
        .catch((e: any) => {
            return new Node(node.host, node.owner, node.repo, node.number, null)
        })
    if(node.data === null){
        return {node: node, relationships:[]}
    }
    node.data = new IssueData()
    let deps: Node[] = [];
    let all_links: Node[] = [];
    await octokit.rest.issues.listComments({owner: owner, repo: repo, issue_number: issue_number, per_page: 100}).then(({data})=>{
        for (let {body} of data) {
            if(body === undefined){
                continue
            }
            const dep_lines = extract_dependency_lines(body)
            for(let l of dep_lines){
                extract_issue_numbers(l).forEach((num) => deps.push(new Node(GITHUB_HOSTNAME, owner, repo, num)))
                extract_issue_urls(l).forEach((i) => deps.push(i))
            }

            extract_issue_urls(body).forEach((i) => all_links.push(i))
            extract_issue_numbers(body).forEach((num) => all_links.push(new Node(GITHUB_HOSTNAME, owner, repo, num)))
        }
    })
    await octokit.rest.issues.listEventsForTimeline({owner: owner, repo: repo, issue_number: issue_number, per_page: 100}).then(({data})=>{
        data.forEach((e) => {
            if(e.event == "cross-referenced"){
                let _e: any = e // typescript hide typing errors
                let cre: {source: {type:string, issue:{number: number, repository: {name: string, owner: {login: string}}}}} = _e
                if(cre.source.type != "issue"){
                    console.error("unknown cross reference type")
                }
                let issue_number = cre.source.issue.number
                let issue_repo = cre.source.issue.repository.name
                let issue_owner = cre.source.issue.repository.owner.login
                let link = new Node(GITHUB_HOSTNAME, issue_owner, issue_repo, issue_number)
                all_links.push(link)
            }
        })
    })
    
    let related: {node: Node, dependency: boolean}[] = [];
    deps.forEach( (a) => {if(related.find(b => Node.same(a, b.node)) === undefined) related.push({node: a, dependency: true})});
    // any leftovers are just links
    all_links.forEach( (a) => {if(related.find(b => Node.same(a, b.node)) === undefined) related.push({node: a, dependency: false})});
    return {node: node, relationships: related}
}

export function want_links(graph: Graph){
    let want: Node[] = []
    graph.nodes.forEach((n) => {
        if(n.data !== undefined){
            // already fetched
            return
        }
        want.push(n)
        graph.relationships(n).forEach((r) => {
            if(graph.nodes.find((n) => Node.same(n, r.node)) === undefined) 
                want.push(r.node)
        })
    })
    return want
}

export async function update_issuegraph(octokit: Octokit, graph: Graph, want: Node[]) {
    const promises = want.map(async (i) => {
        return fetch_issuenode(octokit, i.owner, i.repo, i.number).then(({node, relationships}) => {
            let ni = graph.nodes.findIndex(b => Node.same(node, b))
            if(ni < 0){
                throw "node not found in graph"
            }else{
                // update existing
                graph.nodes[ni].data = node.data
            }
            const new_nodes = relationships.map((r) => 
                graph.nodes.find(b => Node.same(r.node, b)) ? null : r.node
            ).filter(n => n !== null)
            graph.nodes = graph.nodes.concat(new_nodes)
            const new_edges = relationships.map((r) => {
                const nj = graph.nodes.findIndex(b => Node.same(r.node, b))
                const e = graph.edges.find(e => e.connects(nj))
                const edge_type = r.dependency ? EdgeType.DependsOn : EdgeType.RelatesTo
                if(e){
                    if(edge_type == EdgeType.DependsOn && e.a == nj){
                        if(e.type == EdgeType.RelatesTo){
                            // swap and make edge a dependency type
                            e.a = ni
                            e.b = nj
                            e.type = edge_type
                        }else{
                            e.type = EdgeType.CircularDependency
                        }
                    }
                    return null
                }else{
                    // edge does not exist yet
                    return new Edge(ni, nj, edge_type)
                }
            }).filter(e => e !== null)
            graph.edges = graph.edges.concat(new_edges)
            // todo: prune edges for duplicates
        }).catch((e)=>{
            console.error(e)
        })
    })
    return Promise.allSettled(promises).then(()=>graph)
}