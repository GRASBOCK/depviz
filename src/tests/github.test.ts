import { expect, test, describe, it, assert} from 'vitest'
import { extract_issue_numbers, extract_issue_urls, extract_dependency_lines, fetch_issuenode, update_issuegraph, want_links, GITHUB_HOSTNAME } from '$lib/github'
import { IssueLink, Graph } from '$lib/graph'
import { Octokit } from 'octokit';
import { ACCESS_TOKEN } from '$env/static/private';

const testing_access_token = ACCESS_TOKEN

describe("fetch an issue", async () => {
    const octokit = new Octokit({ auth: testing_access_token });    
    const { data: { login } } = await octokit.rest.users.getAuthenticated();

    let node = await fetch_issuenode(octokit, "octocat", "Hello-World", 3094)
    it("issue exists", ()=>{
        expect(node)
    })
    it("issue details", ()=>{
        expect(node?.link).toEqual(new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3094))
    })
    
    it("issue dependencies", ()=>{
        let dependencies = [
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3095), 
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3089), 
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Spoon-Knife", 33081),
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3043),
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3087), 
        ]

        expect(node?.dependencies.sort(IssueLink.compare)).toEqual(dependencies.sort(IssueLink.compare))
    })
})

describe("gather the issuegraph", async () => {
    const octokit = new Octokit({ auth: testing_access_token }); 
    const { data: { login } } = await octokit.rest.users.getAuthenticated();    
    let initial_node = await fetch_issuenode(octokit, "octocat", "Hello-World", 3094)
    assert(initial_node)
    let graph = new Graph([initial_node])
    let want = want_links(graph)
    graph = await update_issuegraph(octokit, graph, want)
    it("first node", ()=>{
        expect(graph.nodes.length).above(0)
        expect(graph.nodes[0].link).toEqual(new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3094))
        let dependencies = [
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3095), 
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3089), 
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Spoon-Knife", 33081),
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3043),
            new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3087), 
        ]
        expect(graph.nodes[0].dependencies.sort(IssueLink.compare)).toEqual(dependencies.sort(IssueLink.compare))
    })
})

describe("extract from tags", () => {
    const tests: {desc: string, text: string, expected: number[]}[] = [
        {desc: "default", text: "#3095", expected: [3095]},
        {desc: "multiple", text: "#3095,#59, #3093 and #3094", expected: [3095,59,3093,3094]},
        {desc: "mixed with url", text: "#3095, #5464 https://github.com/octocat/Hello-World/issues/3095", expected: [3095,5464]},
        {desc: "only url", text: "https://github.com/octocat/Hello-World/issues/3095", expected: []},
    ]    
    
    for(let t of tests){
        it(t.desc, ()=>{
            expect(extract_issue_numbers(t.text)).toEqual(t.expected)
        })
    }
})

describe("extract from url", () => {
    const tests: {desc: string, text: string, expected: IssueLink[]}[] = [
        {desc: "default", text: "https://github.com/octocat/Hello-World/issues/3095", expected: [new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3095)]},
        {desc: "multiple", text: "https://github.com/octocat/Hello-World/issues/3095 https://github.com/octocat/Hello-World/issues/3093", expected: [new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3095), new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3093)]},
        {desc: "markdown link", text: "[.sesef tju7 ++ #..](https://github.com/octocat/Hello-World/issues/3095)", expected: [new IssueLink(GITHUB_HOSTNAME, "octocat", "Hello-World", 3095)]},
        {desc: "other repo", text: "https://github.com/octocat/Spoon-Knife/issues/33081", expected: [new IssueLink(GITHUB_HOSTNAME, "octocat", "Spoon-Knife", 33081)]},
        {desc: "not a url", text: "#3095", expected: []},
    ]    
    
    for(let t of tests){
        it(t.desc, ()=>{
            expect(extract_issue_urls(t.text)).toEqual(t.expected)
        })
    }
})

describe("issue text extraction", () => {
    const tests: {desc: string, text: string, expected: string[]}[] = [
        {desc: "default", text: "depends on #3095", expected: ["#3095"]},
        {desc: "case insensitive", text: "Depends on #3095", expected: ["#3095"]},
        {desc: "multiple", text: "depends on #3095 and #3094", expected: ["#3095 and #3094"]},
        {desc: "multiline", text: "depends on #3095 ;\nalso depends on #3094", expected: ["#3095 ;", "#3094"]},
        {desc: "before", text: "Some issue: #3094. It depends on #3095 and https://github.com/octocat/Hello-World/issues/3095", expected: ["#3095 and https://github.com/octocat/Hello-World/issues/3095"]},
        {desc: "without", text: "some text without dependencies", expected: []},
    ]    
    
    for(let t of tests){
        it(t.desc, ()=>{
            expect(extract_dependency_lines(t.text)).toEqual(t.expected)
        })
    }

})