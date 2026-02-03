import type { Card } from './Card'

export class Player {
	id: number
	cards: Card[]
	points: number
	eliminated: boolean = false
	knownCards: boolean[] = []

	constructor(id: number) {
		this.id = id
		this.cards = []
		this.points = 0
		this.knownCards = [true, true, false] // conhece as 2 primeiras cartas
	}

	get sum(): number {
		return this.cards.reduce((a, b) => a + (b || 0), 0)
	}

	get knownSum(): number {
		return this.cards
			.filter((_, index) => this.knownCards[index])
			.reduce((a, b) => a + b, 0)
	}

	knownCardValues(): Card[] {
		return this.cards.filter((_, index) => this.knownCards[index])
	}
}
