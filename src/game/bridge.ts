type Handlers = {
  onScore: (score: number) => void
  onOver: (score: number) => void
}

let handlers: Handlers = {
  onScore: () => {},
  onOver: () => {},
}

export function bindGame(next: Handlers) {
  handlers = next
}

export function emitScore(score: number) {
  handlers.onScore(score)
}

export function emitOver(score: number) {
  handlers.onOver(score)
}
