import { useCallback, useEffect, useRef, useState } from 'react'

export type AnimalSound = 'hens' | 'cattle' | 'sheep'
type EffectName = AnimalSound | 'shutter' | 'leaves' | 'ui'
type SoundStatus = 'silent' | 'loading' | 'ready' | 'partial'

export interface SoundscapeSnapshot {
  enabled: boolean
  musicEnabled: boolean
  musicLevel: number
  musicBlocked: boolean
  status: SoundStatus
  failedEffects: number
}

interface Voice {
  source: AudioBufferSourceNode
  gain: GainNode
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
const EFFECT_URLS: Record<EffectName, string> = {
  shutter: publicAsset('audio/shutter-open.mp3'),
  leaves: publicAsset('audio/leaf-rustle.mp3'),
  ui: publicAsset('audio/paper-tick.mp3'),
  hens: publicAsset('audio/hens-cluck.mp3'),
  cattle: publicAsset('audio/cattle-low.mp3'),
  sheep: publicAsset('audio/sheep-bleat.mp3'),
}
const MUSIC_URL = publicAsset('audio/morning-bed.mp3')
const MUSIC_GAIN = 0.11
const DUCKED_MUSIC_GAIN = 0.038

class SoundscapeController {
  private context?: AudioContext
  private master?: GainNode
  private musicGain?: GainNode
  private effectsGain?: GainNode
  private uiGain?: GainNode
  private music?: HTMLAudioElement
  private musicSource?: MediaElementAudioSourceNode
  private buffers = new Map<EffectName, AudioBuffer>()
  private voices = new Set<Voice>()
  private animalVoice?: Voice
  private shutterVoice?: Voice
  private loadPromise?: Promise<void>
  private lastAnimalAt = new Map<AnimalSound, number>()
  private lastOpeningShot = 'light'
  private snapshot: SoundscapeSnapshot = { enabled: false, musicEnabled: true, musicLevel: 0.55, musicBlocked: false, status: 'silent', failedEffects: 0 }

  constructor(private readonly onChange: (snapshot: SoundscapeSnapshot) => void) {}

  private publish(patch: Partial<SoundscapeSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.onChange(this.snapshot)
  }

  private async ensureGraph() {
    if (this.context) return
    this.context = new AudioContext()
    this.master = this.context.createGain()
    this.musicGain = this.context.createGain()
    this.effectsGain = this.context.createGain()
    this.uiGain = this.context.createGain()
    this.master.gain.value = 0.82
    this.musicGain.gain.value = MUSIC_GAIN * this.snapshot.musicLevel
    this.effectsGain.gain.value = 0.62
    this.uiGain.gain.value = 0.34
    this.musicGain.connect(this.master)
    this.effectsGain.connect(this.master)
    this.uiGain.connect(this.master)
    this.master.connect(this.context.destination)

    if (new URLSearchParams(location.search).has('recordSound')) {
      const capture = this.context.createMediaStreamDestination()
      this.master.connect(capture)
      ;(window as typeof window & { __farmStandAudioStream?: MediaStream }).__farmStandAudioStream = capture.stream
    }

    this.music = new Audio()
    this.music.loop = true
    this.music.preload = 'none'
    this.music.src = MUSIC_URL
    this.musicSource = this.context.createMediaElementSource(this.music)
    this.musicSource.connect(this.musicGain)
  }

