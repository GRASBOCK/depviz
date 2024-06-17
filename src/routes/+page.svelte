<script>
    let owner = "octocat";
	let repo = "Hello-World";
    let issue_number = "3094";
    $: url = `/github/${owner}/${repo}/${issue_number}`
    let valid_input = false
    function validate_issue_number(){
        valid_input = issue_number.match(/^-?\d+$/) != null
    }
    validate_issue_number()
</script>

<h1>DepViz</h1>
<p>A tool to visualize work dependencies of Github</p>
<p>Choose your root issue</p>

<input bind:value={owner}>
<input bind:value={repo}>
<input bind:value={issue_number} min="0" on:change={validate_issue_number}/>
{#if valid_input}
    <a href={url}>GitHub</a>
{/if}