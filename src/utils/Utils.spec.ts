import { Utils } from '../utils/Utils'

describe('Utils', () => {
	describe('cardToSymbol', () => {
		it('should return "J" for card value 0', () => {
			expect(Utils.cardToSymbol(0)).toBe('J')
		})

		it('should return "A" for card value 1', () => {
			expect(Utils.cardToSymbol(1)).toBe('A')
		})

		it('should return numeric string for cards 2-10', () => {
			expect(Utils.cardToSymbol(2)).toBe('2')
			expect(Utils.cardToSymbol(5)).toBe('5')
			expect(Utils.cardToSymbol(10)).toBe('10')
		})

		it('should return "Q" for card value 11', () => {
			expect(Utils.cardToSymbol(11)).toBe('Q')
		})

		it('should return "K" for card value 12', () => {
			expect(Utils.cardToSymbol(12)).toBe('K')
		})

		it('should return "?" for undefined card', () => {
			expect(Utils.cardToSymbol(undefined as any)).toBe('?')
		})
	})
})
