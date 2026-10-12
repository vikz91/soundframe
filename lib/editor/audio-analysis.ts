export type AudioSamples = {
  frequency: Uint8Array<ArrayBuffer>
  waveform: Uint8Array<ArrayBuffer>
}

/** One graph per audio element; created only when the user starts playback. */
export class LocalAudioAnalyser {
  private disposed = false
  private graph: {
    context: AudioContext
    source: MediaElementAudioSourceNode
    analyser: AnalyserNode
    samples: AudioSamples
  } | null = null

  constructor(private readonly audio: HTMLAudioElement) {}

  async start() {
    if (this.disposed || typeof AudioContext === 'undefined') return false
    if (!this.graph) {
      const context = new AudioContext()
      try {
        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.8
        const source = context.createMediaElementSource(this.audio)
        // Keep playback connected directly; the analyser only observes the signal.
        source.connect(context.destination)
        source.connect(analyser)
        this.graph = {
          context,
          source,
          analyser,
          samples: {
            frequency: new Uint8Array(analyser.frequencyBinCount),
            waveform: new Uint8Array(analyser.fftSize)
          }
        }
      } catch (error) {
        void context.close().catch(() => {})
        throw error
      }
    }
    const current = this.graph
    await current.context.resume()
    return this.graph === current && current.context.state === 'running' && !this.audio.paused
  }

  read(): AudioSamples | null {
    const current = this.graph
    if (!current || this.audio.paused || this.audio.ended || current.context.state !== 'running') return null
    current.analyser.getByteFrequencyData(current.samples.frequency)
    current.analyser.getByteTimeDomainData(current.samples.waveform)
    return current.samples
  }

  dispose() {
    this.disposed = true
    const current = this.graph
    this.graph = null
    if (!current) return
    current.source.disconnect()
    current.analyser.disconnect()
    void current.context.close().catch(() => {})
  }
}
