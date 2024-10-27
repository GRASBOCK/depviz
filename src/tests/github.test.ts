import { expect, describe, it } from 'vitest';
import {
	extract_issue_numbers,
	extract_issue_urls,
	extract_dependency_lines,
	GitHubHandler
} from '$lib/github';
import { Octokit } from 'octokit';
import { ACCESS_TOKEN } from '$env/static/private';

describe('fetch issuedata', async () => {
	const octokit = new Octokit({ auth: ACCESS_TOKEN });
	const {
		data: { login }
	} = await octokit.rest.users.getAuthenticated();
	const client = new GitHubHandler(octokit);

	const issuedata = await client.fetch_issuedata('https://github.com/octocat/Hello-World/issues/3094');
	it('issuedata exists', () => {
		expect(issuedata);
	});

	it('issue dependencies', () => {
		const is_blocked_by = [
			'https://github.com/octocat/Hello-World/issues/3095',
			'https://github.com/octocat/Hello-World/issues/3087',
			'https://github.com/octocat/Hello-World/issues/3089',
			'https://github.com/octocat/Hello-World/issues/3043',
			'https://github.com/octocat/Spoon-Knife/issues/33081'
		];
		expect(is_blocked_by.sort()).toEqual(issuedata!.is_blocked_by.sort());
		const relates_to = [
			'https://github.com/octocat/Hello-World/issues/3130',
			'https://github.com/octocat/Hello-World/issues/3095'
		];
		expect(relates_to.sort()).toEqual(issuedata!.relates_to.sort());
	});

	
});

describe('extract from tags', () => {
	const tests: { desc: string; text: string; expected: number[] }[] = [
		{ desc: 'default', text: '#3095', expected: [3095] },
		{ desc: 'multiple', text: '#3095,#59, #3093 and #3094', expected: [3095, 59, 3093, 3094] },
		{
			desc: 'mixed with url',
			text: '#3095, #5464 https://github.com/octocat/Hello-World/issues/3095',
			expected: [3095, 5464]
		},
		{ desc: 'only url', text: 'https://github.com/octocat/Hello-World/issues/3095', expected: [] }
	];

	for (const t of tests) {
		it(t.desc, () => {
			expect(extract_issue_numbers(t.text)).toEqual(t.expected);
		});
	}
});

describe('extract from url', () => {
	const tests: { desc: string; text: string; expected: string[] }[] = [
		{
			desc: 'default',
			text: 'https://github.com/octocat/Hello-World/issues/3095',
			expected: ['https://github.com/octocat/Hello-World/issues/3095']
		},
		{
			desc: 'multiple',
			text: 'https://github.com/octocat/Hello-World/issues/3095 https://github.com/octocat/Hello-World/issues/3093',
			expected: [
				'https://github.com/octocat/Hello-World/issues/3095',
				'https://github.com/octocat/Hello-World/issues/3093'
			]
		},
		{
			desc: 'markdown link',
			text: '[.sesef tju7 ++ #..](https://github.com/octocat/Hello-World/issues/3095)',
			expected: ['https://github.com/octocat/Hello-World/issues/3095']
		},
		{
			desc: 'other repo',
			text: 'https://github.com/octocat/Spoon-Knife/issues/33081',
			expected: ['https://github.com/octocat/Spoon-Knife/issues/33081']
		},
		{ desc: 'not a url', text: '#3095', expected: [] }
	];

	for (const t of tests) {
		it(t.desc, () => {
			expect(extract_issue_urls(t.text)).toEqual(t.expected);
		});
	}
});

describe('issue text extraction', () => {
	const tests: { desc: string; text: string; expected: string[] }[] = [
		{ desc: 'default', text: 'depends on #3095', expected: ['#3095'] },
		{ desc: 'case insensitive', text: 'Depends on #3095', expected: ['#3095'] },
		{ desc: 'multiple', text: 'depends on #3095 and #3094', expected: ['#3095 and #3094'] },
		{
			desc: 'multiline',
			text: 'depends on #3095 ;\nalso depends on #3094',
			expected: ['#3095 ;', '#3094']
		},
		{
			desc: 'before',
			text: 'Some issue: #3094. It depends on #3095 and https://github.com/octocat/Hello-World/issues/3095',
			expected: ['#3095 and https://github.com/octocat/Hello-World/issues/3095']
		},
		{ desc: 'without', text: 'some text without dependencies', expected: [] }
	];

	for (const t of tests) {
		it(t.desc, () => {
			expect(extract_dependency_lines(t.text)).toEqual(t.expected);
		});
	}
});
