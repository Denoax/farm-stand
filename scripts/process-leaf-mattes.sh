#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
shop_source='/home/mani/Downloads/No Copyright I Autumn Red Leaves Transition 01 I free stock videos.mp4'
animals_source='/home/mani/Downloads/No Copyright I Autumn Red Leaves Transition 02  I free stock videos.mp4'
output_dir="$project_dir/public/media/transitions"
work_dir=$(mktemp -d /tmp/farm-leaf-mattes-XXXXXX)
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM

neighbor_min='min(min(alpha(X-1,Y),alpha(X+1,Y)),min(alpha(X,Y-1),alpha(X,Y+1)))'
weighted_red='(r(X,Y)*alpha(X,Y)+r(X-1,Y)*alpha(X-1,Y)+r(X+1,Y)*alpha(X+1,Y)+r(X,Y-1)*alpha(X,Y-1)+r(X,Y+1)*alpha(X,Y+1))/(alpha(X,Y)+alpha(X-1,Y)+alpha(X+1,Y)+alpha(X,Y-1)+alpha(X,Y+1)+0.001)'
edge_red="if(lt($neighbor_min,32),$weighted_red,r(X,Y))"
edge_green=$(printf '%s' "$edge_red" | sed 's/r(/g(/g')
edge_blue=$(printf '%s' "$edge_red" | sed 's/r(/b(/g')
shaped_alpha="0.58*alpha(X,Y)+0.42*$neighbor_min"
filter="format=rgba,colorkey=0x000000:0.15:0.07,unpremultiply=inplace=1,geq=r='$edge_red':g='$edge_green':b='$edge_blue':a='$shaped_alpha'"

encode() {
  source_file=$1
  output_name=$2
  temporary="$work_dir/$output_name"
  ffmpeg -hide_banner -loglevel error -y -i "$source_file" -an -vf "$filter" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -row-mt 1 -b:v 0 -crf 24 "$temporary"
  mv "$temporary" "$output_dir/$output_name"
}

test -f "$shop_source"
test -f "$animals_source"
encode "$shop_source" 'leaves-shop-01-alpha.webm'
encode "$animals_source" 'leaves-animals-02-alpha.webm'

# These are decoded frames from the same authorized masters, not synthetic
# colour covers. They sit above the keyed video only across its measured
# commit interval so isolated edge-alpha pixels cannot reveal a destination.
ffmpeg -hide_banner -loglevel error -y -ss 3.033333 -i "$shop_source" -frames:v 1 -c:v libwebp -q:v 90 "$output_dir/leaves-shop-cover.webp"
ffmpeg -hide_banner -loglevel error -y -ss 1.933333 -i "$animals_source" -frames:v 1 -c:v libwebp -q:v 90 "$output_dir/leaves-animals-cover.webp"
