import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const png = path.resolve('evidence/bird-hop/work/bird-static.png')
const webp = path.resolve('public/media/bird-orange-perch.webp')
await fs.mkdir(path.dirname(png), { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 512, height: 640 }, deviceScaleFactor: 1 })
await page.goto('http://127.0.0.1:5173/farm-stand/', { waitUntil: 'domcontentloaded' })
page.on('console', (message) => console.log(message.text()))
page.on('pageerror', (error) => console.error(error.message))
await page.setContent(`<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}canvas{display:block}</style>
<script type="module">
import * as THREE from 'http://127.0.0.1:5173/farm-stand/@fs${path.resolve('node_modules/three/build/three.module.js')}'
import { GLTFLoader } from 'http://127.0.0.1:5173/farm-stand/@fs${path.resolve('node_modules/three/examples/jsm/loaders/GLTFLoader.js')}'
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(512,640);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setClearColor(0x000000,0);document.body.append(renderer.domElement)
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(28,512/640,.1,20);camera.position.set(0,.35,4.8);camera.lookAt(0,.25,0)
scene.add(new THREE.HemisphereLight(0xfff1d8,0x4a4c44,2));const key=new THREE.DirectionalLight(0xffdfa6,4.2);key.position.set(3,4,5);scene.add(key)
const gltf=await new GLTFLoader().loadAsync('/farm-stand/models/bird-orange/bird-orange.glb');const model=gltf.scene;const box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());const scale=1.9/size.y;model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale-1,-center.z*scale);model.rotation.set(.13,-.52,0)
const texture=await new THREE.TextureLoader().loadAsync('/farm-stand/models/bird-orange/bird-orange-base-color.webp');texture.colorSpace=THREE.SRGBColorSpace;model.traverse(child=>{if(!child.isMesh)return;child.material=new THREE.MeshStandardMaterial({map:texture,roughness:.86,metalness:0})});scene.add(model);if(gltf.animations[0]){const mixer=new THREE.AnimationMixer(model);mixer.clipAction(gltf.animations[0]).play();mixer.setTime(1.35)}renderer.render(scene,camera);window.__ready=true
</script>`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__ready === true, null, { timeout: 12000 })
await page.screenshot({ path: png, omitBackground: true })
await browser.close()
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '88', webp])
console.log(webp)
