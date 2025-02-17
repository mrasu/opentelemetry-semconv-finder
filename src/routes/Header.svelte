<script lang="ts">
	import github from '$lib/images/github.svg';
	import { AppBar } from '@skeletonlabs/skeleton';
</script>

<AppBar background="none">
	<svelte:fragment slot="lead">
		<i></i>
	</svelte:fragment>
	<h1 class="h1">OpenTelemetry SemConv Finder</h1>
	<svelte:fragment slot="trail">
		<div class="corner">
			<a href="https://github.com/mrasu/opentelemetry-semconv-finder" target="_blank">
				<img src={github} alt="GitHub" />
			</a>
		</div></svelte:fragment
	>
</AppBar>

<style>
	.corner {
		width: 3em;
		height: 3em;
	}

	.corner a {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.corner img {
		width: 2em;
		height: 2em;
		object-fit: contain;
	}
</style>
