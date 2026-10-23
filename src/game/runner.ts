import type { Rig, XY } from './textures.ts'

export type PoseName = 'run' | 'jump' | 'duck' | 'dive'

const GROUND = 196
const THIGH = 52
const SHIN = 44
const UPPER = 26
const FORE = 24
const DUTY = 0.36
const SCALE = 0.5

function fract(value: number) {
  return value - Math.floor(value)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpXY(a: XY, b: XY, t: number): XY {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}

function smooth(t: number) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

function cloneRig(rig: Rig): Rig {
  return {
    hood: [...rig.hood],
    shoulder: [...rig.shoulder],
    hip: [...rig.hip],
    lElbow: [...rig.lElbow],
    lHand: [...rig.lHand],
    rElbow: [...rig.rElbow],
    rHand: [...rig.rHand],
    lKnee: [...rig.lKnee],
    lFoot: [...rig.lFoot],
    rKnee: [...rig.rKnee],
    rFoot: [...rig.rFoot],
    scarf: [[...rig.scarf[0]], [...rig.scarf[1]], [...rig.scarf[2]]],
    lead: rig.lead,
  }
}

function ik(origin: XY, target: XY, a: number, b: number, flip: number): XY {
  const dx = target[0] - origin[0]
  const dy = target[1] - origin[1]
  const reach = Math.max(8, Math.min(Math.hypot(dx, dy), a + b - 1.2))
  const ang = Math.atan2(dy, dx)
  const cos = Math.max(-1, Math.min(1, (a * a + reach * reach - b * b) / (2 * a * reach)))
  const extra = Math.acos(cos) * flip
  return [origin[0] + Math.cos(ang - extra) * a, origin[1] + Math.sin(ang - extra) * a]
}

export function lerpRig(a: Rig, b: Rig, t: number): Rig {
  const k = smooth(t)
  return {
    hood: lerpXY(a.hood, b.hood, k),
    shoulder: lerpXY(a.shoulder, b.shoulder, k),
    hip: lerpXY(a.hip, b.hip, k),
    lElbow: lerpXY(a.lElbow, b.lElbow, k),
    lHand: lerpXY(a.lHand, b.lHand, k),
    rElbow: lerpXY(a.rElbow, b.rElbow, k),
    rHand: lerpXY(a.rHand, b.rHand, k),
    lKnee: lerpXY(a.lKnee, b.lKnee, k),
    lFoot: lerpXY(a.lFoot, b.lFoot, k),
    rKnee: lerpXY(a.rKnee, b.rKnee, k),
    rFoot: lerpXY(a.rFoot, b.rFoot, k),
    scarf: [lerpXY(a.scarf[0], b.scarf[0], k), lerpXY(a.scarf[1], b.scarf[1], k), lerpXY(a.scarf[2], b.scarf[2], k)],
    lead: k > 0.5 ? b.lead : a.lead,
  }
}

function hasteOf(speed: number) {
  return Math.max(0, Math.min(1, (speed - 280) / 240))
}

function strideOf(speed: number) {
  return 72 + hasteOf(speed) * 8
}

function footAt(phase: number, hipX: number, stride: number, lift: number): XY {
  const p = fract(phase)
  if (p < DUTY) {
    const t = p / DUTY
    return [hipX + stride * 0.42 - t * stride, GROUND]
  }
  const t = (p - DUTY) / (1 - DUTY)
  const back = hipX - stride * 0.58
  const front = hipX + stride * 0.48
  const x = back + t * (front - back)
  const y = GROUND - Math.sin(t * Math.PI) * lift - (1 - t) * 10
  return [x, y]
}

export function gaitRig(phase: number, speed: number, scarf: [XY, XY, XY], landDip = 0): Rig {
  const haste = hasteOf(speed)
  const stride = strideOf(speed)
  const lift = 44 + haste * 6
  const lean = 6 + haste * 3
  const bob = 2.2 * Math.abs(Math.cos(phase * Math.PI * 2))

  const hip: XY = [80, 100 + bob + landDip * 2]
  const shoulder: XY = [hip[0] + lean, 48 + bob * 0.25 + landDip]
  const hood: XY = [shoulder[0] + 8, 28 + bob * 0.08 + landDip * 0.4]
  const hipFoot: XY = [hip[0] + 1, hip[1]]

  const rFoot = footAt(phase, hip[0] + 4, stride, lift)
  const lFoot = footAt(phase + 0.5, hip[0] + 4, stride, lift)
  const rKnee = ik(hipFoot, rFoot, THIGH, SHIN, 1)
  const lKnee = ik(hipFoot, lFoot, THIGH, SHIN, 1)

  const swing = Math.cos(phase * Math.PI * 2)
  const lHand: XY = [shoulder[0] + 18 + swing * 28, shoulder[1] + 16 - swing * 20]
  const rHand: XY = [shoulder[0] + 18 - swing * 28, shoulder[1] + 16 + swing * 20]
  const lElbow = ik(shoulder, lHand, UPPER, FORE, 1)
  const rElbow = ik(shoulder, rHand, UPPER, FORE, 1)

  return {
    hood,
    shoulder,
    hip,
    lElbow,
    lHand,
    rElbow,
    rHand,
    lKnee,
    lFoot,
    rKnee,
    rFoot,
    scarf,
    lead: rFoot[0] >= lFoot[0] ? 'right' : 'left',
  }
}

export const POSES: Record<'jump' | 'duck' | 'dive' | 'land', Rig> = {
  jump: {
    hood: [106, 38],
    shoulder: [94, 60],
    hip: [82, 112],
    lElbow: [72, 52],
    lHand: [54, 38],
    rElbow: [122, 78],
    rHand: [142, 64],
    lKnee: [56, 154],
    lFoot: [42, 184],
    rKnee: [120, 142],
    rFoot: [138, 164],
    scarf: [
      [84, 56],
      [48, 42],
      [20, 28],
    ],
    lead: 'right',
  },
  duck: {
    hood: [104, 128],
    shoulder: [92, 144],
    hip: [82, 166],
    lElbow: [70, 156],
    lHand: [56, 168],
    rElbow: [116, 150],
    rHand: [132, 158],
    lKnee: [62, 182],
    lFoot: [48, 196],
    rKnee: [108, 180],
    rFoot: [118, 196],
    scarf: [
      [80, 138],
      [50, 132],
      [24, 140],
    ],
    lead: 'right',
  },
  dive: {
    hood: [96, 108],
    shoulder: [88, 128],
    hip: [84, 158],
    lElbow: [70, 150],
    lHand: [56, 168],
    rElbow: [112, 118],
    rHand: [124, 100],
    lKnee: [64, 178],
    lFoot: [50, 196],
    rKnee: [106, 176],
    rFoot: [118, 196],
    scarf: [
      [78, 118],
      [52, 92],
      [28, 72],
    ],
    lead: 'right',
  },
  land: {
    hood: [102, 38],
    shoulder: [92, 60],
    hip: [80, 112],
    lElbow: [70, 82],
    lHand: [52, 98],
    rElbow: [118, 74],
    rHand: [136, 62],
    lKnee: [62, 162],
    lFoot: [50, 196],
    rKnee: [104, 158],
    rFoot: [118, 196],
    scarf: [
      [84, 52],
      [50, 46],
      [20, 56],
    ],
    lead: 'right',
  },
}

export class RunnerAnim {
  phase = 0
  pose: PoseName = 'run'
  blend = 1
  blendMs = 110
  from: Rig
  displayed: Rig
  land = 0
  airborne = false
  scarf: [XY, XY, XY] = [
    [84, 42],
    [48, 40],
    [16, 52],
  ]

  constructor() {
    this.displayed = gaitRig(0, 280, this.scarf)
    this.from = cloneRig(this.displayed)
  }

  step(dt: number, speed: number, pose: PoseName, onGround: boolean): { rig: Rig; planted: boolean } {
    if (pose !== this.pose) {
      this.from = cloneRig(this.displayed)
      this.pose = pose
      this.blend = 0
      this.blendMs = pose === 'dive' ? 80 : pose === 'duck' ? 90 : 110
      if (pose === 'run' && this.airborne) this.land = 1
    }
    this.airborne = !onGround

    const prev = this.phase
    if (onGround && pose === 'run') {
      const strideWorld = strideOf(speed) * SCALE
      this.phase += ((speed * dt) / 1000) / (2 * strideWorld)
    }
    this.phase = fract(this.phase)
    this.land = Math.max(0, this.land - dt / 120)
    this.blend = Math.min(1, this.blend + dt / this.blendMs)
    this.updateScarf(dt, pose)

    let target = this.poseTarget(speed)
    if (this.blend < 1) target = lerpRig(this.from, target, this.blend)
    target.scarf = this.scarf
    this.displayed = target

    const planted =
      onGround &&
      pose === 'run' &&
      ((prev > 0.88 && this.phase < 0.12) || (prev < 0.5 && this.phase >= 0.5))

    return { rig: this.displayed, planted }
  }

  private poseTarget(speed: number): Rig {
    if (this.pose === 'jump') return POSES.jump
    if (this.pose === 'duck') return POSES.duck
    if (this.pose === 'dive') return POSES.dive
    const run = gaitRig(this.phase, speed, this.scarf, this.land)
    if (this.land > 0) return lerpRig(POSES.land, run, 1 - this.land)
    return run
  }

  private updateScarf(dt: number, pose: PoseName) {
    const follow = pose === 'run' ? this.displayed.hood : POSES[pose].hood
    const neck: XY = [follow[0] - 18, follow[1] + 10]
    const wave = Math.sin(this.phase * Math.PI * 8)
    const up = pose === 'dive' || pose === 'jump' ? -18 : 8
    const midTarget: XY = [neck[0] - 28, neck[1] + 2 + wave * 4]
    const tipTarget: XY = [neck[0] - 56, neck[1] + up + wave * 7]
    const k = 1 - Math.exp(-dt / 70)
    this.scarf = [
      lerpXY(this.scarf[0], neck, Math.min(1, k * 1.4)),
      lerpXY(this.scarf[1], midTarget, k),
      lerpXY(this.scarf[2], tipTarget, k * 0.7),
    ]
  }
}