  private loadEffects() {
    if (this.loadPromise || !this.context) return this.loadPromise
    this.publish({ status: 'loading' })
    this.loadPromise = Promise.all(Object.entries(EFFECT_URLS).map(async ([name, url]) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`${response.status} ${url}`)
      const buffer = await response.arrayBuffer()
      this.buffers.set(name as EffectName, await this.context!.decodeAudioData(buffer))
    }).map(async (task) => {
      try { await task; return true } catch { return false }
    })).then((results) => {
      const failedEffects = results.filter((loaded) => !loaded).length
      this.publish({ failedEffects, status: failedEffects ? 'partial' : 'ready' })
    })
    return this.loadPromise
  }

  async enable() {
    try {
      await this.ensureGraph()
    } catch {
      this.publish({ enabled: false, musicBlocked: true, status: 'partial' })
      return
    }
    this.publish({ enabled: true, musicBlocked: false })
    try { await this.context?.resume() } catch { /* Effects remain optional and the site stays usable. */ }
    void this.loadEffects()
    if (this.snapshot.enabled && this.snapshot.musicEnabled && this.music) {
      try { await this.music.play() } catch { this.publish({ musicBlocked: true }) }
    }
  }

  disable() {
    this.publish({ enabled: false })
    this.stopAllVoices()
    this.music?.pause()
  }

  async setMusicEnabled(enabled: boolean) {
    this.publish({ musicEnabled: enabled, musicBlocked: false })
    if (!this.music) return
    if (!enabled || !this.snapshot.enabled) {
      this.music.pause()
      return
    }
    try { await this.music.play() } catch { this.publish({ musicBlocked: true }) }
  }

  setMusicLevel(level: number) {
    const musicLevel = Math.min(1, Math.max(0, level))
    this.publish({ musicLevel })
    if (!this.context || !this.musicGain) return
    this.musicGain.gain.setTargetAtTime(MUSIC_GAIN * musicLevel, this.context.currentTime, 0.035)
  }

  private duckMusic(milliseconds: number) {
    if (!this.context || !this.musicGain || !this.snapshot.musicEnabled) return
    const now = this.context.currentTime
    this.musicGain.gain.cancelScheduledValues(now)
    this.musicGain.gain.setTargetAtTime(DUCKED_MUSIC_GAIN, now, 0.035)
    this.musicGain.gain.setTargetAtTime(MUSIC_GAIN * this.snapshot.musicLevel, now + milliseconds / 1000, 0.18)
  }

  private stopVoice(voice?: Voice, fadeSeconds = 0.035) {
    if (!voice || !this.context) return
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setTargetAtTime(0, now, Math.max(0.005, fadeSeconds / 3))
    try { voice.source.stop(now + fadeSeconds) } catch { /* A naturally ended voice is already stopped. */ }
    this.voices.delete(voice)
  }

  private startVoice(name: EffectName, category: 'effect' | 'ui', gainValue: number) {
    if (!this.snapshot.enabled || !this.context) return
    const buffer = this.buffers.get(name)
    const output = category === 'ui' ? this.uiGain : this.effectsGain
    if (!buffer || !output) return
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    gain.gain.value = gainValue
    source.buffer = buffer
    source.connect(gain)
    gain.connect(output)
    const voice = { source, gain }
    this.voices.add(voice)
    source.addEventListener('ended', () => this.voices.delete(voice), { once: true })
    source.start()
    window.dispatchEvent(new CustomEvent('farmstandsound', { detail: { name } }))
    return voice
  }

  playUi() {
    this.startVoice('ui', 'ui', 0.52)
  }

  playLeaves() {
    this.duckMusic(1450)
    this.startVoice('leaves', 'effect', 0.42)
  }

  playAnimal(kind: AnimalSound) {
    if (!this.snapshot.enabled) return false
    const now = performance.now()
    if (now - (this.lastAnimalAt.get(kind) ?? -Infinity) < 2500) return false
    this.lastAnimalAt.set(kind, now)
    this.stopVoice(this.animalVoice, 0.08)
    this.duckMusic(kind === 'hens' ? 2500 : 1900)
    this.animalVoice = this.startVoice(kind, 'effect', kind === 'hens' ? 0.48 : 0.42)
    return Boolean(this.animalVoice)
  }

  syncOpening(shot: string, shutterLift: number) {
    const enteringLift = shot === 'lift' && this.lastOpeningShot !== 'lift'
    if (enteringLift && this.snapshot.enabled) {
      this.duckMusic(2900)
      this.shutterVoice = this.startVoice('shutter', 'effect', 0.46)
    }
    if (this.shutterVoice && (shot !== 'lift' || shutterLift >= 0.995)) {
      this.stopVoice(this.shutterVoice, 0.09)
      this.shutterVoice = undefined
    }
    this.lastOpeningShot = shot
  }

  onVisibilityChange() {
    if (!this.context) return
    if (document.hidden) {
      this.stopAllVoices()
      this.music?.pause()
      void this.context.suspend()
      return
    }
    if (!this.snapshot.enabled) return
    void this.context.resume().then(() => {
      if (this.snapshot.musicEnabled) void this.music?.play().catch(() => this.publish({ musicBlocked: true }))
    }).catch(() => undefined)
  }

  stopAllVoices() {
    for (const voice of [...this.voices]) this.stopVoice(voice, 0.025)
    this.animalVoice = undefined
    this.shutterVoice = undefined
  }

  dispose() {
    this.stopAllVoices()
    this.music?.pause()
    this.music?.removeAttribute('src')
    this.music?.load()
    void this.context?.close()
    delete (window as typeof window & { __farmStandAudioStream?: MediaStream }).__farmStandAudioStream
  }
}

export function useSoundscape() {
  const [snapshot, setSnapshot] = useState<SoundscapeSnapshot>({ enabled: false, musicEnabled: true, musicLevel: 0.55, musicBlocked: false, status: 'silent', failedEffects: 0 })
  const controllerRef = useRef<SoundscapeController | undefined>(undefined)
  if (!controllerRef.current) controllerRef.current = new SoundscapeController(setSnapshot)

  useEffect(() => {
    const controller = controllerRef.current!
    const onVisibility = () => controller.onVisibilityChange()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      controller.dispose()
    }
  }, [])

  const enable = useCallback(() => controllerRef.current!.enable(), [])
  const disable = useCallback(() => controllerRef.current!.disable(), [])
  const setMusicEnabled = useCallback((enabled: boolean) => controllerRef.current!.setMusicEnabled(enabled), [])
  const setMusicLevel = useCallback((level: number) => controllerRef.current!.setMusicLevel(level), [])
  const playUi = useCallback(() => controllerRef.current!.playUi(), [])
  const playLeaves = useCallback(() => controllerRef.current!.playLeaves(), [])
  const playAnimal = useCallback((kind: AnimalSound) => controllerRef.current!.playAnimal(kind), [])
  const syncOpening = useCallback((shot: string, shutterLift: number) => controllerRef.current!.syncOpening(shot, shutterLift), [])

  return { snapshot, enable, disable, setMusicEnabled, setMusicLevel, playUi, playLeaves, playAnimal, syncOpening }
}
