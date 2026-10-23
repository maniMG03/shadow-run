import { useEffect, useRef } from 'react'
import { bindGame } from './bridge.ts'
import { createGame } from './createGame.ts'

type Props = {
  round: number
  onScore: (score: number) => void
  onOver: (score: number) => void
}

export function GameCanvas({ round, onScore, onOver }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const onScoreRef = useRef(onScore)
  const onOverRef = useRef(onOver)

  useEffect(() => {
    onScoreRef.current = onScore
    onOverRef.current = onOver
  })

  useEffect(() => {
    const parent = host.current
    if (!parent) return
    bindGame({
      onScore: (score) => onScoreRef.current(score),
      onOver: (score) => onOverRef.current(score),
    })
    const game = createGame(parent)
    return () => {
      bindGame({ onScore: () => {}, onOver: () => {} })
      game.destroy(true)
      parent.replaceChildren()
    }
  }, [round])

  return <div className="stage" ref={host} />
}
