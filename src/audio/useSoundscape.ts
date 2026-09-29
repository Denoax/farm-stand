import { useCallback, useEffect, useRef, useState } from 'react'

export type AnimalSound = 'hens' | 'cattle' | 'sheep'
export type CommerceSound = 'add' | 'details' | 'quantity' | 'remove' | 'basket-open' | 'basket-close'
type EffectName = AnimalSound | CommerceSound | 'shutter' | 'leaves'
type SoundStatus = 'silent' | 'loading' | 'ready' | 'partial'

export interface SoundscapeSnapshot {
  audioReady: boolean
  musicRequested: boolean
  musicPlaying: boolean
  musicBlocked: boolean
  musicMuted: boolean
  musicStarting: boolean
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
  hens: publicAsset('audio/hens-cluck.mp3'),
  cattle: publicAsset('audio/cattle-low.mp3'),
  sheep: publicAsset('audio/sheep-bleat.mp3'),
  add: publicAsset('audio/add.mp3'),
  details: publicAsset('audio/details.mp3'),
  quantity: publicAsset('audio/quantity.mp3'),
  remove: publicAsset('audio/remove.mp3'),
  'basket-open': publicAsset('audio/basket-open.mp3'),
  'basket-close': publicAsset('audio/basket-close.mp3'),
}
const MUSIC_URL = publicAsset('audio/morning-bed.mp3')
const MUSIC_MUTE_KEY = 'farm-stand-music-muted-v1'
const MUSIC_GAIN = 0.061
const DUCKED_MUSIC_GAIN = 0.023
function initiallyMuted() {
  try { return sessionStorage.getItem(MUSIC_MUTE_KEY) === 'true' } catch { return false }
}

