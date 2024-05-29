import { Octokit, App } from "octokit";
import { Issue } from "./issue"

/* test cases
Depends on #3095
Depends on #3095 and #3094
depends on #3095, #5464 https://github.com/octocat/Hello-World/issues/3095
Depends on https://github.com/octocat/Hello-World/issues/3095
Depends on [.sesef tju7 ++ #..](https://github.com/octocat/Hello-World/issues/3095)
*/

export async function fetch_issue(owner: string, repo: string, issue_number: number) {
    const octokit = new Octokit({
        auth: "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"
    });    

    // authenticates as app based on request URLs
    const { data: { login } } = await octokit.rest.users.getAuthenticated();
    console.log("authenticated")
    let related_issues: Issue[] = []
    let issue = new Issue(owner, repo, issue_number)
    let remote_issue = await octokit.rest.issues.get({owner: "octocat", repo: "Hello-World", issue_number: 3094}).then(({data: issue})=>{return issue})
    if(remote_issue === undefined){
        return [issue]
    }
    
    const issue_dependencies = await octokit.rest.issues.listComments({owner: owner, repo: repo, issue_number: 3094, per_page: 100}).then(({data})=>{
        let issue_dependencies: Issue[] = []
        for (let {body} of data) {
            if(body === undefined){
                continue
            }
            const regex : RegExp = /depends on (?<ISSUES_TEXT>.*)/gmi;
            let groups = regex.exec(body)?.groups
            if(groups === undefined){
                continue
            }
            let issues_text = groups["ISSUES_TEXT"]
            if(issues_text === undefined){
                continue
            }
            
            const regex_hashissue : RegExp = /#\d+/
            let issue_deps: Issue[] = []
            regex_hashissue.exec(issues_text)?.forEach((hashissue) => {
                const issue_number = parseInt(hashissue.slice(1))
                issue_deps.push(new Issue(owner, repo, issue_number))
            })
            const regex_githuburls : RegExp = /https:\/\/github\.com\/(?<OWNER>.+?)\/(?<REPO>.+?)\/issues\/(?<ISSUE_NUMBER>\d+)/
            regex_githuburls.exec(body)?.forEach((url) => {
                let groups = regex.exec(body)?.groups
                if(groups === undefined){
                    return
                }
                let owner = groups["OWNER"]
                let repo = groups["REPO"]
                let issue_number = groups["ISSUE_NUMBER"]
                if(owner === undefined){
                    return
                }
                if(repo === undefined){
                    return
                }
                if(issue_number === undefined){
                    return
                }
                return issue_deps.push(new Issue(owner, repo, parseInt(issue_number)))
            })
            issue_dependencies = issue_dependencies.concat(issue_deps)
        }
        return issue_dependencies
    })
    issue.depends_on = issue_dependencies
    return [issue]
}