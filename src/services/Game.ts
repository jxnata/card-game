import { GAME_CONFIG } from '../config/game.config'
import { Utils } from '../utils/Utils'
import type { Card } from '../models/Card'
import { Player } from '../models/Player'

export class Game {
	players: Player[]
	deck: Card[]
	discardPile: Card[] = []
	currentPlayerIndex: number = 0
	stoppedBy: Player | null = null
	roundEndedByCards: boolean = false

	constructor(playerCount: number) {
		if (playerCount < GAME_CONFIG.MIN_PLAYERS || playerCount > GAME_CONFIG.MAX_PLAYERS) {
			throw new Error(`Número de jogadores deve ser entre ${GAME_CONFIG.MIN_PLAYERS} e ${GAME_CONFIG.MAX_PLAYERS}`)
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
			deck.push(11) // Q
			deck.push(12) // K
			for (let n = 1; n <= 10; n++) deck.push(n)
		}

		if (deck.length !== GAME_CONFIG.TOTAL_CARDS) {
			throw new Error(`Deck deve ter ${GAME_CONFIG.TOTAL_CARDS} cartas, mas tem ${deck.length}`)
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
		// Only deal cards to active players
		const activePlayers = this.players.filter(p => !p.eliminated)

		for (const player of activePlayers) {
			if (this.deck.length < 3) {
				throw new Error('Não há cartas suficientes no deck para distribuir')
			}
			player.cards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!]
		}

		// Descarte sempre começa vazio - não colocar carta inicial
	}

	get currentPlayer(): Player {
		return this.players[this.currentPlayerIndex]
	}

