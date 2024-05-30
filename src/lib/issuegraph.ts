export class Issue{
  owner: string
  repo: string
  number: number

  constructor(owner: string, repo: string, number: number){
    this.owner = owner
    this.repo = repo
    this.number = number
  }
}

export class IssueNode{
  issue: Issue
  dependencies: Issue[]
  constructor(issue: Issue, dependencies: Issue[]){
    this.issue = issue
    this.dependencies = dependencies
  }
}

export class IssueGraph{
  nodes: IssueNode[]
  constructor(nodes: IssueNode[]){
    this.nodes = nodes
  }
}