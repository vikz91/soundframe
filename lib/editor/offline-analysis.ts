import type { FrameAnalysis } from './composition'

export const analysisSampleRate = 22050
const size = 1024

/** Absolute-time FFT with no history: chunk boundaries and seeks cannot reset effects.
 * Reuses every working buffer. The soundtrack is decoded once to bounded mono PCM.
 */
export function createOfflineAnalysis(pcm: Float32Array) {
  const real = new Float64Array(size)
  const imaginary = new Float64Array(size)
  const frequency = new Uint8Array(size / 2)
  const waveform = new Uint8Array(size)
  const window = Float64Array.from(
    { length: size },
    (_, i) => 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / size) + 0.08 * Math.cos((4 * Math.PI * i) / size)
  )
  const samples: FrameAnalysis = { frequency, waveform }
  return (frameIndex: number) => {
    const start = Math.floor((frameIndex * analysisSampleRate) / 30) - size / 2
    imaginary.fill(0)
    for (let i = 0; i < size; i++) {
      const value = pcm[start + i] ?? 0
      waveform[i] = Math.max(0, Math.min(255, Math.round(128 + value * 128)))
      real[i] = value * window[i]
    }
    for (let i = 1, j = 0; i < size; i++) {
      let bit = size >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j ^= bit
      if (i < j) [real[i], real[j]] = [real[j], real[i]]
    }
    for (let length = 2; length <= size; length *= 2) {
      for (let offset = 0; offset < size; offset += length) {
        for (let j = 0; j < length / 2; j++) {
          const angle = (-2 * Math.PI * j) / length
          const right = offset + j + length / 2
          const left = offset + j
          const r = real[right] * Math.cos(angle) - imaginary[right] * Math.sin(angle)
          const im = real[right] * Math.sin(angle) + imaginary[right] * Math.cos(angle)
          real[right] = real[left] - r
          imaginary[right] = imaginary[left] - im
          real[left] += r
          imaginary[left] += im
        }
      }
    }
    for (let i = 0; i < frequency.length; i++) {
      const magnitude = Math.hypot(real[i], imaginary[i]) / size
      const decibels = 20 * Math.log10(Math.max(1e-10, magnitude))
      frequency[i] = Math.max(0, Math.min(255, Math.round(((decibels + 100) / 70) * 255)))
    }
    return samples
  }
}
