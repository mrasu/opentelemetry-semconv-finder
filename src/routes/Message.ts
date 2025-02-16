export class Message {
	constructor(
		public role: string,
		public name: string,
		public message: string
	) {}

	get sentMessage(): string {
		return this.message;
	}
}

export class MessageWithPrompt extends Message {
	constructor(
		question: string,
		private prompt: string
	) {
		super('user', 'You', question);
	}

	get sentMessage(): string {
		return this.prompt;
	}
}

export class UserMessage extends Message {
	constructor(message: string) {
		super('user', 'You', message);
	}
}

export class Response extends Message {
	constructor(response: string) {
		super('assistant', 'AI', response);
	}
}
