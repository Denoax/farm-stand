import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { evaluateMarketOpening } from '../scene/marketOpeningShot'

type SceneState = 'loading' | 'ready' | 'fallback'

interface FarmSceneProps {
  progressRef: React.RefObject<number>
  onStateChange: (state: SceneState) => void
  onPresented: (progress: number, shot: string) => void
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
const WOOD_VARIANTS = ['a', 'b', 'c'] as const
const COUNTER_TOP_Y = -1.9
const APPLE_SUPPORT_SAMPLES = 72

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
) {
  const safeRadius = Math.min(radius, Math.min(...dimensions) * 0.22)
  const board = new THREE.Mesh(new RoundedBoxGeometry(...dimensions, 2, safeRadius), material)
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
    normalScale: new THREE.Vector2(0.14, 0.14),
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

export function FarmScene({ progressRef, onStateChange, onPresented }: FarmSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const sceneHost = host

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      onStateChange('fallback')
      onPresented(1, 'rest')
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
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
      makeBoard([1.08, 8.2, 0.72], boardMaterials(mapsFor(1, 'vertical'), 'vertical', 8.2, 1.08, 0xf4ead9), [-3.16, 0.3, 1.36], 0.055),
      makeBoard([1.08, 8.2, 0.72], boardMaterials(mapsFor(2, 'vertical'), 'vertical', 8.2, 1.08, 0xeee2cf), [3.16, 0.3, 1.36], 0.055),
      makeBoard([7.02, 0.62, 0.72], boardMaterials(mapsFor(0, 'horizontal'), 'horizontal', 7.02, 0.62, 0xf6ecda), [0, 1.78, 1.36], 0.055),
      makeBoard([7.55, 0.62, 0.54], boardMaterials(mapsFor(1, 'horizontal'), 'horizontal', 7.55, 0.62, 0xf1e5d2), [0, -2.28, 1.66], 0.045),
      makeBoard([7.65, 0.2, 1.62], boardMaterials(mapsFor(1, 'horizontal'), 'horizontal', 7.65, 0.2, 0xf4ead8), [0, COUNTER_TOP_Y - 0.1, 0.96], 0.035),
    )
    scene.add(permanentFrame)

    // A real timber reveal sits behind the pinned photographs. The board wall
    // is part of the same set as the frame and is covered by the shutter while
    // closed, so the returned photographs have a credible mounting surface.
    const photoWall = new THREE.Group()
    photoWall.name = 'right-photo-wall'
    for (let index = 0; index < 3; index += 1) {
      photoWall.add(makeBoard(
        [0.62, 4.7, 0.18],
        boardMaterials(mapsFor(index % WOOD_VARIANTS.length, 'vertical'), 'vertical', 4.7, 0.62, index % 2 ? 0xe7dac5 : 0xefe3d0),
        [1.55 + index * 0.58, -0.18, 0.38],
        0.018,
      ))
    }
    scene.add(photoWall)

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
    scene.add(shutter)

    const trackHardware = new THREE.Group()
    trackHardware.name = 'shutter-track-hardware'
    trackHardware.add(makeBoard([0.1, 7.2, 0.12], iron, [-2.78, 0.1, 0.9], 0.018))
    trackHardware.add(makeBoard([0.1, 7.2, 0.12], iron, [2.78, 0.1, 0.9], 0.018))
    scene.add(trackHardware)

    let apple: PreparedApple | undefined
    let disposed = false
    let frame = 0
    let renderEnabled = true
    let heroVisible = true

    function requestRender() {
      if (!renderEnabled || !heroVisible || document.hidden || !apple) return
      if (!frame) frame = requestAnimationFrame(render)
    }

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

    const resize = () => {
      const width = Math.max(sceneHost.clientWidth, 1)
      const height = Math.max(sceneHost.clientHeight, 1)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      requestRender()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(sceneHost)

    const counterNormal = new THREE.Vector3(0, 1, 0)
    const travelDirection = new THREE.Vector3(-1, 0, 0)
    const rollingAxis = counterNormal.clone().cross(travelDirection).normalize()
    const rollingQuaternion = new THREE.Quaternion()
    const debugClearance = import.meta.env.DEV && new URLSearchParams(location.search).has('debugAppleClearance')

    function render() {
      frame = 0
      if (!apple || document.hidden || !heroVisible) return
      const state = evaluateMarketOpening(progressRef.current ?? 0)
      const portrait = sceneHost.clientWidth < 700
      // Widen the physical opening on broad screens instead of allowing the
      // same world-space posts to crowd an increasingly wide composition.
      const frameScaleX = portrait ? 0.48 : THREE.MathUtils.clamp(camera.aspect / 1.48, 1, 1.22)

      if (debugClearance) {
        camera.position.set(-7.8, -0.65, 0.78)
        camera.lookAt(-3.12, -1.55, 0.78)
      } else {
        camera.position.x = portrait ? 0.06 : THREE.MathUtils.lerp(0.18, 0, state.cameraPullback)
        camera.position.y = portrait ? 0.3 : THREE.MathUtils.lerp(0.12, 0.26, state.cameraPullback)
        camera.position.z = portrait ? THREE.MathUtils.lerp(8.85, 9.35, state.cameraPullback) : THREE.MathUtils.lerp(7.45, 8.05, state.cameraPullback)
        camera.lookAt(portrait ? 0.03 : 0, -0.08, 0.5)
      }

      permanentFrame.scale.x = frameScaleX
      photoWall.scale.x = frameScaleX
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
      apple.group.scale.setScalar(appleScale)
      apple.group.position.set(appleX, COUNTER_TOP_Y + apple.supportHeightAt(rollAngle) * appleScale, appleLaneZ)
      apple.group.quaternion.copy(rollingQuaternion.setFromAxisAngle(rollingAxis, rollAngle))

      const wallAnchor = new THREE.Vector3(2.13 * frameScaleX, -0.18, 0.38).project(camera)
      sceneHost.parentElement?.style.setProperty('--photo-wall-anchor-x', `${(wallAnchor.x * 0.5 + 0.5) * sceneHost.clientWidth}px`)

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
      sceneHost.dataset.appleCollisionFree = appleClearance > 0 ? 'true' : 'false'
      sceneHost.dataset.counterY = COUNTER_TOP_Y.toFixed(3)
      sceneHost.dataset.frame = 'permanent'
      sceneHost.dataset.rendering = 'active'
      onPresented(state.progress, state.shot)
    }

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
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
        frame = 0
      }
    }, { rootMargin: '80px 0px' })
    intersectionObserver.observe(sceneHost)

    return () => {
      disposed = true
      renderEnabled = false
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('farmstageprogress', onProgress)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
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

  return <div ref={hostRef} className="scene-host" data-testid="scene-host" />
}