const INITIAL_SNAPSHOT: SoundscapeSnapshot = {
  audioReady: false,
  musicRequested: !initiallyMuted(),
  musicPlaying: false,
  musicBlocked: false,
  musicMuted: initiallyMuted(),
  musicStarting: false,
  status: 'silent',
  failedEffects: 0,
}

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
  private basketVoice?: Voice
  private musicAttempt = 0
  private loadPromise?: Promise<void>
  private lastAnimalAt = new Map<AnimalSound, number>()
  private lastCommerceAt = new Map<CommerceSound, number>()
  private openingShot = 'light'
  private shutterLift = 0
  private snapshot = INITIAL_SNAPSHOT

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
    this.musicGain.gain.value = MUSIC_GAIN
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
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${response.status} ${url}`)
        const buffer = await response.arrayBuffer()
        this.buffers.set(name as EffectName, await this.context!.decodeAudioData(buffer))
        return true
      } catch {
        return false
      }
    })).then((results) => {
      const failedEffects = results.filter((loaded) => !loaded).length
      this.publish({ failedEffects, status: failedEffects ? 'partial' : 'ready' })
      if (this.openingShot === 'lift' && this.shutterLift < .995 && !this.shutterVoice) {
        this.playShutterAtLift(this.shutterLift)
      }
    })
    return this.loadPromise
  }

  async unlock() {
    try {
      await this.ensureGraph()
      const resumed = this.context?.state === 'running' || await Promise.race([
        this.context?.resume().then(() => this.context?.state === 'running'),
        new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 450)),
      ])
      this.publish({ audioReady: Boolean(resumed) })
      void this.loadEffects()
    } catch {
      this.publish({ audioReady: false, status: 'partial' })
    }
  }

  private storeMuted(muted: boolean) {
    try { sessionStorage.setItem(MUSIC_MUTE_KEY, String(muted)) } catch { /* The in-memory preference still applies. */ }
  }

  async requestMusic(automatic = false) {
    if (this.snapshot.musicMuted) return false
    const attempt = ++this.musicAttempt
    this.publish({ musicRequested: true, musicBlocked: false, musicStarting: true })
    try {
      if (automatic) await this.ensureGraph()
      else await this.unlock()
    } catch {
      if (attempt === this.musicAttempt && !this.snapshot.musicMuted) {
        this.publish({ audioReady: false, musicPlaying: false, musicBlocked: true, musicStarting: false, status: 'partial' })
      }
      return false
    }
    if (!this.music || this.snapshot.musicMuted || attempt !== this.musicAttempt) return false
    try {
      await this.music.play()
      if (this.snapshot.musicMuted || attempt !== this.musicAttempt || this.context?.state !== 'running') {
        this.music.pause()
        if (attempt === this.musicAttempt && !this.snapshot.musicMuted) this.publish({ musicPlaying: false, musicBlocked: true, musicStarting: false })
        return false
      }
      this.publish({ musicPlaying: true, musicBlocked: false, musicStarting: false })
      return true
    } catch {
      if (attempt === this.musicAttempt && !this.snapshot.musicMuted) {
        this.publish({ musicRequested: true, musicPlaying: false, musicBlocked: true, musicStarting: false })
      }
      return false
    }
  }

  async toggleMusic() {
    if (this.snapshot.musicPlaying || this.snapshot.musicStarting) {
      this.musicAttempt += 1
      this.music?.pause()
      this.storeMuted(true)
      this.publish({ musicRequested: false, musicPlaying: false, musicBlocked: false, musicMuted: true, musicStarting: false })
      return
    }
    this.storeMuted(false)
    this.publish({ musicMuted: false, musicRequested: true })
    await this.requestMusic()
  }

  async handleEligibleInteraction() {
    await this.unlock()
    if (this.snapshot.musicRequested && !this.snapshot.musicMuted && !this.snapshot.musicPlaying) {
      await this.requestMusic()
    }
  }

  private duckMusic(milliseconds: number) {
    if (!this.context || !this.musicGain || !this.snapshot.musicPlaying) return
    const now = this.context.currentTime
    this.musicGain.gain.cancelScheduledValues(now)
    this.musicGain.gain.setTargetAtTime(DUCKED_MUSIC_GAIN, now, 0.035)
    this.musicGain.gain.setTargetAtTime(MUSIC_GAIN, now + milliseconds / 1000, 0.18)
  }

  private stopVoice(voice?: Voice, fadeSeconds = 0.035) {
    if (!voice || !this.context) return
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setTargetAtTime(0, now, Math.max(0.005, fadeSeconds / 3))
    try { voice.source.stop(now + fadeSeconds) } catch { /* A naturally ended voice is already stopped. */ }
    this.voices.delete(voice)
  }

  private startVoice(name: EffectName, category: 'effect' | 'ui', gainValue: number, offset = 0) {
    if (!this.context || this.context.state !== 'running') return
    const buffer = this.buffers.get(name)
    const output = category === 'ui' ? this.uiGain : this.effectsGain
    if (!buffer || !output || offset >= buffer.duration) return
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    gain.gain.value = gainValue
    source.buffer = buffer
    source.connect(gain)
    gain.connect(output)
    const voice = { source, gain }
    this.voices.add(voice)
    source.addEventListener('ended', () => this.voices.delete(voice), { once: true })
    source.start(0, Math.max(0, offset))
    window.dispatchEvent(new CustomEvent('farmstandsound', { detail: { name, gain: gainValue, offset } }))
    return voice
  }

  playCommerce(kind: CommerceSound) {
    const now = performance.now()
    const cooldown = kind === 'quantity' ? 70 : 120
    if (now - (this.lastCommerceAt.get(kind) ?? -Infinity) < cooldown) return false
    this.lastCommerceAt.set(kind, now)
    if (kind === 'basket-open' || kind === 'basket-close') {
      this.stopVoice(this.basketVoice, 0.025)
      this.basketVoice = this.startVoice(kind, 'ui', 0.42)
      return Boolean(this.basketVoice)
    }
    return Boolean(this.startVoice(kind, 'ui', kind === 'remove' ? .54 : .48))
  }

  playLeaves() {
    this.duckMusic(2400)
    this.startVoice('leaves', 'effect', 0.42)
  }

  playAnimal(kind: AnimalSound) {
    const now = performance.now()
    if (now - (this.lastAnimalAt.get(kind) ?? -Infinity) < 2500) return false
    this.lastAnimalAt.set(kind, now)
    this.stopVoice(this.animalVoice, 0.08)
    this.duckMusic(kind === 'hens' ? 2500 : 1900)
    const gain = kind === 'hens' ? 0.48 : kind === 'cattle' ? 0.167 : 0.42
    this.animalVoice = this.startVoice(kind, 'effect', gain)
    return Boolean(this.animalVoice)
  }

  private playShutterAtLift(lift: number) {
    const buffer = this.buffers.get('shutter')
    if (!buffer || lift >= .995) return
    this.duckMusic(2900)
    const offset = Math.min(buffer.duration - .03, buffer.duration * Math.max(0, lift))
    this.shutterVoice = this.startVoice('shutter', 'effect', 0.46, offset)
  }

  syncOpening(shot: string, shutterLift: number) {
    const enteringLift = shot === 'lift' && this.openingShot !== 'lift'
    this.openingShot = shot
    this.shutterLift = shutterLift
    if (enteringLift) this.playShutterAtLift(shutterLift)
    if (this.shutterVoice && (shot !== 'lift' || shutterLift >= .995)) {
      this.stopVoice(this.shutterVoice, 0.09)
      this.shutterVoice = undefined
    }
  }

  onVisibilityChange() {
    if (!this.context) return
    if (document.hidden) {
      this.musicAttempt += 1
      this.stopAllVoices()
      this.music?.pause()
      this.publish({ musicPlaying: false, musicStarting: false })
      void this.context.suspend()
      return
    }
    void this.context.resume().then(() => {
      this.publish({ audioReady: true })
      if (this.snapshot.musicRequested && !this.snapshot.musicMuted) void this.requestMusic()
    }).catch(() => this.publish({ audioReady: false }))
  }

  stopAllVoices() {
    for (const voice of [...this.voices]) this.stopVoice(voice, 0.025)
    this.animalVoice = undefined
    this.shutterVoice = undefined
    this.basketVoice = undefined
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
  const [snapshot, setSnapshot] = useState<SoundscapeSnapshot>(INITIAL_SNAPSHOT)
  const controllerRef = useRef<SoundscapeController | undefined>(undefined)
  const disposeTimerRef = useRef<number | undefined>(undefined)
  if (!controllerRef.current) controllerRef.current = new SoundscapeController(setSnapshot)

  useEffect(() => {
    const controller = controllerRef.current!
    if (disposeTimerRef.current !== undefined) window.clearTimeout(disposeTimerRef.current)
    disposeTimerRef.current = undefined
    const onVisibility = () => controller.onVisibilityChange()
    document.addEventListener('visibilitychange', onVisibility)
    void controller.requestMusic(true)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      // React development StrictMode performs an immediate cleanup/remount.
      // Defer disposal by one task so that probe cannot close the reused graph.
      disposeTimerRef.current = window.setTimeout(() => controller.dispose(), 0)
    }
  }, [])

  const unlock = useCallback(() => controllerRef.current!.unlock(), [])
  const handleEligibleInteraction = useCallback(() => controllerRef.current!.handleEligibleInteraction(), [])
  const toggleMusic = useCallback(() => controllerRef.current!.toggleMusic(), [])
  const playCommerce = useCallback((kind: CommerceSound) => controllerRef.current!.playCommerce(kind), [])
  const playLeaves = useCallback(() => controllerRef.current!.playLeaves(), [])
  const playAnimal = useCallback((kind: AnimalSound) => controllerRef.current!.playAnimal(kind), [])
  const syncOpening = useCallback((shot: string, shutterLift: number) => controllerRef.current!.syncOpening(shot, shutterLift), [])

  return { snapshot, unlock, handleEligibleInteraction, toggleMusic, playCommerce, playLeaves, playAnimal, syncOpening }
}
