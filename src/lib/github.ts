import { Octokit, App } from "octokit";
import { IssueLink, Node, Graph, IssueData} from "./graph"

export function extract_issue_numbers(line: string){
    let matches = [...line.matchAll(/#\d+/g)]
    return matches.map((m)=>{
        return parseInt(m[0].slice(1))
    })
}

export function extract_issue_urls(line: string){
    const re : RegExp = /https:\/\/github\.com\/(?<OWNER>.+?)\/(?<REPO>.+?)\/issues\/(?<ISSUE_NUMBER>\d+)/g
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
        return new IssueLink(owner, repo, parseInt(issue_number))
    }).filter((v): v is IssueLink => !!v)
}

export function extract_dependency_lines(line: string){
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


export async function fetch_issuenode(octokit: Octokit, owner: string, repo: string, issue_number: number) {
    let link = new IssueLink(owner, repo, issue_number)
    let remote_issue = await octokit.rest.issues.get({owner: owner, repo: repo, issue_number: issue_number})
        .then(({data: issue})=> new Node(link, new IssueData(), []))
        .catch((e: any) => {new Node(link, null, [])})
    if(remote_issue === undefined){
        return new Node(link, null, [])
    }
    let deps: IssueLink[] = [];
    await octokit.rest.issues.listComments({owner: owner, repo: repo, issue_number: issue_number, per_page: 100}).then(({data})=>{
        for (let {body} of data) {
            if(body === undefined){
                continue
            }
            const lines = extract_dependency_lines(body)
            for(let l of lines){
                extract_issue_numbers(l).forEach((num) => deps.push(new IssueLink(owner, repo, num)))
                extract_issue_urls(l).forEach((i) => deps.push(i))
            }
        }
    })
    let unqiue_deps: IssueLink[] = [];
    deps.forEach( (a) => {if(unqiue_deps.find(b => IssueLink.same(a, b)) === undefined) unqiue_deps.push(a)});
    return new Node(link, new IssueData(), unqiue_deps)
}

export function want_links(graph: Graph){
    let want: IssueLink[] = []
    graph.nodes.forEach((n) => {
        if(n.data === null){
            return
        }
        n.dependencies.forEach((d) => {
            if(graph.nodes.find(({link: i}) => IssueLink.same(i, d)) === undefined) 
                want.push(d)
        })
    })
    return want
}

export async function update_issuegraph(octokit: Octokit, graph: Graph, want: IssueLink[]) {
    const promises = want.map(async (i) => {
        return fetch_issuenode(octokit, i.owner, i.repo, i.number).then((n) => {
            if(n){
                if(!graph.nodes.find(b => IssueLink.same(n.link, b.link))){
                    graph.nodes.push(n)
                }
            }
            else console.error("Issue does not exist: ", i)
        })
    })
    return Promise.allSettled(promises).then(()=>graph)
}