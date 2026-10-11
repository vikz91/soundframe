import type { AudioSamples } from './audio-analysis'

export type Visualisation = 'spectrum' | 'orbit' | 'electric'

export type VisualisationFrame = { time: number; randomness: number; seed: number; audio: AudioSamples | null }

// Interpolated seeded noise varies smoothly instead of flickering independently each frame.
function noise(index: number, time: number, seed: number) {
  const step = Math.floor(time)
  const fraction = time - step
  const smooth = fraction * fraction * (3 - 2 * fraction)
  const hash = (tick: number) => {
    const value = Math.sin(index * 127.1 + tick * 311.7 + seed * 74.7) * 43758.5453
    return value - Math.floor(value)
  }
  return hash(step) * (1 - smooth) + hash(step + 1) * smooth
}

function frequency(samples: AudioSamples, index: number, count: number) {
  const bin = Math.min(samples.frequency.length - 1, Math.floor(2 ** ((index / (count - 1)) * 8)))
  return samples.frequency[bin] / 255
}

export function drawVisualisation(ctx: CanvasRenderingContext2D, style: Visualisation, frame: VisualisationFrame) {
  const { time, randomness, seed, audio } = frame
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#071b24'
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2)
  glow.addColorStop(0, style === 'electric' ? '#243443' : '#0b3a41')
  glow.addColorStop(1, '#071b24')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = '#ffffff08'
  ctx.lineWidth = 1
  for (let x = 24; x < width; x += 32) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 16; y < height; y += 32) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.save()
  ctx.shadowBlur = 16
  ctx.shadowColor = '#65e1c8'
  if (style === 'spectrum') {
    const gradient = ctx.createLinearGradient(0, 70, 0, 245)
    gradient.addColorStop(0, '#bfffd7')
    gradient.addColorStop(1, '#36b4c1')
    ctx.fillStyle = gradient
    for (let i = 0; i < 36; i++) {
      const envelope = Math.sin((i / 35) * Math.PI)
      const variation = (noise(i, time * 2, seed) - 0.5) * randomness * 0.65
      const signal = audio ? frequency(audio, i, 36) : 0.35 + Math.sin(time * 2 + i * 0.42) * 0.25
      const barHeight = 12 + Math.max(0, Math.min(1, signal + variation)) * (audio ? 170 : 155 * envelope)
      const x = 49 + i * 13
      ctx.beginPath()
      ctx.roundRect(x, 230 - barHeight, 7, barHeight, 4)
      ctx.fill()
      ctx.globalAlpha = 0.18
      ctx.fillRect(x, 239, 7, barHeight * 0.25)
      ctx.globalAlpha = 1
    }
  } else if (style === 'orbit') {
    const cx = width / 2
    const cy = height / 2
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2 + time * 0.15
      const variation = (noise(i, time * 1.7, seed) - 0.5) * randomness * 0.65
      const signal = audio ? frequency(audio, Math.abs(44 - i), 46) : 0.4 + Math.sin(i * 0.32 - time * 2) * 0.3
      const length = 7 + Math.max(0, Math.min(1, signal + variation)) * 47
      ctx.strokeStyle = i % 3 === 0 ? '#d4ffd5' : '#64dbcb'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(angle) * 76, cy + Math.sin(angle) * 76)
      ctx.lineTo(cx + Math.cos(angle) * (76 + length), cy + Math.sin(angle) * (76 + length))
      ctx.stroke()
    }
    ctx.shadowBlur = 0
    ctx.fillStyle = '#102c35'
    ctx.beginPath()
    ctx.arc(cx, cy, 58, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#72e3cc55'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#d9f6ed'
    ctx.textAlign = 'center'
    ctx.font = '12px sans-serif'
    ctx.fillText('AUDIOFRAME', cx, cy + 4)
  } else {
    const points = Array.from({ length: 81 }, (_, i) => {
      const envelope = Math.sin((i / 80) * Math.PI) ** 2
      const variation = (noise(i, time * 4, seed) - 0.5) * randomness * 0.7
      const signal = audio
        ? (audio.waveform[Math.floor((i / 80) * (audio.waveform.length - 1))] - 128) / 128
        : Math.sin(i * 0.42 - time * 3) * 0.35 + Math.sin(i * 0.16 + time * 2) * 0.2
      return [38 + i * 6.15, height / 2 + envelope * Math.max(-1, Math.min(1, signal + variation)) * 115]
    })
    for (const [lineWidth, color, blur] of [
      [12, '#6899ff22', 24],
      [4, '#91baff', 14],
      [1.5, '#e9f6ff', 4]
    ] as const) {
      ctx.beginPath()
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = color
      ctx.shadowColor = '#80b6ff'
      ctx.shadowBlur = blur
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.stroke()
    }
  }
  ctx.restore()
}
