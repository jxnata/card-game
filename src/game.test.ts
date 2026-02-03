// game.test.ts
// Teste automatizado que simula um jogo completo com logs detalhados

import { Game, Utils } from './game'

function simulateGame() {
	const game = new Game(4)

	console.log('=== INÍCIO DO JOGO ===')

	let turn = 0

	while (!game.isGameOver() && turn < 500) {
		const player = game.currentPlayer
		if (player.eliminated) {
			game.playTurn({ takeFrom: 'deck' })
			continue
		}

		console.log(`\nTurno ${turn + 1} | Jogador ${player.id}`)
		console.log(`Cartas atuais (ocultas): [${player.cards.map(c => Utils.cardToSymbol(c)).join(', ')}] | Pontos: ${player.points}`)

		const knownIndexes = [0, 1] // assume que ele conhece as cartas 0 e 1
		const unknownIndex = 2

		const takeFrom = Math.random() > 0.5 ? 'deck' : 'discard'
		const drawnCard =
			takeFrom === 'deck'
				? game.drawFromDeck()
				: game.drawFromDiscard()

		console.log(
			`Comprou carta ${drawnCard} do ${takeFrom === 'deck' ? 'monte' : 'descarte'
			}`
		)

		let swapIndex: number | undefined

		// tenta trocar cartas conhecidas se a nova for menor
		for (const i of knownIndexes) {
			if (drawnCard < player.cards[i]) {
				swapIndex = i
				break
			}
		}

		// se não trocar conhecidas, tenta trocar a desconhecida se < 3
		if (swapIndex === undefined && drawnCard < 3) {
			swapIndex = unknownIndex
		}

		if (swapIndex !== undefined) {
			console.log(
				`Trocou carta ${drawnCard} pela posição ${swapIndex}`
			)
			const old = player.cards[swapIndex]
			player.cards[swapIndex] = drawnCard
			game.discardPile.push(old)
		} else {
			console.log(`Descartou carta ${drawnCard}`)
			game.discardPile.push(drawnCard)
		}

		// decisão aleatória de parar se soma for baixa
		if (player.sum <= 5 && Math.random() > 0.6) {
			console.log(
				`Jogador ${player.id} pediu para parar (soma=${player.sum})`
			)
			game.playTurn({
				takeFrom: 'deck',
				stop: true,
			})
			console.log('--- FIM DA RODADA ---')
		} else {
			game.nextPlayer()
		}

		turn++
	}

	const winner = game.getWinner()
	console.log('\n=== FIM DO JOGO ===')
	if (winner) {
		console.log(`Vencedor: Jogador ${winner.id}`)
	} else {
		console.log('Nenhum vencedor definido')
	}

	console.log('\nPontuação final:')
	game.players.forEach(p => {
		console.log(
			`Jogador ${p.id} | Pontos: ${p.points} | Eliminado: ${p.eliminated}`
		)
	})
}

simulateGame()
