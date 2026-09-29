import fs from 'node:fs/promises'
import path from 'node:path'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

const source = path.resolve('assets/source/user-provided/bird-orange/source/BirdOrange.fbx')
const output = path.resolve('evidence/bird-hop/review/bird/bird-fbx-inspection.json')

const manager = new THREE.LoadingManager()
manager.addHandler(/\.(png|jpe?g)$/i, {
  path: '',
  setPath(value) { this.path = value; return this },
  load() { return new THREE.Texture() },
})

const buffer = await fs.readFile(source)
const scene = new FBXLoader(manager).parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), path.dirname(source))
const meshes = []
const bones = []
scene.traverse((object) => {
  if (object.isMesh) {
    const position = object.geometry.attributes.position
    const triangleCount = object.geometry.index ? object.geometry.index.count / 3 : (position?.count ?? 0) / 3
    const vertexKey = (vertexIndex) => `${position.getX(vertexIndex).toFixed(5)},${position.getY(vertexIndex).toFixed(5)},${position.getZ(vertexIndex).toFixed(5)}`
    const triangleVertices = Array.from({ length: triangleCount }, (_, triangle) => Array.from({ length: 3 }, (_, corner) => object.geometry.index?.getX(triangle * 3 + corner) ?? triangle * 3 + corner))
    const byVertex = new Map()
    triangleVertices.forEach((indices, triangle) => indices.forEach((index) => {
      const key = vertexKey(index)
      if (!byVertex.has(key)) byVertex.set(key, [])
      byVertex.get(key).push(triangle)
    }))
    const remaining = new Set(triangleVertices.map((_, index) => index))
    const components = []
    while (remaining.size) {
      const seed = remaining.values().next().value
      const queue = [seed]
      remaining.delete(seed)
      const triangles = []
      const box = new THREE.Box3()
      const uvBounds = { min: [Infinity, Infinity], max: [-Infinity, -Infinity] }
      while (queue.length) {
        const triangle = queue.pop()
        triangles.push(triangle)
        triangleVertices[triangle].forEach((index) => {
          box.expandByPoint(new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)))
          const uv = object.geometry.attributes.uv
          if (uv) {
            uvBounds.min[0] = Math.min(uvBounds.min[0], uv.getX(index))
            uvBounds.min[1] = Math.min(uvBounds.min[1], uv.getY(index))
            uvBounds.max[0] = Math.max(uvBounds.max[0], uv.getX(index))
            uvBounds.max[1] = Math.max(uvBounds.max[1], uv.getY(index))
          }
          for (const neighbor of byVertex.get(vertexKey(index))) {
            if (remaining.delete(neighbor)) queue.push(neighbor)
          }
        })
      }
      components.push({ triangles: triangles.length, min: box.min.toArray(), max: box.max.toArray(), uv: uvBounds })
    }
    components.sort((a, b) => b.triangles - a.triangles)
    meshes.push({ name: object.name, type: object.type, vertices: position?.count ?? 0, skinned: Boolean(object.isSkinnedMesh), components })
  }
  if (object.isBone) bones.push(object.name)
})

const clips = scene.animations.map((clip) => ({
  name: clip.name,
  duration: clip.duration,
  tracks: clip.tracks.length,
  trackNames: clip.tracks.map((track) => track.name),
}))

const sampleTimes = [0, .5, 1, 1.5, 2, 2.5, 3, 4, 5]
const mixer = new THREE.AnimationMixer(scene)
if (scene.animations[0]) mixer.clipAction(scene.animations[0]).play()
const samples = []
for (const time of sampleTimes) {
  mixer.setTime(time)
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(scene)
  const positions = {}
  for (const name of ['Root_M', 'Hip_L', 'Hip_R', 'Ankle_L', 'Ankle_R', 'ToeBase_L', 'ToeBase_R', 'Head_M', 'Jaw_M', 'Tail1_M']) {
    const bone = scene.getObjectByName(name)
    if (!bone) continue
    const value = bone.getWorldPosition(new THREE.Vector3())
    positions[name] = value.toArray().map((number) => Number(number.toFixed(5)))
  }
  samples.push({
    time,
    boxMin: box.min.toArray().map((number) => Number(number.toFixed(5))),
    boxMax: box.max.toArray().map((number) => Number(number.toFixed(5))),
    bones: positions,
  })
}

const report = {
  source,
  sourceBytes: buffer.byteLength,
  sceneName: scene.name,
  scale: scene.scale.toArray(),
  meshes,
  bones,
  clips,
  samples,
}
await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
