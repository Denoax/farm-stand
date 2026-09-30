import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = path.resolve('evidence/six-hop/work/take-poses')
const samples = [0, 0.5, 1, 1.35, 1.75, 2.25, 2.75, 3, 3.5, 4, 4.5, 5]
await fs.mkdir(root, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 480, height: 480 } })
await page.goto('http://127.0.0.1:5173/farm-stand/', { waitUntil: 'domcontentloaded' })
await page.setContent(`<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#e9dec5;overflow:hidden}canvas{display:block}</style>
<script type="module">
import * as THREE from 'http://127.0.0.1:5173/farm-stand/@fs${path.resolve('node_modules/three/build/three.module.js')}'
import { GLTFLoader } from 'http://127.0.0.1:5173/farm-stand/@fs${path.resolve('node_modules/three/examples/jsm/loaders/GLTFLoader.js')}'
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(480,480);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setClearColor(0xe9dec5,1);document.body.append(renderer.domElement)
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(28,1,.1,20);camera.position.set(0,.35,4.8);camera.lookAt(0,.25,0)
scene.add(new THREE.HemisphereLight(0xfff1d8,0x4a4c44,2));const key=new THREE.DirectionalLight(0xffdfa6,4.2);key.position.set(3,4,5);scene.add(key)
const gltf=await new GLTFLoader().loadAsync('/farm-stand/models/bird-orange/bird-orange.glb');const model=gltf.scene;const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const scale=1.9/size.y;model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale-1,-center.z*scale);model.rotation.set(.13,-.52,0)
const texture=await new THREE.TextureLoader().loadAsync('/farm-stand/models/bird-orange/bird-orange-base-color.webp');texture.colorSpace=THREE.SRGBColorSpace;model.traverse(child=>{if(!child.isMesh)return;child.material=new THREE.MeshStandardMaterial({map:texture,roughness:.86,metalness:0})});scene.add(model)
const mixer=new THREE.AnimationMixer(model);mixer.clipAction(gltf.animations[0]).play();window.__renderTake=(time)=>{mixer.setTime(time);model.updateMatrixWorld(true);renderer.render(scene,camera);const head=model.getObjectByName('Head_M');const neck=model.getObjectByName('Neck_M');return {time,headQuaternion:head.quaternion.toArray(),neckQuaternion:neck.quaternion.toArray()}};window.__ready=true
</script>`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__ready === true, null, { timeout: 12000 })
const poses = []
for (const time of samples) {
  poses.push(await page.evaluate((value) => window.__renderTake(value), time))
  await page.screenshot({ path: path.join(root, `take-${time.toFixed(2).replace('.', '-')}.png`) })
}
await browser.close()
await fs.writeFile(path.join(root, 'poses.json'), `${JSON.stringify(poses, null, 2)}\n`)
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(root, 'take-*.png'), '-vf', "scale=240:240,tile=4x3", '-frames:v', '1', path.join(root, 'contact-sheet.png')])
console.log(path.join(root, 'contact-sheet.png'))