	drawFromDeck(): Card {
		if (this.deck.length === 0) {
			throw new Error('Deck vazio - rodada deve terminar')
		}
		const card = this.deck.pop()
		if (card === undefined) {
			throw new Error('Deck vazio')
		}
		return card
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
		drawnCard?: number // opcional: carta já comprada
	}) {
		const player = this.currentPlayer

		// Verifica se o deck está vazio - se estiver, a rodada termina automaticamente
		// Isso acontece independentemente se o jogador quer comprar do monte ou do descarte
		if (this.deck.length === 0) {
			this.roundEndedByCards = true
			this.resolveRound()
			return
		}

		let card = options.drawnCard ?? (
			options.takeFrom === 'deck'
				? this.drawFromDeck()
				: this.drawFromDiscard()
		)

		if (options.swapIndex !== undefined) {
			const old = player.cards[options.swapIndex]
			player.cards[options.swapIndex] = card
			player.knownCards[options.swapIndex] = true // agora ele conhece esta carta
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

	stopRound(player?: Player) {
		// Método para parar a rodada sem comprar carta (quando jogador decide parar após sua jogada)
		// Recebe o jogador opcionalmente (para quando o currentPlayer já mudou após a jogada)
		this.stoppedBy = player || this.currentPlayer
		this.resolveRound()
	}

	private resolveRound() {
		console.log('\n=== RESOLUÇÃO DA RODADA ===')

		// Mostra cartas de todos os jogadores
		for (const p of this.players) {
			if (!p.eliminated) {
				console.log(`Jogador ${p.id}: [${p.cards.map(c => Utils.cardToSymbol(c)).join(', ')}] = Soma: ${p.sum} pontos`)
			}
		}

		if (this.roundEndedByCards) {
			// Fim por acabarem as cartas - todos revelam e somam pontos
			console.log('\nRodada terminou por deck vazio:')
			for (const p of this.players) {
				if (!p.eliminated) {
					console.log(`Jogador ${p.id}: +${p.sum} pontos (total: ${p.points} → ${p.points + p.sum})`)
					p.points += p.sum
				}
			}
		} else if (this.stoppedBy) {
			// Fim por pedido de parada
			const stopper = this.stoppedBy
			const stopperSum = stopper.sum
			console.log(`\nRodada terminou por pedido de parada do Jogador ${stopper.id} (soma: ${stopperSum}):`)

			const someoneEqualOrLower = this.players.some(
				p => p !== stopper && !p.eliminated && p.sum <= stopperSum
			)

			if (someoneEqualOrLower) {
				// perde - soma os pontos de todas as cartas (incluindo as suas)
				const total = this.players
					.filter(p => !p.eliminated)
					.reduce((sum, p) => sum + p.sum, 0)

				console.log(`Jogador ${stopper.id} PERDEU: alguém teve soma igual ou menor`)
				console.log(`Jogador ${stopper.id}: +${total} pontos (total: ${stopper.points} → ${stopper.points + total})`)
				stopper.points += total

				console.log('Outros jogadores: +0 pontos')
			} else {
				// vence
				console.log(`Jogador ${stopper.id} VENCEU: teve a menor soma`)
				console.log(`Jogador ${stopper.id}: +0 pontos`)

				for (const p of this.players) {
					if (p !== stopper && !p.eliminated) {
						console.log(`Jogador ${p.id}: +${p.sum} pontos (total: ${p.points} → ${p.points + p.sum})`)
						p.points += p.sum
					}
				}
			}
		}

		console.log('\nPontuação após a rodada:')
		for (const p of this.players) {
			console.log(`Jogador ${p.id}: ${p.points} pontos ${p.eliminated ? '(ELIMINADO)' : ''}`)
		}

		this.checkEliminations()
		this.resetRound()
	}

	private checkEliminations() {
		for (const p of this.players) {
			if (p.points >= GAME_CONFIG.ELIMINATION_POINTS) {
				p.eliminated = true
			}
		}
	}

	private resetRound() {
		console.log('\n=== REINÍCIO DA RODADA ===')

		const activePlayers = this.players.filter(p => !p.eliminated)
		const activeCount = activePlayers.length

		// Recolher TODAS as cartas (deck, descarte, jogadores ativos e eliminados) e criar novo baralho completo
		const discardCards = [...this.discardPile]
		const allPlayerCards = this.players.flatMap(p => p.cards)
		const remainingDeckCards = [...this.deck]

		console.log(`Cartas recolhidas:`)
		console.log(`  - Descarte: ${discardCards.length}`)
		console.log(`  - Jogadores: ${allPlayerCards.length}`)
		console.log(`  - Deck restante: ${remainingDeckCards.length}`)
		console.log(`  - Total recolhido: ${discardCards.length + allPlayerCards.length + remainingDeckCards.length}`)

		// Sempre criar um novo baralho completo de 52 cartas
		this.deck = this.createDeck()
		this.discardPile = []

		console.log(`Criado novo baralho completo: ${this.deck.length} cartas`)

		// Embaralhar o novo deck
		this.shuffle(this.deck)
		console.log(`Baralho embaralhado`)

		this.stoppedBy = null
		this.roundEndedByCards = false

		// Limpar cartas de todos os jogadores (ativos e eliminados)
		for (const player of this.players) {
			player.cards = []
			player.knownCards = []
		}

		// Distribuir novas cartas para jogadores ativos
		this.dealCards()

		console.log(`Cartas distribuídas: ${activeCount * 3} cartas para ${activeCount} jogadores`)
		console.log(`Cartas no deck após distribuição: ${this.deck.length}`)
		console.log(`Cartas no descarte inicial: ${this.discardPile.length}`)

		// Resetar conhecimento das cartas - jogadores ativos conhecem apenas 2 das 3 cartas
		for (const player of activePlayers) {
			player.knownCards = [true, true, false]
		}

		// Verificar se o jogo acabou
		if (activeCount <= 1) {
			console.log('JOGO TERMINOU - apenas um jogador ativo!')
		}

		console.log('=== FIM DO REINÍCIO ===\n')
	}

	isGameOver(): boolean {
		return this.players.filter(p => !p.eliminated).length === 1
	}

	getWinner(): Player | null {
		if (!this.isGameOver()) return null
		return this.players.find(p => !p.eliminated) || null
	}
}
