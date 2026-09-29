import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { evaluateMarketOpening } from '../scene/marketOpeningShot'
import { marketView } from '../scene/marketView'

type SceneState = 'loading' | 'ready' | 'fallback'

interface FarmSceneProps {
  progressRef: React.RefObject<number>
  onStateChange: (state: SceneState) => void
  onPresented: (progress: number, shot: string) => void
  onBirdActivate: () => void
}

interface PreparedApple {
  group: THREE.Group
  effectiveRadius: number
  halfExtentZ: number
  supportHeightAt: (angle: number) => number
}

interface WoodMaps {
  diffuse: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
}

interface WoodVariant extends WoodMaps {
  verticalDiffuse: THREE.Texture
  verticalNormal: THREE.Texture
  verticalRoughness: THREE.Texture
}

type BoardAxis = 'horizontal' | 'vertical'

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
const APPLE_URL = publicAsset('models/food_apple_01/food_apple_01_1k.gltf')
const BIRD_URL = publicAsset('models/bird-orange/bird-orange.glb')
const BIRD_TEXTURE_URL = publicAsset('models/bird-orange/bird-orange-base-color.webp')
const WOOD_VARIANTS = ['a', 'b', 'c'] as const
const COUNTER_TOP_Y = -1.9
const APPLE_SUPPORT_SAMPLES = 72
const SHUTTER_DEPTH_OFFSET = -0.8
const TRACK_DEPTH_OFFSET = -0.86

function prepareApple(model: THREE.Object3D): PreparedApple {
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const scale = 0.5 / Math.max(size.y, 0.001)

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow = true
    child.receiveShadow = true
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace
      material.roughness = Math.max(material.roughness, 0.62)
      material.envMapIntensity = 0.22
      material.needsUpdate = true
    })
  })

  const restingPose = new THREE.Group()
  restingPose.rotation.set(0.02, -0.38, 0.07)
  restingPose.add(model)
  const group = new THREE.Group()
  group.add(restingPose)
  group.updateMatrixWorld(true)

  const vertices: THREE.Vector3[] = []
  const vertex = new THREE.Vector3()
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const positions = child.geometry.getAttribute('position')
    for (let index = 0; index < positions.count; index += 1) {
      vertex.fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld)
      vertices.push(vertex.clone())
    }
  })

  const rollingAxis = new THREE.Vector3(0, 0, 1)
  const supportHeights = Array.from({ length: APPLE_SUPPORT_SAMPLES }, (_, index) => {
    const angle = index / APPLE_SUPPORT_SAMPLES * Math.PI * 2
    let minimumY = Number.POSITIVE_INFINITY
    for (const point of vertices) {
      const rotatedY = point.clone().applyAxisAngle(rollingAxis, angle).y
      minimumY = Math.min(minimumY, rotatedY)
    }
    return -minimumY
  })
  const supportHeightAt = (angle: number) => {
    const turns = ((angle / (Math.PI * 2)) % 1 + 1) % 1
    const sample = turns * APPLE_SUPPORT_SAMPLES
    const lower = Math.floor(sample) % APPLE_SUPPORT_SAMPLES
    const upper = (lower + 1) % APPLE_SUPPORT_SAMPLES
    return THREE.MathUtils.lerp(supportHeights[lower], supportHeights[upper], sample - Math.floor(sample))
  }
  let halfExtentZ = 0.001
  for (const point of vertices) halfExtentZ = Math.max(halfExtentZ, Math.abs(point.z))

  return {
    group,
    effectiveRadius: Math.max(0.001, (size.x + size.y) * scale * 0.25),
    halfExtentZ,
    supportHeightAt,
  }
}

function makeBoard(
  dimensions: [number, number, number],
  material: THREE.Material | THREE.Material[],
  position: [number, number, number],
  radius = 0.035,
  segments = 2,
) {
  const safeRadius = Math.min(radius, Math.min(...dimensions) * 0.22)
  const board = new THREE.Mesh(new RoundedBoxGeometry(...dimensions, segments, safeRadius), material)
  board.position.set(...position)
  board.castShadow = true
  board.receiveShadow = true
  return board
}

