import sys,shutil,os
root=sys.argv[1]
p=os.path.join(root,"src/content/images.ts")
s=open(p).read()
def ent(i,src): return f'  "{i}": {{ id: "{i}", kind: "scene", status: "real", src: "{src}", widths: [480, 960, 1600], width: 1600, height: 1000, focal: [0.5, 0.5], alt: "test photo", credit: "", source: "", licence: "" }} as unknown as ImageAsset,\n'
s=s.replace('  "juzar-gulamali": {', ent("t-ok","/photos/t-ok")+ent("t-bad","/photos/t-missing")+ent("contact-scene","/photos/t-ok")+'  "juzar-gulamali": {',1)
s=s.replace('capEvents: "events-exhibitions"','capEvents: "t-ok"').replace('capCentres: "immersive-installations"','capCentres: "t-bad"').replace('contactScene: "contact-scene"','contactScene: "t-ok"')
open(p,"w").write(s)
for w in (480,960,1600): shutil.copy(f"/tmp/claude-0/t-ok-{w}.webp",os.path.join(root,f"public/photos/t-ok-{w}.webp"))
