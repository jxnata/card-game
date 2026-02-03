import { Player } from './Player'

describe('Player', () => {
	describe('constructor', () => {
		it('should create a player with correct id', () => {
			const player = new Player(1)
			expect(player.id).toBe(1)
		})

		it('should initialize with empty cards array', () => {
			const player = new Player(1)
			expect(player.cards).toEqual([])
		})

		it('should initialize with zero points', () => {
			const player = new Player(1)
			expect(player.points).toBe(0)
		})

		it('should not be eliminated initially', () => {
			const player = new Player(1)
			expect(player.eliminated).toBe(false)
		})

		it('should know first two cards initially', () => {
			const player = new Player(1)
			expect(player.knownCards).toEqual([true, true, false])
		})
	})

	describe('sum getter', () => {
		it('should return 0 when no cards', () => {
			const player = new Player(1)
			expect(player.sum).toBe(0)
		})

		it('should return correct sum with valid cards', () => {
			const player = new Player(1)
			player.cards = [1, 2, 3]
			expect(player.sum).toBe(6)
		})

		it('should handle face cards (J=0, Q=11, K=12)', () => {
			const player = new Player(1)
			player.cards = [0, 11, 12]
			expect(player.sum).toBe(23)
		})

		it('should handle ace (A=1)', () => {
			const player = new Player(1)
			player.cards = [1, 5, 10]
			expect(player.sum).toBe(16)
		})

		it('should handle undefined values gracefully', () => {
			const player = new Player(1)
			player.cards = [1, undefined as any, 3]
			expect(player.sum).toBe(4)
		})
	})

	describe('knownSum getter', () => {
		it('should return 0 when no known cards', () => {
			const player = new Player(1)
			player.knownCards = [false, false, false]
			player.cards = [1, 2, 3]
			expect(player.knownSum).toBe(0)
		})

		it('should return sum of known cards only', () => {
			const player = new Player(1)
			player.knownCards = [true, true, false]
			player.cards = [1, 2, 10]
			expect(player.knownSum).toBe(3)
		})

		it('should return full sum when all cards known', () => {
			const player = new Player(1)
			player.knownCards = [true, true, true]
			player.cards = [5, 5, 5]
			expect(player.knownSum).toBe(15)
		})
	})

	describe('knownCardValues', () => {
		it('should return empty array when no known cards', () => {
			const player = new Player(1)
			player.knownCards = [false, false, false]
			player.cards = [1, 2, 3]
			expect(player.knownCardValues()).toEqual([])
		})

		it('should return only known card values', () => {
			const player = new Player(1)
			player.knownCards = [true, false, true]
			player.cards = [1, 2, 3]
			expect(player.knownCardValues()).toEqual([1, 3])
		})

		it('should return all cards when all known', () => {
			const player = new Player(1)
			player.knownCards = [true, true, true]
			player.cards = [5, 6, 7]
			expect(player.knownCardValues()).toEqual([5, 6, 7])
		})
	})
})
