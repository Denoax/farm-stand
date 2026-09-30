import { useCallback, useEffect, useRef, useState } from 'react'
import { ShuffleBag } from './shuffleBag'

export type AnimalSound = 'hens' | 'cattle' | 'sheep'
export type CommerceSound = 'add' | 'quantity' | 'details-open' | 'details-close' | 'filter' | 'remove' | 'clear' | 'basket-open' | 'basket-close' | 'confirm'
type EffectName = AnimalSound | CommerceSound | 'shutter' | 'apple-roll' | 'bird' | 'leaves-shop' | 'leaves-animals' | 'leaf-accent'
type LeafTransition = 'shop' | 'animals'
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
  name: EffectName
  source: AudioBufferSourceNode
  gain: GainNode
  stopped: boolean
}

type SoundTraceStage = 'requested' | 'accepted' | 'queued' | 'suppressed' | 'started' | 'stopped' | 'asset-ready' | 'asset-failed'

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
const variants = (stem: string) => [1, 2, 3, 4].map((variant) => publicAsset(`audio/${stem}${variant === 1 ? '' : `-${variant}`}.mp3`))
const EFFECT_POOLS: Record<EffectName, string[]> = {
  shutter: [publicAsset('audio/shutter-open.mp3')],
  'apple-roll': [publicAsset('audio/apple-roll-wood.mp3')],
  bird: [publicAsset('audio/bird-chirp.mp3'), publicAsset('audio/bird-chirp-2.mp3'), publicAsset('audio/bird-chirp-3.mp3')],
  'leaves-shop': [publicAsset('audio/leaves-shop-bed.mp3')],
  'leaves-animals': [publicAsset('audio/leaves-animals-bed.mp3')],
  'leaf-accent': [publicAsset('audio/leaf-accent-1.mp3'), publicAsset('audio/leaf-accent-2.mp3'), publicAsset('audio/leaf-accent-3.mp3')],
  hens: [publicAsset('audio/hens-cluck.mp3')],
  cattle: [publicAsset('audio/cattle-low.mp3')],
  sheep: [publicAsset('audio/sheep-bleat.mp3')],
  add: variants('add'),
  quantity: variants('quantity'),
  'details-open': variants('details'),
  'details-close': variants('details-close'),
  filter: variants('filter'),
  remove: variants('remove'),
  clear: variants('clear'),
  'basket-open': variants('basket-open'),
  'basket-close': variants('basket-close'),
  confirm: variants('confirm'),
}
const INTERFACE_GAINS: Record<CommerceSound, number> = {
  add: .58,
  quantity: .44,
  'details-open': .5,
  'details-close': .46,
  filter: .42,
  remove: .54,
  clear: .5,
  'basket-open': .56,
  'basket-close': .48,
  confirm: .46,
}
const MUSIC_URL = publicAsset('audio/morning-bed.mp3')
const MUSIC_MUTE_KEY = 'farm-stand-music-muted-v1'
const MUSIC_GAIN = 0.061
const DUCKED_MUSIC_GAIN = 0.023
// Source-level measurements differ by more than 18 dB. These per-source
// trims place each short call near the normal music bed plus roughly 2 dB;
// equal GainNode values would make cattle and sheep dominate the mix.
const BIRD_GAIN = 0.075
const ANIMAL_GAINS: Record<AnimalSound, number> = { hens: 0.15, cattle: 0.039, sheep: 0.058 }
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
  private buffers = new Map<string, AudioBuffer>()
  private assetLoads = new Map<string, Promise<boolean>>()
  private assetAttempts = new Map<string, number>()
  private failedAssets = new Set<string>()
  private bags = new Map<EffectName, ShuffleBag<string>>()
  private voices = new Set<Voice>()
  private animalVoice?: Voice
  private shutterVoice?: Voice
  private appleRollVoice?: Voice
  private birdVoice?: Voice
  private leafVoice?: Voice
  private interfaceVoice?: Voice
  private musicAttempt = 0
  private loadPromise?: Promise<void>
  private lastAnimalAt = new Map<AnimalSound, number>()
  private lastBirdAt = -Infinity
  private pendingBird?: { id: number; requestedAt: number }
  private birdRequestSequence = 0
  private leafKind?: LeafTransition
  private leafMediaTime = -1
  private leafCues = new Set<number>()
  private lastCommerceAt = new Map<CommerceSound, number>()
  private openingShot = 'light'
  private shutterLift = 0
  private appleRoll = 0
  private lastAppleMovementAt = -Infinity
  private snapshot = INITIAL_SNAPSHOT

  constructor(private readonly onChange: (snapshot: SoundscapeSnapshot) => void) {
    const injected = (window as typeof window & { __farmStandSoundRandom?: () => number }).__farmStandSoundRandom
    const random = typeof injected === 'function' ? injected : Math.random
    for (const name of Object.keys(EFFECT_POOLS) as EffectName[]) this.bags.set(name, new ShuffleBag(random))
  }

  private publish(patch: Partial<SoundscapeSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.onChange(this.snapshot)
  }

  private trace(name: EffectName, stage: SoundTraceStage, reason?: string, detail: Record<string, unknown> = {}) {
    window.dispatchEvent(new CustomEvent('farmstandsoundtrace', {
      detail: { name, stage, reason, atMs: Math.round(performance.now()), contextState: this.context?.state ?? 'absent', ...detail },
    }))
  }

  private updateLoadStatus() {
    const total = new Set(Object.values(EFFECT_POOLS).flat()).size
    const loaded = this.buffers.size
    const status: SoundStatus = loaded === total ? 'ready' : loaded || this.failedAssets.size ? 'partial' : 'loading'
    this.publish({ status, failedEffects: this.failedAssets.size })
  }

  private loadEffectAsset(url: string, allowRetry = false) {
    if (this.buffers.has(url)) return Promise.resolve(true)
    const active = this.assetLoads.get(url)
    if (active) return active
    const attempts = this.assetAttempts.get(url) ?? 0
    if (attempts >= (allowRetry ? 2 : 1)) return Promise.resolve(false)
    this.assetAttempts.set(url, attempts + 1)
    const effectName = (Object.entries(EFFECT_POOLS).find(([, urls]) => urls.includes(url))?.[0] ?? 'bird') as EffectName
    const request = (async () => {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${response.status} ${url}`)
        const buffer = await response.arrayBuffer()
        this.buffers.set(url, await this.context!.decodeAudioData(buffer))
        this.failedAssets.delete(url)
        this.trace(effectName, 'asset-ready', undefined, { asset: url.split('/').pop(), attempt: attempts + 1 })
        return true
      } catch {
        this.failedAssets.add(url)
        this.trace(effectName, 'asset-failed', 'asset-failed', { asset: url.split('/').pop(), attempt: attempts + 1 })
        return false
      } finally {
        this.assetLoads.delete(url)
        this.updateLoadStatus()
      }
    })()
    this.assetLoads.set(url, request)
    return request
  }

  private loadBirdPool(allowRetry = false) {
    return Promise.all(EFFECT_POOLS.bird.map((url) => this.loadEffectAsset(url, allowRetry)))
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
    this.uiGain.gain.value = 0.58
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
    // Decode the tiny chirp bank as soon as the graph exists. It does not
    // delay rendering or unlock, but removes the cold-click race with the
    // much larger all-effects batch.
    void this.loadBirdPool()
  }

  private loadEffects() {
    if (this.loadPromise || !this.context) return this.loadPromise
    this.publish({ status: 'loading' })
    const urls = [...new Set(Object.values(EFFECT_POOLS).flat())]
    this.loadPromise = Promise.all(urls.map((url) => this.loadEffectAsset(url, true))).then(() => {
      this.updateLoadStatus()
      if (this.openingShot === 'lift' && this.shutterLift < .995 && !this.shutterVoice) {
        this.playShutterAtLift(this.shutterLift)
      }
      if (this.openingShot === 'apple-roll' && this.appleRoll > 0 && this.appleRoll < .995 && performance.now() - this.lastAppleMovementAt < 140) {
        this.playAppleRollAtProgress(this.appleRoll)
      }
    }).finally(() => {
      this.loadPromise = undefined
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
    if (!voice || !this.context || voice.stopped) return
    voice.stopped = true
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setTargetAtTime(0, now, Math.max(0.005, fadeSeconds / 3))
    try { voice.source.stop(now + fadeSeconds) } catch { /* A naturally ended voice is already stopped. */ }
    this.voices.delete(voice)
    this.trace(voice.name, 'stopped', 'controlled')
    window.dispatchEvent(new CustomEvent('farmstandsoundstop', { detail: { name: voice.name, reason: 'controlled' } }))
  }

  private startVoice(name: EffectName, category: 'effect' | 'ui', gainValue: number, offset = 0) {
    if (document.hidden) {
      this.trace(name, 'suppressed', 'hidden')
      return
    }
    if (!this.context || this.context.state !== 'running') {
      this.trace(name, 'suppressed', 'context-suspended')
      return
    }
    const available = EFFECT_POOLS[name].filter((url) => this.buffers.has(url))
    const variant = this.bags.get(name)?.next(available)
    const buffer = variant ? this.buffers.get(variant) : undefined
    const output = category === 'ui' ? this.uiGain : this.effectsGain
    if (!buffer || !output || offset >= buffer.duration) {
      const reason = EFFECT_POOLS[name].every((url) => this.failedAssets.has(url)) ? 'asset-failed' : 'buffer-pending'
      this.trace(name, 'suppressed', reason)
      return
    }
    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    gain.gain.value = gainValue
    source.buffer = buffer
    source.connect(gain)
    gain.connect(output)
    const voice = { name, source, gain, stopped: false }
    this.voices.add(voice)
    source.addEventListener('ended', () => {
      this.voices.delete(voice)
      if (voice.stopped) return
      voice.stopped = true
      this.trace(voice.name, 'stopped', 'ended')
      window.dispatchEvent(new CustomEvent('farmstandsoundstop', { detail: { name: voice.name, reason: 'ended' } }))
    }, { once: true })
    try {
      source.start(0, Math.max(0, offset))
    } catch {
      this.voices.delete(voice)
      voice.stopped = true
      this.trace(name, 'suppressed', 'source-start-failed')
      return
    }
    this.trace(name, 'started', undefined, { gain: gainValue, offset, variant: variant?.split('/').pop(), contextTime: this.context.currentTime })
    window.dispatchEvent(new CustomEvent('farmstandsound', { detail: { name, gain: gainValue, offset, variant: variant?.split('/').pop() } }))
    return voice
  }

  playCommerce(kind: CommerceSound) {
    const now = performance.now()
    const cooldown = kind === 'quantity' ? 70 : kind === 'filter' ? 100 : 120
    if (now - (this.lastCommerceAt.get(kind) ?? -Infinity) < cooldown) return false
    this.stopVoice(this.interfaceVoice, kind === 'quantity' ? .012 : .022)
    const voice = this.startVoice(kind, 'ui', INTERFACE_GAINS[kind])
    if (!voice) return false
    this.lastCommerceAt.set(kind, now)
    this.interfaceVoice = voice
    return true
  }

  syncLeafTransition(kind: LeafTransition, mediaTime: number) {
    if (this.leafKind !== kind) {
      this.stopLeafTransition()
      this.leafKind = kind
      this.leafMediaTime = -1
      this.leafCues.clear()
      this.duckMusic(kind === 'shop' ? 4300 : 3000)
      this.leafVoice = this.startVoice(kind === 'shop' ? 'leaves-shop' : 'leaves-animals', 'effect', 0.31, mediaTime)
    }
    const cueTimes = kind === 'shop' ? [0.58, 1.66, 2.94] : [0.38, 1.12, 1.72]
    cueTimes.forEach((cueTime, index) => {
      if (!this.leafCues.has(index) && mediaTime >= cueTime && this.leafMediaTime < cueTime) {
        this.leafCues.add(index)
        this.startVoice('leaf-accent', 'effect', 0.24)
      }
    })
    this.leafMediaTime = Math.max(this.leafMediaTime, mediaTime)
  }

  stopLeafTransition() {
    this.stopVoice(this.leafVoice, 0.09)
    this.leafVoice = undefined
    this.leafKind = undefined
    this.leafMediaTime = -1
    this.leafCues.clear()
  }

  playBird(stage: 'start' | 'queued' = 'start') {
    if (stage === 'queued') {
      this.trace('bird', 'queued', 'reaction-active')
      return true
    }
    const now = performance.now()
    this.trace('bird', 'requested')
    if (document.hidden) {
      this.trace('bird', 'suppressed', 'hidden')
      return false
    }
    if (now - this.lastBirdAt < 650) {
      this.trace('bird', 'suppressed', 'cooldown')
      return false
    }
    if (this.pendingBird) {
      this.trace('bird', 'suppressed', 'pending-request')
      return false
    }
    const pending = { id: ++this.birdRequestSequence, requestedAt: now }
    this.pendingBird = pending
    this.trace('bird', 'accepted')
    if (this.context?.state !== 'running' || !EFFECT_POOLS.bird.some((url) => this.buffers.has(url))) {
      this.trace('bird', 'queued', this.context?.state === 'running' ? 'buffer-pending' : 'context-suspended')
    }
    void this.startBirdWhenReady(pending)
    return true
  }

  private async startBirdWhenReady(pending: { id: number; requestedAt: number }) {
    try {
      await this.ensureGraph()
      if (this.context?.state !== 'running') {
        const resumed = await Promise.race([
          this.context?.resume().then(() => this.context?.state === 'running'),
          new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 450)),
        ])
        this.publish({ audioReady: Boolean(resumed) })
      }
      if (!EFFECT_POOLS.bird.some((url) => this.buffers.has(url))) {
        await Promise.race([
          this.loadBirdPool(true),
          new Promise<void>((resolve) => window.setTimeout(resolve, 700)),
        ])
        if (!EFFECT_POOLS.bird.some((url) => this.buffers.has(url))) {
          await Promise.race([
            this.loadBirdPool(true),
            new Promise<void>((resolve) => window.setTimeout(resolve, 300)),
          ])
        }
      }
      if (this.pendingBird?.id !== pending.id) return
      this.pendingBird = undefined
      if (document.hidden) {
        this.trace('bird', 'suppressed', 'hidden')
        return
      }
      if (performance.now() - pending.requestedAt > 1100) {
        this.trace('bird', 'suppressed', 'stale')
        return
      }
      this.stopVoice(this.birdVoice, 0.035)
      const voice = this.startVoice('bird', 'effect', BIRD_GAIN)
      if (!voice) return
      this.lastBirdAt = performance.now()
      this.birdVoice = voice
    } catch {
      if (this.pendingBird?.id === pending.id) this.pendingBird = undefined
      this.trace('bird', 'suppressed', 'context-suspended')
    }
  }

  playAnimal(kind: AnimalSound) {
    const now = performance.now()
    if (now - (this.lastAnimalAt.get(kind) ?? -Infinity) < 2500) return false
    this.stopVoice(this.animalVoice, 0.08)
    const gain = ANIMAL_GAINS[kind]
    const voice = this.startVoice(kind, 'effect', gain)
    if (!voice) return false
    this.lastAnimalAt.set(kind, now)
    this.animalVoice = voice
    return true
  }

  private playShutterAtLift(lift: number) {
    const buffer = this.buffers.get(EFFECT_POOLS.shutter[0])
    if (!buffer || lift >= .995) return
    this.duckMusic(2900)
    const offset = Math.min(buffer.duration - .03, buffer.duration * Math.max(0, lift))
    this.shutterVoice = this.startVoice('shutter', 'effect', 0.46, offset)
  }

  private playAppleRollAtProgress(progress: number) {
    if (this.appleRollVoice) return
    const buffer = this.buffers.get(EFFECT_POOLS['apple-roll'][0])
    if (!buffer || progress >= .995) return
    const offset = Math.min(buffer.duration - .05, buffer.duration * progress * .78)
    this.appleRollVoice = this.startVoice('apple-roll', 'effect', .17, offset)
  }

  syncOpening(shot: string, shutterLift: number, appleRoll: number) {
    const enteringLift = shot === 'lift' && this.openingShot !== 'lift'
    const rollDelta = appleRoll - this.appleRoll
    this.openingShot = shot
    this.shutterLift = shutterLift
    this.appleRoll = appleRoll
    if (enteringLift) this.playShutterAtLift(shutterLift)
    if (this.shutterVoice && (shot !== 'lift' || shutterLift >= .995)) {
      this.stopVoice(this.shutterVoice, 0.09)
      this.shutterVoice = undefined
    }
    if (shot === 'apple-roll' && rollDelta > .00005 && appleRoll < .995) {
      this.lastAppleMovementAt = performance.now()
      this.playAppleRollAtProgress(appleRoll)
      if (this.appleRollVoice && this.context) {
        const taper = appleRoll < .72 ? 1 : Math.max(.18, 1 - (appleRoll - .72) / .28)
        this.appleRollVoice.gain.gain.setTargetAtTime(.17 * taper, this.context.currentTime, .045)
      }
    }
    if (this.appleRollVoice && (shot !== 'apple-roll' || appleRoll >= .995 || rollDelta < -.00005)) {
      this.stopVoice(this.appleRollVoice, .11)
      this.appleRollVoice = undefined
    }
  }

  onVisibilityChange() {
    if (document.hidden) {
      if (this.pendingBird) {
        this.pendingBird = undefined
        this.trace('bird', 'suppressed', 'hidden')
      }
      if (!this.context) return
      this.musicAttempt += 1
      this.stopAllVoices()
      this.music?.pause()
      this.publish({ musicPlaying: false, musicStarting: false })
      void this.context.suspend()
      return
    }
    if (!this.context) return
    void this.context.resume().then(() => {
      this.publish({ audioReady: true })
      if (this.snapshot.musicRequested && !this.snapshot.musicMuted) void this.requestMusic()
    }).catch(() => this.publish({ audioReady: false }))
  }

  stopAllVoices() {
    for (const voice of [...this.voices]) this.stopVoice(voice, 0.025)
    this.animalVoice = undefined
    this.shutterVoice = undefined
    this.appleRollVoice = undefined
    this.interfaceVoice = undefined
    this.birdVoice = undefined
    this.leafVoice = undefined
    this.leafKind = undefined
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
  const syncLeafTransition = useCallback((kind: LeafTransition, mediaTime: number) => controllerRef.current!.syncLeafTransition(kind, mediaTime), [])
  const stopLeafTransition = useCallback(() => controllerRef.current!.stopLeafTransition(), [])
  const playBird = useCallback((stage?: 'start' | 'queued') => controllerRef.current!.playBird(stage), [])
  const playAnimal = useCallback((kind: AnimalSound) => controllerRef.current!.playAnimal(kind), [])
  const syncOpening = useCallback((shot: string, shutterLift: number, appleRoll: number) => controllerRef.current!.syncOpening(shot, shutterLift, appleRoll), [])

  return { snapshot, unlock, handleEligibleInteraction, toggleMusic, playCommerce, syncLeafTransition, stopLeafTransition, playBird, playAnimal, syncOpening }
}
