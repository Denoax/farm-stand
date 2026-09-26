import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { HeroProductId } from '../content/config'

type SceneState = 'loading' | 'ready' | 'fallback'

interface FarmSceneProps {
  progressRef: React.RefObject<number>
  selectedProduct: HeroProductId
  onStateChange: (state: SceneState) => void
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const MODEL_URLS = {
  apple: publicAsset('models/food_apple_01/food_apple_01_1k.gltf'),
  onion: publicAsset('models/yellow_onion/yellow_onion_1k.gltf'),
} as const

function prepareModel(model: THREE.Object3D, targetHeight: number) {
  const bounds = new THREE.Box3().setFromObject(model)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const scale = targetHeight / Math.max(size.y, 0.001)

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace
          material.envMapIntensity = 0.32
          material.needsUpdate = true
        }
      })
    }
  })

  const group = new THREE.Group()
  group.add(model)
  return group
}

function crateBoard(
  dimensions: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material)
  board.position.set(...position)
  board.castShadow = true
  board.receiveShadow = true
  return board
}

export function FarmScene({ progressRef, selectedProduct, onStateChange }: FarmSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef(selectedProduct)
  selectedRef.current = selectedProduct

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('farmsceneselection'))
  }, [selectedProduct])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const sceneHost = host

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      onStateChange('fallback')
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.domElement.className = 'farm-canvas'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    sceneHost.append(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30)
    camera.position.set(0, 2.05, 7.3)
    camera.lookAt(0, 0.2, 0)

    scene.add(new THREE.HemisphereLight(0xfff4d1, 0x355240, 1.6))
    const sun = new THREE.DirectionalLight(0xfff0c4, 5.4)
    sun.position.set(-4.5, 7.5, 4)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -6
    sun.shadow.camera.right = 6
    sun.shadow.camera.top = 6
    sun.shadow.camera.bottom = -3
    sun.shadow.bias = -0.0004
    scene.add(sun)

    const stillLife = new THREE.Group()
    scene.add(stillLife)

    const woodTexture = new THREE.TextureLoader().load(publicAsset('media/crate-wood.webp'))
    woodTexture.colorSpace = THREE.SRGBColorSpace
    woodTexture.wrapS = THREE.RepeatWrapping
    woodTexture.wrapT = THREE.RepeatWrapping
    woodTexture.repeat.set(1.4, 1.4)
    woodTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xb28b65, roughness: 0.9, metalness: 0 })
    const woodEdge = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0x755237, roughness: 0.95, metalness: 0 })
    const crate = new THREE.Group()
    crate.add(
      crateBoard([3.7, 0.14, 1.8], [0, -0.72, 0], wood),
      crateBoard([3.8, 0.22, 0.13], [0, -0.25, -0.9], woodEdge),
      crateBoard([3.8, 0.2, 0.13], [0, 0.2, -0.9], wood),
      crateBoard([0.14, 0.95, 1.9], [-1.87, -0.27, 0], woodEdge),
      crateBoard([0.14, 0.95, 1.9], [1.87, -0.27, 0], woodEdge),
    )
    crate.rotation.x = -0.025
    stillLife.add(crate)

    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(5.7, 2.6),
      new THREE.ShadowMaterial({ color: 0x1c241a, opacity: 0.38 }),
    )
    contact.rotation.x = -Math.PI / 2
    contact.position.y = -0.79
    contact.receiveShadow = true
    stillLife.add(contact)

    const modelGroups: Partial<Record<HeroProductId, THREE.Group>> = {}
    let disposed = false
    const loader = new GLTFLoader()
    const loadModel = (id: HeroProductId, url: string, height: number) =>
      new Promise<void>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            if (disposed) return
            const group = prepareModel(gltf.scene, height)
            modelGroups[id] = group
            stillLife.add(group)
            resolve()
          },
          undefined,
          reject,
        )
      })

    Promise.all([
      loadModel('apple', MODEL_URLS.apple, 1.34),
      loadModel('onion', MODEL_URLS.onion, 1.13),
    ])
      .then(() => {
        if (!disposed) {
          onStateChange('ready')
          requestRender()
        }
      })
      .catch(() => {
        if (!disposed) onStateChange('fallback')
      })

    let frame = 0
    let renderEnabled = true
    let heroVisible = true
    let selectionAnimationStart: number | null = null
    let appleStartScale = 1
    let onionStartScale = 1
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const resize = () => {
      const width = sceneHost.clientWidth
      const height = sceneHost.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      requestRender()
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(sceneHost)

    function requestRender() {
      if (!renderEnabled || !heroVisible || document.hidden) return
      if (!frame) frame = requestAnimationFrame(render)
    }
    function render(now: number) {
      frame = 0
      if (document.hidden || !heroVisible) return
      const progress = progressRef.current ?? 0
      const portrait = sceneHost.clientWidth < 700
      const selected = selectedRef.current

      stillLife.position.x = THREE.MathUtils.lerp(portrait ? 0.12 : 1.45, portrait ? 0 : -1.05, progress)
      stillLife.position.y = portrait ? THREE.MathUtils.lerp(-0.2, 1.05, progress) : -0.05
      stillLife.position.z = THREE.MathUtils.lerp(0.25, -0.05, progress)
      stillLife.rotation.y = THREE.MathUtils.lerp(-0.08, 0.05, progress)
      const sceneScale = portrait ? 0.7 : 1
      stillLife.scale.setScalar(sceneScale)

      const apple = modelGroups.apple
      const onion = modelGroups.onion
      const selectionDuration = reducedMotion.matches ? 0 : 260
      const selectionProgress = selectionAnimationStart === null || selectionDuration === 0
        ? 1
        : Math.min(1, (now - selectionAnimationStart) / selectionDuration)
      const easedSelection = 1 - Math.pow(1 - selectionProgress, 3)

      if (apple) {
        apple.position.set(-0.42, -0.7, 0.08)
        apple.rotation.y = -0.28
        const target = selected === 'apple' ? 1.05 : 0.94
        const scale = THREE.MathUtils.lerp(appleStartScale, target, easedSelection)
        apple.scale.setScalar(selectionProgress === 1 ? target : scale)
      }
      if (onion) {
        onion.position.set(0.82, -0.7, -0.03)
        onion.rotation.y = 0.36
        const target = selected === 'onion' ? 1.08 : 0.94
        const scale = THREE.MathUtils.lerp(onionStartScale, target, easedSelection)
        onion.scale.setScalar(selectionProgress === 1 ? target : scale)
      }

      camera.position.x = THREE.MathUtils.lerp(0, 0.32, progress)
      camera.position.y = THREE.MathUtils.lerp(portrait ? 2.35 : 2.05, portrait ? 2.1 : 1.92, progress)
      camera.lookAt(0, portrait ? 0.15 : 0.05, 0)
      renderer.render(scene, camera)
      sceneHost.dataset.drawCalls = String(renderer.info.render.calls)
      sceneHost.dataset.triangles = String(renderer.info.render.triangles)
      sceneHost.dataset.renderCount = String(Number(sceneHost.dataset.renderCount ?? 0) + 1)
      sceneHost.dataset.rendering = 'active'
      if (selectionProgress < 1) frame = requestAnimationFrame(render)
      else selectionAnimationStart = null
    }
    requestRender()

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else {
        requestRender()
      }
    }
    const onProgress = () => requestRender()
    const onSelection = () => {
      appleStartScale = modelGroups.apple?.scale.x ?? 1
      onionStartScale = modelGroups.onion?.scale.x ?? 1
      selectionAnimationStart = performance.now()
      requestRender()
    }
    const onMotionChange = () => {
      selectionAnimationStart = null
      requestRender()
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      renderEnabled = false
      cancelAnimationFrame(frame)
      frame = 0
      onStateChange('fallback')
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('farmstageprogress', onProgress)
    window.addEventListener('farmsceneselection', onSelection)
    reducedMotion.addEventListener('change', onMotionChange)
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
      window.removeEventListener('farmsceneselection', onSelection)
      reducedMotion.removeEventListener('change', onMotionChange)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            Object.values(material).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose()
            })
            material.dispose()
          })
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onStateChange, progressRef])

  return <div ref={hostRef} className="scene-host" data-testid="scene-host" />
}
