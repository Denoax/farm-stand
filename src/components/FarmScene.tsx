import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { ProductId } from '../content/config'

type SceneState = 'loading' | 'ready' | 'fallback'

interface FarmSceneProps {
  progressRef: React.RefObject<number>
  selectedProduct: ProductId
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

    const modelGroups: Partial<Record<ProductId, THREE.Group>> = {}
    let disposed = false
    const loader = new GLTFLoader()
    const loadModel = (id: ProductId, url: string, height: number) =>
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
          requestRender(3)
        }
      })
      .catch(() => {
        if (!disposed) onStateChange('fallback')
      })

    let frame = 0
    let remainingFrames = 0
    let renderEnabled = true
    const resize = () => {
      const width = sceneHost.clientWidth
      const height = sceneHost.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      requestRender(2)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(sceneHost)

    function requestRender(frames = 1) {
      if (!renderEnabled) return
      remainingFrames = Math.max(remainingFrames, frames)
      if (!frame && !document.hidden) frame = requestAnimationFrame(render)
    }
    function render() {
      frame = 0
      if (document.hidden) return
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
      if (apple) {
        apple.position.set(-0.42, -0.7, 0.08)
        apple.rotation.y = -0.28
        const scale = selected === 'apple' ? 1.05 : 0.94
        apple.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.11)
      }
      if (onion) {
        onion.position.set(0.82, -0.7, -0.03)
        onion.rotation.y = 0.36
        const scale = selected === 'onion' ? 1.08 : 0.94
        onion.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.11)
      }

      camera.position.x = THREE.MathUtils.lerp(0, 0.32, progress)
      camera.position.y = THREE.MathUtils.lerp(portrait ? 2.35 : 2.05, portrait ? 2.1 : 1.92, progress)
      camera.lookAt(0, portrait ? 0.15 : 0.05, 0)
      renderer.render(scene, camera)
      sceneHost.dataset.drawCalls = String(renderer.info.render.calls)
      sceneHost.dataset.triangles = String(renderer.info.render.triangles)
      remainingFrames -= 1
      if (remainingFrames > 0) frame = requestAnimationFrame(render)
    }
    requestRender(2)

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame)
        frame = 0
      } else {
        requestRender(2)
      }
    }
    const onProgress = () => requestRender(2)
    const onSelection = () => requestRender(18)
    const onContextLost = (event: Event) => {
      event.preventDefault()
      renderEnabled = false
      remainingFrames = 0
      cancelAnimationFrame(frame)
      frame = 0
      onStateChange('fallback')
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('farmstageprogress', onProgress)
    window.addEventListener('farmsceneselection', onSelection)
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)

    return () => {
      disposed = true
      renderEnabled = false
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('farmstageprogress', onProgress)
      window.removeEventListener('farmsceneselection', onSelection)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
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
