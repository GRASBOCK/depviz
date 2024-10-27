import type { Octokit } from 'octokit';

export let octokit: Octokit;

export class IssueData {
	is_blocked_by: string[];
	blocks: string[];
	relates_to: string[];

	constructor(
		is_blocked_by: string[] = [],
		blocks: string[] = [],
		relates_to: string[] = []
	) {
		this.is_blocked_by = is_blocked_by;
		this.blocks = blocks;
		this.relates_to = relates_to;
	}	
}

export class NoHandler {}

export class Issue {
	url: string;
	data: IssueData | NoHandler | null | undefined; // issue data = successful, null = broken link, undefined = not fetched yet

	constructor(
		url: string,
		data: IssueData | NoHandler | null | undefined = undefined,
	) {
		this.url = url;
		this.data = data;
	}

	label() {
		const url = new URL(this.url);
		const components = url.pathname.split('/');
		const owner = components[1];
		const repo = components[2];
		const number = components[4];
		const indicator = this.data !== null ? (this.data instanceof NoHandler ? '⚠️' : '') : '❓';
		return `${owner}\n${repo}\n#${number}` + indicator;
	}
}
