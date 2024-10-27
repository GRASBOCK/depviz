import { Issue, IssueData, NoHandler } from './issue';

export enum IssueFetchError {
	CANT_HANDLE = 'Cannot handle the url of this issue. Broken URL or use different handler',
	FETCH_FAILED = 'Failed fetching issue'
}

export interface Handler {
	fetch_issuedata(url: string): Promise<IssueData>;
}

export class Client {
	handlers: Handler[] = [];

	async fetch_issuedata(url: string): Promise<IssueData | NoHandler | null> {
		for (let i = 0; i < this.handlers.length; i++) {
			try {
				return await this.handlers[i].fetch_issuedata(url);
			} catch (error) {
				if (typeof error === 'string') {
					console.error('error:', error, '; url:', url);
					if (error === IssueFetchError.FETCH_FAILED) {
						return null;
					}
				}
			}
		}
		return new NoHandler();
	}
}
