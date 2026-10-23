let ctx: AudioContext | null = null
let muted = false
let musicGain: GainNode | null = null
let musicTimer: number | null = null
let step = 0

const MELODY = [440, 0, 523, 0, 659, 587, 523, 0, 440, 0, 392, 0, 349, 392, 440, 0]
const BASS = [110, 110, 131, 98]

function context() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function musicOut() {
  const audio = context()
  if (!musicGain) {
    musicGain = audio.createGain()
    musicGain.gain.value = muted ? 0 : 1
    musicGain.connect(audio.destination)
  }
  return musicGain
}

export function unlockAudio() {
  context()
}

export function setMuted(next: boolean) {
  muted = next
  if (!musicGain || !ctx) return
  const now = ctx.currentTime
  musicGain.gain.cancelScheduledValues(now)
  musicGain.gain.setValueAtTime(next ? 0 : 1, now)
}

export function startMusic() {
  unlockAudio()
  if (musicTimer !== null) return
  step = 0
  musicPulse()
  musicTimer = window.setInterval(musicPulse, 150)
}

function musicPulse() {
  if (muted) {
    step += 1
    return
  }
  const audio = context()
  const index = step % MELODY.length
  const tone = MELODY[index]
  if (tone > 0) toneAt(tone, 0.16, 0.045, 'triangle')
  if (index % 4 === 0) toneAt(BASS[Math.floor(index / 4) % BASS.length], 0.28, 0.07, 'sine')
  if (index % 8 === 0) {
    const kick = audio.createOscillator()
    const kickGain = audio.createGain()
    kick.frequency.setValueAtTime(150, audio.currentTime)
    kick.frequency.exponentialRampToValueAtTime(48, audio.currentTime + 0.12)
    kickGain.gain.setValueAtTime(0.12, audio.currentTime)
    kickGain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.16)
    kick.connect(kickGain)
    kickGain.connect(musicOut())
    kick.start()
    kick.stop(audio.currentTime + 0.16)
  }
  if (index % 2 === 1) hat()
  step += 1
}

function toneAt(freq: number, dur: number, volume: number, type: OscillatorType) {
  const audio = context()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime)
  gain.gain.setValueAtTime(volume, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur)
  osc.connect(gain)
  gain.connect(musicOut())
  osc.start()
  osc.stop(audio.currentTime + dur)
}

function hat() {
  const audio = context()
  const count = Math.floor(audio.sampleRate * 0.03)
  const buffer = audio.createBuffer(1, count, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  const source = audio.createBufferSource()
  source.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 6000
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.02, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.03)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(musicOut())
  source.start()
}

export function blip(
  freq: number,
  dur: number,
  volume = 0.04,
  type: OscillatorType = 'sine',
) {
  if (muted) return
  const audio = context()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime)
  gain.gain.setValueAtTime(volume, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + dur)
}
