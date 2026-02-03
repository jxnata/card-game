// game.test.ts
// Teste automatizado que simula um jogo completo com logs detalhados

import { Game, GAME_CONFIG, Utils } from './game'
import type { Player } from './game'

// Função auxiliar para verificar se deve parar após jogada
function checkShouldStopAfterPlay(player: Player, game: Game): boolean {
	const knownCardsCount = player.knownCards.filter(k => k).length
	const currentKnownSum = player.knownSum
	const totalCards = player.cards.length
	const unknownCardsCount = totalCards - knownCardsCount
	
	// ESTRATÉGIA 1: Conhece TODAS as cartas
	if (knownCardsCount === totalCards) {
		// Se soma <= 4, para imediatamente (mão excelente)
		if (currentKnownSum <= GAME_CONFIG.STOP_SUM_LOW) {
			console.log(`Jogador ${player.id} pediu para parar APÓS jogada (soma total conhecida=${currentKnownSum}) - MÃO EXCELENTE!`)
			game.stopRound(player) // Passa o jogador explicitamente
			console.log('--- FIM DA RODADA ---')
			return true
		}
		
		// Se soma <= 8, tem 50% de chance de parar (mão boa)
		if (currentKnownSum <= GAME_CONFIG.STOP_SUM_MEDIUM && Math.random() > 0.5) {
			console.log(`Jogador ${player.id} pediu para parar APÓS jogada (soma total conhecida=${currentKnownSum}) - MÃO BOA!`)
			game.stopRound(player) // Passa o jogador explicitamente
			console.log('--- FIM DA RODADA ---')
			return true
		}
	}
	
	// ESTRATÉGIA 2: Conhece 2 das 3 cartas (falta 1 desconhecida)
	if (knownCardsCount === 2 && unknownCardsCount === 1) {
		// Se soma das 2 conhecidas <= 2, para imediatamente
		if (currentKnownSum <= 2) {
			console.log(`Jogador ${player.id} pediu para parar APÓS jogada (soma conhecida=${currentKnownSum}, 1 carta oculta) - MÃO MUITO BOA!`)
			game.stopRound(player) // Passa o jogador explicitamente
			console.log('--- FIM DA RODADA ---')
			return true
		}
		
		// Se soma das 2 conhecidas <= 4, tem 70% de chance de parar
		if (currentKnownSum <= 4 && Math.random() > 0.3) {
			console.log(`Jogador ${player.id} pediu para parar APÓS jogada (soma conhecida=${currentKnownSum}, 1 carta oculta) - MÃO PROVAVELMENTE BOA!`)
			game.stopRound(player) // Passa o jogador explicitamente
			console.log('--- FIM DA RODADA ---')
			return true
		}
	}
	
	return false
}

