export class Issue{
  owner: string
  repo: string
  number: number

  constructor(owner: string, repo: string, number: number){
    this.owner = owner
    this.repo = repo
    this.number = number
  }

  static compare(a: Issue, b: Issue){
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

  static same(x: Issue, y: Issue){
    return x.number == y.number && x.owner == y.owner && x.repo == y.repo
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