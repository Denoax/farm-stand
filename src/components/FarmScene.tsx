import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { evaluateMarketOpening } from '../scene/marketOpeningShot'

type SceneState = 'loading' | 'ready' | 'fallback'

interface FarmSceneProps {
  progressRef: React.RefObject<number>
  motionPaused: boolean
  onStateChange: (state: SceneState) => void
  onPresented: (progress: number, shot: string) => void
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
const APPLE_URL = publicAsset('models/food_apple_01/food_apple_01_1k.gltf')

function prepareApple(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const scale = 0.5 / Math.max(size.y, 0.001)

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
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

  const group = new THREE.Group()
  group.add(model)
  return group
}

function makeBoard(
  dimensions: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material)
  board.position.set(...position)
  board.castShadow = true
  board.receiveShadow = true
  return board
}

export function FarmScene({ progressRef, motionPaused, onStateChange, onPresented }: FarmSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const motionPausedRef = useRef(motionPaused)
  motionPausedRef.current = motionPaused

  useEffect(() => {
    window.dispatchEvent(new Event('farmstageprogress'))
  }, [motionPaused])

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
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.domElement.className = 'farm-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    sceneHost.append(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 30)
    camera.position.set(0, 0.15, 7.6)

    scene.add(new THREE.HemisphereLight(0xffe9b7, 0x18251f, 1.15))
    const sun = new THREE.DirectionalLight(0xffd583, 5.7)
    sun.position.set(-4.8, 5.4, 4.8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -7
    sun.shadow.camera.right = 7
    sun.shadow.camera.top = 6
    sun.shadow.camera.bottom = -5
    sun.shadow.bias = -0.00025
    scene.add(sun)
    const thresholdLight = new THREE.SpotLight(0xffc867, 72, 14, 0.34, 0.68, 1.35)
    thresholdLight.position.set(-3.4, 4.1, 4.8)
    thresholdLight.target.position.set(-1.8, -1.8, 0.5)
    scene.add(thresholdLight, thresholdLight.target)

    const textureLoader = new THREE.TextureLoader()
    const woodTexture = textureLoader.load(publicAsset('media/crate-wood.webp'))
    woodTexture.colorSpace = THREE.SRGBColorSpace
    woodTexture.wrapS = THREE.RepeatWrapping
    woodTexture.wrapT = THREE.RepeatWrapping
    woodTexture.repeat.set(2.8, 0.75)
    woodTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)

    const shutterWood = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0x65462f, roughness: 0.94, metalness: 0 })
    const shutterEdge = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0x2f2119, roughness: 0.97, metalness: 0 })
    const counterWood = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0x8a684b, roughness: 0.9, metalness: 0 })
    const passageWood = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xa77a54, roughness: 0.9, metalness: 0 })
    const iron = new THREE.MeshStandardMaterial({ color: 0x202622, roughness: 0.72, metalness: 0.45 })

    const shutter = new THREE.Group()
    for (let index = 0; index < 8; index += 1) {
      shutter.add(makeBoard([12.8, 0.72, 0.22], index % 2 === 0 ? shutterWood : shutterEdge, [0, -2.42 + index * 0.7, 0]))
    }
    const braceLeft = makeBoard([0.3, 5.8, 0.34], shutterEdge, [-3.6, 0.02, 0.19])
    const braceRight = makeBoard([0.3, 5.8, 0.34], shutterEdge, [3.6, 0.02, 0.19])
    braceLeft.rotation.z = -0.03
    braceRight.rotation.z = 0.03
    shutter.add(braceLeft, braceRight)
    scene.add(shutter)

    const threshold = new THREE.Group()
    threshold.add(makeBoard([13.2, 1.02, 1.52], counterWood, [0, -2.57, 0.68]))
    threshold.add(makeBoard([13.4, 0.16, 1.7], shutterEdge, [0, -2.02, 0.7]))
    threshold.add(makeBoard([0.34, 8.6, 0.42], iron, [-5.55, 0.15, -0.02]))
    threshold.add(makeBoard([0.34, 8.6, 0.42], iron, [5.55, 0.15, -0.02]))
    scene.add(threshold)

    const passage = new THREE.Group()
    passage.position.set(0, 7.5, 4.15)
    passage.add(makeBoard([14.5, 6.9, 1.15], passageWood, [0, 0, 0]))
    passage.add(makeBoard([0.28, 7.05, 0.18], iron, [0, 0, 0.66]))
    passage.add(makeBoard([0.24, 7.05, 0.18], iron, [-3.45, 0, 0.66]))
    passage.add(makeBoard([0.24, 7.05, 0.18], iron, [3.45, 0, 0.66]))
    const boltGeometry = new THREE.SphereGeometry(0.1, 16, 8)
    for (const x of [-3.45, 0, 3.45]) {
      for (const y of [-2.25, 0, 2.25]) {
        const bolt = new THREE.Mesh(boltGeometry, iron)
        bolt.position.set(x, y, 0.82)
        passage.add(bolt)
      }
    }
    scene.add(passage)

    const contact = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 40),
      new THREE.MeshBasicMaterial({ color: 0x20150e, transparent: true, opacity: 0.4, depthWrite: false }),
    )
    contact.scale.set(1, 0.22, 1)
    contact.position.set(-2.25, -1.91, 1.53)
    scene.add(contact)

    let apple: THREE.Group | undefined
    let disposed = false
    let frame = 0
    let renderEnabled = true
    let heroVisible = true
    let lastProgress = 0

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
        apple.position.set(-2.25, -1.94, 1.54)
        apple.rotation.set(0.02, -0.38, 0.07)
        scene.add(apple)
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

    function render() {
      frame = 0
      if (!apple || document.hidden || !heroVisible) return
      const requestedProgress = motionPausedRef.current ? lastProgress : (progressRef.current ?? 0)
      if (!motionPausedRef.current) lastProgress = requestedProgress
      const state = evaluateMarketOpening(requestedProgress)
      const portrait = sceneHost.clientWidth < 700

      camera.position.x = portrait ? 0.12 : THREE.MathUtils.lerp(0.22, 0, state.cameraPullback)
      camera.position.y = portrait ? 0.35 : THREE.MathUtils.lerp(0.12, 0.28, state.cameraPullback)
      camera.position.z = portrait ? THREE.MathUtils.lerp(8.85, 9.45, state.cameraPullback) : THREE.MathUtils.lerp(7.45, 8.15, state.cameraPullback)
      camera.lookAt(portrait ? 0.1 : 0, -0.08, 0)

      const liftDistance = portrait ? 6.8 : 6.25
      shutter.position.y = state.shutterLift * liftDistance
      shutter.position.z = THREE.MathUtils.lerp(0, -0.38, state.cameraPullback)
      shutter.scale.setScalar(1 - state.cameraPullback * 0.025)

      passage.position.y = state.passage < 1
        ? THREE.MathUtils.lerp(7.5, 0, state.passage)
        : THREE.MathUtils.lerp(0, -8.2, state.passageExit)
      passage.position.z = 4.15
      passage.rotation.x = THREE.MathUtils.lerp(-0.06, 0.04, state.passage)
      passage.visible = state.progress >= 0.46 && state.progress <= 0.68

      const underCover = state.progress >= 0.545 && state.progress <= 0.64
      threshold.visible = state.progress < 0.47
      apple.visible = !underCover && (state.progress < 0.57 || state.progress >= 0.66)
      contact.visible = apple.visible
      contact.position.x = portrait ? -0.3 : state.progress >= 0.66 ? -2.65 : -1.75
      contact.position.y = portrait ? -1.73 : state.progress >= 0.66 ? -1.95 : -1.7
      contact.position.z = state.progress >= 0.66 ? 0.64 : 1.53
      thresholdLight.intensity = THREE.MathUtils.lerp(72, 42, state.shutterLift)

      if (state.progress >= 0.66) {
        apple.position.set(portrait ? -0.3 : -2.65, portrait ? -1.76 : -1.98, 0.65)
        apple.scale.setScalar(portrait ? 0.7 : 0.92)
        apple.rotation.set(0.02, -0.31, 0.07)
      } else {
        apple.position.set(portrait ? -0.3 : -1.75, portrait ? -1.76 : -1.73, 1.54)
        apple.scale.setScalar(portrait ? 0.78 : 1)
      }

      renderer.render(scene, camera)
      sceneHost.dataset.scene = state.shot
      sceneHost.dataset.requestedProgress = state.progress.toFixed(4)
      sceneHost.dataset.presentedProgress = state.progress.toFixed(4)
      sceneHost.dataset.drawCalls = String(renderer.info.render.calls)
      sceneHost.dataset.triangles = String(renderer.info.render.triangles)
      sceneHost.dataset.renderCount = String(Number(sceneHost.dataset.renderCount ?? 0) + 1)
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
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) value.dispose()
          })
          material.dispose()
        })
      })
      woodTexture.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onPresented, onStateChange, progressRef])

  return <div ref={hostRef} className="scene-host" data-testid="scene-host" />
}
