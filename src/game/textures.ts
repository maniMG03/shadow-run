import Phaser from 'phaser'

type Pt = [number, number]
export type XY = [number, number]

function sheet(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a drawing surface')
  return { canvas, ctx }
}

function add(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  scene.textures.addCanvas(key, canvas)
}

const INK = '#000000'

export type Rig = {
  hood: XY
  shoulder: XY
  hip: XY
  lElbow: XY
  lHand: XY
  rElbow: XY
  rHand: XY
  lKnee: XY
  lFoot: XY
  rKnee: XY
  rFoot: XY
  scarf: [XY, XY, XY]
  lead: 'left' | 'right'
}

function capsule(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, r: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const ang = Math.atan2(dy, dx)
  ctx.beginPath()
  ctx.arc(x1, y1, r, ang + Math.PI / 2, ang - Math.PI / 2)
  ctx.arc(x2, y2, r, ang - Math.PI / 2, ang + Math.PI / 2)
  ctx.closePath()
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

function paintShape(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK
  ctx.fill()
}

function arm(ctx: CanvasRenderingContext2D, shoulder: XY, elbow: XY, hand: XY) {
  capsule(ctx, shoulder[0], shoulder[1], elbow[0], elbow[1], 7)
  paintShape(ctx)
  capsule(ctx, elbow[0], elbow[1], hand[0], hand[1], 5.5)
  paintShape(ctx)
  blob(ctx, hand[0], hand[1], 5, 5)
  paintShape(ctx)
}

function paw(ctx: CanvasRenderingContext2D, knee: XY, foot: XY) {
  const dir = foot[0] >= knee[0] ? 1 : -1
  ctx.beginPath()
  ctx.ellipse(foot[0] + dir * 8, foot[1] - 2, 10, 3.2, dir * 0.12, 0, Math.PI * 2)
  paintShape(ctx)
}

function leg(ctx: CanvasRenderingContext2D, hip: XY, knee: XY, foot: XY) {
  capsule(ctx, hip[0], hip[1], knee[0], knee[1], 6.5)
  paintShape(ctx)
  capsule(ctx, knee[0], knee[1], foot[0], foot[1], 5.2)
  paintShape(ctx)
  paw(ctx, knee, foot)
}

function scarf(ctx: CanvasRenderingContext2D, a: XY, b: XY, c: XY) {
  ctx.beginPath()
  ctx.moveTo(a[0], a[1] - 6)
  ctx.quadraticCurveTo(b[0], b[1] - 10, c[0], c[1] - 4)
  ctx.lineTo(c[0] + 6, c[1] + 10)
  ctx.quadraticCurveTo(b[0] + 4, b[1] + 8, a[0], a[1] + 8)
  ctx.closePath()
  paintShape(ctx)
}

function hood(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x + 14, y + 6)
  ctx.quadraticCurveTo(x + 18, y - 4, x + 6, y - 16)
  ctx.quadraticCurveTo(x - 8, y - 20, x - 16, y - 6)
  ctx.quadraticCurveTo(x - 20, y + 8, x - 6, y + 14)
  ctx.quadraticCurveTo(x + 10, y + 16, x + 14, y + 6)
  ctx.closePath()
  paintShape(ctx)
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#fff4e6'
  ctx.beginPath()
  ctx.moveTo(x, y + 2)
  ctx.lineTo(x + 12, y - 1)
  ctx.lineTo(x + 11, y + 3)
  ctx.lineTo(x + 1, y + 5)
  ctx.closePath()
  ctx.fill()
}

export function paintRig(ctx: CanvasRenderingContext2D, rig: Rig) {
  scarf(ctx, rig.scarf[0], rig.scarf[1], rig.scarf[2])
  const backFirst = rig.lead === 'right'
  if (backFirst) {
    arm(ctx, rig.shoulder, rig.lElbow, rig.lHand)
    leg(ctx, rig.hip, rig.lKnee, rig.lFoot)
  } else {
    arm(ctx, rig.shoulder, rig.rElbow, rig.rHand)
    leg(ctx, rig.hip, rig.rKnee, rig.rFoot)
  }
  capsule(ctx, rig.shoulder[0], rig.shoulder[1], rig.hip[0], rig.hip[1], 11)
  paintShape(ctx)
  blob(ctx, rig.shoulder[0] + 1, rig.shoulder[1] + 6, 12, 10)
  paintShape(ctx)
  if (backFirst) {
    leg(ctx, rig.hip, rig.rKnee, rig.rFoot)
    arm(ctx, rig.shoulder, rig.rElbow, rig.rHand)
  } else {
    leg(ctx, rig.hip, rig.lKnee, rig.lFoot)
    arm(ctx, rig.shoulder, rig.lElbow, rig.lHand)
  }
  hood(ctx, rig.hood[0], rig.hood[1])
  eye(ctx, rig.hood[0] + 4, rig.hood[1] - 2)
}

