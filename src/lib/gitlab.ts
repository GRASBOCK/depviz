import { Octokit } from 'octokit';
import { IssueData, NoHandler } from '$lib/issue';
import { IssueFetchError } from './client';

export const GITHUB_HOSTNAME: string = 'github';

export class GitLabIssue {
	_url: string;
	_data: IssueData; // issue data = successful, null = broken link, undefined = not fetched yet

	constructor(url: string, data: IssueData) {
		this._url = url;
		this._data = data;
	}

	variables(): { project_path: string; issue_number: string } {
		const matches = /gitlab\.com\/(?<project_path>.*)\/-\/issues\/(?<issue_number>\d*)/.exec(
			this._url
		);
		if (matches === null) {
			console.error('does not matches');
			throw IssueFetchError.CANT_HANDLE;
		}
		const groups = matches.groups;
		if (groups === undefined) {
			console.error('does not have groups');
			throw IssueFetchError.CANT_HANDLE;
		}

		const project_path = groups.project_path;
		const issue_number = groups.issue_number;
		return { project_path, issue_number };
	}

	url() {
		return this._url;
	}

	data() {
		return this._data;
	}

	table_label(): string {
		const vars = this.variables();
		return vars.project_path.replaceAll('/', ' ') + ' #' + vars.issue_number;
	}

	graph_label() {
		const vars = this.variables();
		return vars.project_path.replaceAll('/', '\n') + '\n#' + vars.issue_number;
	}
	is_blocked_by(): string[] {
		return this._data.is_blocked_by;
	}
	relates_to(): string[] {
		return this._data.relates_to;
	}
	blocks(): string[] {
		return this._data.blocks;
	}
}

export function extract_issue_numbers(line: string): number[] {
	const matches = [...line.matchAll(/#\d+/g)];
	return matches.map((m) => {
		return parseInt(m[0].slice(1));
	});
}

export function extract_issue_urls(line: string): string[] {
	const re: RegExp = /github\.com\/(?<OWNER>.+?)\/(?<REPO>.+?)\/issues\/(?<ISSUE_NUMBER>\d+)/g;
	const matches = [...line.matchAll(re)];
	return matches
		.map((m) => {
			const groups = m.groups;
			if (groups === undefined) {
				return null;
			}
			const owner = groups['OWNER'];
			const repo = groups['REPO'];
			const issue_number = groups['ISSUE_NUMBER'];
			if (owner === undefined || repo === undefined || issue_number === undefined) {
				return null;
			}
			return url_from_path(owner, repo, parseInt(issue_number));
		})
		.filter((v): v is string => !!v);
}

export function extract_dependency_lines(line: string): string[] {
	const re: RegExp = /depends on (?<DEPENDENCY_LINE>.*)/gi;
	const matches = [...line.matchAll(re)];
	return matches
		.map((m) => {
			const groups = m.groups;
			if (groups === undefined) {
				return null;
			}
			const dependency_line = groups['DEPENDENCY_LINE'];
			if (dependency_line === undefined) {
				return null;
			}
			return dependency_line;
		})
		.filter((v): v is string => !!v);
}

function url_from_path(owner: string, repo: string, number: number) {
	return `https://github.com/${owner}/${repo}/issues/${number}`;
}

export class GitLabHandler {
	access_token: string;
	constructor(access_token: string) {
		this.access_token = access_token;
	}
	async fetch_issue(url: string): Promise<GitLabIssue> {
		if (!url.includes('gitlab')) {
			throw IssueFetchError.CANT_HANDLE;
		}

		const matches = /gitlab\.com\/(?<project_path>.*)\/-\/issues\/(?<issue_number>\d*)/.exec(url);
		if (matches === null) {
			console.error('does not matches');
			throw IssueFetchError.CANT_HANDLE;
		}
		const groups = matches.groups;
		if (groups === undefined) {
			console.error('does not have groups');
			throw IssueFetchError.CANT_HANDLE;
		}

		const project_path = groups.project_path.replaceAll('/', '%2F');
		const issue_number = groups.issue_number;
		console.log('project_path', project_path);
		const init = { headers: { Authorization: `Bearer ${this.access_token}` } };

		const data = await fetch(
			`https://gitlab.com/api/v4/projects/${project_path}/issues/${issue_number}`,
			init
		).then((res) => {
			if (res.ok) {
				return res.json();
			} else {
				console.error('failed to fetch issue: status', res.status, res.statusText);
				throw IssueFetchError.FETCH_FAILED;
			}
		});
		const project_id = data.project_id;
		const issue_iid = data.iid;
		const links: { web_url: string; link_type: string }[] = await fetch(
			`https://gitlab.com/api/v4/projects/${project_id}/issues/${issue_iid}/links`,
			init
		).then((res) => {
			if (res.ok) {
				return res.json();
			} else {
				console.error('failed to fetch issue links: status', res.status, res.statusText, res.url);
				throw IssueFetchError.FETCH_FAILED;
			}
		});

		const is_blocked_by: string[] = [];
		const blocks: string[] = [];
		const relates_to: string[] = [];
		links.forEach((link) => {
			switch (link.link_type) {
				case 'relates_to':
					relates_to.push(link.web_url);
					break;
				case 'blocks':
					blocks.push(link.web_url);
					break;
				case 'is_blocked_by':
					is_blocked_by.push(link.web_url);
					break;
			}
		});
		return new GitLabIssue(url, new IssueData(is_blocked_by, blocks, relates_to));
	}
}

export async function new_gitlab_handler(access_token: string): Promise<GitLabHandler> {
	return new GitLabHandler(access_token);
}
