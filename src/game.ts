export type Card = number // J = 0, A = 1, 2–10 = valor, Q = 12, K = 13

export class Player {
	id: number
	cards: Card[]
	points: number
	eliminated: boolean = false

	constructor(id: number) {
		this.id = id
		this.cards = []
		this.points = 0
	}

	get sum(): number {
		return this.cards.reduce((a, b) => a + b, 0)
	}
}

export class Game {
	players: Player[]
	deck: Card[]
	discardPile: Card[] = []
	currentPlayerIndex: number = 0
	stoppedBy: Player | null = null

	constructor(playerCount: number) {
		if (playerCount < 2 || playerCount > 4) {
			throw new Error('Número de jogadores deve ser entre 2 e 4')
		}

		this.players = Array.from({ length: playerCount }, (_, i) => new Player(i + 1))
		this.deck = this.createDeck()
		this.shuffle(this.deck)
		this.dealCards()
	}

	private createDeck(): Card[] {
		const deck: Card[] = []
		for (let i = 0; i < 4; i++) {
			deck.push(0) // J
			deck.push(12) // Q
			deck.push(13) // K
			for (let n = 1; n <= 10; n++) deck.push(n)
		}
		return deck
	}

	private shuffle(deck: Card[]) {
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
				;[deck[i], deck[j]] = [deck[j], deck[i]]
		}
	}

	private dealCards() {
		for (const player of this.players) {
			player.cards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!]
		}
		this.discardPile.push(this.deck.pop()!)
	}

	get currentPlayer(): Player {
		return this.players[this.currentPlayerIndex]
	}

	drawFromDeck(): Card {
		if (this.deck.length === 0) {
			this.deck = this.discardPile.splice(0, this.discardPile.length - 1)
			this.shuffle(this.deck)
		}
		return this.deck.pop()!
	}

	drawFromDiscard(): Card {
		if (this.discardPile.length === 0) {
			throw new Error('Descarte vazio')
		}
		return this.discardPile.pop()!
	}

	playTurn(options: {
		takeFrom: 'deck' | 'discard'
		swapIndex?: number
		stop?: boolean
	}) {
		const player = this.currentPlayer
		let card =
			options.takeFrom === 'deck'
				? this.drawFromDeck()
				: this.drawFromDiscard()

		if (options.swapIndex !== undefined) {
			const old = player.cards[options.swapIndex]
			player.cards[options.swapIndex] = card
			this.discardPile.push(old)
		} else {
			this.discardPile.push(card)
		}

		if (options.stop) {
			this.stoppedBy = player
			this.resolveRound()
			return
		}

		this.nextPlayer()
	}

	nextPlayer() {
		do {
			this.currentPlayerIndex =
				(this.currentPlayerIndex + 1) % this.players.length
		} while (this.currentPlayer.eliminated)
	}

	private resolveRound() {
		if (!this.stoppedBy) return

		const stopper = this.stoppedBy
		const stopperSum = stopper.sum

		const someoneEqualOrLower = this.players.some(
			p => p !== stopper && !p.eliminated && p.sum <= stopperSum
		)

		if (someoneEqualOrLower) {
			// perde
			const total = this.players
				.filter(p => !p.eliminated)
				.reduce((sum, p) => sum + p.sum, 0)

			stopper.points += total
		} else {
			// vence
			for (const p of this.players) {
				if (p !== stopper && !p.eliminated) {
					p.points += p.sum
				}
			}
		}

		this.checkEliminations()
		this.resetRound()
	}

	private checkEliminations() {
		for (const p of this.players) {
			if (p.points >= 100) {
				p.eliminated = true
			}
		}
	}

	private resetRound() {
		this.deck = this.createDeck()
		this.shuffle(this.deck)
		this.discardPile = []
		this.stoppedBy = null
		this.dealCards()
	}

	isGameOver(): boolean {
		return this.players.filter(p => !p.eliminated).length === 1
	}

	getWinner(): Player | null {
		if (!this.isGameOver()) return null
		return this.players.find(p => !p.eliminated) || null
	}
}

export class Utils {
	static cardToSymbol(card: Card): string {
		return card === 0 ? 'J' : card === 1 ? 'A' : card === 12 ? 'Q' : card === 13 ? 'K' : card.toString()
	}
}