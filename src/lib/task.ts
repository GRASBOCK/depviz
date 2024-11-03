import type { Octokit } from 'octokit';
import { fetch_gitlab_tasks, is_gitlab } from './gitlab';

export let octokit: Octokit;

export enum Status {
	CANT_HANDLE = 'Cannot handle the url of this issue. Broken URL or use different handler',
	FETCH_FAILED = 'Failed fetching issue'
}

export interface Task {
	url(): string;

	fetch(): Promise<void>;
	fetched(): boolean;

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

	throw Error('not yet implemented; no handler');
}
