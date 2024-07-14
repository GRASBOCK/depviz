import { Octokit, App } from "octokit";
import { IssueLink, Node, Graph, IssueData, Relationship} from "./graph"

export const GITHUB_HOSTNAME: string = "github"

export function extract_issue_numbers(line: string): number[]{
    let matches = [...line.matchAll(/#\d+/g)]
    return matches.map((m)=>{
        return parseInt(m[0].slice(1))
    })
}

export function extract_issue_urls(line: string): IssueLink[]{
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
        return new IssueLink(GITHUB_HOSTNAME, owner, repo, parseInt(issue_number))
    }).filter((v): v is IssueLink => !!v)
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


export async function fetch_issuenode(octokit: Octokit, owner: string, repo: string, issue_number: number) {
    let link = new IssueLink(GITHUB_HOSTNAME, owner, repo, issue_number)
    let remote_issue = await octokit.rest.issues.get({owner: owner, repo: repo, issue_number: issue_number})
        .then(({data: issue})=> new Node(link, new IssueData(), []))
        .catch((e: any) => {new Node(link, null, [])})
    if(remote_issue === undefined){
        return new Node(link, null, [])
    }
    let deps: IssueLink[] = [];
    let all_links: IssueLink[] = [];
    await octokit.rest.issues.listComments({owner: owner, repo: repo, issue_number: issue_number, per_page: 100}).then(({data})=>{
        for (let {body} of data) {
            if(body === undefined){
                continue
            }
            const dep_lines = extract_dependency_lines(body)
            for(let l of dep_lines){
                extract_issue_numbers(l).forEach((num) => deps.push(new IssueLink(GITHUB_HOSTNAME, owner, repo, num)))
                extract_issue_urls(l).forEach((i) => deps.push(i))
            }

            extract_issue_urls(body).forEach((i) => all_links.push(i))
            extract_issue_numbers(body).forEach((num) => all_links.push(new IssueLink(GITHUB_HOSTNAME, owner, repo, num)))
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
                let link = new IssueLink(GITHUB_HOSTNAME, issue_owner, issue_repo, issue_number)
                all_links.push(link)
            }
        })
    })
    
    let related: Relationship[] = [];
    deps.forEach( (a) => {if(related.find(b => IssueLink.same(a, b.link)) === undefined) related.push(new Relationship(a, true))});
    // any leftovers are just links
    all_links.forEach( (a) => {if(related.find(b => IssueLink.same(a, b.link)) === undefined) related.push(new Relationship(a, false))});
    return new Node(link, new IssueData(), related)
}

export function want_links(graph: Graph){
    let want: IssueLink[] = []
    graph.nodes.forEach((n) => {
        if(n.data === null){
            return
        }
        n.related.forEach((r) => {
            if(graph.nodes.find(({link: i}) => IssueLink.same(i, r.link)) === undefined) 
                want.push(r.link)
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