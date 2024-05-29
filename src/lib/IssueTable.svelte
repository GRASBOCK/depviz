<script lang="ts">
    import { fetch_issue } from "./github"
    import { onMount } from 'svelte';
    import type { Issue } from "./issue";

    let issues: Issue[] = [] 
    onMount(async () => {
        
		issues = await fetch_issue("octocat", "Hello-World", 3094);
        issues = issues
        console.log("test:", issues)
	});
</script>

<p>Issues:</p>
{#each issues as issue, i}
    {issue.number} -> 
    {#each issue.depends_on as dependency, i}
        <p>{dependency.number} </p>
    {/each}
{/each}

<style>
    p { display: inline; }
</style>