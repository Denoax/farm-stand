#!/usr/bin/env sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
material_dir="$root_dir/public/media/materials"

for variant in a b c; do
  for orientation in "" "-vertical"; do
    source_file="$material_dir/rough-wood-${variant}${orientation}-diff.jpg"
    output_file="$material_dir/storybook-wood-${variant}${orientation}-diff.jpg"
    ffmpeg -hide_banner -loglevel error -y -i "$source_file" \
      -vf "scale=512:64:flags=lanczos,nlmeans=s=2.4:p=3:r=7,colorchannelmixer=rr=1.18:gg=1.02:bb=.74,eq=saturation=1.28:contrast=.88:brightness=.075,curves=all='0/0.05 .2/.27 .5/.57 .8/.83 1/.96',scale=1024:128:flags=lanczos" \
      -q:v 2 "$output_file"
  done
done