export const RUNNER_KEY = 'runner-live'
export const RUNNER_W = 160
export const RUNNER_H = 200

let live: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null

export function createLiveRunner(scene: Phaser.Scene) {
  const { canvas, ctx } = sheet(RUNNER_W, RUNNER_H)
  live = { canvas, ctx }
  add(scene, RUNNER_KEY, canvas)
}

export function redrawLiveRunner(scene: Phaser.Scene, rig: Rig) {
  if (!live) return
  live.ctx.clearRect(0, 0, RUNNER_W, RUNNER_H)
  paintRig(live.ctx, rig)
  const tex = scene.textures.get(RUNNER_KEY)
  if ('refresh' in tex) (tex as Phaser.Textures.CanvasTexture).refresh()
}

function drawSpike() {
  const { canvas, ctx } = sheet(56, 72)
  const tooth = (inset: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(28, 6 + inset)
    ctx.lineTo(8 + inset, 68)
    ctx.lineTo(48 - inset, 68)
    ctx.closePath()
    ctx.fill()
  }
  tooth(0, '#ffbfa0')
  tooth(5, '#140c10')
  return canvas
}

function drawBeam() {
  const { canvas, ctx } = sheet(140, 104)
  round(ctx, 2, 22, 136, 62, 10, '#ffbfa0')
  round(ctx, 7, 27, 126, 52, 8, '#140c10')
  ctx.fillStyle = '#ffbfa0'
  for (let i = 0; i < 5; i += 1) {
    const x = 18 + i * 22
    ctx.beginPath()
    ctx.moveTo(x, 26)
    ctx.lineTo(x + 8, 6)
    ctx.lineTo(x + 16, 26)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, 78)
    ctx.lineTo(x + 8, 98)
    ctx.lineTo(x + 16, 78)
    ctx.closePath()
    ctx.fill()
  }
  return canvas
}

function round(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function drawCoin() {
  const { canvas, ctx } = sheet(36, 36)
  const glow = ctx.createRadialGradient(18, 18, 4, 18, 18, 16)
  glow.addColorStop(0, '#fff6d2')
  glow.addColorStop(1, '#e39a3a')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(18, 18, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fff1c4'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(18, 18, 8, 0, Math.PI * 2)
  ctx.stroke()
  return canvas
}

function drawStars() {
  const { canvas, ctx } = sheet(640, 540)
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 97) % 640
    const y = (i * 53) % 280
    const big = i % 7 === 0
    ctx.fillStyle = `rgba(255, 246, 230, ${0.35 + (i % 5) * 0.12})`
    if (big) {
      ctx.fillRect(x, y, 2, 2)
      ctx.fillRect(x - 2, y, 6, 1)
      ctx.fillRect(x, y - 2, 1, 6)
    } else {
      ctx.fillRect(x, y, 1, 1)
    }
  }
  return canvas
}

function skyline(ctx: CanvasRenderingContext2D, base: number, amp: number, color: string) {
  const width = ctx.canvas.width
  const heightAt = (x: number) =>
    base -
    Math.sin((x / width) * Math.PI * 4) * amp -
    Math.sin((x / width) * Math.PI * 2) * amp * 0.55
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, ctx.canvas.height)
  ctx.lineTo(0, heightAt(0))
  for (let x = 16; x <= width; x += 16) ctx.lineTo(x, heightAt(x))
  ctx.lineTo(width, ctx.canvas.height)
  ctx.closePath()
  ctx.fill()
}

function pagoda(ctx: CanvasRenderingContext2D, x: number, base: number, color: string) {
  ctx.fillStyle = color
  const roofs = [46, 34, 22]
  roofs.forEach((half, i) => {
    const y = base - 28 - i * 28
    ctx.beginPath()
    ctx.moveTo(x, y - 16)
    ctx.lineTo(x + half, y)
    ctx.lineTo(x - half, y)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(x - 6, y, 12, 26)
  })
}

