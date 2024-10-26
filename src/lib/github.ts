import { Octokit } from 'octokit';
import { IssueData } from './graph';
import { Issue } from '$lib/issue';

export const GITHUB_HOSTNAME: string = 'github';

export function extract_issue_numbers(line: string): number[] {
	let matches = [...line.matchAll(/#\d+/g)];
	return matches.map((m) => {
		return parseInt(m[0].slice(1));
	});
}

export function extract_issue_urls(line: string): string[] {
	const re: RegExp = /github\.com\/(?<OWNER>.+?)\/(?<REPO>.+?)\/issues\/(?<ISSUE_NUMBER>\d+)/g;
	let matches = [...line.matchAll(re)];
	return matches
		.map((m) => {
			let groups = m.groups;
			if (groups === undefined) {
				return null;
			}
			let owner = groups['OWNER'];
			let repo = groups['REPO'];
			let issue_number = groups['ISSUE_NUMBER'];
			if (owner === undefined || repo === undefined || issue_number === undefined) {
				return null;
			}
			return url_from_path(owner, repo, parseInt(issue_number));
		})
		.filter((v): v is string => !!v);
}

export function extract_dependency_lines(line: string): string[] {
	const re: RegExp = /depends on (?<DEPENDENCY_LINE>.*)/gi;
	let matches = [...line.matchAll(re)];
	return matches
		.map((m) => {
			let groups = m.groups;
			if (groups === undefined) {
				return null;
			}
			let dependency_line = groups['DEPENDENCY_LINE'];
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
	async fetch_issue(url: string): Promise<Issue|null> {
		if (!url.includes('github')) {
			return null // not the correct handler
		}
		const path = new URL(url).pathname.split('/');
		if (path.length < 4) {
			throw Error('does not contain all path components');
		}
		const owner = path[1];
		const repo = path[2];
		const issue_number = Number(path[4]);
		const issue_data = await this.octokit.rest.issues
			.get({ owner: owner, repo: repo, issue_number: issue_number })
			.then(({ data: issue }) => new IssueData())
			.catch((e: any) => {
                console.error(`couldn't fetch issue data for issue ${issue_number}`)
				return null;
			});
		if (issue_data === null) {
			return new Issue(url, null);
		}
		let is_blocked_by: string[] = [];
		let blocks: string[] = [];
		let relates_to: string[] = [];
		await this.octokit.rest.issues
			.listComments({ owner: owner, repo: repo, issue_number: issue_number, per_page: 100 })
			.then(({ data }) => {
				for (let { body } of data) {
					if (body === undefined) {
						continue;
					}
					const dep_lines = extract_dependency_lines(body);
					for (let l of dep_lines) {
						extract_issue_numbers(l).forEach((num) =>
							is_blocked_by.push(url_from_path(owner, repo, num))
						);
						extract_issue_urls(l).forEach((i) => is_blocked_by.push(i));
					}
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
						let _e: any = e; // typescript hide typing errors
						let cre: {
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
		return new Issue(
			url,
			issue_data,
			Array.from(new Set(is_blocked_by)),
			Array.from(new Set(blocks)),
			Array.from(new Set(relates_to))
		);
	}
}
