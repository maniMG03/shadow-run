import { useState } from 'react'
import { setMuted, startMusic, unlockAudio } from './game/audio.ts'
import { GameCanvas } from './game/GameCanvas.tsx'

type Mode = 'menu' | 'play' | 'over'

const BEST_KEY = 'shadow-run-best'

function readBest() {
  const stored = Number(localStorage.getItem(BEST_KEY) ?? 0)
  return Number.isFinite(stored) ? stored : 0
}

function phase(score: number) {
  if (score >= 1200) return 'Eclipse'
  if (score >= 500) return 'Night'
  return 'Dusk'
}

export default function App() {
  const [mode, setMode] = useState<Mode>('menu')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readBest)
  const [round, setRound] = useState(0)
  const [muted, setMutedState] = useState(false)

  function remember(finalScore: number) {
    setBest((current) => {
      const next = Math.max(current, finalScore)
      localStorage.setItem(BEST_KEY, String(next))
      return next
    })
  }

  function play() {
    unlockAudio()
    startMusic()
    setScore(0)
    setRound((value) => value + 1)
    setMode('play')
  }

  function finish(finalScore: number) {
    setScore(finalScore)
    remember(finalScore)
    setMode('over')
  }

  function toggleSound() {
    setMutedState((current) => {
      const next = !current
      setMuted(next)
      if (!next) {
        unlockAudio()
        startMusic()
      }
      return next
    })
  }

  return (
    <div className="app">
      {mode === 'menu' ? (
        <section className="menu">
          <p className="eyebrow">A small night run</p>
          <h1>Shadow Run</h1>
          <p className="lede">
            Jump the spikes. Duck the beams. Grab the lights before the dusk runs out.
          </p>
          <div className="row">
            <button type="button" className="go" onClick={play}>
              Run
            </button>
            <button type="button" className="ghost" onClick={toggleSound}>
              {muted ? 'Sound on' : 'Sound off'}
            </button>
          </div>
          <ul className="keys">
            <li>
              <kbd>Space</kbd> to jump
            </li>
            <li>
              <kbd>Down</kbd> to duck or drop
            </li>
          </ul>
          {best > 0 ? <p className="best">Best {best}</p> : null}
        </section>
      ) : (
        <section className="play">
          <header className="hud">
            <div>
              <p className="eyebrow">{phase(score)}</p>
              <p className="score">{score}</p>
            </div>
            <div className="hud-side">
              <p className="best">Best {best}</p>
              <button type="button" className="ghost tiny" onClick={toggleSound}>
                {muted ? 'Sound on' : 'Sound off'}
              </button>
            </div>
          </header>
          <p className="hint">
            <kbd>Space</kbd> to jump
            <kbd>Down</kbd> to duck or drop
          </p>
          <GameCanvas round={round} onScore={setScore} onOver={finish} />
        </section>
      )}

      {mode === 'over' ? (
        <div className="veil">
          <div className="card">
            <p className="eyebrow">Caught</p>
            <h2>{score}</h2>
            <p className="best">Best {best}</p>
            <div className="row center">
              <button type="button" className="go" onClick={play}>
                Run again
              </button>
              <button type="button" className="ghost" onClick={() => setMode('menu')}>
                Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
