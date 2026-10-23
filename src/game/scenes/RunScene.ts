import Phaser from 'phaser'
import { blip } from '../audio.ts'
import { emitOver, emitScore } from '../bridge.ts'
import { RunnerAnim, type PoseName } from '../runner.ts'
import { paintTextures, redrawLiveRunner, RUNNER_KEY } from '../textures.ts'

const GROUND_Y = 468
const PLAYER_X = 210
const SCALE = 0.5

export class RunScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private hazards!: Phaser.Physics.Arcade.Group
  private coins!: Phaser.Physics.Arcade.Group
  private stars!: Phaser.GameObjects.TileSprite
  private far!: Phaser.GameObjects.TileSprite
  private near!: Phaser.GameObjects.TileSprite
  private groundTile!: Phaser.GameObjects.TileSprite
  private shadow!: Phaser.GameObjects.Ellipse
  private halo!: Phaser.GameObjects.Image
  private night!: Phaser.GameObjects.Rectangle
  private props!: Phaser.GameObjects.Group
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyW!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keySpace!: Phaser.Input.Keyboard.Key

  private speed = 280
  private distance = 0
  private bonus = 0
  private score = 0
  private spawnIn = 700
  private coyote = 0
  private jumpBuffer = 0
  private ducking = false
  private diving = false
  private airTime = 0
  private over = false
  private intro = false
  private runner = new RunnerAnim()
  private streakIn = 0
  private lastHazard: 'spike' | 'beam' | 'none' = 'none'
  private propIn = 280
  private lastProp = ''

  constructor() {
    super('run')
  }

  create() {
    paintTextures(this)
    this.drawWorld()

    this.hazards = this.physics.add.group({ allowGravity: false, immovable: true })
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true })

    this.props = this.add.group()
    this.seedProps()
    this.bindInput()
    this.physics.add.overlap(this.player, this.hazards, () => this.die())
    this.physics.add.overlap(this.player, this.coins, (_player, coin) => {
      this.collect(coin as Phaser.Physics.Arcade.Sprite)
    })
    emitScore(0)
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 34)
    this.scroll(dt)
    this.pushMovers(dt)
    this.pushProps(dt)
    this.night.setAlpha(Phaser.Math.Clamp(this.distance / 12000, 0, 0.42))

    if (this.over) {
      this.speed = Math.max(0, this.speed - dt * 1.5)
      this.player.setVelocityX(0)
      this.player.x = PLAYER_X
      return
    }

    this.speed = Math.min(520, 280 + this.distance * 0.02)
    this.distance += (this.speed * dt) / 1000
    this.syncScore()
    this.drive(dt)

    this.spawnIn -= dt
    if (this.spawnIn <= 0) this.spawnNext()
    this.propIn -= dt
    if (this.propIn <= 0) this.spawnProp()

    this.streakIn -= dt
    if (this.streakIn <= 0 && this.speed > 400) {
      this.streakIn = 180
      this.streak()
    }

    this.player.setVelocityX(0)
    this.player.x = PLAYER_X
    const lift = Math.max(0, GROUND_Y - this.player.y)
    const scale = Phaser.Math.Clamp(1 - lift / 200, 0.4, 1)
    this.shadow.setPosition(PLAYER_X, GROUND_Y - 4)
    this.shadow.setScale(scale, scale)
    this.shadow.setDepth(6)
    const tucked = this.ducking || this.diving
    this.halo.setPosition(PLAYER_X, this.player.y - (tucked ? 22 : 46))
    this.halo.setScale(tucked ? 1.1 : 1, tucked ? 0.55 : 1)
    this.halo.setAlpha(0.28 + scale * 0.4)
  }

  private drawWorld() {
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x2a1840, 0x2a1840, 0xf0b08a, 0xf6c7a6, 1, 1, 1, 1)
    sky.fillRect(0, 0, 960, 540)

    this.stars = this.add.tileSprite(480, 270, 960, 540, 'stars').setOrigin(0.5).setDepth(1)
    this.night = this.add.rectangle(480, 270, 960, 540, 0x070414, 0).setDepth(1.5)
    this.add.image(830, 92, 'moon').setDepth(2)
    this.far = this.add.tileSprite(480, 348, 960, 240, 'ridge').setOrigin(0.5).setDepth(3)
    this.near = this.add.tileSprite(480, 392, 960, 190, 'hills').setOrigin(0.5).setDepth(4)
    this.groundTile = this.add
      .tileSprite(480, GROUND_Y + 36, 960, 72, 'ground')
      .setOrigin(0.5)
      .setDepth(5)

    const floor = this.add.rectangle(480, GROUND_Y + 200, 960, 400, 0x000000, 0)
    this.physics.add.existing(floor, true)
    ;(floor.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject()

    this.shadow = this.add.ellipse(PLAYER_X, GROUND_Y - 4, 52, 12, 0x14080c, 0.4).setDepth(6)
    this.halo = this.add.image(PLAYER_X, GROUND_Y - 46, 'halo').setDepth(6.5)
    this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y, RUNNER_KEY)
    redrawLiveRunner(this, this.runner.displayed)
    this.player.setOrigin(0.5, 1)
    this.player.setScale(SCALE)
    this.player.setDepth(7)
    this.player.setCollideWorldBounds(false)
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(48, 140, false)
    body.setOffset(50, 52)
    this.physics.add.collider(this.player, floor)
  }

  private bindInput() {
    const keyboard = this.input.keyboard
    if (!keyboard) throw new Error('Keyboard input is unavailable')
    this.cursors = keyboard.createCursorKeys()
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.S,
    ])
  }

  private drive(dt: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const onGround = body.blocked.down || body.touching.down
    this.coyote = onGround ? 120 : Math.max(0, this.coyote - dt)

    const pressed =
      Phaser.Input.Keyboard.JustDown(this.keySpace) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keyW)
    if (pressed) this.jumpBuffer = 140
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt)

    let jumped = false
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.player.setVelocityY(-720)
      this.jumpBuffer = 0
      this.coyote = 0
      this.ducking = false
      this.diving = false
      this.airTime = 0
      jumped = true
      blip(460, 0.07, 0.03, 'triangle')
    }

    const duckHeld = this.cursors.down.isDown || this.keyS.isDown
    const downPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.keyS)

    if (onGround) {
      if (this.diving) this.puff()
      this.diving = false
      this.airTime = 0
    } else {
      this.airTime += dt
      const canDive = duckHeld && (downPressed || this.diving || this.airTime > 120)
      if (canDive) {
        if (!this.diving) blip(180, 0.06, 0.04, 'square')
        this.diving = true
        if (body.velocity.y < 1650) this.player.setVelocityY(1650)
      }
    }

    this.ducking = !jumped && duckHeld && onGround
    this.applyPose(onGround, dt)
  }

  private applyPose(onGround: boolean, dt: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const pose: PoseName = this.diving ? 'dive' : this.ducking ? 'duck' : onGround ? 'run' : 'jump'
    const { planted } = this.runner.step(dt, this.speed, pose, onGround)
    redrawLiveRunner(this, this.runner.displayed)
    if (planted) this.puff()

    if (this.ducking || this.diving) {
      body.setSize(52, 72, false)
      body.setOffset(50, 120)
      return
    }

    body.setSize(48, 140, false)
    body.setOffset(50, 52)
  }

  private puff() {
    const dust = this.add.ellipse(PLAYER_X + 10, GROUND_Y - 3, 18, 5, 0x4a3050, 0.45).setDepth(6)
    this.tweens.add({
      targets: dust,
      x: dust.x - 36,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 0.6,
      duration: 220,
      onComplete: () => dust.destroy(),
    })
  }

  private seedProps() {
    const starters = [
      { key: 'cloud', x: 260, y: 118, scroll: 0.15, depth: 2, originY: 0.5 },
      { key: 'lantern', x: 390, y: GROUND_Y, scroll: 1, depth: 5.4, originY: 1 },
      { key: 'rock', x: 560, y: GROUND_Y + 2, scroll: 1, depth: 5.5, originY: 1 },
      { key: 'banner', x: 700, y: GROUND_Y, scroll: 1, depth: 5.4, originY: 1 },
      { key: 'pine', x: 860, y: GROUND_Y + 6, scroll: 0.55, depth: 4.2, originY: 1 },
    ]
    for (const item of starters) {
      const prop = this.add.image(item.x, item.y, item.key).setOrigin(0.5, item.originY).setDepth(item.depth)
      prop.setData('scroll', item.scroll)
      this.props.add(prop)
    }
  }

  private spawnProp() {
    const options = [
      { key: 'cloud', y: 120, scroll: 0.15, depth: 2, originY: 0.5 },
      { key: 'bird', y: 150, scroll: 0.7, depth: 4, originY: 0.5 },
      { key: 'tower', y: 300, scroll: 0.22, depth: 3, originY: 1 },
      { key: 'pine', y: GROUND_Y + 6, scroll: 0.55, depth: 4.2, originY: 1 },
      { key: 'shrine', y: GROUND_Y + 4, scroll: 0.62, depth: 4.4, originY: 1 },
      { key: 'lantern', y: GROUND_Y, scroll: 1, depth: 5.4, originY: 1 },
      { key: 'banner', y: GROUND_Y, scroll: 1, depth: 5.4, originY: 1 },
      { key: 'rock', y: GROUND_Y + 2, scroll: 1, depth: 5.5, originY: 1 },
    ]
    let pick = options[Math.floor(Math.random() * options.length)]
    if (pick.key === this.lastProp) pick = options[(options.indexOf(pick) + 3) % options.length]
    this.lastProp = pick.key
    const prop = this.add
      .image(1080, pick.y, pick.key)
      .setOrigin(0.5, pick.originY)
      .setDepth(pick.depth)
    prop.setData('scroll', pick.scroll)
    this.props.add(prop)
    this.propIn = Phaser.Math.Between(380, 860)
  }

  private pushProps(dt: number) {
    for (const child of this.props.getChildren()) {
      const prop = child as Phaser.GameObjects.Image
      const factor = prop.getData('scroll') as number
      prop.x -= (this.speed * factor * dt) / 1000
      if (prop.x < -200) prop.destroy()
    }
  }

  private scroll(dt: number) {
    const px = (this.speed * dt) / 1000
    this.stars.tilePositionX += px * 0.06
    this.far.tilePositionX += px * 0.2
    this.near.tilePositionX += px * 0.45
    this.groundTile.tilePositionX += px
  }

  private pushMovers(dt: number) {
    const step = (group: Phaser.Physics.Arcade.Group) => {
      for (const child of group.getChildren()) {
        const sprite = child as Phaser.Physics.Arcade.Sprite
        sprite.setVelocityX(-this.speed)
        if (sprite.getData('kind') === 'coin') sprite.angle += dt * 0.18
        if (sprite.x < -160) sprite.destroy()
      }
    }
    step(this.hazards)
    step(this.coins)
  }

  private spawnNext() {
    if (!this.intro) {
      this.intro = true
      this.spawnCoin(false)
      this.spawnIn = 650
      return
    }

    const roll = Math.random()
    const kind: 'spike' | 'beam' | 'coin' = roll < 0.14 ? 'coin' : roll < 0.44 ? 'beam' : 'spike'
    const t = Phaser.Math.Clamp(this.distance / 8000, 0, 1)
    let gap = Phaser.Math.Linear(430, 320, t)
    if (kind === 'beam' && this.lastHazard === 'spike') gap = Phaser.Math.Linear(280, 230, t)
    else if (kind === 'spike' && this.lastHazard === 'beam') gap += 180
    this.spawnIn = (gap / this.speed) * 1000

    if (kind === 'coin') {
      this.spawnCoin(Math.random() < 0.6)
      return
    }

    this.lastHazard = kind
    if (kind === 'spike') this.spawnSpike()
    else this.spawnBeam()
  }

  private prepare(sprite: Phaser.Physics.Arcade.Sprite, width: number, height: number, ox: number, oy: number) {
    sprite.setImmovable(true)
    sprite.setDepth(7)
    const body = sprite.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(width, height, false)
    body.setOffset(ox, oy)
    sprite.setVelocityX(-this.speed)
  }

  private spawnSpike() {
    const spike = this.hazards.create(1040, GROUND_Y, 'spike') as Phaser.Physics.Arcade.Sprite
    spike.setOrigin(0.5, 1)
    this.prepare(spike, 24, 56, 16, 12)
  }

  private spawnBeam() {
    const beam = this.hazards.create(1080, 430, 'beam') as Phaser.Physics.Arcade.Sprite
    beam.setOrigin(0.5, 1)
    this.prepare(beam, 118, 62, 11, 22)
  }

  private spawnCoin(high: boolean) {
    const coin = this.coins.create(1040, high ? 340 : 418, 'coin') as Phaser.Physics.Arcade.Sprite
    coin.setData('kind', 'coin')
    this.prepare(coin, 22, 22, 7, 7)
  }

  private collect(coin: Phaser.Physics.Arcade.Sprite) {
    if (!coin.active || this.over) return
    const x = coin.x
    const y = coin.y
    coin.destroy()
    this.bonus += 50
    this.syncScore()
    blip(860, 0.09, 0.035, 'sine')
    const label = this.add
      .text(x, y, '+50', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '20px',
        color: '#ffe7b0',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(9)
    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 420,
      onComplete: () => label.destroy(),
    })
  }

  private syncScore() {
    const next = Math.floor(this.distance / 12) + this.bonus
    if (next === this.score) return
    this.score = next
    emitScore(this.score)
  }

  private die() {
    if (this.over) return
    this.over = true
    this.ducking = false
    this.diving = false
    this.runner.step(80, this.speed, 'jump', false)
    redrawLiveRunner(this, this.runner.displayed)
    this.player.setVelocityY(-280)
    this.tweens.add({ targets: this.player, angle: -70, duration: 380 })
    this.cameras.main.shake(160, 0.006)
    blip(90, 0.28, 0.05, 'sawtooth')
    const flash = this.add.rectangle(480, 270, 960, 540, 0xff3358, 0.28).setDepth(20)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 260,
      onComplete: () => flash.destroy(),
    })
    this.time.delayedCall(480, () => emitOver(this.score))
  }

  private streak() {
    const y = Phaser.Math.Between(30, 280)
    const line = this.add
      .rectangle(1000, y, Phaser.Math.Between(36, 90), 2, 0xffe6d4, 0.28)
      .setDepth(3)
    this.tweens.add({
      targets: line,
      x: -80,
      duration: 380,
      onComplete: () => line.destroy(),
    })
  }
}
