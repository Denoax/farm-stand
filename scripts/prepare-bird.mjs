import { execFile } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

const run = promisify(execFile)
const sourceRoot = path.resolve('assets/source/user-provided/bird-orange')
const sourceFbx = path.join(sourceRoot, 'source/BirdOrange.fbx')
const sourceTexture = path.join(sourceRoot, 'textures/BirdOrange_BaseColor.png')
const deliveryRoot = path.resolve('public/models/bird-orange')
const outputGlb = path.join(deliveryRoot, 'bird-orange.glb')
const outputTexture = path.join(deliveryRoot, 'bird-orange-base-color.webp')
const reportPath = path.resolve('evidence/bird-hop/review/bird/bird-preparation.json')

class NodeFileReader {
  result = null
  onloadend = null
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = result
      this.onloadend?.()
    })
  }
  readAsDataURL(blob) {
    void blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`
      this.onloadend?.()
    })
  }
}
globalThis.FileReader = NodeFileReader

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

const manager = new THREE.LoadingManager()
manager.addHandler(/\.(png|jpe?g)$/i, {
  path: '',
  setPath(value) { this.path = value; return this },
  load() { return new THREE.Texture() },
})

const fbxBuffer = await fs.readFile(sourceFbx)
const scene = new FBXLoader(manager).parse(fbxBuffer.buffer.slice(fbxBuffer.byteOffset, fbxBuffer.byteOffset + fbxBuffer.byteLength), path.dirname(sourceFbx))
let triangles = 0
let skinnedMeshes = 0
let removedTailTriangles = 0
const removedRigLines = []
scene.traverse((object) => {
  if (object.isLine) {
    removedRigLines.push(object)
    object.material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    return
  }
  if (!object.isMesh) return
  const sourceGeometry = object.geometry
  const position = sourceGeometry.attributes.position
  if (!sourceGeometry.index && position) {
    const triangleCount = position.count / 3
    const key = (vertex) => `${position.getX(vertex).toFixed(5)},${position.getY(vertex).toFixed(5)},${position.getZ(vertex).toFixed(5)}`
    const byVertex = new Map()
    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      for (let corner = 0; corner < 3; corner += 1) {
        const vertexKey = key(triangle * 3 + corner)
        if (!byVertex.has(vertexKey)) byVertex.set(vertexKey, [])
        byVertex.get(vertexKey).push(triangle)
      }
    }
    const remaining = new Set(Array.from({ length: triangleCount }, (_, index) => index))
    const excluded = new Set()
    while (remaining.size) {
      const seed = remaining.values().next().value
      const queue = [seed]
      const component = []
      remaining.delete(seed)
      let maximumZ = -Infinity
      while (queue.length) {
        const triangle = queue.pop()
        component.push(triangle)
        for (let corner = 0; corner < 3; corner += 1) {
          const vertex = triangle * 3 + corner
          maximumZ = Math.max(maximumZ, position.getZ(vertex))
          for (const neighbor of byVertex.get(key(vertex))) if (remaining.delete(neighbor)) queue.push(neighbor)
        }
      }
      // Five disconnected, identically sized rear feathers lie flat around
      // the feet in the supplied take and read as a neon ring from this camera.
      // The untouched FBX remains archived; the public derivative omits only
      // those rear components rather than recolouring or replacing the bird.
      if (component.length === 76 && maximumZ < -1.2) component.forEach((triangle) => excluded.add(triangle))
    }
    if (excluded.size) {
      const keptVertices = []
      for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        if (excluded.has(triangle)) continue
        keptVertices.push(triangle * 3, triangle * 3 + 1, triangle * 3 + 2)
      }
      const geometry = new THREE.BufferGeometry()
      for (const [name, attribute] of Object.entries(sourceGeometry.attributes)) {
        const values = new attribute.array.constructor(keptVertices.length * attribute.itemSize)
        keptVertices.forEach((vertex, outputIndex) => {
          for (let item = 0; item < attribute.itemSize; item += 1) values[outputIndex * attribute.itemSize + item] = attribute.array[vertex * attribute.itemSize + item]
        })
        geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized))
      }
      object.geometry = geometry
      removedTailTriangles += excluded.size
    }
  }
  skinnedMeshes += object.isSkinnedMesh ? 1 : 0
  const positions = object.geometry.attributes.position?.count ?? 0
  triangles += object.geometry.index ? object.geometry.index.count / 3 : positions / 3
  object.geometry.computeBoundingBox()
  object.geometry.computeBoundingSphere()
  object.material = new THREE.MeshStandardMaterial({
    name: 'BirdOrangeMaterial',
    color: 0xffffff,
    roughness: .82,
    metalness: 0,
    side: THREE.FrontSide,
  })
})

const result = await new GLTFExporter().parseAsync(scene, {
  binary: true,
  trs: true,
  animations: scene.animations,
  onlyVisible: false,
})
const glbBuffer = Buffer.from(result)
await fs.mkdir(deliveryRoot, { recursive: true })
await fs.writeFile(outputGlb, glbBuffer)
await run('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', sourceTexture,
  '-vf', 'scale=1024:1024:flags=lanczos', '-c:v', 'libwebp', '-quality', '82',
  outputTexture,
])
const textureBuffer = await fs.readFile(outputTexture)
const report = {
  sourceArchive: '/home/mani/Downloads/bird-orange.zip',
  rightsBasis: 'USER-PROVIDED CLEARANCE; the archive contains no licence document.',
  sourceFbx: { path: sourceFbx, bytes: fbxBuffer.byteLength, sha256: hash(fbxBuffer) },
  sourceTexture: { path: sourceTexture, bytes: (await fs.stat(sourceTexture)).size, sha256: hash(await fs.readFile(sourceTexture)) },
  deliveryGlb: { path: outputGlb, bytes: glbBuffer.byteLength, sha256: hash(glbBuffer), skinnedMeshes, triangles },
  deliveryTexture: { path: outputTexture, bytes: textureBuffer.byteLength, sha256: hash(textureBuffer), dimensions: [1024, 1024] },
  animations: scene.animations.map((clip) => ({ name: clip.name, duration: clip.duration, tracks: clip.tracks.length })),
  removedTailTriangles,
  neutralizedRigLineObjects: removedRigLines.length,
  transformation: 'FBX parsed with pinned Three.js; obsolete texture path removed; skin and Take 001 retained in GLB; the non-render rig control line was retained as a transparent hierarchy node and five flat rear-feather components were omitted from the delivery mesh while the FBX remained untouched; supplied RGB texture resized to 1024px WebP and remapped at runtime.',
}
await fs.mkdir(path.dirname(reportPath), { recursive: true })
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
