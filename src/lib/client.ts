import type { GitHubClient } from './github';
import type { Issue } from './issue';

export class Client {
	github_client: GitHubClient | undefined = undefined;

	async fetch_issue(url: string): Promise<Issue | undefined> {
		if (url.includes('github')) {
			return this.github_client?.fetch_issue(url);
		}
		throw Error('unknown url type');
	}
}