function drawRidge() {
  const { canvas, ctx } = sheet(1600, 240)
  skyline(ctx, 168, 52, '#5a3b68')
  ctx.fillStyle = '#4a3058'
  ctx.beginPath()
  ctx.moveTo(180, 150)
  ctx.lineTo(230, 70)
  ctx.lineTo(280, 150)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(860, 160)
  ctx.lineTo(980, 36)
  ctx.lineTo(1100, 160)
  ctx.fill()
  pagoda(ctx, 520, 168, '#3d274c')
  ctx.fillStyle = '#3d274c'
  ctx.fillRect(1240, 78, 18, 90)
  ctx.fillRect(1216, 86, 66, 10)
  ctx.beginPath()
  ctx.moveTo(1249, 48)
  ctx.lineTo(1272, 86)
  ctx.lineTo(1226, 86)
  ctx.fill()
  return canvas
}

function tree(ctx: CanvasRenderingContext2D, x: number, ground: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x - 3, ground - h * 0.42, 6, h * 0.42)
  for (let i = 0; i < 3; i += 1) {
    const y = ground - h * (0.28 + i * 0.2)
    const half = 24 - i * 6
    ctx.beginPath()
    ctx.moveTo(x, y - 26)
    ctx.lineTo(x + half, y + 8)
    ctx.lineTo(x - half, y + 8)
    ctx.closePath()
    ctx.fill()
  }
}

function drawHills() {
  const { canvas, ctx } = sheet(1500, 190)
  skyline(ctx, 132, 36, '#4a3358')
  tree(ctx, 120, 150, 92, '#3a2744')
  tree(ctx, 340, 156, 70, '#3a2744')
  tree(ctx, 760, 148, 110, '#32203c')
  tree(ctx, 1040, 158, 64, '#3a2744')
  tree(ctx, 1320, 150, 96, '#32203c')
  ctx.fillStyle = '#3a2744'
  ctx.fillRect(560, 96, 70, 54)
  ctx.beginPath()
  ctx.moveTo(548, 100)
  ctx.lineTo(595, 62)
  ctx.lineTo(642, 100)
  ctx.fill()
  ctx.fillRect(590, 118, 12, 22)
  return canvas
}

function drawGround() {
  const { canvas, ctx } = sheet(960, 72)
  ctx.fillStyle = '#161018'
  ctx.fillRect(0, 0, 960, 72)
  ctx.fillStyle = '#ffc7a8'
  ctx.fillRect(0, 0, 960, 3)
  const bands: [number, number, string][] = [
    [0, 220, '#221628'],
    [220, 80, '#2a1a22'],
    [300, 260, '#1a121c'],
    [560, 120, '#321c28'],
    [680, 280, '#1c141e'],
  ]
  for (const [x, w, color] of bands) {
    ctx.fillStyle = color
    ctx.fillRect(x, 16, w, 56)
  }
  ctx.fillStyle = '#3a2434'
  for (let x = 24; x < 960; x += 46) {
    ctx.fillRect(x, 28, 10, 6)
    ctx.fillRect(x + 18, 46, 16, 5)
  }
  ctx.fillStyle = 'rgba(255, 199, 168, 0.35)'
  ctx.fillRect(560, 8, 120, 2)
  return canvas
}

