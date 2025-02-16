<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/store/db';
	import { toVector } from '$lib/vector';
	import type { PGlite } from '@electric-sql/pglite';
	import { Message, MessageWithPrompt, Response, UserMessage } from './Message';

	let apiKey: string = $state('');
	let currentQuestion: string = $state('');
	let aiThinking: boolean = $state(false);
	let includeDeprecated = $state(false);

	let messages: Message[] = $state([]);

	const onCommandKeyDown = (event) => {
		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault(); // Prevents adding a new line
			submitQuery(); // Call the function to handle submission
		}
	};

	const submitQuery = async () => {
		/*
		messages.push(new MessageWithPrompt(
			"List attributes appropriate to store url's path",
		`You are the senior software enginner and know well about OpenTelemetry. Below Yamls describe the list of opentelemetry's attributes.

Given these Yamls, answer the question.
Yamls:
-----
-------
Title: About http attributes
Content: - brief: 'The size of the request payload body in bytes. This is the number of bytes
    transferred excluding headers and is often, but not always, present as the [Content-Length](https://www.rfc-editor.org/rfc/rfc9110.html#field.content-length)
    header. For requests using transport encoding, this should be the compressed size.

    '
  deprecated: false
  examples: 3495
  name: http.request.body.size
- brief: 'HTTP request headers, \`<key>\` being the normalized HTTP Header name (lowercase),
    the value being the header values.

------
Question: List attributes appropriate to store url's path
Answer:`))
		messages.push(new Response(`Based on the provided context, here are the OpenTelemetry attributes related to URL and path:

1. url.domain
   - Brief: Domain extracted from the full URL
   - Examples: "www.foo.bar", "opentelemetry.io"

2. url.extension
   - Brief: File extension extracted from the full URL, excluding the leading dot
   - Examples: "png", "gz"

3. url.fragment
   - Brief: The URI fragment component
   - Examples: "SemConv"`));
		 // */
		console.log(includeDeprecated);
		if (apiKey === '') {
			console.log('no apiKey');
			return;
		}
		if (!$db) {
			console.log('db is not initialised');
			return;
		}

		const q = currentQuestion;

		if (messages.length === 0) {
			const docs = await getRelatingDocuments($db, q, includeDeprecated);
			const prompt = buildPromptIncludingContext(q, docs);
			messages.push(new MessageWithPrompt(currentQuestion, prompt));
		} else {
			messages.push(new UserMessage(currentQuestion));
		}
		aiThinking = true;

		const sendingMessage = messages.map((msg) => {
			return {
				role: msg.role,
				content: [
					{
						type: 'text',
						text: msg.sentMessage
					}
				]
			};
		});

		currentQuestion = '';
		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
					'content-type': 'application/json',
					'anthropic-dangerous-direct-browser-access': 'true'
				},
				body: JSON.stringify({
					model: 'claude-3-5-haiku-20241022',
					max_tokens: 1000,
					messages: sendingMessage
				})
			});
			const data = await response.json();
			console.log('AI response generated successfully', data);
			messages.push(new Response(data.content[0].text));
		} catch (e) {
			console.error(e);
			messages.pop();
		} finally {
			aiThinking = false;
		}
	};

	const getRelatingDocuments = async (
		db: PGlite,
		text: string,
		useFull: boolean
	): Promise<string[]> => {
		const vector = await toVector(text);
		const tableName = useFull ? 'full_documents' : 'active_documents';
		const result = await db.query<{ distance: number; document: string }>(
			`SELECT embedding <+> $1 AS distance, document FROM ${tableName} ORDER BY embedding <+> $1 LIMIT 5;`,
			[JSON.stringify(vector)]
		);

		return result.rows.map((doc) => doc.document);
	};

	const buildPromptIncludingContext = (question: string, relatingDocs: string[]) => {
		return `You are the senior software engineer and an expert in OpenTelemetry, and you are answering a user's questions about OpenTelemetry's attributes.

		You have access to YAML-formatted documents describing the list of OpenTelemetry's attributes in <context></context>. Your answer should be solely based on the provided documents.

		Given these documents, answer the question.
		<context>
		${relatingDocs.join('\n')}
		</context>

		User's question: ${question}

		Answer:`;
	};
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

{#if $db === null}
	Loading...
{:else}
	<section>
		<div class="w-full pb-3">
			<div class="grid grid-cols-[auto_1fr] items-center gap-2">
				<span>API Key (Claude)</span>
				<input class="input w-full" type="password" bind:value={apiKey} />
			</div>
		</div>

		<div class="w-full">
			{#each messages as msg}
				<div class="grid grid-cols-[auto] gap-2 pb-2">
					<div class="card space-y-2 rounded-tr-none p-4">
						<header class="flex items-center justify-between">
							<p class="font-bold">{msg.name}</p>
						</header>
						<p class="whitespace-pre-wrap">{msg.message}</p>
					</div>
				</div>
			{/each}
			{#if aiThinking}
				<div class="grid grid-cols-[auto] gap-2 pb-2">
					<div class="card space-y-2 rounded-tr-none p-4">
						<header class="flex items-center justify-between">
							<p class="font-bold">AI</p>
						</header>
						<div class="placeholder w-5/6 animate-pulse"></div>
					</div>
				</div>
			{/if}
		</div>

		<div class="input-group input-group-divider grid-cols-[1fr_auto] rounded-container-token">
			<textarea
				bind:value={currentQuestion}
				onkeydown={onCommandKeyDown}
				class="border-0 bg-transparent ring-0"
				name="prompt"
				id="prompt"
				placeholder="Write command. (e.g. List attributes for SQL)"
				rows="1"
			></textarea>
			<button
				class="variant-filled-primary"
				class:opacity-50={aiThinking}
				class:cursor-not-allowed={aiThinking}
				onclick={submitQuery}>Send</button
			>
		</div>
		{#if messages.length === 0}
			<div class="pt-3">
				<label class="flex items-center space-x-2">
					<input class="checkbox" type="checkbox" bind:checked={includeDeprecated} />
					<p>Include deprecated</p>
				</label>
			</div>
		{/if}
	</section>
{/if}

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		flex: 0.6;
	}
</style>
