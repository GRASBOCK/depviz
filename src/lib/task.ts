import type { Octokit } from 'octokit';
import { fetch_gitlab_tasks, is_gitlab } from './gitlab';
import { fetch_github_tasks, is_github, new_github_issue } from './github';

export let octokit: Octokit;

export enum Status {
	FETCHED = 'The issue has been successfully fetched',
	FETCH_FAILED = 'Failed fetching issue',
	TO_BE_FETCHED = 'Issue has been registered, but still has to be fetched'
}

export interface Task {
	url(): string;

	fetch(): Promise<void>;
	fetched(): Status;
	
	completed(): boolean;
	graph_label(): string;
	table_label(): string;
	is_blocked_by(): string[];
	relates_to(): string[];
	blocks(): string[];
}

export function distinguish(
	access_tokens: Map<string, string>,
	url: string
): Task | Promise<Task[]> {
	if (is_gitlab(url)) {
		const gitlab_access_token = access_tokens.get('gitlab');
		if (gitlab_access_token === undefined) {
			throw Error('gitlab access token is not defined');
		}
		return fetch_gitlab_tasks(gitlab_access_token, url);
	}

	if (is_github(url)) {
		const github_access_token = access_tokens.get('github');
		if (github_access_token === undefined) {
			throw Error('gitlab access token is not defined');
		}
		return fetch_github_tasks(github_access_token, url);
	}

	throw Error('not yet implemented; no handler');
}
