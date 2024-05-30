import { expect, test, describe, it, assert} from 'vitest'
import { extract_issue_numbers, extract_issue_urls, extract_dependency_lines, fetch_issue } from './github'
import { Issue } from './issuegraph'

describe("fetch an issue from github", async () => {
    let node = await fetch_issue("octocat", "Hello-World", 3094)
    it("issue exists", ()=>{
        expect(node)
    })
    it("issue details", ()=>{
        expect(node?.issue).toEqual(new Issue("octocat", "Hello-World", 3094))
    })
    
    it("issue dependencies", ()=>{
        let dependencies = [
            new Issue("octocat", "Hello-World", 3095), 
            new Issue("octocat", "Hello-World", 3089), 
            new Issue("octocat", "Spoon-Knife", 33081),
            new Issue("octocat", "Hello-World", 3043),
            new Issue("octocat", "Hello-World", 3087), 
        ]

        expect(node?.dependencies.sort(Issue.compare)).toEqual(dependencies.sort(Issue.compare))
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
    const tests: {desc: string, text: string, expected: Issue[]}[] = [
        {desc: "default", text: "https://github.com/octocat/Hello-World/issues/3095", expected: [new Issue("octocat", "Hello-World", 3095)]},
        {desc: "multiple", text: "https://github.com/octocat/Hello-World/issues/3095 https://github.com/octocat/Hello-World/issues/3093", expected: [new Issue("octocat", "Hello-World", 3095), new Issue("octocat", "Hello-World", 3093)]},
        {desc: "markdown link", text: "[.sesef tju7 ++ #..](https://github.com/octocat/Hello-World/issues/3095)", expected: [new Issue("octocat", "Hello-World", 3095)]},
        {desc: "other repo", text: "https://github.com/octocat/Spoon-Knife/issues/33081", expected: [new Issue("octocat", "Spoon-Knife", 33081)]},
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