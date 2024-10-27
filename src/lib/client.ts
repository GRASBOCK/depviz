import { Issue, NoHandler } from './issue';

export interface Handler {
	fetch_issue(url: string): Promise<Issue | null>;
}

export class Client {
	handlers: Handler[] = [];

	async fetch_issue(url: string): Promise<Issue | null> {
		let issue = null;
		for (let i = 0; i < this.handlers.length; i++) {
			issue = await this.handlers[i].fetch_issue(url);
			if (issue !== null) {
				return issue;
			}
		}
		return new Issue(url, new NoHandler());
	}
}