function drawMoon() {
  const { canvas, ctx } = sheet(200, 200)
  const glow = ctx.createRadialGradient(100, 100, 36, 100, 100, 96)
  glow.addColorStop(0, 'rgba(255, 236, 196, 0.45)')
  glow.addColorStop(1, 'rgba(255, 236, 196, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(100, 100, 96, 0, Math.PI * 2)
  ctx.fill()

  const disc = ctx.createRadialGradient(78, 82, 8, 100, 100, 58)
  disc.addColorStop(0, '#fffdf8')
  disc.addColorStop(0.45, '#f4e2b4')
  disc.addColorStop(1, '#c9a56a')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(100, 100, 52, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(150, 112, 62, 0.28)'
  const craters: Pt[] = [
    [78, 92],
    [112, 108],
    [96, 126],
    [124, 84],
    [70, 118],
    [108, 74],
  ]
  const radii = [8, 11, 5, 4, 3, 6]
  craters.forEach(([x, y], i) => {
    ctx.beginPath()
    ctx.arc(x, y, radii[i], 0, Math.PI * 2)
    ctx.fill()
  })
  return canvas
}

function drawHalo() {
  const { canvas, ctx } = sheet(160, 180)
  const glow = ctx.createRadialGradient(80, 96, 8, 80, 96, 64)
  glow.addColorStop(0, 'rgba(255, 224, 186, 0.32)')
  glow.addColorStop(0.4, 'rgba(255, 210, 168, 0.12)')
  glow.addColorStop(1, 'rgba(255, 210, 168, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 160, 180)
  return canvas
}

function drawPine() {
  const { canvas, ctx } = sheet(70, 130)
  tree(ctx, 35, 128, 118, '#3a2744')
  return canvas
}

function drawLantern() {
  const { canvas, ctx } = sheet(36, 96)
  ctx.fillStyle = '#4a3050'
  ctx.fillRect(16, 28, 4, 68)
  ctx.fillStyle = '#ffb15a'
  round(ctx, 6, 8, 24, 28, 4, '#ffb15a')
  ctx.fillStyle = '#fff1c8'
  ctx.fillRect(14, 16, 8, 12)
  ctx.fillStyle = '#4a3050'
  ctx.fillRect(10, 6, 16, 4)
  return canvas
}

function drawRock() {
  const { canvas, ctx } = sheet(64, 36)
  ctx.fillStyle = '#3a2836'
  ctx.beginPath()
  ctx.moveTo(4, 32)
  ctx.lineTo(14, 16)
  ctx.lineTo(28, 8)
  ctx.lineTo(48, 14)
  ctx.lineTo(60, 32)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#3a2832'
  ctx.fillRect(22, 18, 10, 4)
  return canvas
}

function drawShrine() {
  const { canvas, ctx } = sheet(120, 150)
  ctx.fillStyle = '#3a2438'
  ctx.fillRect(16, 36, 10, 114)
  ctx.fillRect(94, 36, 10, 114)
  ctx.fillStyle = '#4a3050'
  ctx.beginPath()
  ctx.moveTo(4, 40)
  ctx.lineTo(60, 18)
  ctx.lineTo(116, 40)
  ctx.lineTo(108, 52)
  ctx.lineTo(60, 34)
  ctx.lineTo(12, 52)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(18, 56, 84, 8)
  return canvas
}

function drawTower() {
  const { canvas, ctx } = sheet(90, 170)
  pagoda(ctx, 45, 168, '#4a3060')
  return canvas
}

function drawCloud() {
  const { canvas, ctx } = sheet(150, 48)
  ctx.fillStyle = 'rgba(255, 214, 186, 0.16)'
  ctx.beginPath()
  ctx.ellipse(40, 28, 28, 14, 0, 0, Math.PI * 2)
  ctx.ellipse(78, 24, 36, 16, 0, 0, Math.PI * 2)
  ctx.ellipse(112, 30, 24, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

function drawBanner() {
  const { canvas, ctx } = sheet(28, 88)
  ctx.fillStyle = '#4a3050'
  ctx.fillRect(4, 0, 4, 88)
  ctx.fillStyle = '#6a2438'
  ctx.beginPath()
  ctx.moveTo(8, 8)
  ctx.lineTo(26, 18)
  ctx.lineTo(8, 36)
  ctx.fill()
  return canvas
}

function drawBird() {
  const { canvas, ctx } = sheet(28, 14)
  ctx.strokeStyle = '#1a1018'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(2, 10)
  ctx.lineTo(10, 4)
  ctx.lineTo(14, 8)
  ctx.lineTo(18, 4)
  ctx.lineTo(26, 10)
  ctx.stroke()
  return canvas
}

export function paintTextures(scene: Phaser.Scene) {
  createLiveRunner(scene)
  add(scene, 'spike', drawSpike())
  add(scene, 'beam', drawBeam())
  add(scene, 'coin', drawCoin())
  add(scene, 'stars', drawStars())
  add(scene, 'ridge', drawRidge())
  add(scene, 'hills', drawHills())
  add(scene, 'ground', drawGround())
  add(scene, 'moon', drawMoon())
  add(scene, 'pine', drawPine())
  add(scene, 'lantern', drawLantern())
  add(scene, 'rock', drawRock())
  add(scene, 'shrine', drawShrine())
  add(scene, 'tower', drawTower())
  add(scene, 'cloud', drawCloud())
  add(scene, 'banner', drawBanner())
  add(scene, 'bird', drawBird())
  add(scene, 'halo', drawHalo())
}
