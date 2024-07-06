export class IssueLink{
  host: string
  owner: string
  repo: string
  number: number

  constructor(host: string, owner: string, repo: string, number: number){
    this.host = host
    this.owner = owner
    this.repo = repo
    this.number = number
  }

  url(): string{
    switch(this.host){
      case "github":
        return `https://github.com/${this.owner}/${this.repo}/issues/${this.number}`
      default:
        throw "host unsupported"
    }
  }

  static compare(a: IssueLink, b: IssueLink){
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

  static same(x: IssueLink, y: IssueLink){
    return x.number == y.number && x.owner == y.owner && x.repo == y.repo
  }
}

export class IssueData{

}

export class Node{
  link: IssueLink
  data: IssueData | null
  dependencies: IssueLink[]
  constructor(issue: IssueLink, data: IssueData | null, dependencies: IssueLink[]){
    this.link = issue
    this.data = data
    this.dependencies = dependencies
  }
}

export class Graph{
  nodes: Node[]
  constructor(nodes: Node[]){
    this.nodes = nodes
  }
}