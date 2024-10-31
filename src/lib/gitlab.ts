import { Octokit } from 'octokit';
import { Issue, IssueData } from '$lib/issue';
import { IssueFetchError } from './client';

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

export class GitHubHandler {
	octokit: Octokit;
	constructor(octokit: Octokit) {
		this.octokit = octokit;
	}
	async fetch_issuedata(url: string): Promise<IssueData> {
		if (!url.includes('github')) {
			throw IssueFetchError.CANT_HANDLE;
		}
		const path = new URL(url).pathname.split('/');
		if (path.length < 4) {
			throw IssueFetchError.CANT_HANDLE;
		}
		const owner = path[1];
		const repo = path[2];
		const issue_number = Number(path[4]);
		const issue_data = await this.octokit.rest.issues
			.get({ owner: owner, repo: repo, issue_number: issue_number })
			.then(({ data: issue }) => new IssueData())
			.catch(() => {
				throw IssueFetchError.FETCH_FAILED;
			});
		const is_blocked_by: string[] = [];
		const blocks: string[] = [];
		const relates_to: string[] = [];
		await this.octokit.rest.issues
			.listComments({ owner: owner, repo: repo, issue_number: issue_number, per_page: 100 })
			.then(({ data }) => {
				for (const { body } of data) {
					if (body === undefined) {
						continue;
					}
					const dep_lines = extract_dependency_lines(body);
					for (const l of dep_lines) {
						extract_issue_numbers(l).forEach((num) =>
							is_blocked_by.push(url_from_path(owner, repo, num))
						);
						extract_issue_urls(l).forEach((i) => is_blocked_by.push(i));
					}
					extract_issue_numbers(body).forEach((num) =>
						relates_to.push(url_from_path(owner, repo, num))
					);
					extract_issue_urls(body).forEach((i) => relates_to.push(i));
				}
			});
		await this.octokit.rest.issues
			.listEventsForTimeline({
				owner: owner,
				repo: repo,
				issue_number: issue_number,
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
		issue_data.is_blocked_by = Array.from(new Set(is_blocked_by));
		issue_data.blocks = Array.from(new Set(blocks));
		issue_data.relates_to = Array.from(new Set(relates_to));
		return issue_data;
	}
}

export async function new_gitlab_handler(access_token: string): Promise<GitHubHandler> {
	const octokit = new Octokit({ auth: access_token });
	await octokit.rest.users.getAuthenticated();
	return new GitHubHandler(octokit);
}
