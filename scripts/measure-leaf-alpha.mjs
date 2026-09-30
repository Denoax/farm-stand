import { spawn } from 'node:child_process'

const clips = [
  { kind: 'shop', file: 'public/media/transitions/leaves-shop-01-alpha.webm', width: 1280, height: 720, filter: 'alphaextract,format=gray' },
  // At the established 1.9x crop, a 16:9 viewport sees this centred source
  // window. Narrower viewports see less of the source and therefore cannot
  // expose corners outside this worst-case crop.
  { kind: 'animals', file: 'public/media/transitions/leaves-animals-02-alpha.webm', width: 674, height: 379, filter: 'crop=674:379:(iw-674)/2:(ih-379)/2,alphaextract,format=gray' },
]

async function inspect(clip) {
  const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', clip.file, '-vf', clip.filter, '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1'])
  const frameSize = clip.width * clip.height
  let pending = Buffer.alloc(0)
  let frame = 0
  const samples = []
  for await (const chunk of child.stdout) {
    pending = Buffer.concat([pending, chunk])
    while (pending.length >= frameSize) {
      const pixels = pending.subarray(0, frameSize)
      pending = pending.subarray(frameSize)
      let minimum = 255
      let below250 = 0
      for (const value of pixels) {
        minimum = Math.min(minimum, value)
        if (value < 250) below250 += 1
      }
      samples.push({ frame, mediaTime: frame / 30, minimum, below250 })
      frame += 1
    }
  }
  const exitCode = await new Promise((resolve) => child.once('close', resolve))
  if (exitCode !== 0) throw new Error(`ffmpeg failed for ${clip.file}: ${exitCode}`)
  const covered = samples.filter((sample) => sample.minimum >= 250)
  return {
    kind: clip.kind,
    sourceWindow: { width: clip.width, height: clip.height },
    decodedFrames: samples.length,
    opaqueFrames: covered.length,
    firstOpaque: covered.at(0) ?? null,
    lastOpaque: covered.at(-1) ?? null,
    nearCover: samples.filter((sample) => sample.mediaTime >= (clip.kind === 'shop' ? 3 : 1.65) && sample.mediaTime <= (clip.kind === 'shop' ? 4.1 : 2.25)),
  }
}

const report = []
for (const clip of clips) report.push(await inspect(clip))
console.log(JSON.stringify({ measuredAt: new Date().toISOString(), clips: report }, null, 2))
