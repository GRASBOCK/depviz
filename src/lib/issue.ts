import type { Octokit } from 'octokit';

export let octokit: Octokit;

export class IssueData {
	is_blocked_by: string[];
	blocks: string[];
	relates_to: string[];

	constructor(is_blocked_by: string[] = [], blocks: string[] = [], relates_to: string[] = []) {
		this.is_blocked_by = is_blocked_by;
		this.blocks = blocks;
		this.relates_to = relates_to;
	}
}

export class NoHandler {}

export interface Issue {
	url(): string;
	data(): IssueData;
	graph_label(): string
	table_label(): string
	is_blocked_by(): string[]
	relates_to(): string[]
	blocks(): string[]
}


