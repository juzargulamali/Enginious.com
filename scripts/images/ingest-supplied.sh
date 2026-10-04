#!/usr/bin/env bash
# One command for the five supplied photos. Put them in ./incoming/ with these names (any of .jpg/.jpeg/.png/.webp) and run:
#   bash scripts/images/ingest-supplied.sh
# Source/licence: supplied by the owner from stock-photo links; the owner must confirm the licence per image (recorded in docs/licences/).
set -e
cd "$(dirname "$0")/../.."
L="Stock photograph supplied by the owner; licence terms to be confirmed by the owner"
S="Supplied by the owner (stock-photo link; original page URL to be added)"
go() { f=$(ls incoming/$1.* 2>/dev/null | head -1); [ -z "$f" ] && { echo "missing incoming/$1.*"; return; }; shift; node scripts/images/ingest.mjs "$@" "$f"; }
node_ingest() { id=$1; name=$2; shift 2; f=$(ls incoming/$name.* 2>/dev/null | head -1); [ -z "$f" ] && { echo "missing incoming/$name.*"; return; }; node scripts/images/ingest.mjs "$id" "$f" "$@" --licence "$L" --source "$S"; }
node_ingest immersive-installations immersive-installations --kind scene --status stock --focal 0.5,0.55 --alt "Visitors standing in a dark, hazy hall in front of large illuminated screens" --credit "Stock photographer (to be added)"
node_ingest interactive-technology interactive-technology --kind scene --status stock --focal 0.5,0.5 --alt "A large spherical LED display showing a glowing blue map of the world" --credit "Stock photographer (to be added)"
node_ingest events-exhibitions events-exhibitions --kind scene --status stock --focal 0.5,0.6 --alt "A crowded exhibition hall under a steel roof with lit booths and visitors" --credit "Stock photographer (to be added)"
node_ingest preview-portrait-male temporary-male-portrait --kind portrait --status preview-portrait --focal 0.5,0.4 --alt "Preview portrait of a man in a dark suit and bow tie" --credit "Stock photographer (to be added)"
node_ingest preview-portrait-female temporary-female-portrait --kind portrait --status preview-portrait --focal 0.52,0.28 --alt "Preview portrait of a woman in a black blazer with arms crossed" --credit "Stock photographer (to be added)"
