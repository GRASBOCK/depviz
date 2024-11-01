import { type Issue } from './issue';

export enum IssueFetchError {
	CANT_HANDLE = 'Cannot handle the url of this issue. Broken URL or use different handler',
	FETCH_FAILED = 'Failed fetching issue'
}

export interface Handler {
	fetch_issue(url: string): Promise<Issue>;
}

export class Client {
	handlers: Handler[] = [];

	async fetch_issue(url: string): Promise<Issue> {
		for (let i = 0; i < this.handlers.length; i++) {
			try {
				return await this.handlers[i].fetch_issue(url);
			} catch (error) {
				console.error('error:', error, '; url:', url);
			}
		}
		throw Error('no handler could successfully fetch issue');
	}
}
