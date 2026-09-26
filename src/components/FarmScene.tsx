import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { HeroProductId } from '../content/config'

type SceneState = 'loading' | 'ready' | 'fallback'

interface FarmSceneProps {
  progressRef: React.RefObject<number>
  motionPaused: boolean
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

export function FarmScene({ progressRef, motionPaused, onStateChange }: FarmSceneProps) {
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
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
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

    const landingShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x11120c, transparent: true, opacity: 0 }),
    )
    landingShadow.position.set(0, -0.67, 0.08)
    stillLife.add(landingShadow)

    const modelGroups: Partial<Record<HeroProductId, THREE.Group>> = {}
    const modelMeshes: Partial<Record<HeroProductId, THREE.Mesh[]>> = {}
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
            const materials: THREE.Material[] = []
            const meshes: THREE.Mesh[] = []
            group.traverse((child) => {
              if (!(child instanceof THREE.Mesh)) return
              meshes.push(child)
              const childMaterials = Array.isArray(child.material) ? child.material : [child.material]
              childMaterials.forEach((material) => {
                if (!materials.includes(material)) materials.push(material)
              })
            })
            modelMeshes[id] = meshes
            group.userData.localBounds = new THREE.Box3().setFromObject(group)
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
    let hostLeft = 0
    let hostTop = 0
    const projectedPoint = new THREE.Vector3()
    const projectedScale = new THREE.Vector3()
    const resize = () => {
      const width = sceneHost.clientWidth
      const height = sceneHost.clientHeight
      const bounds = sceneHost.getBoundingClientRect()
      hostLeft = bounds.left
      hostTop = bounds.top
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
    function render() {
      frame = 0
      if (document.hidden || !heroVisible) return
      const progress = motionPausedRef.current ? 1 : (progressRef.current ?? 0)
      const portrait = sceneHost.clientWidth < 700
      const standScene = progress >= 0.77
      stillLife.position.x = standScene ? (portrait ? 0 : -1.05) : 0
      stillLife.position.y = standScene ? (portrait ? 1.05 : -0.05) : 0
      stillLife.position.z = standScene ? -0.05 : 0.25
      stillLife.rotation.y = standScene ? 0.05 : -0.08
      const sceneScale = portrait ? 0.7 : 1
      stillLife.scale.setScalar(sceneScale)

      const apple = modelGroups.apple
      const onion = modelGroups.onion
      if (apple) {
        const release = THREE.MathUtils.clamp((progress - 0.16) / 0.08, 0, 1)
        const fall = THREE.MathUtils.clamp((progress - 0.24) / 0.28, 0, 1)
        const landing = THREE.MathUtils.clamp((progress - 0.52) / 0.13, 0, 1)
        const startX = portrait ? -0.1 : -0.75
        const startY = portrait ? 1.92 : 1.02
        const restX = portrait ? 0.05 : 0
        const restY = portrait ? -0.69 : -0.61
        const fallDistance = fall * fall
        const bounce = Math.sin(landing * Math.PI) * (1 - landing) * 0.14

        if (standScene) {
          apple.position.set(-0.5, -0.63, 0.1)
          apple.rotation.set(0, -0.28, 0.08)
          apple.scale.setScalar(0.92)
        } else {
          apple.position.set(
            THREE.MathUtils.lerp(startX, restX, THREE.MathUtils.smoothstep(fall, 0, 1)),
            THREE.MathUtils.lerp(startY, restY, fallDistance) + bounce,
            0.22,
          )
          apple.rotation.set(0, -0.08, release * fall * 2.15)
          apple.scale.setScalar(portrait ? 0.34 : 0.38)
        }
        apple.visible = progress < 0.7 || progress > 0.79
        modelMeshes.apple?.forEach((mesh) => {
          mesh.castShadow = standScene
        })

        const shadowMaterial = landingShadow.material as THREE.MeshBasicMaterial
        landingShadow.visible = !standScene && progress > 0.43 && progress < 0.7
        landingShadow.position.x = THREE.MathUtils.lerp(startX, restX, THREE.MathUtils.smoothstep(fall, 0, 1))
        landingShadow.scale.setScalar(0.5 + fall * 0.5)
        shadowMaterial.opacity = THREE.MathUtils.lerp(0, 0.34, THREE.MathUtils.smoothstep(fall, 0.45, 1))
      }
      if (onion) {
        onion.position.set(0.82, -0.7, -0.03)
        onion.rotation.y = 0.36
        onion.visible = standScene
        const target = 0.94
        onion.scale.setScalar(target)
      }

      crate.visible = standScene
      contact.visible = standScene
      camera.position.x = standScene ? 0.32 : 0
      camera.position.y = standScene ? (portrait ? 2.1 : 1.92) : (portrait ? 2.35 : 2.05)
      camera.lookAt(0, portrait ? 0.15 : 0.05, 0)
      camera.updateMatrixWorld()

      if (apple) {
        stillLife.updateWorldMatrix(true, true)
        const localBounds = apple.userData.localBounds as THREE.Box3
        const minimum = localBounds.min
        const maximum = localBounds.max
        let left = Number.POSITIVE_INFINITY
        let top = Number.POSITIVE_INFINITY
        let right = Number.NEGATIVE_INFINITY
        let bottom = Number.NEGATIVE_INFINITY
        for (const x of [minimum.x, maximum.x]) {
          for (const y of [minimum.y, maximum.y]) {
            for (const z of [minimum.z, maximum.z]) {
              projectedPoint.set(x, y, z).applyMatrix4(apple.matrixWorld).project(camera)
              left = Math.min(left, (projectedPoint.x + 1) * sceneHost.clientWidth / 2)
              right = Math.max(right, (projectedPoint.x + 1) * sceneHost.clientWidth / 2)
              top = Math.min(top, (1 - projectedPoint.y) * sceneHost.clientHeight / 2)
              bottom = Math.max(bottom, (1 - projectedPoint.y) * sceneHost.clientHeight / 2)
            }
          }
        }
        window.dispatchEvent(new CustomEvent('farmsceneappleframe', {
          detail: {
            left: hostLeft + left,
            top: hostTop + top,
            width: right - left,
            height: bottom - top,
            worldScale: apple.getWorldScale(projectedScale).x,
          },
        }))
      }
      renderer.render(scene, camera)
      sceneHost.dataset.drawCalls = String(renderer.info.render.calls)
      sceneHost.dataset.triangles = String(renderer.info.render.triangles)
      sceneHost.dataset.renderCount = String(Number(sceneHost.dataset.renderCount ?? 0) + 1)
      sceneHost.dataset.rendering = 'active'
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
    const onContextLost = (event: Event) => {
      event.preventDefault()
      renderEnabled = false
      cancelAnimationFrame(frame)
      frame = 0
      onStateChange('fallback')
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