function simulateGame() {
	const game = new Game(GAME_CONFIG.MAX_PLAYERS)

	console.log('=== INÍCIO DO JOGO ===')
	console.log(`Config: ${GAME_CONFIG.TOTAL_CARDS} cartas, ${GAME_CONFIG.MAX_PLAYERS} players`)

	let turn = 0

	while (!game.isGameOver() && turn < 100) {
		const player = game.currentPlayer
		if (player.eliminated) {
			game.nextPlayer()
			continue
		}

		console.log(`\nTurno ${turn + 1} | Jogador ${player.id}`)
		console.log(`Cartas conhecidas: [${player.cards.map((c, i) => player.knownCards[i] ? Utils.cardToSymbol(c) : '?').join(', ')}] | Pontos: ${isNaN(player.points) ? 0 : player.points}`)

		// PRIMEIRO: Decidir de onde comprar
		let takeFrom: 'deck' | 'discard'
		let swapIndex: number | undefined

		if (game.discardPile.length > 0) {
			const topDiscard = game.discardPile[game.discardPile.length - 1]
			console.log(`Carta no descarte: ${Utils.cardToSymbol(topDiscard)}`)

			// Pega do descarte se for menor que alguma carta conhecida
			const shouldTakeDiscard = player.knownCardValues().some(knownCard => topDiscard < knownCard)
			takeFrom = shouldTakeDiscard ? 'discard' : 'deck'
		} else {
			takeFrom = 'deck'
		}

		console.log(`Jogador ${player.id} escolhe comprar do ${takeFrom === 'deck' ? 'monte' : 'descarte'}`)

		// TERCEIRO: Decidir qual carta trocar (estratégia)
		if (takeFrom === 'discard') {
			const topDiscard = game.discardPile[game.discardPile.length - 1]
			
			// Estratégia: troca a maior carta conhecida que seja MAIOR que a carta do descarte
			let maxValue = -1
			for (let i = 0; i < player.cards.length; i++) {
				if (player.knownCards[i] && topDiscard < player.cards[i] && player.cards[i] > maxValue) {
					maxValue = player.cards[i]
					swapIndex = i
				}
			}

			// Se não trocar as conhecidas, verifica a carta oculta (desconhecida)
			if (swapIndex === undefined) {
				const unknownIndex = player.knownCards.findIndex(known => !known)
				// Troca carta desconhecida se a carta do descarte for baixa (<= 3)
				if (unknownIndex !== -1 && topDiscard <= GAME_CONFIG.LOW_CARD_THRESHOLD) {
					swapIndex = unknownIndex
				}
			}
			
			// Executa a jogada do descarte
			game.playTurn({
				takeFrom,
				swapIndex,
				stop: false,
			})
			
			// Log da jogada
			if (swapIndex !== undefined) {
				console.log(`Trocou carta pela posição ${swapIndex}`)
			} else {
				console.log(`Descartou carta comprada`)
			}
			
			// Mostra estado
			console.log(`Cartas após jogada: [${player.cards.map((c, i) => player.knownCards[i] ? Utils.cardToSymbol(c) : '?').join(', ')}]`)
			
			// QUARTO: Verificar se deve parar APÓS a jogada (melhorou a mão?)
			if (checkShouldStopAfterPlay(player, game)) {
				turn++
				continue
			}
			
			turn++
			continue
		} else {
			// Do deck - jogador compra e VÊ a carta, então decide
			// Precisamos comprar primeiro para saber o valor
			const drawnCard = game.drawFromDeck()
			console.log(`Comprou carta ${Utils.cardToSymbol(drawnCard)} do monte`)

			// Agora decide qual carta trocar baseado no VALOR REAL da carta comprada
			let maxValue = -1
			for (let i = 0; i < player.cards.length; i++) {
				if (player.knownCards[i] && drawnCard < player.cards[i] && player.cards[i] > maxValue) {
					maxValue = player.cards[i]
					swapIndex = i
				}
			}

			// Se não trocou nenhuma conhecida que seja maior, verifica a desconhecida
			if (swapIndex === undefined) {
				const unknownIndex = player.knownCards.findIndex(known => !known)
				if (unknownIndex !== -1 && drawnCard <= GAME_CONFIG.LOW_CARD_THRESHOLD) {
					// Troca carta desconhecida se a carta comprada for baixa (<= 3)
					swapIndex = unknownIndex
				}
			}

			// Executa a jogada passando a carta já comprada
			game.playTurn({
				takeFrom,
				swapIndex,
				stop: false,
				drawnCard,
			})
			
			// Log da jogada
			if (swapIndex !== undefined) {
				console.log(`Trocou carta ${Utils.cardToSymbol(drawnCard)} pela posição ${swapIndex}`)
			} else {
				console.log(`Descartou carta ${Utils.cardToSymbol(drawnCard)}`)
			}
			
			// Mostra estado
			console.log(`Cartas após jogada: [${player.cards.map((c, i) => player.knownCards[i] ? Utils.cardToSymbol(c) : '?').join(', ')}]`)
			
			// QUARTO: Verificar se deve parar APÓS a jogada (melhorou a mão?)
			if (checkShouldStopAfterPlay(player, game)) {
				turn++
				continue
			}
			
			turn++
			continue
		}
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

	console.log(`\nTotal de turnos jogados: ${turn}`)
}

simulateGame()