function configureMap(texture: THREE.Texture, isColor: boolean, anisotropy: number) {
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = anisotropy
  return texture
}

function cloneMap(texture: THREE.Texture, axis: BoardAxis, repeats: number) {
  const clone = texture.clone()
  clone.wrapS = THREE.RepeatWrapping
  clone.wrapT = THREE.RepeatWrapping
  clone.repeat.set(axis === 'horizontal' ? repeats : 1, axis === 'vertical' ? repeats : 1)
  clone.needsUpdate = true
  return clone
}

function boardMaterials(
  maps: WoodMaps,
  axis: BoardAxis,
  length: number,
  width: number,
  tint: THREE.ColorRepresentation,
) {
  const repeats = Math.max(1, length / Math.max(width * 8, 0.001))
  const longGrain = new THREE.MeshStandardMaterial({
    map: cloneMap(maps.diffuse, axis, repeats),
    normalMap: cloneMap(maps.normal, axis, repeats),
    roughnessMap: cloneMap(maps.roughness, axis, repeats),
    normalScale: new THREE.Vector2(0.10, 0.10),
    color: tint,
    roughness: 0.96,
    metalness: 0,
  })
  // RoundedBoxGeometry creates six material groups. A material array would
  // multiply every board into six draw calls even though the structural ends
  // are buried in joints. One continuous mapped material retains the visible
  // grain/normal/roughness treatment and keeps the live threshold economical.
  return longGrain
}

