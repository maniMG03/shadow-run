import Phaser from 'phaser'
import { RunScene } from './scenes/RunScene.ts'

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#2a1840',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1800 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [RunScene],
    banner: false,
  })
}
