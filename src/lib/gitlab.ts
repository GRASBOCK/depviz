import { Status } from './task';

export const GITHUB_HOSTNAME: string = 'github';

export function is_gitlab(url: string): boolean {
	if (url.includes('gitlab')) {
		return true;
	} else {
		return false;
	}
}

export class GitLabIssue {
	_url: URL;
	_fetched: Status = Status.TO_BE_FETCHED;
	_status_text: string = 'unfetched';
	_blocks: string[] = [];
	_is_blocked_by: string[] = [];
	_relates_to: string[] = [];
	_completed: boolean = false;
	project_path: string;
	issue_number: string;
	access_token: string;

	constructor(access_token: string, url: string) {
		this._url = new URL(url);
		this.access_token = access_token;

		const matches = /\/(?<project_path>.*)\/-\/(issues|work_items)\/(?<issue_number>\d*)/.exec(
			this._url.pathname
		);
		if (matches === null) {
			throw Error(`does not match ${this._url}`);
		}
		const groups = matches.groups;
		if (groups === undefined) {
			console.error('does not have groups');
			throw Error("Can't handle");
		}
		this.project_path = groups.project_path;
		this.issue_number = groups.issue_number;
	}

	fetched(): Status {
		return this._fetched;
	}

	completed(): boolean {
		return this._completed;
	}

	url() {
		return this._url.href;
	}

	table_label(): string {
		return this.project_path.replaceAll('/', ' ') + ' #' + this.issue_number;
	}

	graph_label() {
		return this.project_path.replaceAll('/', '\n') + '\n#' + this.issue_number;
	}
	is_blocked_by(): string[] {
		return this._is_blocked_by;
	}
	relates_to(): string[] {
		return this._relates_to;
	}
	blocks(): string[] {
		return this._blocks;
	}

	async fetch(): Promise<void> {
		const project_path = this.project_path.replaceAll('/', '%2F');
		const issue_number = this.issue_number;
		const init = { headers: { Authorization: `Bearer ${this.access_token}` } };

		const data = await fetch(
			`https://gitlab.com/api/v4/projects/${project_path}/issues/${issue_number}`,
			init
		).then((res) => {
			if (res.ok) {
				return res.json();
			} else {
				console.error('failed to fetch issue: status', res.status, res.statusText);
				this._fetched = Status.FETCH_FAILED;
				throw Error("Can't fetch");
			}
		});
		this._completed = data.closed_at !== null ? true : false;
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
				this._fetched = Status.FETCH_FAILED;
				throw Error("Can't fetch");
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
		this._blocks = blocks;
		this._is_blocked_by = is_blocked_by;
		this._relates_to = relates_to;
		this._fetched = Status.FETCHED;
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

export async function new_gitlab_issue(access_token: string, url: string): Promise<GitLabIssue> {
	return new GitLabIssue(access_token, url);
}

export async function fetch_multiple_issues(
	access_token: string,
	url: string
): Promise<GitLabIssue[]> {
	const _url = new URL(url);

	let prefix = '';
	let pathname_for_regex = _url.pathname;
	if (_url.pathname.includes('groups')) {
		prefix = 'groups/';
		pathname_for_regex = pathname_for_regex.replace('/groups', '');
	} else {
		prefix = 'projects/';
	}

	const matches = /\/(?<project_path>.*)\/-\/issues/.exec(pathname_for_regex);
	if (matches === null) {
		throw Error('does not match');
	}
	const groups = matches.groups;
	if (groups === undefined) {
		throw Error('does not have groups');
	}
	const project_path = groups.project_path.replaceAll('/', '%2F');
	const params = [
		['per_page', '100'],
		['sort', 'asc'] // sort ascending, so that issues that appear during fetching are not accidentally lost due to pagination
	];

	let labels = _url.searchParams.getAll('label_name[]');
	if (labels.length > 0) {
		let label_names = labels[0];
		for (let i = 1; i < labels.length; ++i) {
			label_names = label_names.concat(',', labels[i]);
		}
		params.push(['labels', label_names]);
	}

	const result: GitLabIssue[] = [];
	const init = { headers: { Authorization: `Bearer ${access_token}` } };
	let finished = false;
	let i = 0;
	while (!finished) {
		const issues: { web_url: string }[] = await fetch(
			`https://gitlab.com/api/v4/${prefix}${project_path}/issues?${new URLSearchParams(params)}&page=${i}`,
			init
		).then((res) => {
			if (res.ok) {
				return res.json();
			} else {
				console.error('failed to fetch issue: status', res.status, res.statusText);
				throw Error('failed fetching');
			}
		});
		issues.forEach((issue) => {
			result.push(new GitLabIssue(access_token, issue.web_url));
		});
		if (issues.length < 100) {
			finished = true;
		}
		i += 1;
	}

	/**/
	return result;
}

export function fetch_gitlab_tasks(
	access_token: string,
	url: string
): GitLabIssue | Promise<GitLabIssue[]> {
	const pathname = new URL(url).pathname;
	const last = pathname.substring(pathname.lastIndexOf('/') + 1);
	if (last === '' || last === 'issues') {
		return fetch_multiple_issues(access_token, url);
	} else {
		return new GitLabIssue(access_token, url);
	}
}
