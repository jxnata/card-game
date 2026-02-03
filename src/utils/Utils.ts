import type { Card } from '../models/Card'

export class Utils {
	static cardToSymbol(card: Card): string {
		if (card === undefined) return '?'
		return card === 0 ? 'J' : card === 1 ? 'A' : card === 11 ? 'Q' : card === 12 ? 'K' : card.toString()
	}
}
