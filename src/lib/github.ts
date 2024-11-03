import { Octokit } from 'octokit';

export const GITHUB_HOSTNAME: string = 'github';

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

export class GitHubIssue {
	octokit: Octokit;
	_url: URL;
	_fetched: boolean = false;
	_status_text: string = 'unfetched';
	_blocks: string[] = [];
	_is_blocked_by: string[] = [];
	_relates_to: string[] = [];
	owner: string;
	repo: string;
	number: number;

	constructor(octokit: Octokit, url: string) {
		this.octokit = octokit;
		this._url = new URL(url);
		if (!this._url.host.includes('github')) {
			throw Error("Can't handle");
		}
		const path = new URL(this._url).pathname.split('/');
		if (path.length < 4) {
			throw Error("Can't handle");
		}
		const components = new URL(this._url).pathname.split('/');
		this.owner = components[1];
		this.repo = components[2];
		this.number = Number(components[4]);
	}

	url(): string {
		return this._url.href;
	}

	fetched(): boolean {
		return this._fetched;
	}

	table_label(): string {
		return `${this.owner} ${this.repo} #${this.number}`;
	}

	graph_label() {
		return `${this.owner}\n${this.repo}\n#${this.number}`;
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
		await this.octokit.rest.issues
			.get({ owner: this.owner, repo: this.repo, issue_number: this.number })
			.then(({ data: issue }) => {})
			.catch(() => {
				throw Error("Can't fetch");
			});
		const is_blocked_by: string[] = [];
		const blocks: string[] = [];
		const relates_to: string[] = [];
		await this.octokit.rest.issues
			.listComments({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.number,
				per_page: 100
			})
			.then(({ data }) => {
				for (const { body } of data) {
					if (body === undefined) {
						continue;
					}
					const dep_lines = extract_dependency_lines(body);
					for (const l of dep_lines) {
						extract_issue_numbers(l).forEach((num) =>
							is_blocked_by.push(url_from_path(this.owner, this.repo, num))
						);
						extract_issue_urls(l).forEach((i) => is_blocked_by.push(i));
					}
					extract_issue_numbers(body).forEach((num) =>
						relates_to.push(url_from_path(this.owner, this.repo, num))
					);
					extract_issue_urls(body).forEach((i) => relates_to.push(i));
				}
			});
		await this.octokit.rest.issues
			.listEventsForTimeline({
				owner: this.owner,
				repo: this.repo,
				issue_number: this.number,
				per_page: 100
			})
			.then(({ data }) => {
				data.forEach((e) => {
					if (e.event == 'cross-referenced') {
						const _e: any = e; // typescript hide typing errors
						const cre: {
							source: {
								type: string;
								issue: { number: number; repository: { name: string; owner: { login: string } } };
							};
						} = _e;
						if (cre.source.type != 'issue') {
							console.error('unknown cross reference type');
						}
						const number = cre.source.issue.number;
						const repo = cre.source.issue.repository.name;
						const owner = cre.source.issue.repository.owner.login;
						const link = url_from_path(owner, repo, number);
						relates_to.push(link);
					}
				});
			});
		this._blocks = blocks;
		this._is_blocked_by = is_blocked_by;
		this._relates_to = relates_to;
	}
}

export async function new_github_issue(access_token: string, url: string): Promise<GitHubIssue> {
	const octokit = new Octokit({ auth: access_token });
	await octokit.rest.users.getAuthenticated();
	return new GitHubIssue(octokit, url);
}
