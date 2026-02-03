import { Game } from './Game'

describe('Game', () => {
	describe('constructor', () => {
		it('should create game with valid player count', () => {
			const game = new Game(2)
			expect(game.players).toHaveLength(2)
			expect(game.deck).toHaveLength(52 - 6) // 52 - (2 players * 3 cards)
			expect(game.discardPile).toHaveLength(0)
		})

		it('should create game with maximum players', () => {
			const game = new Game(4)
			expect(game.players).toHaveLength(4)
			expect(game.deck).toHaveLength(52 - 12) // 52 - (4 players * 3 cards)
		})

		it('should throw error with less than minimum players', () => {
			expect(() => new Game(1)).toThrow('Número de jogadores deve ser entre 2 e 4')
		})

		it('should throw error with more than maximum players', () => {
			expect(() => new Game(5)).toThrow('Número de jogadores deve ser entre 2 e 4')
		})

		it('should throw error when deck creation results in wrong card count', () => {
			// Mock Array.prototype.push to limit the number of cards added
			const originalPush = Array.prototype.push
			let pushCount = 0
			
			const mockPush = jest.spyOn(Array.prototype, 'push').mockImplementation(function(this: any[], ...items: any[]) {
				// Only allow first 30 pushes to simulate incomplete deck creation
				if (pushCount < 30) {
					pushCount += items.length
					return originalPush.apply(this, items)
				}
				return this.length
			})
			
			expect(() => new Game(2)).toThrow(/Deck deve ter \d+ cartas, mas tem \d+/)
			
			mockPush.mockRestore()
		})

		it('should throw error when not enough cards to deal', () => {
			const game = new Game(2)
			// Reduce deck to less than 3 cards to trigger error in dealCards
			game.deck = [1, 2] // Only 2 cards, need 3
			
			// Spy on dealCards to trigger the specific error path
			expect(() => (game as any).dealCards()).toThrow('Não há cartas suficientes no deck para distribuir')
		})

		it('should initialize players with correct IDs', () => {
			const game = new Game(3)
			expect(game.players[0].id).toBe(1)
			expect(game.players[1].id).toBe(2)
			expect(game.players[2].id).toBe(3)
		})

		it('should deal 3 cards to each player', () => {
			const game = new Game(2)
			expect(game.players[0].cards).toHaveLength(3)
			expect(game.players[1].cards).toHaveLength(3)
		})

		it('should set current player index to 0', () => {
			const game = new Game(2)
			expect(game.currentPlayerIndex).toBe(0)
		})

		it('should initialize stoppedBy as null', () => {
			const game = new Game(2)
			expect(game.stoppedBy).toBeNull()
		})
	})

	describe('currentPlayer getter', () => {
		it('should return first player initially', () => {
			const game = new Game(2)
			expect(game.currentPlayer.id).toBe(1)
		})
	})

	describe('drawFromDeck', () => {
		it('should return a card and remove it from deck', () => {
			const game = new Game(2)
			const initialLength = game.deck.length
			const card = game.drawFromDeck()
			expect(card).toBeDefined()
			expect(game.deck.length).toBe(initialLength - 1)
		})

		it('should throw error when deck is empty', () => {
			const game = new Game(2)
			game.deck = []
			expect(() => game.drawFromDeck()).toThrow('Deck vazio - rodada deve terminar')
		})

		it('should throw error when pop returns undefined', () => {
			const game = new Game(2)
			// Mock pop to return undefined even when array has length
			const mockPop = jest.spyOn(game.deck, 'pop').mockReturnValue(undefined as any)
			
			expect(() => game.drawFromDeck()).toThrow('Deck vazio')
			
			mockPop.mockRestore()
		})
	})

	describe('drawFromDiscard', () => {
		it('should return top card from discard pile', () => {
			const game = new Game(2)
			game.discardPile = [5, 10]
			const card = game.drawFromDiscard()
			expect(card).toBe(10)
			expect(game.discardPile).toEqual([5])
		})

		it('should throw error when discard pile is empty', () => {
			const game = new Game(2)
			expect(() => game.drawFromDiscard()).toThrow('Descarte vazio')
		})
	})

	describe('playTurn', () => {
		it('should draw from deck and discard when no swap', () => {
			const game = new Game(2)
			const initialDeckLength = game.deck.length
			const player = game.currentPlayer

			game.playTurn({ takeFrom: 'deck' })

			expect(game.deck.length).toBe(initialDeckLength - 1)
			expect(game.discardPile.length).toBe(1)
			expect(player.cards).toHaveLength(3) // No swap, cards unchanged
		})

		it('should draw from deck and swap card when swapIndex provided', () => {
			const game = new Game(2)
			const player = game.currentPlayer
			const originalCard = player.cards[0]
			const initialDeckLength = game.deck.length

			game.playTurn({ takeFrom: 'deck', swapIndex: 0 })

			expect(player.cards[0]).not.toBe(originalCard)
			expect(player.knownCards[0]).toBe(true)
			expect(game.deck.length).toBe(initialDeckLength - 1)
			expect(game.discardPile.length).toBe(1)
			expect(game.discardPile[0]).toBe(originalCard)
		})

		it('should draw from discard and swap', () => {
			const game = new Game(2)
			const player = game.currentPlayer
			const originalCard = player.cards[1]

			// Setup discard pile
			game.discardPile = [7]

			game.playTurn({ takeFrom: 'discard', swapIndex: 1 })

			expect(player.cards[1]).toBe(7)
			expect(player.knownCards[1]).toBe(true)
			expect(game.discardPile[0]).toBe(originalCard)
		})

		it('should move to next player after turn', () => {
			const game = new Game(2)
			expect(game.currentPlayer.id).toBe(1)

			game.playTurn({ takeFrom: 'deck' })

			expect(game.currentPlayer.id).toBe(2)
		})

		it('should stop round when stop option is true', () => {
			const game = new Game(2)
			const player = game.currentPlayer

			// Setup cards for deterministic test
			player.cards = [1, 1, 1] // sum = 3 (lowest, so stopper wins)
			game.players[1].cards = [10, 10, 10] // sum = 30
			// Note: Don't empty the deck, or it will trigger round end by cards instead of stop

			// Mock console.log to avoid output noise
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

			game.playTurn({ takeFrom: 'deck', stop: true })

			consoleSpy.mockRestore()

			// Verify round was resolved via stop mechanic: stopper has lowest sum so gets 0 points, other gets 30
			expect(player.points).toBe(0)
			expect(game.players[1].points).toBe(30)
		})

		it('should end round by cards when deck is empty', () => {
			const game = new Game(2)
			game.deck = []

			// Setup cards for deterministic point verification
			game.players[0].cards = [5, 5, 5] // sum = 15
			game.players[1].cards = [10, 10, 10] // sum = 30

			// Mock console.log to avoid output noise
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

			game.playTurn({ takeFrom: 'discard' })

			consoleSpy.mockRestore()

			// Verify round was resolved by empty deck: both players get their own sums
			expect(game.players[0].points).toBe(15)
			expect(game.players[1].points).toBe(30)
		})

		it('should use provided drawnCard when specified', () => {
			const game = new Game(2)
			const player = game.currentPlayer
			const originalCard = player.cards[0]
			const initialDeckLength = game.deck.length

			game.playTurn({ takeFrom: 'deck', swapIndex: 0, drawnCard: 5 })

			expect(player.cards[0]).toBe(5)
			expect(game.deck.length).toBe(initialDeckLength) // Deck not touched when drawnCard provided
			expect(game.discardPile[0]).toBe(originalCard)
		})
	})

	describe('nextPlayer', () => {
		it('should advance to next player', () => {
			const game = new Game(2)
			game.nextPlayer()
			expect(game.currentPlayerIndex).toBe(1)
		})

		it('should wrap around to first player', () => {
			const game = new Game(2)
			game.currentPlayerIndex = 1
			game.nextPlayer()
			expect(game.currentPlayerIndex).toBe(0)
		})

		it('should skip eliminated players', () => {
			const game = new Game(3)
			game.players[1].eliminated = true
			game.currentPlayerIndex = 0

			game.nextPlayer()

			expect(game.currentPlayerIndex).toBe(2)
		})
	})

	describe('stopRound', () => {
		it('should resolve round when called', () => {
			const game = new Game(2)
			const initialPoints = game.players[0].points
			
			// Setup cards for deterministic test
			game.players[0].cards = [1, 1, 1] // sum = 3
			game.players[1].cards = [10, 10, 10] // sum = 30
			game.deck = [] // Force round end
			
			// Mock console.log to avoid output
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
			
			game.stopRound(game.players[0])
			
			consoleSpy.mockRestore()
			
			// After resolveRound, points should be updated
			// Player 0 stopped with sum 3, which is lowest, so they win (0 points)
			// Player 1 should have their sum added
			expect(game.players[0].points).toBe(0)
			expect(game.players[1].points).toBe(30)
		})

		it('should handle stop from specific player', () => {
			const game = new Game(2)
			
			// Setup cards
			game.players[0].cards = [10, 10, 10] // sum = 30
			game.players[1].cards = [1, 1, 1] // sum = 3
			game.deck = []
			
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
			
			// Player 1 stops
			game.stopRound(game.players[1])
			
			consoleSpy.mockRestore()
			
			// Player 1 stopped with sum 3 (lowest), so they win
			expect(game.players[1].points).toBe(0)
			// Player 0 gets their points
			expect(game.players[0].points).toBe(30)
		})
	})

	describe('isGameOver', () => {
		it('should return false when multiple players active', () => {
			const game = new Game(2)
			expect(game.isGameOver()).toBe(false)
		})

		it('should return false when all players active', () => {
			const game = new Game(4)
			expect(game.isGameOver()).toBe(false)
		})

		it('should return true when only one player remains', () => {
			const game = new Game(2)
			game.players[0].eliminated = true
			expect(game.isGameOver()).toBe(true)
		})

		it('should return true when all but one eliminated', () => {
			const game = new Game(4)
			game.players[0].eliminated = true
			game.players[1].eliminated = true
			game.players[2].eliminated = true
			expect(game.isGameOver()).toBe(true)
		})
	})

	describe('getWinner', () => {
		it('should return null when game is not over', () => {
			const game = new Game(2)
			expect(game.getWinner()).toBeNull()
		})

		it('should return the only active player when game is over', () => {
			const game = new Game(2)
			game.players[0].eliminated = true
			expect(game.getWinner()?.id).toBe(2)
		})

		it('should return null when all players eliminated', () => {
			const game = new Game(2)
			game.players[0].eliminated = true
			game.players[1].eliminated = true
			expect(game.getWinner()).toBeNull()
		})
	})

	describe('round resolution', () => {
		describe('when round ends by stop request', () => {
			it('should penalize stopper when someone has equal or lower sum', () => {
				const game = new Game(2)
				const stopper = game.players[0]
				const other = game.players[1]

				// Setup: stopper has high sum, other has lower
				stopper.cards = [10, 10, 10] // sum = 30
				other.cards = [1, 1, 1] // sum = 3

				game.stopRound(stopper)

				// Stopper should receive all points (30 + 3 = 33)
				expect(stopper.points).toBe(33)
				expect(other.points).toBe(0)
			})

			it('should not penalize stopper when has lowest sum', () => {
				const game = new Game(2)
				const stopper = game.players[0]
				const other = game.players[1]

				// Setup: stopper has lower sum
				stopper.cards = [1, 1, 1] // sum = 3
				other.cards = [10, 10, 10] // sum = 30

				game.stopRound(stopper)

				expect(stopper.points).toBe(0)
				expect(other.points).toBe(30)
			})

			it('should handle multiple players correctly', () => {
				const game = new Game(3)
				const stopper = game.players[0]

				stopper.cards = [5, 5, 5] // sum = 15
				game.players[1].cards = [10, 10, 10] // sum = 30
				game.players[2].cards = [1, 1, 1] // sum = 3

				game.stopRound(stopper)

				// Someone (player 3) has lower sum, so stopper loses
				expect(stopper.points).toBe(15 + 30 + 3)
				expect(game.players[1].points).toBe(0)
				expect(game.players[2].points).toBe(0)
			})
		})

		describe('when round ends by empty deck', () => {
			it('should add all players their own sums', () => {
				const game = new Game(2)

				game.players[0].cards = [5, 5, 5] // sum = 15
				game.players[1].cards = [10, 10, 10] // sum = 30

				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.players[0].points).toBe(15)
				expect(game.players[1].points).toBe(30)
			})
		})

		describe('elimination', () => {
			it('should eliminate player at 50 or more points', () => {
				const game = new Game(2)
				const player = game.players[0]

				player.cards = [20, 20, 20] // sum = 60

				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(player.points).toBe(60)
				expect(player.eliminated).toBe(true)
			})

			it('should not eliminate player below 50 points', () => {
				const game = new Game(2)
				const player = game.players[0]

				player.cards = [5, 5, 5] // sum = 15

				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(player.points).toBe(15)
				expect(player.eliminated).toBe(false)
			})
		})

		describe('round reset', () => {
			it('should create new deck after round', () => {
				const game = new Game(2)
				const originalDeck = [...game.deck]

				game.players[0].cards = [5, 5, 5]
				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.deck.length).toBe(52 - 6) // New full deck minus dealt cards
				expect(game.deck).not.toEqual(originalDeck) // Should be shuffled
			})

			it('should clear discard pile after round', () => {
				const game = new Game(2)
				game.discardPile = [1, 2, 3]

				game.players[0].cards = [5, 5, 5]
				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.discardPile).toHaveLength(0)
			})

			it('should deal new cards to active players', () => {
				const game = new Game(2)
				const originalCards = [...game.players[0].cards]

				game.players[0].cards = [5, 5, 5]
				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.players[0].cards).toHaveLength(3)
				expect(game.players[0].cards).not.toEqual(originalCards)
			})

			it('should not deal cards to eliminated players', () => {
				const game = new Game(3)
				game.players[0].eliminated = true

				// Setup hands for remaining players
				game.players[1].cards = [5, 5, 5]
				game.players[2].cards = [10, 10, 10]

				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.players[0].cards).toHaveLength(0)
				expect(game.players[1].cards).toHaveLength(3)
				expect(game.players[2].cards).toHaveLength(3)
			})

			it('should reset knownCards for active players', () => {
				const game = new Game(2)
				game.players[0].knownCards = [true, true, true]

				game.players[0].cards = [5, 5, 5]
				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.players[0].knownCards).toEqual([true, true, false])
			})

			it('should reset stoppedBy after round', () => {
				const game = new Game(2)

				game.players[0].cards = [5, 5, 5]
				game.stoppedBy = game.players[0]
				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game.stoppedBy).toBeNull()
			})

			it('should reset roundEndedByCards after round', () => {
				const game = new Game(2)

				game.players[0].cards = [5, 5, 5]
				game['roundEndedByCards'] = true
				game.deck = []
				game.playTurn({ takeFrom: 'discard' })

				expect(game['roundEndedByCards']).toBe(false)
			})
		})
	})

	describe('integration scenarios', () => {
		it('should complete a full round with multiple turns', () => {
			const game = new Game(2)
			const player1 = game.players[0]
			const player2 = game.players[1]

			// Player 1 takes from deck and stops
			game.playTurn({ takeFrom: 'deck', stop: true })

			// Round should resolve
			expect(player1.cards).toHaveLength(3)
			expect(player2.cards).toHaveLength(3)
			expect(game.discardPile).toHaveLength(0)
		})

		it('should handle chain of swaps from discard pile', () => {
			const game = new Game(2)
			const player1 = game.players[0]
			const player2 = game.players[1]

			// First player draws and discards
			game.playTurn({ takeFrom: 'deck' })

			// Second player takes from discard
			const discardTop = game.discardPile[game.discardPile.length - 1]
			const originalCard = player2.cards[0]

			game.playTurn({ takeFrom: 'discard', swapIndex: 0 })

			expect(player2.cards[0]).toBe(discardTop)
			expect(game.discardPile[game.discardPile.length - 1]).toBe(originalCard)
		})

		it('should eliminate player and continue game', () => {
			const game = new Game(3)
			const player1 = game.players[0]

			// Give player1 high points
			player1.points = 49
			player1.cards = [1, 1, 1] // sum = 3 -> total 52, eliminated

			game.deck = []
			game.playTurn({ takeFrom: 'discard' })

			expect(player1.eliminated).toBe(true)
			expect(game.isGameOver()).toBe(false) // Still 2 players
		})

		it('should end game when all but one eliminated', () => {
			const game = new Game(2)
			const player1 = game.players[0]

			player1.points = 49
			player1.cards = [1, 1, 1] // sum = 3 -> total 52

			game.deck = []
			game.playTurn({ takeFrom: 'discard' })

			expect(game.isGameOver()).toBe(true)
			expect(game.getWinner()?.id).toBe(2)
		})
	})
})
