import sys,os,subprocess,json
root=sys.argv[1]
A="/tmp/claude-0/assets"
node=r'''
const sharp=require("sharp");const fs=require("fs");
const root=process.argv[1],A=process.argv[2];
(async()=>{
 for(const [id,file] of [["t-png","t-png.png"],["t-webp","t-static.webp"],["t-pose","t-pose.png"]]){
  for(const w of [480,960,1000]) await sharp(`${A}/${file}`).resize({width:w}).webp({quality:88,alphaQuality:100}).toFile(`${root}/public/photos/${id}-${w}.webp`);
 }
 fs.copyFileSync(`${A}/t-anim.webp`,`${root}/public/photos/t-anim-1000.webp`);
})()'''
subprocess.check_call(["node","-e",node,root,A],cwd="/home/user/Enginious.com")
p=os.path.join(root,"src/content/images.ts"); s=open(p).read()
def ent(i,src,w): return f'  "{i}": {{ id: "{i}", kind: "scene", status: "concept", src: "{src}", widths: {w}, width: 1000, height: 1000, focal: [0.5, 0.5], alt: "TEST ASSET, not a real product", credit: "", source: "", licence: "" }} as unknown as ImageAsset,\n'
add=ent("t-png","/photos/t-png","[480, 960, 1000]")+ent("t-webp","/photos/t-webp","[480, 960, 1000]")+ent("t-pose","/photos/t-pose","[480, 960, 1000]")+ent("t-anim","/photos/t-anim","[1000]")+ent("t-bad","/photos/t-missing","[480, 960, 1000]")
s=s.replace('  "juzar-gulamali": {',add+'  "juzar-gulamali": {',1); open(p,"w").write(s)
p=os.path.join(root,"src/lib/content/seed.ts"); s=open(p).read()
extra='...(({"holofan":{showcase_image:"t-png",showcase_scale:90},"tri-helix":{showcase_image:"t-pose",showcase_animation:"t-anim",showcase_scale:100},"robotic-arm":{showcase_image:"t-webp",showcase_y:4},"ai-photobooth":{showcase_image:"t-bad"},"circular-dial":{showcase_image:"t-pose",showcase_animation:"t-bad"}} as Record<string,Record<string,unknown>>)[t.slug] ?? {}), '
s=s.replace("projects: t.projects, ...(TECH_EXTRA","projects: t.projects, "+extra+"...(TECH_EXTRA",1); open(p,"w").write(s)
