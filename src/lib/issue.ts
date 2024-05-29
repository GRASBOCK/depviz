

export class Issue{
  owner: string
  repo: string
  number: number
  depends_on: Issue[] = []

  constructor(owner: string, repo: string, number: number){
    this.owner = owner
    this.repo = repo
    this.number = number
  }
}
