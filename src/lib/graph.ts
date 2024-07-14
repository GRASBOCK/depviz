import { GITHUB_HOSTNAME } from "./github"

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
      case GITHUB_HOSTNAME:
        return `https://github.com/${this.owner}/${this.repo}/issues/${this.number}`
      default:
        throw Error("host unsupported")
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

export class Relationship{
  dependency: boolean
  link: IssueLink
  constructor(link: IssueLink, dependency: boolean){
    this.link = link
    this.dependency = dependency
  }

  static compare(a: Relationship, b: Relationship){
    return IssueLink.compare(a.link, b.link)
  }
}

export class Node{
  link: IssueLink
  data: IssueData | null
  related: Relationship[]
  constructor(issue: IssueLink, data: IssueData | null, dependencies: Relationship[]){
    this.link = issue
    this.data = data
    this.related = dependencies
  }
}

export class Graph{
  nodes: Node[]
  constructor(nodes: Node[]){
    this.nodes = nodes
  }
}