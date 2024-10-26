import type { Octokit } from 'octokit';

export let octokit: Octokit;

export class IssueData {}

export class Issue {
	url: string;
	data: IssueData | null | undefined; // issue data = successful, null = broken link, undefined = not fetched yet
	is_blocked_by: string[];
	blocks: string[];
	relates_to: string[];

	constructor(
		url: string,
		data: IssueData | null | undefined = undefined,
		is_blocked_by: string[] = [],
		blocks: string[] = [],
		relates_to: string[] = []
	) {
		this.url = url;
		this.data = data;
		this.is_blocked_by = is_blocked_by;
		this.blocks = blocks;
		this.relates_to = relates_to;
	}

	label() {
		const url = new URL(this.url)
		const components = url.pathname.split('/')
		const owner = components[1]
		const repo = components[2]
		const number = components[4]
		const indicator = this.data !== null ? "" : "❓";
		return `${owner}\n${repo}\n#${number}` + indicator
	}
}
