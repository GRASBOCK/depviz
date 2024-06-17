import type { Load } from "@sveltejs/kit"
import { error } from '@sveltejs/kit';

export const load: Load = ({ params }) => {
	const issue_number_str = params.issue_number
	if(!issue_number_str){
		error(404, {
			message: 'issue number not found'
		});
	}
	const issue_number = parseInt(issue_number_str)
	return {
		owner: params.owner,
		repo: params.repo,
		issue_number: issue_number
	}
}