export function FarmScene({ progressRef, onStateChange, onPresented, onBirdActivate }: FarmSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const birdButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const sceneHost = host

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      sceneHost.dataset.birdState = 'static'
      if (birdButtonRef.current) birdButtonRef.current.hidden = false
      onStateChange('fallback')
      onPresented(1, 'rest')
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    // A measured 1.75 candidate sharpened static diagonals but regressed the
    // software-rendered opening cadence materially. Keep the proven 1.5 cap;
    // edge improvement comes from geometry and calmer normal response.
    const pixelRatioCap = 1.5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap))
    renderer.domElement.className = 'farm-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    sceneHost.append(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 30)
    camera.position.set(0, 0.15, 7.6)

    scene.add(new THREE.HemisphereLight(0xfff0d5, 0x424a40, 1.68))
    const frontFill = new THREE.DirectionalLight(0xe8eadc, 1.15)
    frontFill.position.set(2.8, 2.4, 5.8)
    scene.add(frontFill)
    const sun = new THREE.DirectionalLight(0xffdfa6, 4.8)
    // The selected farm photograph is lit from camera-right. Keep the live
    // timber and apple on that same side of the light so the layers read as
    // one threshold rather than a foreground pasted over a backdrop.
    sun.position.set(4.8, 5.4, 4.8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -7
    sun.shadow.camera.right = 7
    sun.shadow.camera.top = 6
    sun.shadow.camera.bottom = -5
    sun.shadow.bias = -0.00025
    sun.shadow.normalBias = 0.018
    sun.target.position.set(-1.4, -1.7, 0.8)
    scene.add(sun, sun.target)
    const thresholdLight = new THREE.SpotLight(0xffcf7e, 62, 14, 0.34, 0.68, 1.35)
    thresholdLight.position.set(3.4, 4.1, 4.8)
    thresholdLight.target.position.set(-1.5, -1.6, 0.7)
    scene.add(thresholdLight, thresholdLight.target)

    const textureLoader = new THREE.TextureLoader()
    const anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
    const woodMaps: WoodVariant[] = WOOD_VARIANTS.map((variant) => ({
      diffuse: configureMap(textureLoader.load(publicAsset(`media/materials/rough-wood-${variant}-diff.jpg`)), true, anisotropy),
      normal: configureMap(textureLoader.load(publicAsset(`media/materials/rough-wood-${variant}-nor.jpg`)), false, anisotropy),
      roughness: configureMap(textureLoader.load(publicAsset(`media/materials/rough-wood-${variant}-rough.jpg`)), false, anisotropy),
      verticalDiffuse: configureMap(textureLoader.load(publicAsset(`media/materials/rough-wood-${variant}-vertical-diff.jpg`)), true, anisotropy),
      verticalNormal: configureMap(textureLoader.load(publicAsset(`media/materials/rough-wood-${variant}-vertical-nor.jpg`)), false, anisotropy),
      verticalRoughness: configureMap(textureLoader.load(publicAsset(`media/materials/rough-wood-${variant}-vertical-rough.jpg`)), false, anisotropy),
    }))
    const mapsFor = (variant: number, axis: BoardAxis): WoodMaps => axis === 'horizontal'
      ? woodMaps[variant]
      : {
          diffuse: woodMaps[variant].verticalDiffuse,
          normal: woodMaps[variant].verticalNormal,
          roughness: woodMaps[variant].verticalRoughness,
        }
    const iron = new THREE.MeshStandardMaterial({ color: 0x565e58, roughness: 0.82, metalness: 0.34 })

    const permanentFrame = new THREE.Group()
    permanentFrame.name = 'permanent-fruit-stand-frame'
    permanentFrame.add(
      makeBoard([1.08, 8.2, 0.72], boardMaterials(mapsFor(1, 'vertical'), 'vertical', 8.2, 1.08, 0xf4ead9), [-3.16, 0.3, 1.36], 0.055, 3),
      makeBoard([1.08, 8.2, 0.72], boardMaterials(mapsFor(2, 'vertical'), 'vertical', 8.2, 1.08, 0xeee2cf), [3.16, 0.3, 1.36], 0.055, 3),
      makeBoard([7.02, 0.62, 0.72], boardMaterials(mapsFor(0, 'horizontal'), 'horizontal', 7.02, 0.62, 0xf6ecda), [0, 1.78, 1.36], 0.055, 3),
      makeBoard([7.55, 0.62, 0.54], boardMaterials(mapsFor(1, 'horizontal'), 'horizontal', 7.55, 0.62, 0xf1e5d2), [0, -2.28, 1.66], 0.045, 3),
      makeBoard([7.65, 0.2, 1.62], boardMaterials(mapsFor(1, 'horizontal'), 'horizontal', 7.65, 0.2, 0xf4ead8), [0, COUNTER_TOP_Y - 0.1, 0.96], 0.035, 3),
    )
    scene.add(permanentFrame)

    const shutter = new THREE.Group()
    shutter.name = 'single-rising-shutter'
    for (let index = 0; index < 8; index += 1) {
      const variant = index % WOOD_VARIANTS.length
      const tint = index % 2 === 0 ? 0xf0e4d0 : 0xe8dac5
      shutter.add(makeBoard(
        [6.55, 0.7, 0.24],
        boardMaterials(mapsFor(variant, 'horizontal'), 'horizontal', 6.55, 0.7, tint),
        [0, -2.42 + index * 0.69, 0.54],
        0.028,
      ))
    }
    const braceLeft = makeBoard([0.28, 5.72, 0.32], boardMaterials(mapsFor(0, 'vertical'), 'vertical', 5.72, 0.28, 0xe7d8c0), [-1.84, -0.01, 0.74], 0.025)
    const braceRight = makeBoard([0.28, 5.72, 0.32], boardMaterials(mapsFor(1, 'vertical'), 'vertical', 5.72, 0.28, 0xe9dac3), [1.84, -0.01, 0.74], 0.025)
    braceLeft.rotation.z = -0.025
    braceRight.rotation.z = 0.025
    shutter.add(braceLeft, braceRight)
    shutter.position.z = SHUTTER_DEPTH_OFFSET
    scene.add(shutter)

    const trackHardware = new THREE.Group()
    trackHardware.name = 'shutter-track-hardware'
    trackHardware.add(makeBoard([0.1, 7.2, 0.12], iron, [-2.78, 0.1, 0.9], 0.018))
    trackHardware.add(makeBoard([0.1, 7.2, 0.12], iron, [2.78, 0.1, 0.9], 0.018))
    trackHardware.position.z = TRACK_DEPTH_OFFSET
    scene.add(trackHardware)

    let apple: PreparedApple | undefined
    let bird: THREE.Group | undefined
    let birdShadow: THREE.Mesh | undefined
    let birdMixer: THREE.AnimationMixer | undefined
    let birdReactionUntil = 0
    let birdIdlePulseStart = 0
    let birdIdlePulseUntil = 0
    let nextBirdIdleAt = performance.now() + 4200
    let birdIdleCount = 0
    let disposed = false
    let frame = 0
    let idleTimer = 0
    let renderEnabled = true
    let heroVisible = true
    let clearanceSweepCache: { appleScale: number; frameScaleX: number; minimum: number; maxCounterPenetration: number } | undefined

    function requestRender() {
      if (!renderEnabled || !heroVisible || document.hidden || !apple) return
      if (!frame) frame = requestAnimationFrame(render)
    }

    function scheduleIdleRender(delay = 110) {
      window.clearTimeout(idleTimer)
      if (!renderEnabled || !heroVisible || document.hidden || !bird) return
      const now = performance.now()
      if (now >= nextBirdIdleAt && now >= birdIdlePulseUntil) {
        birdIdlePulseStart = now
        birdIdlePulseUntil = now + 680
        birdIdleCount += 1
        nextBirdIdleAt = birdIdlePulseUntil + (birdIdleCount % 2 ? 4700 : 5600)
      }
      const wait = now < birdIdlePulseUntil ? delay : Math.max(80, nextBirdIdleAt - now)
      idleTimer = window.setTimeout(requestRender, wait)
    }

    const onBirdReaction = () => {
      birdReactionUntil = performance.now() + 720
      requestRender()
    }
    sceneHost.addEventListener('farmbirdreaction', onBirdReaction)

    const loader = new GLTFLoader()
    loader.load(
      APPLE_URL,
      (gltf) => {
        if (disposed) return
        apple = prepareApple(gltf.scene)
        scene.add(apple.group)
        render()
        onStateChange('ready')
      },
      undefined,
      () => {
        if (!disposed) {
          onStateChange('fallback')
          onPresented(1, 'rest')
        }
      },
    )

    loader.load(
      BIRD_URL,
      (gltf) => {
        if (disposed) return
        const model = gltf.scene
        const bounds = new THREE.Box3().setFromObject(model)
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())
        const scale = 0.76 / Math.max(size.y, 0.001)
        model.scale.setScalar(scale)
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
        const birdTexture = textureLoader.load(BIRD_TEXTURE_URL, requestRender)
        birdTexture.colorSpace = THREE.SRGBColorSpace
        birdTexture.anisotropy = anisotropy
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return
          child.castShadow = false
          child.receiveShadow = true
          child.frustumCulled = false
          const material = new THREE.MeshStandardMaterial({
            map: birdTexture,
            color: 0xffffff,
            roughness: 0.86,
            metalness: 0,
            envMapIntensity: 0.16,
            side: THREE.FrontSide,
          })
          child.material = material
        })
        bird = new THREE.Group()
        bird.name = 'supported-bird'
        bird.add(model)
        scene.add(bird)
        const shadowCanvas = document.createElement('canvas')
        shadowCanvas.width = 128
        shadowCanvas.height = 64
        const shadowContext = shadowCanvas.getContext('2d')
        const shadowGradient = shadowContext?.createRadialGradient(64, 32, 3, 64, 32, 58)
        shadowGradient?.addColorStop(0, 'rgba(20, 16, 10, .34)')
        shadowGradient?.addColorStop(.48, 'rgba(20, 16, 10, .2)')
        shadowGradient?.addColorStop(1, 'rgba(20, 16, 10, 0)')
        if (shadowContext && shadowGradient) {
          shadowContext.fillStyle = shadowGradient
          shadowContext.fillRect(0, 0, 128, 64)
        }
        const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
        birdShadow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.92, 0.48),
          new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
        )
        birdShadow.rotation.x = -Math.PI / 2
        birdShadow.renderOrder = 4
        scene.add(birdShadow)
        if (gltf.animations[0]) {
          birdMixer = new THREE.AnimationMixer(model)
          const action = birdMixer.clipAction(gltf.animations[0])
          action.play()
        }
        sceneHost.dataset.birdState = 'ready'
        sceneHost.dataset.birdSource = 'bird-orange.glb'
        sceneHost.dataset.birdTake = gltf.animations[0]?.name ?? 'none'
        requestRender()
      },
      undefined,
      () => {
        if (disposed) return
        sceneHost.dataset.birdState = 'static'
        if (birdButtonRef.current) birdButtonRef.current.hidden = false
        requestRender()
      },
    )

    const resize = () => {
      const width = Math.max(sceneHost.clientWidth, 1)
      const height = Math.max(sceneHost.clientHeight, 1)
      renderer.setSize(width, height, false)
      const context = renderer.getContext()
      const attributes = context.getContextAttributes()
      sceneHost.dataset.contextAntialias = attributes?.antialias ? 'true' : 'false'
      sceneHost.dataset.contextSamples = String(context.getParameter(context.SAMPLES) ?? 0)
      sceneHost.dataset.pixelRatio = renderer.getPixelRatio().toFixed(2)
      sceneHost.dataset.pixelRatioCap = pixelRatioCap.toFixed(2)
      sceneHost.dataset.drawingBuffer = `${renderer.domElement.width}x${renderer.domElement.height}`
      camera.aspect = width / height
      const view = marketView(width, height, 1)
      camera.fov = view.fov
      camera.updateProjectionMatrix()
      document.documentElement.style.setProperty('--orchard-position-x', `${view.orchard.xPercent}%`)
      document.documentElement.style.setProperty('--orchard-position-y', `${view.orchard.yPercent}%`)
      document.documentElement.style.setProperty('--orchard-scale', String(view.orchard.scale))
      requestRender()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(sceneHost)

    const counterNormal = new THREE.Vector3(0, 1, 0)
    const travelDirection = new THREE.Vector3(-1, 0, 0)
    const rollingAxis = counterNormal.clone().cross(travelDirection).normalize()
    const rollingQuaternion = new THREE.Quaternion()
    const birdBounds = new THREE.Box3()
    const debugParameters = import.meta.env.DEV ? new URLSearchParams(location.search) : null
    const debugClearance = debugParameters?.get('debugAppleClearance') ?? null
    const debugProgressValue = debugParameters?.get('debugProgress')
    const requestedDebugProgress = Number(debugProgressValue)
    const debugProgress = debugProgressValue !== null && debugProgressValue !== undefined && Number.isFinite(requestedDebugProgress)
      ? THREE.MathUtils.clamp(requestedDebugProgress, 0, 1)
      : null

    function render() {
      frame = 0
      if (!apple || document.hidden || !heroVisible) return
      const state = evaluateMarketOpening(debugProgress ?? progressRef.current ?? 0)
      const view = marketView(sceneHost.clientWidth, sceneHost.clientHeight, state.cameraPullback)
      const { portrait, frameScaleX } = view
      camera.fov = view.fov
      camera.updateProjectionMatrix()

      if (debugClearance === 'side') {
        camera.position.set(-7.8, -0.65, 0.78)
        camera.lookAt(-3.12, -1.55, 0.78)
      } else if (debugClearance === 'top') {
        camera.position.set(-2.3, 7.8, 0.72)
        camera.lookAt(-2.3, -1.5, 0.72)
      } else {
        camera.position.set(view.camera.x, view.camera.y, view.camera.z)
        camera.lookAt(view.target.x, view.target.y, view.target.z)
      }

      permanentFrame.scale.x = frameScaleX
      trackHardware.scale.x = frameScaleX
      shutter.scale.x = frameScaleX
      shutter.position.y = state.shutterLift * (portrait ? 6.55 : 6.15)
      thresholdLight.intensity = THREE.MathUtils.lerp(62, 38, state.shutterLift)

      const appleScale = portrait ? 0.8 : 1
      const appleStartX = portrait ? -0.2 : -1.28
      const appleEndX = portrait ? -1.5 : -3.18 * frameScaleX
      const appleX = THREE.MathUtils.lerp(appleStartX, appleEndX, state.appleRoll)
      const distance = appleStartX - appleX
      const rollAngle = distance / (apple.effectiveRadius * appleScale)
      const postRearZ = 1.36 - 0.72 / 2
      const appleLaneZ = Math.min(0.62, postRearZ - apple.halfExtentZ * appleScale - 0.09)
      const appleClearance = postRearZ - (appleLaneZ + apple.halfExtentZ * appleScale)
      const appleFrontZ = appleLaneZ + apple.halfExtentZ * appleScale
      const appleRearZ = appleLaneZ - apple.halfExtentZ * appleScale
      const shutterFrontZ = SHUTTER_DEPTH_OFFSET + 0.74 + 0.32 / 2
      const trackFrontZ = TRACK_DEPTH_OFFSET + 0.9 + 0.12 / 2
      const fasciaRearZ = 1.66 - 0.54 / 2
      const shutterClearance = appleRearZ - shutterFrontZ
      const trackClearance = appleRearZ - trackFrontZ
      const fasciaClearance = fasciaRearZ - appleFrontZ
      const supportY = COUNTER_TOP_Y + apple.supportHeightAt(rollAngle) * appleScale
      const counterPenetration = COUNTER_TOP_Y - (supportY - apple.supportHeightAt(rollAngle) * appleScale)
      const assemblyClearance = Math.min(appleClearance, shutterClearance, trackClearance, fasciaClearance)
      if (!clearanceSweepCache || clearanceSweepCache.appleScale !== appleScale || clearanceSweepCache.frameScaleX !== frameScaleX) {
        let maxCounterPenetration = 0
        for (let sample = 0; sample <= 100; sample += 1) {
          const sampledState = evaluateMarketOpening(sample / 100)
          const sampledX = THREE.MathUtils.lerp(appleStartX, appleEndX, sampledState.appleRoll)
          const sampledDistance = appleStartX - sampledX
          const sampledAngle = sampledDistance / (apple.effectiveRadius * appleScale)
          const sampledSupport = COUNTER_TOP_Y + apple.supportHeightAt(sampledAngle) * appleScale
          maxCounterPenetration = Math.max(maxCounterPenetration, Math.abs(COUNTER_TOP_Y - (sampledSupport - apple.supportHeightAt(sampledAngle) * appleScale)))
        }
        clearanceSweepCache = { appleScale, frameScaleX, minimum: assemblyClearance, maxCounterPenetration }
      }
      apple.group.scale.setScalar(appleScale)
      apple.group.position.set(appleX, supportY, appleLaneZ)
      apple.group.quaternion.copy(rollingQuaternion.setFromAxisAngle(rollingAxis, rollAngle))

      if (bird) {
        const entrance = THREE.MathUtils.smoothstep(state.progress, 0.43, 0.86)
        const hopPosition = entrance * 3
        const hopIndex = Math.min(2, Math.floor(hopPosition))
        const hopLocal = entrance >= 1 ? 1 : hopPosition - hopIndex
        const hopArc = entrance > 0 && entrance < 1 ? Math.sin(hopLocal * Math.PI) * (0.2 - hopIndex * 0.025) : 0
        const birdEntryX = portrait ? 1.88 : 3.92 * frameScaleX
        // Portrait's photo cluster fills the right side of the counter. Let the
        // same right-origin entrance cross to an unobstructed left-hand perch
        // instead of placing the bird under a link's hit area.
        const birdPerchX = portrait ? -0.57 : 1.92 * frameScaleX
        const birdX = THREE.MathUtils.lerp(birdEntryX, birdPerchX, entrance)
        const reacting = performance.now() < birdReactionUntil
        const reactionPhase = reacting ? 1 - Math.max(0, birdReactionUntil - performance.now()) / 720 : 0
        const reactionLift = reacting ? Math.sin(reactionPhase * Math.PI) * 0.09 : 0
        bird.visible = entrance > 0.012
        if (birdShadow) {
          birdShadow.visible = bird.visible
          birdShadow.position.set(birdX, COUNTER_TOP_Y + 0.032, 1.19)
          const shadowScale = 1 - Math.min(0.46, (hopArc + reactionLift) * 1.45)
          birdShadow.scale.setScalar(shadowScale)
        }
        const expectedFootY = COUNTER_TOP_Y + hopArc + reactionLift
        bird.position.set(birdX, expectedFootY, 1.19)
        bird.rotation.set(0.13, entrance < 1 ? -0.22 : -0.52, reacting ? Math.sin(reactionPhase * Math.PI * 2) * 0.055 : 0)
        const idlePulse = performance.now() < birdIdlePulseUntil
          ? (performance.now() - birdIdlePulseStart) / 680
          : 0
        const idleTime = entrance < 1 ? 1.05 + entrance * 0.55 : idlePulse ? 1.35 + idlePulse * 0.62 : 1.35
        birdMixer?.setTime(reacting ? 0.36 + reactionPhase * 0.62 : idleTime)
        bird.updateMatrixWorld(true)
        birdBounds.setFromObject(bird)
        bird.position.y += expectedFootY - birdBounds.min.y
        bird.updateMatrixWorld(true)
        birdBounds.setFromObject(bird)

        const button = birdButtonRef.current
        if (button && bird.visible) {
          let minimumX = Number.POSITIVE_INFINITY
          let maximumX = Number.NEGATIVE_INFINITY
          let minimumY = Number.POSITIVE_INFINITY
          let maximumY = Number.NEGATIVE_INFINITY
          const corner = new THREE.Vector3()
          for (const x of [birdBounds.min.x, birdBounds.max.x]) {
            for (const y of [birdBounds.min.y, birdBounds.max.y]) {
              for (const z of [birdBounds.min.z, birdBounds.max.z]) {
                corner.set(x, y, z).project(camera)
                const screenX = (corner.x * 0.5 + 0.5) * sceneHost.clientWidth
                const screenY = (-corner.y * 0.5 + 0.5) * sceneHost.clientHeight
                minimumX = Math.min(minimumX, screenX)
                maximumX = Math.max(maximumX, screenX)
                minimumY = Math.min(minimumY, screenY)
                maximumY = Math.max(maximumY, screenY)
              }
            }
          }
          const padding = 6
          button.style.left = `${minimumX - padding}px`
          button.style.top = `${minimumY - padding}px`
          button.style.width = `${Math.max(44, maximumX - minimumX + padding * 2)}px`
          button.style.height = `${Math.max(44, maximumY - minimumY + padding * 2)}px`
          button.hidden = entrance < 0.96
        }
        const footError = Math.abs(birdBounds.min.y - expectedFootY)
        sceneHost.dataset.birdPhase = entrance >= 1 ? (reacting ? 'reacting' : 'perched') : entrance > 0 ? `hop-${hopIndex + 1}` : 'waiting'
        sceneHost.dataset.birdEntrance = entrance.toFixed(4)
        sceneHost.dataset.birdX = birdX.toFixed(3)
        sceneHost.dataset.birdSupportY = COUNTER_TOP_Y.toFixed(3)
        sceneHost.dataset.birdFootY = birdBounds.min.y.toFixed(4)
        sceneHost.dataset.birdFootContactError = footError.toFixed(4)
        sceneHost.dataset.birdAffectsApple = 'false'
      }

      renderer.render(scene, camera)
      sceneHost.dataset.scene = state.shot
      sceneHost.dataset.requestedProgress = state.progress.toFixed(4)
      sceneHost.dataset.presentedProgress = state.progress.toFixed(4)
      sceneHost.dataset.drawCalls = String(renderer.info.render.calls)
      sceneHost.dataset.triangles = String(renderer.info.render.triangles)
      sceneHost.dataset.renderCount = String(Number(sceneHost.dataset.renderCount ?? 0) + 1)
      sceneHost.dataset.shutterLift = state.shutterLift.toFixed(4)
      sceneHost.dataset.appleRoll = state.appleRoll.toFixed(4)
      sceneHost.dataset.appleTravel = distance.toFixed(4)
      sceneHost.dataset.appleRotation = rollAngle.toFixed(4)
      sceneHost.dataset.appleEffectiveRadius = (apple.effectiveRadius * appleScale).toFixed(4)
      sceneHost.dataset.appleX = appleX.toFixed(3)
      sceneHost.dataset.appleZ = appleLaneZ.toFixed(3)
      sceneHost.dataset.appleHalfExtentZ = (apple.halfExtentZ * appleScale).toFixed(3)
      sceneHost.dataset.postRearZ = postRearZ.toFixed(3)
      sceneHost.dataset.appleClearance = appleClearance.toFixed(3)
      sceneHost.dataset.shutterClearance = shutterClearance.toFixed(3)
      sceneHost.dataset.trackClearance = trackClearance.toFixed(3)
      sceneHost.dataset.fasciaClearance = fasciaClearance.toFixed(3)
      sceneHost.dataset.counterPenetration = counterPenetration.toFixed(4)
      sceneHost.dataset.assemblyMinClearance = assemblyClearance.toFixed(3)
      sceneHost.dataset.clearanceSweepSamples = '101'
      sceneHost.dataset.clearanceSweepMin = clearanceSweepCache.minimum.toFixed(3)
      sceneHost.dataset.clearanceSweepMaxCounterPenetration = clearanceSweepCache.maxCounterPenetration.toFixed(4)
      sceneHost.dataset.appleCollisionFree = assemblyClearance > 0 ? 'true' : 'false'
      sceneHost.dataset.cameraFov = view.fov.toFixed(2)
      sceneHost.dataset.cameraPosition = `${view.camera.x.toFixed(3)},${view.camera.y.toFixed(3)},${view.camera.z.toFixed(3)}`
      sceneHost.dataset.cameraTarget = `${view.target.x.toFixed(3)},${view.target.y.toFixed(3)},${view.target.z.toFixed(3)}`
      sceneHost.dataset.counterY = COUNTER_TOP_Y.toFixed(3)
      sceneHost.dataset.frame = 'permanent'
      if (debugProgress !== null) sceneHost.dataset.debugProgress = debugProgress.toFixed(4)
      sceneHost.dataset.rendering = 'active'
      onPresented(state.progress, state.shot)
      if (bird && state.progress >= 1) {
        if (performance.now() < birdReactionUntil || performance.now() < birdIdlePulseUntil) {
          frame = requestAnimationFrame(render)
        } else {
          scheduleIdleRender()
        }
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        window.clearTimeout(idleTimer)
        frame = 0
      } else requestRender()
    }
    const onProgress = () => requestRender()
    const onContextLost = (event: Event) => {
      event.preventDefault()
      renderEnabled = false
      cancelAnimationFrame(frame)
      frame = 0
      onStateChange('fallback')
      onPresented(1, 'rest')
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('farmstageprogress', onProgress)
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting
      sceneHost.dataset.rendering = heroVisible ? 'active' : 'paused'
      if (heroVisible) requestRender()
      else {
        cancelAnimationFrame(frame)
        window.clearTimeout(idleTimer)
        frame = 0
      }
    }, { rootMargin: '80px 0px' })
    intersectionObserver.observe(sceneHost)

    return () => {
      disposed = true
      renderEnabled = false
      cancelAnimationFrame(frame)
      window.clearTimeout(idleTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('farmstageprogress', onProgress)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      sceneHost.removeEventListener('farmbirdreaction', onBirdReaction)
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      const disposedGeometries = new Set<THREE.BufferGeometry>()
      const disposedMaterials = new Set<THREE.Material>()
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        if (!disposedGeometries.has(object.geometry)) {
          object.geometry.dispose()
          disposedGeometries.add(object.geometry)
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          if (disposedMaterials.has(material)) return
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) value.dispose()
          })
          material.dispose()
          disposedMaterials.add(material)
        })
      })
      woodMaps.forEach((variant) => Object.values(variant).forEach((texture) => texture.dispose()))
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onPresented, onStateChange, progressRef])

  return (
    <>
      <div ref={hostRef} className="scene-host" data-testid="scene-host" />
      <button
        ref={birdButtonRef}
        className="bird-hit"
        type="button"
        hidden
        aria-label="Hear the bird chirp"
        onClick={() => {
          hostRef.current?.dispatchEvent(new Event('farmbirdreaction'))
          onBirdActivate()
        }}
      >
        <img src={publicAsset('media/bird-orange-perch.webp')} alt="" />
      </button>
    </>
  )
}
