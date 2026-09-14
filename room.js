/* After Midnight — self-contained Three.js room, no remote runtime dependencies. */
(() => {
  'use strict';
  let language='ru';try{language=localStorage.getItem('midnight-language')==='en'?'en':'ru';}catch(_){}
  const txt=(ru,en)=>language==='ru'?ru:en;
  const content=window.ROOM_CONTENT;
  if(THREE.ColorManagement)THREE.ColorManagement.legacyMode=false;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth<650;
  const PROJECTS = [
    {id:'movement', number:'01', title:'Движение', subtitle:'Ритм и форма', color:'#d75343', description:'Красная лента, петли и непрерывный ритм. Демонстрационный этюд для просмотра через VHS.', video:null},
    {id:'space', number:'02', title:'Пространство', subtitle:'Свет и перспектива', color:'#afa0e0', description:'Свет в конце коридора. Демонстрационный этюд о глубине и медленном движении.', video:null},
    {id:'texture', number:'03', title:'Текстуры', subtitle:'Волны и отражения', color:'#67b9e6', description:'Вода, блики и аналоговый шум. Демонстрационный этюд для синего экрана после полуночи.', video:null}
  ];
  let selected = PROJECTS[0], playing = null, paused = false, playbackTime = 0;
  let entered = false, entering = false, transition = null, dragging = false;
  let soundOn = false, audioContext = null, audioGain = null, noticeTimer;
  let renderer, scene, camera, tvTexture, tvCanvas, tvContext, screenMesh, tvGlow, lampLight, lampShade, door;
  let currentTarget = null, lastFrame = 0, clockSeconds = 0, lastTVDraw = 0, lastOverlay = 0;
  let yaw = 0, pitch = 0, lampOn = true, animationId, movingTape = null, insertionSequence = 0;
  const keys = new Set(), touchKeys = new Set(), interactive = [], hotspots = [], colliders = [];
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const clock = new THREE.Clock(), seedState = {value:419};
  const random = () => {seedState.value=(seedState.value*1664525+1013904223)>>>0;return seedState.value/4294967296;};
  const dialogOpen = () => !!document.querySelector('dialog[open]');
  const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
  const mat = (color, opts={}) => new THREE.MeshStandardMaterial({color,roughness:.9,metalness:0,flatShading:true,...opts});
  const textures = {}, materials = {};

  function notice(message) {clearTimeout(noticeTimer);$('notice').textContent=translated(message);$('notice').hidden=false;noticeTimer=setTimeout(()=>{$('notice').hidden=true;},3200);}
  function openDialog(id) {
    keys.clear();touchKeys.clear();dragging=false;freeLook=false;
    if (document.pointerLockElement) document.exitPointerLock();
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    $(id).showModal();
  }
  function closeDialogs() {document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>{
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
    d.addEventListener('close',()=>{keys.clear();if(entered)$('room').focus({preventScroll:true});});
  });

  // The moving studies are clearly marked as demo content; supplied projects can replace video:null.
  function drawStudy(ctx, width, height, index, time, cover=false) {
    ctx.save();ctx.scale(width/512,height/384);
    ctx.fillStyle='#080c15';ctx.fillRect(0,0,512,384);
    if(index===0){
      const bg=ctx.createLinearGradient(0,0,512,384);bg.addColorStop(0,'#241f29');bg.addColorStop(1,'#070b10');ctx.fillStyle=bg;ctx.fillRect(0,0,512,384);
      for(let i=0;i<70;i++){
        ctx.beginPath();
        for(let y=-30;y<=415;y+=4){const a=y/67+time*.65;const x=256+Math.sin(a)*105+Math.cos(a*.45)*26+(i-35)*Math.sin(a+1.4)*1.4;y===-30?ctx.moveTo(x,y):ctx.lineTo(x,y);}
        const light=clamp(27+Math.sin(i/70*Math.PI)*40,0,80);ctx.strokeStyle=`hsl(${7+i*.16} 72% ${light}%)`;ctx.lineWidth=2.4;ctx.stroke();
      }
    }else if(index===1){
      const bg=ctx.createRadialGradient(256,175,5,256,200,340);bg.addColorStop(0,'#d1c4f1');bg.addColorStop(.25,'#6a668e');bg.addColorStop(1,'#131626');ctx.fillStyle=bg;ctx.fillRect(0,0,512,384);
      for(let i=14;i>=0;i--){const p=(i+(time*.33)%1)/14;const w=30+p*p*600,h=65+p*p*480;ctx.strokeStyle=`rgba(23,23,45,${.28+p*.7})`;ctx.lineWidth=7+p*32;ctx.strokeRect(256-w/2,185-h/2,w,h);ctx.strokeStyle=`rgba(212,202,248,${.13+p*.15})`;ctx.lineWidth=1;ctx.strokeRect(259-w/2,185-h/2,w,h);}
      ctx.fillStyle='#e7e0ff';ctx.fillRect(246,155,20,57);ctx.fillStyle='#b4a4ef';ctx.beginPath();ctx.moveTo(246,212);ctx.lineTo(266,212);ctx.lineTo(342,384);ctx.lineTo(160,384);ctx.fill();
    }else{
      const bg=ctx.createLinearGradient(0,0,0,384);bg.addColorStop(0,'#091a39');bg.addColorStop(.55,'#17456d');bg.addColorStop(1,'#071c34');ctx.fillStyle=bg;ctx.fillRect(0,0,512,384);
      for(let y=-8;y<402;y+=6){ctx.beginPath();for(let x=-5;x<520;x+=7){const wave=Math.sin(x*.019+y*.035+time*.7)*7+Math.sin(x*.055-time+y*.02)*3; x===-5?ctx.moveTo(x,y+wave):ctx.lineTo(x,y+wave);}ctx.lineWidth=1+Math.sin(y*.2)*.5;ctx.strokeStyle=`rgba(139,215,248,${.15+(Math.sin(y*.081+time)*.5+.5)*.5})`;ctx.stroke();}
    }
    if(!cover){ctx.fillStyle='#e5edff';ctx.font='15px monospace';ctx.fillText(txt('▶ ИГРАЕТ','▶ PLAY'),26,30);ctx.font='12px monospace';ctx.fillText(txt('ДЕМО / ','DEMO / ')+PROJECTS[index].number,370,30);ctx.fillText(new Date(time*1000).toISOString().slice(14,19),424,359);}
    ctx.restore();
  }
  function makeCover(project,index){
    const c=document.createElement('canvas');c.width=400;c.height=600;const ctx=c.getContext('2d');
    drawStudy(ctx,400,600,index,1.7,true);
    const g=ctx.createLinearGradient(0,350,0,600);g.addColorStop(0,'#080c1400');g.addColorStop(1,'#080c14');ctx.fillStyle=g;ctx.fillRect(0,350,400,250);
    ctx.strokeStyle='#ddd7d15a';ctx.lineWidth=1;ctx.strokeRect(20,20,360,560);ctx.fillStyle='#e8e3dd';ctx.font='18px monospace';ctx.fillText(txt('ПОСЛЕ ПОЛУНОЧИ','AFTER MIDNIGHT'),39,53);ctx.font='66px monospace';ctx.fillText(project.number,37,492);ctx.font='27px Arial';ctx.fillText(project.title,39,537);ctx.font='12px monospace';ctx.fillStyle='#c8c7cc';ctx.fillText(txt('VHS / ДЕМО','VHS / DEMO STUDY'),40,559);
    project.cover=c.toDataURL('image/png');project.coverCanvas=c;
  }
  PROJECTS.forEach(makeCover);
  function populateTapes(){
    $('tape-grid').replaceChildren();
    PROJECTS.forEach(p=>{const b=document.createElement('button');b.className='tape-card';b.setAttribute('aria-label',txt('Рассмотреть кассету ','View tape ')+p.number+': '+p.title);b.innerHTML=`<div class="tape-cover"><img src="${p.cover}" alt="${p.title} — ${txt('графическая обложка','illustrated cover')}"></div><div class="tape-meta"><strong>${p.title}</strong><span>${p.number} / ${txt('ДЕМО','DEMO')}</span></div><p class="tape-subtitle">${p.subtitle}</p>`;b.addEventListener('click',()=>selectTape(p));$('tape-grid').append(b);});
  }
  function selectTape(project){selected=project;$('selected-cover').src=project.cover;$('selected-cover').alt=txt('Обложка кассеты: ','Tape cover: ')+project.title;$('tape-heading').textContent=project.title;$('tape-description').textContent=project.description;$('tape-number').textContent=txt('КАССЕТА ','TAPE ')+project.number+' / VHS';$('insert').disabled=!renderer;openDialog('tape-dialog');}
  populateTapes();
  $('tapes-menu').onclick=()=>openDialog('tapes-dialog');$('back-to-tapes').onclick=()=>openDialog('tapes-dialog');
  $('concept-menu').onclick=()=>openDialog('concept-dialog');$('fallback-concept').onclick=()=>openDialog('concept-dialog');$('help-menu').onclick=()=>openDialog('help-dialog');
  document.querySelectorAll('[data-concept]').forEach(b=>b.onclick=()=>{const room=b.dataset.concept==='room';$('concept-image').src=room?'./assets/concept-room.png':'./assets/concept-desk.png';$('concept-image').alt=room?'Обновлённый общий ракурс ночной комнаты от двери':'Обновлённый ракурс стола с PS1, контроллером и иллюстрированными игровыми обложками';$('concept-caption').textContent=room?'Тёплая лампа, холодный экран, свободный центр комнаты.':'PS1, любимые обложки и маленькие вещи, которые возвращают в детство.';document.querySelectorAll('[data-concept]').forEach(x=>x.classList.toggle('active',x===b));});

  function canvasTexture(width,height,draw){const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;return t;}
  function buildMaterials(){
    textures.wood=canvasTexture(256,128,(c,w,h)=>{c.fillStyle='#b1804e';c.fillRect(0,0,w,h);for(let y=0;y<h;y++){const l=43+Math.sin(y*.43)*2+random()*3;c.strokeStyle=`hsl(31 43% ${l}%)`;c.beginPath();for(let x=0;x<w;x+=4){const dy=Math.sin(x*.027+y*.08)*1.5;c.lineTo(x,y+dy);}c.stroke();}for(let i=0;i<4;i++){const x=25+random()*210,y=15+random()*90;c.strokeStyle='#65432b66';c.beginPath();c.ellipse(x,y,8+i,2.3,0,0,Math.PI*2);c.stroke();}});
    textures.floor=canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#5b3d28';c.fillRect(0,0,w,h);for(let y=0;y<256;y+=32){for(let x=-64;x<256;x+=128){const xx=x+(y%64?64:0);c.fillStyle=`hsl(28 33% ${24+random()*9}%)`;c.fillRect(xx+1,y+1,126,30);for(let i=0;i<85;i++){c.fillStyle=random()>.5?'#cb9b5530':'#1c110e28';c.fillRect(xx+random()*126,y+random()*30,4+random()*28,1+Math.floor(random()*3));}}}});textures.floor.wrapS=textures.floor.wrapT=THREE.RepeatWrapping;textures.floor.repeat.set(5,6);
    textures.wall=canvasTexture(128,128,(c,w,h)=>{c.fillStyle='#525560';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){const v=73+random()*13;c.fillStyle=`rgb(${v*.93},${v*.98},${v+3})`;c.fillRect(x,y,3,3);}});textures.wall.wrapS=textures.wall.wrapT=THREE.RepeatWrapping;textures.wall.repeat.set(3,2);
    textures.plaid=canvasTexture(128,128,(c,w,h)=>{c.fillStyle='#9199ad';c.fillRect(0,0,w,h);for(let i=0;i<128;i+=32){c.fillStyle='#3c506cb0';c.fillRect(i,0,17,h);c.fillRect(0,i,w,17);c.fillStyle='#b0afb480';c.fillRect(i+23,0,3,h);c.fillRect(0,i+23,w,3);}for(let i=0;i<2000;i++){c.fillStyle=random()>.5?'#ffffff0e':'#0000000e';c.fillRect(random()*128,random()*128,2,1);}});textures.plaid.wrapS=textures.plaid.wrapT=THREE.RepeatWrapping;textures.plaid.repeat.set(2,3);
    textures.curtain=textures.plaid.clone();textures.curtain.repeat.set(1,3);textures.curtain.needsUpdate=true;
    textures.rug=canvasTexture(160,256,(c,w,h)=>{c.fillStyle='#692c30';c.fillRect(0,0,w,h);const cols=['#863b39','#5f303b','#7c413c','#472c35','#a05b43'];for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){c.fillStyle=cols[Math.floor(random()*cols.length)];c.fillRect(x,y,4,4);}c.strokeStyle='#332937';c.lineWidth=7;c.strokeRect(10,10,w-20,h-20);c.strokeStyle='#b27b555e';c.lineWidth=2;c.strokeRect(17,17,w-34,h-34);for(let y=42;y<h-30;y+=31)for(let x=35;x<w-20;x+=30){c.fillStyle='#402d3977';c.beginPath();c.moveTo(x,y-11);c.lineTo(x+10,y);c.lineTo(x,y+11);c.lineTo(x-10,y);c.fill();}});
    materials.wood=mat('#e6c798',{map:textures.wood});materials.darkWood=mat('#a27b50',{map:textures.wood});materials.floor=mat('#d6b599',{map:textures.floor});materials.wall=mat('#a3a6b1',{map:textures.wall});materials.plaid=mat('#f3efff',{map:textures.plaid});materials.rug=mat('#e0b9b1',{map:textures.rug});materials.black=mat('#17181d');materials.gray=mat('#a5a4a7');materials.metal=mat('#999ba4',{metalness:.6,roughness:.4});materials.gold=mat('#b29355',{metalness:.55,roughness:.35});
  }
  function mesh(geo,material,parent=scene){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,x,y,z,material,parent=scene){const m=mesh(new THREE.BoxGeometry(w,h,d),material,parent);m.position.set(x,y,z);return m;}
  function cyl(r1,r2,h,x,y,z,material,parent=scene,n=12){const m=mesh(new THREE.CylinderGeometry(r1,r2,h,n),material,parent);m.position.set(x,y,z);return m;}
  function sphere(r,x,y,z,material,parent=scene,segments=8){const m=mesh(new THREE.SphereGeometry(r,segments,6),material,parent);m.position.set(x,y,z);return m;}
  function rod(a,b,r,material,parent=scene){const mid=a.clone().add(b).multiplyScalar(.5),m=cyl(r,r,a.distanceTo(b),mid.x,mid.y,mid.z,material,parent,8);m.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return m;}
  function group(x,y,z,ry=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;scene.add(g);return g;}
  function flat(w,h,x,y,z,material,parent=scene){const m=mesh(new THREE.PlaneGeometry(w,h),material,parent);m.position.set(x,y,z);return m;}
  function floorShadow(x,z,w,d){const t=canvasTexture(64,64,c=>{const g=c.createRadialGradient(32,32,5,32,32,32);g.addColorStop(0,'#00000090');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(0,0,64,64);});const m=flat(w,d,x,.011,z,new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.castShadow=false;}
  function labelTexture(text,color='#94b7ff',background='#0e1219',size=128){return canvasTexture(size,32,(c,w,h)=>{c.fillStyle=background;c.fillRect(0,0,w,h);c.font='20px monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(text,w/2,h/2);});}
  function collision(x1,x2,z1,z2){colliders.push({x1,x2,z1,z2});}
  function interactObject(object,kind,label,action){object.traverse(o=>{if(o.isMesh)o.userData.action=action;});interactive.push(object);object.userData.kind=kind;object.userData.label=label;return object;}
  function hotspot(position,label,action){const button=document.createElement('button');button.className='hotspot';button.setAttribute('aria-label',label);const text=document.createElement('span');text.textContent=label;button.append(text);button.onclick=e=>{e.stopPropagation();action();};$('hotspots').append(button);hotspots.push({position,button});}
  function atlasPanel(w,h,x,y,z,texture,coords,parent=scene){
    const geo=new THREE.PlaneGeometry(w,h);const uv=geo.attributes.uv;
    [coords[0],coords[1],coords[3],coords[2]].forEach((p,i)=>uv.setXY(i,p[0]/1448,1-p[1]/1086));uv.needsUpdate=true;
    const m=mesh(geo,mat('#eeeeee',{map:texture,roughness:1,side:THREE.DoubleSide}),parent);m.position.set(x,y,z);m.castShadow=false;return m;
  }
  const art={iron:[[119,69],[249,82],[249,309],[113,306]],mgs:[[269,86],[422,98],[422,292],[269,288]],warcraft:[[1068,91],[1220,86],[1225,290],[1081,283]],max:[[1067,301],[1222,301],[1230,516],[1085,509]],pain:[[1237,313],[1384,323],[1380,517],[1245,516]]};

  function roomArchitecture(){
    const floor=flat(6.6,8.5,0,0,.65,materials.floor);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    box(6.8,3.2,.16,0,1.6,-3.7,materials.wall);box(.16,3.2,7.4,-3.38,1.6,0,materials.wall);
    // The right wall has a real opening, allowing the exterior to sit behind the glass.
    box(.16,3.2,1.0,3.38,1.6,-3.2,materials.wall);box(.16,3.2,4.0,3.38,1.6,1.7,materials.wall);
    box(.16,1.08,2.4,3.38,.54,-1.5,materials.wall);box(.16,.44,2.4,3.38,2.98,-1.5,materials.wall);
    box(6.8,.12,7.55,0,3.25,0,mat('#171c26'));
    box(2.6,3.2,.18,-2.12,1.6,3.78,materials.wall);box(2.6,3.2,.18,2.12,1.6,3.78,materials.wall);box(1.62,.62,.2,0,2.9,3.78,materials.wall);
    box(6.7,.13,.05,0,.065,-3.59,materials.darkWood);box(.05,.13,7.4,-3.27,.065,0,materials.darkWood);box(.05,.13,7.4,3.27,.065,0,materials.darkWood);
    for(const x of [-.85,.85])box(.12,2.65,.22,x,1.32,3.78,materials.wood);box(1.83,.12,.24,0,2.64,3.78,materials.wood);
    door=group(-.79,.035,3.74,0);box(1.58,2.54,.085,.79,1.27,0,materials.darkWood,door);
    for(const y of [.65,1.83]){box(1.13,.9,.02,.79,y,.054,materials.wood,door);box(1.01,.78,.022,.79,y,.068,materials.darkWood,door);}
    box(.055,.19,.09,1.4,1.13,.095,materials.gold,door);rod(V(1.39,1.15,.15),V(1.23,1.15,.15),.025,materials.gold,door);
    const corridor=mat('#292b31');box(1.9,.05,5.4,0,-.04,5.6,materials.floor);box(.12,3.1,5,-1.0,1.5,5.6,corridor);box(.12,3.1,5,1.0,1.5,5.6,corridor);const spill=flat(1.55,1.7,0,.012,4.25,new THREE.MeshBasicMaterial({map:canvasTexture(32,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffd08800');g.addColorStop(1,'#ffbe6980');c.fillStyle=g;c.fillRect(0,0,w,h);}),transparent:true,depthWrite:false}));spill.rotation.x=-Math.PI/2;box(1.54,.022,.016,0,.025,3.80,new THREE.MeshBasicMaterial({color:'#d99b4c',toneMapped:false}));const corridorLight=new THREE.PointLight('#b19270',.28,4,2);corridorLight.position.set(0,1.6,5.5);scene.add(corridorLight);
    const rug=flat(2.25,3.25,-.1,.022,.7,materials.rug);rug.rotation.x=-Math.PI/2;rug.castShadow=false;
    for(let i=0;i<55;i++){const x=-1.2+i*.041;box(.014,.009,.055,x,.027,-.95,mat('#89755f'));box(.014,.009,.055,x,.027,2.35,mat('#89755f'));}
  }

  function bedroom(){
    const bed=group(-2.32,0,-1.72);
    box(1.56,.23,2.65,0,.36,0,materials.darkWood,bed);box(1.46,.18,2.5,0,.57,0,mat('#b4b0a8'),bed);box(1.51,.18,2.08,0,.71,.22,materials.plaid,bed);
    for(const x of [-.8,.8])for(const z of [-1.3,1.3])box(.095,z<0?1.22:.66,.095,x,(z<0?1.22:.66)/2,z,materials.wood,bed);
    box(1.6,.46,.09,0,.94,-1.31,materials.wood,bed);box(1.5,.22,.08,0,.38,1.31,materials.wood,bed);
    const pillow=box(1.03,.19,.49,.08,.77,-.82,materials.plaid,bed);pillow.rotation.x=.15;pillow.rotation.y=.06;
    // A draped, faceted blanket, with a plaid texture and an uneven hanging edge.
    const g=new THREE.PlaneGeometry(1.62,1.9,16,19),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,.035*Math.sin(z*8+x*3)+.024*Math.cos(x*17),-z);}g.computeVertexNormals();
    const blanket=mesh(g,materials.plaid,bed);blanket.position.set(0,.822,.22);blanket.material.side=THREE.DoubleSide;
    box(.04,.44,2.04,.77,.52,.22,materials.plaid,bed);box(.04,.39,2.04,-.77,.54,.22,materials.plaid,bed);
    const fur=mat('#967752'),dark=mat('#1b191a');const teddy=new THREE.Group();bed.add(teddy);teddy.position.set(-.2,.88,-.8);sphere(.115,0,.05,0,fur,teddy);sphere(.105,0,.22,0,fur,teddy);sphere(.046,-.09,.3,0,fur,teddy);sphere(.046,.09,.3,0,fur,teddy);sphere(.042,0,.205,.088,mat('#b99970'),teddy);sphere(.012,-.045,.248,.081,dark,teddy);sphere(.012,.045,.248,.081,dark,teddy);sphere(.014,0,.22,.124,dark,teddy);sphere(.057,-.12,.055,.035,fur,teddy);sphere(.057,.12,.055,.035,fur,teddy);
    floorShadow(-2.32,-1.7,2.1,3.2);collision(-3.25,-1.38,-3.25,-.24);
    for(let i=0;i<2;i++){const shoe=group(-1.52+i*.22,.1,.02);box(.15,.09,.34,0,0,0,mat('#d2cfc3'),shoe);box(.15,.10,.32,0,.06,-.015,materials.black,shoe);for(let j=0;j<3;j++)box(.12,.01,.015,0,.118,-.03+j*.045,mat('#c8c4bb'),shoe);}
  }

  function television(){
    const cabinet=group(-.58,0,-3.03);
    box(2.06,.09,.77,0,.12,0,materials.wood,cabinet);box(2.1,.1,.82,0,.87,0,materials.wood,cabinet);
    for(const x of [-1,1])box(.09,.72,.77,x,.49,0,materials.wood,cabinet);box(2.0,.7,.055,0,.48,-.38,materials.darkWood,cabinet);
    box(.05,.72,.76,-.43,.49,0,materials.wood,cabinet);box(.49,.64,.055,-.735,.5,.39,materials.darkWood,cabinet);box(.024,.17,.024,-.53,.51,.43,materials.black,cabinet);
    box(1.37,.045,.75,.285,.51,0,materials.wood,cabinet);box(1.36,.27,.065,.28,.285,.395,materials.darkWood,cabinet);box(.30,.025,.038,.28,.36,.448,materials.black,cabinet);
    const vcr=group(-.32,.67,-2.99);box(1.23,.17,.54,0,0,0,materials.black,vcr);box(1.17,.12,.016,0,0,.278,mat('#27272c'),vcr);box(.48,.036,.022,-.13,.012,.293,mat('#080a0c'),vcr);
    for(const x of [-.53,.39,.47])box(.045,.035,.02,x,-.015,.302,mat('#535152'),vcr);flat(.21,.052,.20,.016,.305,new THREE.MeshBasicMaterial({map:labelTexture('00:00')}),vcr);sphere(.008,.54,.032,.313,mat('#ff7746',{emissive:'#ff3311',emissiveIntensity:1}),vcr);
    interactObject(vcr,'vcr','Выбрать кассету',()=>openDialog('tapes-dialog'));
    const tv=group(-.50,.99,-3.06);tv.name='Slim CRT';tv.scale.z=.62;tv.position.z+=.478*(1-.62);
    box(1.39,1.04,.66,0,.49,0,mat('#34343d'),tv);box(1.50,.99,.13,0,.51,.355,mat('#484750'),tv);
    box(1.31,.83,.035,0,.57,.433,materials.black,tv);box(1.18,.72,.028,0,.58,.453,mat('#090b15'),tv);
    tvCanvas=document.createElement('canvas');tvCanvas.width=512;tvCanvas.height=384;tvContext=tvCanvas.getContext('2d');tvTexture=new THREE.CanvasTexture(tvCanvas);tvTexture.encoding=THREE.sRGBEncoding;tvTexture.magFilter=THREE.LinearFilter;
    const screenGeo=new THREE.PlaneGeometry(1.19,.77,24,18),sp=screenGeo.attributes.position;
    for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i);sp.setZ(i,.045*(1-(x/.65)**2-(y/.45)**2));}screenGeo.computeVertexNormals();
    screenMesh=mesh(screenGeo,new THREE.MeshBasicMaterial({map:tvTexture}),tv);screenMesh.position.set(0,.57,.478);screenMesh.castShadow=false;
    for(let x=-.58;x<-.31;x+=.035)box(.012,.055,.013,x,.075,.43,mat('#1b1d25'),tv);
    box(.21,.024,.018,0,.062,.43,mat('#171921'),tv);box(.057,.038,.025,.56,.073,.44,mat('#26242b'),tv);sphere(.007,.64,.072,.462,mat('#799bab',{emissive:'#4d98bc',emissiveIntensity:.8}),tv);
    for(const x of [-.48,.48])box(.13,.04,.34,x,-.045,0,materials.black,tv);
    interactObject(tv,'tv','Смотреть телевизор',()=>playing?openScreen():openDialog('tapes-dialog'));
    tvGlow=new THREE.PointLight('#6d8efb',1.0,4.4,2);tvGlow.position.set(-.35,1.55,-2.22);scene.add(tvGlow);
    const lamp=group(-1.42,.93,-2.99);cyl(.13,.15,.035,0,0,0,materials.gold,lamp);cyl(.027,.027,.44,0,.22,0,materials.gold,lamp);cyl(.058,.066,.12,0,.36,0,materials.black,lamp);
    lampShade=cyl(.16,.26,.33,0,.62,0,mat('#ffcf87',{emissive:'#da8137',emissiveIntensity:.32,side:THREE.DoubleSide}),lamp,10);cyl(.009,.009,.07,0,.825,0,materials.gold,lamp);
    lampLight=new THREE.PointLight('#ffb962',2.7,7,1.5);lampLight.position.set(-1.42,1.53,-2.98);lampLight.castShadow=true;lampLight.shadow.mapSize.set(1024,1024);lampLight.shadow.bias=-.003;lampLight.shadow.normalBias=.025;scene.add(lampLight);
    interactObject(lamp,'lamp','Включить / выключить лампу',toggleLamp);
    cyl(.07,.063,.135,-1.19,1.0,-2.78,mat('#d1c4a5'));const handle=mesh(new THREE.TorusGeometry(.046,.012,5,10),mat('#d1c4a5'));handle.position.set(-1.12,1.02,-2.78);handle.rotation.y=Math.PI/2;
    floorShadow(-.6,-2.9,2.5,1.2);collision(-1.64,.52,-3.65,-2.43);
    hotspot(V(-.2,1.55,-2.50),'Телевизор',()=>playing?openScreen():openDialog('tapes-dialog'));
  }

  function tapeShelf(){
    const shelf=group(1.14,0,-3.04);
    for(const x of [-.58,.58])box(.08,1.05,.62,x,.57,0,materials.wood,shelf);for(const y of [.10,1.06])box(1.24,.09,.67,0,y,0,materials.wood,shelf);box(1.15,.92,.05,0,.57,-.29,materials.darkWood,shelf);
    PROJECTS.forEach((p,i)=>{const tape=new THREE.Group();shelf.add(tape);p.sceneObject=tape;tape.position.set(-.36+i*.36,.57,.08);tape.rotation.z=(i-1)*-.024;
      box(.31,.78,.16,0,0,0,mat('#15171e'),tape);box(.292,.75,.014,0,0,.09,mat('#393d46'),tape);
      const tex=new THREE.CanvasTexture(p.coverCanvas);p.coverTexture=tex;tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;flat(.264,.713,.007,0,.102,mat('#ffffff',{map:tex,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.10}),tape);
      interactObject(tape,'tape',p.title,()=>selectTape(p));
    });
    collision(.50,1.8,-3.55,-2.48);floorShadow(1.14,-3.0,1.6,1.2);hotspot(V(1.15,.72,-2.53),'Выбрать VHS',()=>openDialog('tapes-dialog'));
    // No text-only stacks or anonymous game boxes are used as cultural references.
  }

  function postersAndPlant(roomAtlas){
    box(2.37,.065,.38,-.11,2.51,-3.43,materials.wood);for(const x of [-.85,.64]){box(.06,.28,.06,x,2.34,-3.48,materials.darkWood);rod(V(x,2.25,-3.51),V(x,2.46,-3.24),.027,materials.darkWood);}
    const post1=group(-2.63,2.05,-3.588);box(.73,1.03,.028,0,0,0,mat('#d0c0a5'),post1);atlasPanel(.705,1.005,0,0,.018,roomAtlas,art.iron,post1);
    const post2=group(-1.78,2.06,-3.587);box(.64,.87,.026,0,0,0,materials.black,post2);atlasPanel(.617,.845,0,0,.016,roomAtlas,art.mgs,post2);
    const planter=group(.78,2.56,-3.45);cyl(.15,.105,.23,0,.11,0,mat('#77705a'),planter,9);cyl(.132,.132,.007,0,.232,0,mat('#26231b'),planter,9);
    const leafMat=mat('#4f6229',{side:THREE.DoubleSide});
    for(let branch=0;branch<8;branch++){const a=branch*.78;const points=[V(0,.22,0),V(Math.cos(a)*.18,.48+random()*.1,Math.sin(a)*.16),V(Math.cos(a)*.36,.37,Math.sin(a)*.29)];if(branch>4)points.push(V(.32+random()*.1,-.45,-.02),V(.36,-.84,.06));
      for(let i=1;i<points.length;i++)rod(points[i-1],points[i],.009,leafMat,planter);
      for(let i=0;i<11;i++){const u=i/10*(points.length-1),ind=Math.min(Math.floor(u),points.length-2),p=points[ind].clone().lerp(points[ind+1],u-ind);const leaf=mesh(new THREE.OctahedronGeometry(.085,0),leafMat,planter);leaf.position.copy(p).add(V((i%2?1:-1)*.04,0,.035));leaf.scale.set(1.0,.42,1.45);leaf.rotation.set(random(),random()*3,random()*2);}
    }
  }

  function windowAndNight(){
    const g=group(3.27,1.99,-1.48,-Math.PI/2),frame=mat('#8c897e');
    const skyTex=canvasTexture(64,128,(c,w,h)=>{const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#061131');gradient.addColorStop(.5,'#123ca4');gradient.addColorStop(1,'#07152c');c.fillStyle=gradient;c.fillRect(0,0,w,h);for(let i=0;i<65;i++){c.fillStyle='#98bdfbac';c.fillRect(random()*w,random()*h*.66,1,1);}});
    flat(4.8,3.5,0,.1,-4,new THREE.MeshBasicMaterial({map:skyTex}),g);
    for(let i=0;i<9;i++){const x=-2+i*.51+random()*.2,z=-1.4-random()*1.5,h=.9+random()*1.8;box(.06,h,.07,x,-.3,z,mat('#08152c'),g);for(let n=0;n<4;n++){const m=mesh(new THREE.ConeGeometry(.22+(3-n)*.06,.62,5),mat('#0a1c34'),g);m.position.set(x,-.65+n*.27+h*.35,z);}}
    const house=group(4.9,.13,-1.18);box(1.35,.85,1,0,.5,0,mat('#152644'),house);const roof=mesh(new THREE.ConeGeometry(1,1,4),mat('#101d38'),house);roof.position.set(0,1.30,0);roof.rotation.y=Math.PI/4;for(const z of [-.23,.23]){box(.014,.2,.15,-.69,.63,z,mat('#ffd490',{emissive:'#ffa848',emissiveIntensity:1}),house);}
    const glass=flat(2.30,1.67,0,0,-.04,new THREE.MeshBasicMaterial({color:'#5d86eb',transparent:true,opacity:.11}),g);glass.castShadow=false;
    for(const x of [-1.19,1.19])box(.12,1.92,.14,x,0,.02,frame,g);for(const y of [-.92,.92])box(2.48,.13,.16,0,y,.02,frame,g);box(.058,1.81,.13,0,0,.04,frame,g);box(2.29,.05,.13,0,.10,.04,frame,g);box(2.65,.07,.37,0,-.98,.10,materials.wood,g);
    rod(V(-1.65,1.11,.16),V(1.65,1.11,.16),.022,materials.darkWood,g);
    for(const side of [-1,1]){const geo=new THREE.PlaneGeometry(.65,2.58,16,10),pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(pos.getX(i)*42)*.065);geo.computeVertexNormals();const curtain=mesh(geo,mat('#495266',{map:textures.curtain,side:THREE.DoubleSide}),g);curtain.position.set(side*1.26,-.16,.2);}
    const moon=new THREE.DirectionalLight('#5673c5',.36);moon.position.set(5,4,-2);moon.target.position.set(-1,0,0);scene.add(moon,moon.target);
    const blue=new THREE.PointLight('#497df4',.9,5.5,2);blue.position.set(2.85,1.95,-1.4);scene.add(blue);
  }

  function cable(points,r=.012,parent=scene){const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));return mesh(new THREE.TubeGeometry(curve,32,r,6,false),materials.black,parent);}
  function deskAndCollection(roomAtlas,deskAtlas){
    const desk=group(2.72,0,-.93,-Math.PI/2);box(2.30,.105,1.04,0,.92,0,materials.wood,desk);box(2.2,.14,.84,0,.79,0,materials.darkWood,desk);
    for(const x of [-1.01,1.01])for(const z of [-.4,.4])box(.085,.86,.085,x,.43,z,materials.wood,desk);rod(V(-1,.27,-.4),V(1,.27,-.4),.035,materials.wood,desk);
    // The recognizable case artwork is read directly from the supplied reference atlases.
    const can=cyl(.062,.062,.19,.47,1.07,-.26,mat('#b32d28'),desk,12);cyl(.060,.060,.006,.47,1.168,-.26,materials.metal,desk,12);cyl(.04,.04,.004,.47,1.174,-.26,mat('#585863'),desk,12);box(.12,.013,.018,.47,1.00,-.195,mat('#ece8d9'),desk);
    // A small notebook, headphones and a pencil cup provide the ordinary personal clutter.
    cyl(.065,.052,.19,-.9,1.065,-.27,mat('#b4a48b'),desk,9);for(let i=0;i<5;i++){const pen=cyl(.006,.006,.21,-.94+i*.021,1.235,-.28+(i%2)*.03,mat(['#b3973b','#4b7094','#6f625b'][i%3]),desk,6);pen.rotation.z=(i-2)*.08;}
    const headset=mesh(new THREE.TorusGeometry(.11,.018,6,16,Math.PI*1.5),materials.black,desk);headset.position.set(.84,1.034,-.29);headset.rotation.x=-Math.PI/2;for(const x of [.74,.94])box(.055,.045,.085,x,1.02,-.22,materials.black,desk);
    const chair=group(1.78,0,-.65,-Math.PI/2+.10);box(.52,.07,.5,0,.50,0,materials.wood,chair);for(const x of [-.22,.22])for(const z of [-.2,.2])box(.055,.51,.055,x,.255,z,materials.wood,chair);for(const x of [-.24,.24])box(.055,.59,.055,x,.79,.23,materials.wood,chair);box(.50,.23,.055,0,.97,.23,materials.wood,chair);
    collision(2.03,3.33,-2.25,.33);collision(1.38,2.1,-1.03,-.22);floorShadow(2.65,-.9,1.8,2.7);floorShadow(1.8,-.65,.95,.95);
    hotspot(V(2.13,1.12,-.98),'Игровой стол',()=>goTo('desk'));
  }

  function bicycle(){
    const b=group(-2.55,0,1.03,Math.PI/2+.05);b.rotation.z=-.09;const red=mat('#a62e27'),rubber=mat('#141719');
    for(const x of [-.52,.52]){const tire=mesh(new THREE.TorusGeometry(.40,.039,7,24),rubber,b);tire.position.set(x,.43,0);const rim=mesh(new THREE.TorusGeometry(.35,.012,5,24),materials.metal,b);rim.position.set(x,.43,0);sphere(.038,x,.43,0,materials.black,b);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;rod(V(x,.43,0),V(x+Math.cos(a)*.345,.43+Math.sin(a)*.345,0),.0035,materials.metal,b);}}
    const pts={back:V(-.52,.43,0),front:V(.52,.43,0),pedal:V(-.07,.36,0),seat:V(-.24,.94,0),head:V(.34,1.03,0)};
    for(const [a,c]of [['back','seat'],['back','pedal'],['pedal','seat'],['seat','head'],['head','pedal'],['head','front']])rod(pts[a],pts[c],.023,red,b);
    rod(pts.seat,V(-.26,1.06,0),.016,materials.metal,b);box(.25,.049,.12,-.26,1.08,0,materials.black,b);rod(pts.head,V(.31,1.19,0),.014,materials.metal,b);rod(V(.31,1.19,-.26),V(.31,1.19,.26),.014,materials.metal,b);rod(V(.31,1.19,-.3),V(.31,1.19,-.17),.03,materials.black,b);rod(V(.31,1.19,.3),V(.31,1.19,.17),.03,materials.black,b);
    rod(V(-.07,.36,-.13),V(-.07,.36,.15),.018,materials.metal,b);box(.12,.034,.09,-.07,.36,.18,materials.black,b);collision(-3.2,-2.0,.35,1.78);floorShadow(-2.56,1.04,1.1,1.9);
  }

  function dust(){const g=new THREE.BufferGeometry(),p=new Float32Array(90*3);for(let i=0;i<90;i++){p[i*3]=(random()-.5)*5.6;p[i*3+1]=.3+random()*2.7;p[i*3+2]=(random()-.5)*6;}g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({color:'#ddc299',size:.011,transparent:true,opacity:.25,depthWrite:false});scene.add(new THREE.Points(g,m));}

  function toggleLamp(){lampOn=!lampOn;lampLight.intensity=lampOn?2.7:0;lampShade.material.emissiveIntensity=lampOn?.32:.015;clickSound();}
  function clickSound(){if(!soundOn||!audioContext)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='triangle';osc.frequency.setValueAtTime(95,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(35,audioContext.currentTime+.08);gain.gain.setValueAtTime(.055,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.09);osc.connect(gain);gain.connect(audioGain);osc.start();osc.stop(audioContext.currentTime+.1);}
  $('sound').onclick=()=>{soundChoice=true;soundOn=!soundOn;ensureSound();};

  function getView(name){
    return {room:{pos:V(-1.28,1.61,2.05),look:V(.55,1.1,-1.75)},tv:{pos:V(-.22,1.28,-.70),look:V(-.22,1.10,-2.10)},desk:{pos:V(.68,1.48,-.42),look:V(1.77,.88,-.50)},ps1:{pos:V(.12,.72,-.89),look:V(.12,.09,-1.53)},bike:{pos:V(-.85,1.12,1.63),look:V(-1.84,.51,1.15)},wardrobe:{pos:V(.49,1.48,1.64),look:V(1.95,1.20,1.91)},curtains:{pos:V(.95,1.58,-1.28),look:V(1.05,1.87,-2.26)},entrance:{pos:V(-1.525,1.20,4.95),look:V(-1.525,1.06,2.85)}}[name];
  }

  function setLook(look){camera.lookAt(look);pitch=camera.rotation.x;yaw=camera.rotation.y;}
  function goTo(name,instant=false,onComplete){
    if(!renderer)return;

    if(!onComplete)cancelInsertion();
    if(!entered&&name!=='entrance'){entered=true;entering=false;$('entrance').hidden=true;$('quick-nav').hidden=!!playing;$('mobile-move').hidden=false;}
    const view=getView(name);if(!view)return;
    keys.clear();const q=new THREE.Quaternion(),dummy=new THREE.PerspectiveCamera();dummy.position.copy(view.pos);dummy.rotation.order='YXZ';dummy.lookAt(view.look);q.copy(dummy.quaternion);
    if(instant||reducedMotion){camera.position.copy(view.pos);camera.quaternion.copy(q);pitch=camera.rotation.x;yaw=camera.rotation.y;transition=null;onComplete?.();}
    else transition={start:performance.now(),duration:entering?2200:(name==='entrance'?1000:1250),from:camera.position.clone(),to:view.pos.clone(),qFrom:camera.quaternion.clone(),qTo:q,complete:onComplete};
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    $('reticle').hidden=!entered;$('room').focus({preventScroll:true});
  }
  function closeEntryDoor(sequence){
    soundEffect('door-close');const start=performance.now(),angle=door.rotation.y;
    function step(now){if(sequence!==entranceSequence)return;const t=reducedMotion?1:clamp((now-start)/750,0,1);door.rotation.y=angle*(1-t*t*(3-2*t));if(t<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }
  function syncAnalogViewing(){document.body.classList.remove('tv-view');}
  function enterRoom(skip=false){
    if(!renderer||entering||entered||!roomReady)return;closeDialogs();enableEntrySound();requestLook();entering=true;$('entrance').hidden=true;clickSound();
    if(skip||reducedMotion){door.rotation.y=0;entered=true;entering=false;goTo('room',true);$('quick-nav').hidden=false;$('mobile-move').hidden=false;$('reticle').hidden=false;return;}
    soundEffect('handle');soundEffect('door-open');const entryId=++entranceSequence;const start=performance.now();const animateDoor=now=>{if(entryId!==entranceSequence)return;const t=clamp((now-start)/1100,0,1);door.rotation.y=1.12*(1-(1-t)**3);if(t<1)requestAnimationFrame(animateDoor);};requestAnimationFrame(animateDoor);
    entered=true;goTo('room',false,()=>{entering=false;closeEntryDoor(entryId);$('quick-nav').hidden=false;$('mobile-move').hidden=false;});
  }
  $('enter').onclick=()=>enterRoom();$('skip').onclick=()=>enterRoom(true);
  $('home').onclick=()=>{if(!renderer)return;releaseLook();entranceSequence++;cancelInsertion();closeDialogs();eject(false);entered=false;entering=false;$('reticle').hidden=true;$('hotspots').hidden=true;$('quick-nav').hidden=true;$('mobile-move').hidden=true;goTo('entrance',false,()=>{$('entrance').hidden=false;});door.rotation.y=0;};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{goTo(b.dataset.view);});

  function cancelInsertion(){insertionSequence++;if(movingTape){scene.remove(movingTape);movingTape=null;}$('insert').disabled=!renderer;}
  function insertTape(){
    if(!renderer)return;cancelInsertion();const project=selected,sequence=insertionSequence;closeDialogs();$('quick-nav').hidden=true;$('insert').disabled=true;soundEffect('case-open');
    // Capture the selected item for the complete camera + insertion sequence.
    goTo('tv',false,()=>{
      if(sequence!==insertionSequence)return;
      soundEffect('tape-in');movingTape=new THREE.Group();scene.add(movingTape);box(.28,.027,.18,0,0,0,materials.black,movingTape);const tex=new THREE.CanvasTexture(project.coverCanvas);tex.encoding=THREE.sRGBEncoding;const label=flat(.22,.135,0,.014,0,mat('#fff',{map:tex}),movingTape);label.rotation.x=-Math.PI/2;movingTape.position.set(-.262,.464,-1.48);
      const object=movingTape,start=performance.now();const animate=now=>{if(sequence!==insertionSequence){object.traverse(o=>{if(o.geometry)o.geometry.dispose();});tex.dispose();return;}const t=reducedMotion?1:clamp((now-start)/850,0,1);object.position.z=-1.48-.54*(t*t*(3-2*t));if(t<1){requestAnimationFrame(animate);return;}scene.remove(object);object.traverse(o=>{if(o.geometry)o.geometry.dispose();});tex.dispose();movingTape=null;startPlayback(project);$('insert').disabled=false;};requestAnimationFrame(animate);
    });
  }
  function startPlayback(project){soundEffect('tape-start');PROJECTS.forEach(p=>{if(p.sceneObject)p.sceneObject.visible=p!==project;});playing=project;musicUI();paused=false;playbackTime=0;$('playing-title').textContent=project.title;$('playing-bar').hidden=false;$('quick-nav').hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label',txt('Пауза','Pause'));$('full-pause').textContent=txt('Пауза','Pause');clickSound();const video=$('project-video');if(project.video){video.src=project.video;video.load();video.play().catch(()=>notice('Нажмите воспроизведение на видео.'));screenMesh.material.map=new THREE.VideoTexture(video);}else{screenMesh.material.map=tvTexture;}screenMesh.material.needsUpdate=true;}
  function togglePause(){if(!playing)return;paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?txt('Продолжить','Resume'):txt('Пауза','Pause'));$('full-pause').textContent=paused?txt('Продолжить','Resume'):txt('Пауза','Pause');if(playing.video){if(paused)$('project-video').pause();else $('project-video').play().catch(()=>notice('Нажмите воспроизведение на видео.'));}}
  function eject(showNotice=true){if(movingTape)return;playing=null;paused=false;document.body.classList.remove('tv-view');PROJECTS.forEach(p=>{if(p.sceneObject)p.sceneObject.visible=true;});musicUI();$('project-video').pause();$('playing-bar').hidden=true;$('quick-nav').hidden=!entered;if(screenMesh){screenMesh.material.map=tvTexture;screenMesh.material.needsUpdate=true;}$('screen-dialog').close();if(showNotice){soundEffect('tape-out');notice('Кассета извлечена');}}
  function openScreen(){if(!playing){openDialog('tapes-dialog');return;}$('full-title').textContent=playing.title;$('full-demo').hidden=!!playing.video;$('project-video').hidden=!playing.video;$('full-screen').hidden=!!playing.video;openDialog('screen-dialog');}
  $('insert').onclick=insertTape;$('pause').onclick=togglePause;$('full-pause').onclick=togglePause;$('eject').onclick=()=>eject();$('fullscreen').onclick=openScreen;
  $('project-video').addEventListener('error',()=>notice('Видео не удалось загрузить. Проверьте файл проекта.'));

  function canMove(x,z){if(x< -1.98||x>1.98||z< -2.25||z>2.60)return false;const r=.17;return !colliders.some(c=>x>c.x1-r&&x<c.x2+r&&z>c.z1-r&&z<c.z2+r);}
  function walk(dt){
    if(!entered||entering||transition||dialogOpen())return;const f=(keys.has('KeyW')||keys.has('ArrowUp')||touchKeys.has('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||touchKeys.has('back')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')||touchKeys.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touchKeys.has('left')?1:0);
    if(!f&&!s)return;const previous=camera.position.clone();const speed=dt*1.6/Math.max(1,Math.hypot(f,s)),dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed,dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;
    if(canMove(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(canMove(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
    stepDistance+=Math.hypot(camera.position.x-previous.x,camera.position.z-previous.z);if(stepDistance>.57){stepDistance%=.57;const carpet=Math.abs(camera.position.x)<.91&&camera.position.z>-.745&&camera.position.z<1.805;soundEffect(carpet?'carpet-step':'floor-step');}camera.position.y=1.55;document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));
  }
  let dragStart={x:0,y:0},lastPointer={x:0,y:0},pointerMoved=false;
  $('room').addEventListener('pointerdown',e=>{
    if(e.button!==0)return;if(!entered&&!entering&&!dialogOpen()){enterRoom();return;}if(entering||dialogOpen()||transition)return;
    if(e.pointerType==='touch'){dragging=true;pointerMoved=false;dragStart={x:e.clientX,y:e.clientY};lastPointer={...dragStart};$('room').setPointerCapture?.(e.pointerId);return;}
    if(document.pointerLockElement===$('room')){currentTarget?.();return;}requestLook();
  });
  $('room').addEventListener('pointermove',e=>{
    if(!entered||dialogOpen()||transition)return;const locked=document.pointerLockElement===$('room'),touch=e.pointerType==='touch';
    if(touch&&!dragging)return;if(!touch&&!locked&&!freeLook)return;
    const dx=locked||!touch?e.movementX:e.clientX-lastPointer.x,dy=locked||!touch?e.movementY:e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};
    if(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>6)pointerMoved=true;yaw-=dx*.0026;pitch=clamp(pitch-dy*.0022,-.98,.92);camera.rotation.set(pitch,yaw,0,'YXZ');
  });
  $('room').addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&dragging&&!pointerMoved&&!transition&&!dialogOpen()){pointer.set(e.clientX/window.innerWidth*2-1,-e.clientY/window.innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(interactive.filter(o=>o.visible),true);if(hits[0]&&hits[0].distance<2.25&&visibleTarget(hits[0]))hits[0].object.userData.action?.();}dragging=false;});
  $('room').addEventListener('pointercancel',()=>{dragging=false;});
  window.addEventListener('keydown',e=>{
    if(e.code==='Escape'){releaseLook();touchKeys.clear();return;}
    if(dialogOpen())return;if(!entered){if(e.code==='KeyW'&&!e.repeat){e.preventDefault();enterRoom();}return;}
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='KeyE'&&!e.repeat&&currentTarget)currentTarget();
    if(e.code==='KeyF'&&!e.repeat){e.preventDefault();requestLook();}
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();touchKeys.clear();dragging=false;});
  document.addEventListener('visibilitychange',()=>{keys.clear();touchKeys.clear();if(audioContext&&audioGain)audioGain.gain.setTargetAtTime(soundOn&&!document.hidden?.55:0,audioContext.currentTime,.1);});
  document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();touchKeys.add(b.dataset.move);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>touchKeys.delete(b.dataset.move);});
  $('interact').onclick=()=>currentTarget?.();

  function drawTV(time){
    if(playing&&!playing.video)drawStudy(tvContext,512,384,PROJECTS.indexOf(playing),playbackTime);
    else if(!playing){
      const c=tvContext;const bg=c.createRadialGradient(256,192,5,256,192,300);bg.addColorStop(0,'#456cd2');bg.addColorStop(.5,'#14244e');bg.addColorStop(1,'#0a122a');c.fillStyle=bg;c.fillRect(0,0,512,384);
      c.strokeStyle='#849ee933';c.lineWidth=1;for(let i=0;i<14;i++){const s=1+i*.29;c.strokeRect(256-47*s,190-70*s,94*s,140*s);}c.fillStyle='#d1e0ff';c.font='18px monospace';c.fillText(txt('ПОСЛЕ ПОЛУНОЧИ','AFTER MIDNIGHT'),30,40);c.fillStyle='#96b8ff';c.font='13px monospace';c.fillText(txt('ВЫБЕРИТЕ КАССЕТУ','CHOOSE A TAPE'),30,348);c.fillStyle='#c0d4ff';c.font='12px monospace';c.fillText('AV 1',444,348);
      const glow=.5+Math.sin(time*.7)*.1;c.fillStyle=`rgba(172,197,255,${glow})`;c.fillRect(237,127,38,126);c.fillStyle='#5c7fce';c.beginPath();c.moveTo(237,253);c.lineTo(275,253);c.lineTo(332,325);c.lineTo(174,325);c.fill();
    }
    if(!playing){const c=tvContext;c.fillStyle='#080b181a';for(let y=0;y<384;y+=4)c.fillRect(0,y,512,1);c.fillStyle='#d0e2ff0a';c.fillRect(0,(time*25)%400,512,5);tvTexture.needsUpdate=true;}
    if($('screen-dialog').open&&playing&&!playing.video){const canvas=$('full-screen');const w=Math.min(1600,window.innerWidth*window.devicePixelRatio),h=Math.round(w*.75);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}drawStudy(canvas.getContext('2d'),w,h,PROJECTS.indexOf(playing),playbackTime);}
    if(playing&&!playing.video)tvTexture.needsUpdate=true;
    if(tvGlow)tvGlow.intensity=(playing?.id==='movement'?.72:1.0)+Math.sin(time*4)*.018;
  }
  function updateOverlays(){
    $('hotspots').hidden=true;currentTarget=null;
    if(entered&&!entering&&!transition&&!dialogOpen()){
      raycaster.setFromCamera({x:0,y:0},camera);
      const hits=raycaster.intersectObjects(interactive.filter(o=>o.visible),true);
      if(hits[0]&&hits[0].distance<2.25&&visibleTarget(hits[0])){const object=hits[0].object;currentTarget=object.userData.action;let parent=object;while(parent&&!parent.userData.label)parent=parent.parent;$('interaction-label').textContent=translated(parent?.userData.label||'Взаимодействовать');}
    }
    $('interact').hidden=!currentTarget;
    $('interact').querySelector('kbd').textContent=coarse?txt('Нажать','Tap'):'E';
  }
  function resize(){if(!renderer)return;const w=window.innerWidth,h=window.innerHeight;camera.aspect=w/h;camera.fov=w<650?72:61;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio,coarse?1.25:1.5));renderer.setSize(w,h,false);}
  window.addEventListener('resize',resize);
  function tick(now){
    animationId=requestAnimationFrame(tick);if(document.hidden){clock.getDelta();return;}const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;
    if(transition){const tr=transition,t=clamp((now-tr.start)/tr.duration,0,1),smooth=t*t*(3-2*t);camera.position.lerpVectors(tr.from,tr.to,smooth);camera.quaternion.slerpQuaternions(tr.qFrom,tr.qTo,smooth);if(t>=1){transition=null;pitch=camera.rotation.x;yaw=camera.rotation.y;tr.complete?.();}}
    walk(dt);syncAnalogViewing();updateSound();if(ps1Lid){ps1Angle=THREE.MathUtils.damp(ps1Angle,ps1Open?-1.18:0,6,dt);ps1Lid.rotation.x=ps1Angle;}updateRoomDetails(dt,time);musicTick(dt);if(playing&&!paused)playbackTime+=dt;if(now-lastTVDraw>1000/24){drawTV(time);lastTVDraw=now;}if(now-lastOverlay>90){updateOverlays();lastOverlay=now;}
    clockSeconds+=dt;$('clock').textContent=`00:${String(17+Math.floor(clockSeconds/60)%43).padStart(2,'0')}:${String(Math.floor(clockSeconds)%60).padStart(2,'0')}`;
    renderer.render(scene,camera);lastFrame=now;
  }

  let ps1Lid=null,ps1Open=false,ps1Angle=0,stepDistance=0,soundChoice=false,tvHissGain=null;
  const soundEvents=[];
  function soundUI(){
    $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?txt('Выключить звук','Mute sound'):txt('Включить звук','Enable sound'));
    $('sound').innerHTML=soundOn?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/></svg>';
  }
  function ensureSound(){
    if(!audioContext){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audioContext=new AC();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);
      const buffer=audioContext.createBuffer(1,audioContext.sampleRate*3,audioContext.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
      const noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioContext.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.45;
      tvHissGain=audioContext.createGain();tvHissGain.gain.value=0;noise.connect(filter);filter.connect(tvHissGain);tvHissGain.connect(audioGain);noise.start();
    }
    audioContext.resume().catch(()=>{});audioGain.gain.setTargetAtTime(soundOn?.55:0,audioContext.currentTime,.06);soundUI();
  }
  function enableEntrySound(){if(!soundChoice)soundOn=true;ensureSound();}
  function soundEffect(kind){
    if(!soundOn||!audioContext)return;
    soundEvents.push(kind);if(soundEvents.length>16)soundEvents.shift();
    const t=audioContext.currentTime;
    function tone(delay,duration,f1,f2,level,type='sine'){
      const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(f1,t+delay);o.frequency.exponentialRampToValueAtTime(f2,t+delay+duration);
      g.gain.setValueAtTime(.0001,t+delay);g.gain.exponentialRampToValueAtTime(level,t+delay+.006);g.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);
      o.connect(g);g.connect(audioGain);o.start(t+delay);o.stop(t+delay+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    function rub(delay,duration,frequency,level){
      const b=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate),d=b.getChannelData(0);
      for(let i=0;i<d.length;i++){const u=i/d.length;d[i]=(Math.random()*2-1)*Math.sin(Math.PI*u)**2;}
      const src=audioContext.createBufferSource(),f=audioContext.createBiquadFilter(),g=audioContext.createGain();src.buffer=b;f.type='lowpass';f.frequency.value=frequency;g.gain.value=level;src.connect(f);f.connect(g);g.connect(audioGain);src.start(t+delay);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};
    }
    const variation=.92+Math.random()*.16;
    if(kind==='handle'){tone(0,.07,950,430,.055,'triangle');tone(.065,.05,380,140,.055);rub(0,.11,2600,.038);}
    if(kind==='door-open'){rub(0,.65,750,.022);tone(.02,.57,190,125,.012,'triangle');}
    if(kind==='door-close'){rub(0,.50,650,.023);tone(.52,.16,115,44,.11);tone(.60,.065,620,210,.04,'triangle');}
    if(kind==='floor-step'){tone(0,.14,105*variation,40,.065);rub(.016,.12,1100,.045);tone(.04,.09,240,155,.013,'triangle');}
    if(kind==='carpet-step'){tone(0,.12,75*variation,33,.038);rub(0,.18,420,.027);}
    if(kind==='case-open'){rub(0,.24,3800,.047);tone(.06,.05,1300,380,.047,'triangle');rub(.2,.27,1800,.030);}
    if(kind==='tape-in'){rub(0,.60,1250,.036);tone(.12,.52,130,103,.020,'triangle');tone(.69,.10,230,70,.065);}
    if(kind==='tape-start'){tone(0,.06,390,90,.052);tone(.12,.6,65,170,.018,'triangle');rub(.05,.22,2600,.016);}
    if(kind==='tape-out'){tone(0,.42,170,85,.018,'triangle');rub(.1,.40,1300,.032);tone(.45,.06,360,90,.045);}
    if(kind==='lid-open'){tone(0,.045,850,220,.048,'triangle');rub(.05,.35,800,.018);}
    if(kind==='lid-close'){rub(0,.25,700,.018);tone(.3,.08,320,65,.055);}
  }
  function updateSound(){if(!audioContext||!tvHissGain)return;const d=camera.position.distanceTo(V(-.19,1.1,-1.78));const amount=entered&&!playing&&!movingTape?.012/(1+d*d*.9):0;tvHissGain.gain.setTargetAtTime(amount,audioContext.currentTime,.18);}
  function togglePS1(){ps1Open=!ps1Open;soundEffect(ps1Open?'lid-open':'lid-close');notice(ps1Open?'Дисковод открыт':'Дисковод закрыт');}
  function setupPS1Lid(parts){
    ps1Lid=group(.119,.086,-1.631);ps1Lid.name='Hinged original PS1 lid';(parts.ps1lid||[]).forEach(o=>ps1Lid.attach(o));
    // The dark underside and disc well sit below the original circular surface.
    cyl(.113,.113,.012,0,.010,.106,mat('#bdbdc1'),ps1Lid,64);cyl(.105,.105,.002,0,.003,.106,mat('#555760'),ps1Lid,64);
    cyl(.113,.113,.003,.119,.094,-1.525,materials.black,scene,64);cyl(.069,.069,.002,.119,.096,-1.525,mat('#555968',{metalness:.65,roughness:.3}),scene,48);
    cyl(.012,.012,.004,.119,.099,-1.525,materials.metal,scene,16);
    interactObject(ps1Lid,'ps1','Открыть / закрыть дисковод',togglePS1);interactObject(ps1Model,'ps1','Открыть / закрыть дисковод',togglePS1);
  }
  function childhoodShelves(){
    const pine=materials.wood,paper=mat('#d9cbae'),navy=mat('#263a5e'),red=mat('#8c342e'),green=mat('#687353');
    function shelf(z,y,width){const g=group(-2.08,y,z,Math.PI/2);box(width,.045,.25,0,0,0,pine,g);for(const x of [-width*.36,width*.36]){box(.034,.20,.032,x,-.11,-.105,materials.darkWood,g);rod(V(x,-.19,-.10),V(x,-.03,.10),.018,materials.darkWood,g);}return g;}
    const top=shelf(-1.44,2.43,1.38),lower=shelf(.96,1.72,1.18);
    function comic(g,x,i){const m=[navy,red,green][i%3];box(.025,.225,.16,x,.136,0,m,g);box(.014,.211,.152,x,.136,.002,paper,g);box(.026,.035,.008,x,.21,.084,mat('#dfb650'),g);}
    for(let i=0;i<7;i++)comic(lower,-.45+i*.03,i);for(let i=0;i<4;i++)comic(top,.37+i*.03,i);
    // A little tin robot, a toy rocket, a miniature skate deck and model dinosaurs.
    const robot=new THREE.Group();top.add(robot);robot.position.set(-.39,.025,0);
    box(.10,.13,.065,0,.17,0,navy,robot);box(.105,.073,.074,0,.277,0,materials.metal,robot);for(const x of [-.03,.03]){sphere(.012,x,.286,.041,mat('#d9b354'),robot);rod(V(x,.105,0),V(x*1.5,.029,.012),.018,materials.metal,robot);box(.043,.027,.075,x*1.5,.014,.016,navy,robot);}for(const s of [-1,1])rod(V(s*.059,.23,0),V(s*.078,.115,.02),.014,materials.metal,robot);cyl(.006,.006,.045,0,.335,0,materials.metal,robot,8);
    const rocket=new THREE.Group();top.add(rocket);rocket.position.set(-.05,.025,0);cyl(.032,.043,.18,0,.115,0,paper,rocket,12);const cone=mesh(new THREE.ConeGeometry(.033,.07,12),red,rocket);cone.position.y=.24;for(let i=0;i<3;i++){const a=i*2.094;rod(V(Math.cos(a)*.026,.09,Math.sin(a)*.026),V(Math.cos(a)*.072,.012,Math.sin(a)*.072),.012,red,rocket);}
    for(let i=0;i<2;i++){const toy=new THREE.Group();lower.add(toy);toy.position.set(.15+i*.20,.04,0);const body=sphere(.058,0,.06,0,green,toy);body.scale.set(1.4,.7,.55);rod(V(.04,.07,0),V(.075,.13,0),.020,green,toy);sphere(.027,.09,.135,0,green,toy);rod(V(-.07,.05,0),V(-.145,.09,0),.011,green,toy);for(const x of [-.036,.033])for(const z of [-.024,.024])rod(V(x,.04,z),V(x,.005,z),.009,green,toy);}
    // Headphones lie on the lower shelf, with padded cups and a curved headband.
    const phones=new THREE.Group();lower.add(phones);phones.position.set(-.07,.045,.027);const band=mesh(new THREE.TorusGeometry(.064,.007,6,24,Math.PI),materials.black,phones);band.rotation.x=-Math.PI/2;for(const x of [-.064,.064]){const cup=sphere(.029,x,0,0,materials.black,phones);cup.scale.set(.60,.6,1.3);}
    const board=group(-1.995,2.49,-1.19);box(.064,.016,.20,0,0,0,red,board);for(const z of [-.069,.069]){rod(V(-.047,-.024,z),V(.047,-.024,z),.007,materials.metal,board);for(const x of [-.041,.041]){const wh=cyl(.018,.018,.014,x,-.025,z,paper,board,10);wh.rotation.z=Math.PI/2;}}
  }
  function clothesWardrobe(){
    const g=group(1.93,0,1.98,-Math.PI/2);g.name='Wardrobe with childhood clothes';const oak=materials.wood,inside=materials.darkWood;
    for(const x of [-.535,.535])box(.05,2.23,.50,x,1.145,0,oak,g);
    for(const y of [.055,2.235])box(1.12,.065,.54,0,y,0,oak,g);box(1.04,2.13,.032,0,1.15,-.233,inside,g);
    box(.038,2.14,.45,-.045,1.145,0,oak,g);box(.49,2.15,.035,-.295,1.145,.26,oak,g);box(.023,.17,.024,-.10,1.14,.29,materials.gold,g);
    for(const y of [.36,1.87])box(.55,.035,.45,.25,y,0,oak,g);
    rod(V(0,1.72,0),V(.49,1.72,0),.009,materials.metal,g);
    const fabrics=[mat('#53667a'),mat('#8b4338'),mat('#75806b')];
    for(let i=0;i<3;i++){const x=.075+i*.16,m=fabrics[i];const hook=mesh(new THREE.TorusGeometry(.023,.003,4,14,Math.PI*1.7),materials.metal,g);hook.position.set(x,1.71,0);for(const z of [-.12,.12])rod(V(x,1.65,0),V(x,1.59,z),.004,materials.wood,g);box(.044,.45,.23,x,1.365,0,m,g);for(const z of [-.15,.15]){const arm=box(.043,.23,.08,x,1.48,z,m,g);arm.rotation.x=z>0?-.22:.22;}box(.046,.007,.018,x,1.58,.014,paperMaterial(),g);}
    for(let i=0;i<3;i++)box(.35,.06,.28,.235,.41+i*.068,.015,fabrics[i],g);
    box(.33,.17,.33,.25,2.00,0,mat('#927652'),g);box(.12,.022,.003,.25,2.01,.168,paperMaterial(),g);
    collision(1.64,2.2,1.39,2.56);
  }
  function paperMaterial(){return materials.paper||(materials.paper=mat('#cabd9d'));}

  let freeLook=false, curtainsClosed=false, curtainProgress=0, curtainPanels=[], watering=null, wateringCan=null, wateredUntil=0;
  const cloudObjects=[],autumnDetails=[];
  function requestLook(){
    if(coarse||dialogOpen())return;freeLook=true;
    const result=$('room').requestPointerLock?.();if(result?.catch)result.catch(()=>{});
  }
  function releaseLook(){freeLook=false;keys.clear();if(document.pointerLockElement)document.exitPointerLock();}
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)freeLook=false;document.body.classList.toggle('mouse-locked',document.pointerLockElement===$('room'));});
  // Reuse the old TV furniture at the scale and location of the approved floor plan.
  function restoreTVZone(){
    const before=new Set(scene.children),count=colliders.length;
    television();tapeShelf();
    box(1.42,.065,.30,-.79,2.51,-3.40,materials.wood);
    for(const x of [-1.30,-.28]){box(.06,.28,.06,x,2.34,-3.48,materials.darkWood);rod(V(x,2.25,-3.51),V(x,2.46,-3.24),.027,materials.darkWood);}
    const planter=group(-.86,2.56,-3.45);cyl(.15,.105,.23,0,.11,0,mat('#77705a'),planter,9);cyl(.132,.132,.007,0,.232,0,mat('#26231b'),planter,9);
    const leafMat=mat('#4f6229',{side:THREE.DoubleSide});
    for(let branch=0;branch<8;branch++){const a=branch*.78,points=[V(0,.22,0),V(Math.cos(a)*.18,.48+random()*.1,Math.sin(a)*.16),V(Math.cos(a)*.36,.37,Math.sin(a)*.29)];if(branch>4)points.push(V(.32,-.45,-.02),V(.36,-.84,.06));for(let i=1;i<points.length;i++)rod(points[i-1],points[i],.009,leafMat,planter);for(let i=0;i<11;i++){const u=i/10*(points.length-1),n=Math.min(Math.floor(u),points.length-2),p=points[n].clone().lerp(points[n+1],u-n);const leaf=mesh(new THREE.OctahedronGeometry(.085),leafMat,planter);leaf.position.copy(p).add(V((i%2?1:-1)*.04,0,.035));leaf.scale.set(1,.42,1.45);leaf.rotation.set(random(),random()*3,random()*2);}}
    const zone=new THREE.Group();zone.name='Restored pre-Blender TV zone';for(const o of [...scene.children])if(!before.has(o))zone.add(o);scene.add(zone);zone.scale.setScalar(.68);zone.position.set(.044,0,-.02);colliders.length=count;
    collision(-1.07,.40,-2.4,-1.78);collision(.40,1.24,-2.4,-1.79);
  }
  // Project the supplied photographs onto flat prints without stretching their borders.
  function printPanel(w,h,key,corners,parent){
    const c=corners||[[0,0],[1,0],[1,1],[0,1]],[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=c;
    const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
    const g=Math.abs(den)>1e-8?(dx3*dy2-dx2*dy3)/den:0,hp=Math.abs(den)>1e-8?(dx1*dy3-dx3*dy1)/den:0;
    const a=x1-x0+g*x1,b=x3-x0+hp*x3,d=y1-y0+g*y1,e=y3-y0+hp*y3;
    const geo=new THREE.PlaneGeometry(w,h,16,24),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=1-uv.getY(i),q=g*u+hp*v+1;uv.setXY(i,(a*u+b*v+x0)/q,1-(d*u+e*v+y0)/q);}
    const o=mesh(geo,mat('#fff',{map:artTextures[key],side:THREE.DoubleSide}),parent);o.castShadow=false;return o;
  }
  function restoredPrints(){
    const iron=group(-2.187,1.90,-1.32,Math.PI/2);box(.45,.66,.009,0,0,0,mat('#b9ac92'),iron);printPanel(.44,.65,'iron-giant-poster.jpg',[[.046,.015],[.93,.015],[.914,.975],[.055,.975]],iron).position.z=.006;
    const mgs=group(-2.185,1.90,-1.91,Math.PI/2);box(.45,.45,.009,0,0,0,materials.black,mgs);printPanel(.44,.44,'metal-gear-solid-cover.jpg',null,mgs).position.z=.006;
    const poster=group(2.188,1.94,-.46,-Math.PI/2);box(.61,.61,.018,0,0,0,materials.darkWood,poster);printPanel(.59,.59,'courage-poster.png',null,poster).position.z=.012;
    const game=(x,z,key,uv)=>{const g=group(x,.821,z);box(.205,.025,.205,0,0,0,materials.black,g);const p=printPanel(.196,.196,key,uv,g);p.rotation.x=-Math.PI/2;p.position.y=.014;};
    game(1.83,-1.10,'metal-gear-solid-cover.jpg');game(1.83,-.83,'warcraft-iii-reference.jpg',[[.041,.322],[.407,.274],[.456,.61],[.137,.649]]);
    const collection=group(1.98,0,.66,-Math.PI/2);
    function item(x,y,w,h,key,title,uv){const g=new THREE.Group();collection.add(g);g.position.set(x,y,.018);box(w,h,.055,0,0,0,materials.black,g);printPanel(w-.008,h-.008,key,uv,g).position.z=.031;interactObject(g,'collection',title,()=>showObject(title,key));}
    item(.17,.82,.31,.20,'tmnt-reference.jpg','Teenage Mutant Ninja Turtles',[[.018,.307],[.988,.295],[.988,.763],[.02,.763]]);
    item(-.215,1.466,.22,.355,'spider-man-reference.jpg','Spider-Man',[[.091,.110],[.917,.110],[.865,.918],[.09,.885]]);
    item(.005,1.419,.17,.26,'max-payne-reference.jpg','Max Payne',[[.106,.065],[.884,.065],[.898,.876],[.135,.902]]);
    item(.212,1.419,.17,.26,'painkiller-reference.jpg','Painkiller',[[.15,.042],[.815,.029],[.947,.914],[.09,.954]]);
    item(.015,1.985,.17,.295,'guyver-reference.jpg','Guyver');

  }
  function createCurtains(){
    const fabric=mat('#8b8da0',{map:textures.curtain,side:THREE.DoubleSide});
    rod(V(.12,2.76,-2.265),V(2.19,2.76,-2.265),.018,materials.darkWood);
    for(const side of [-1,1]){const geo=new THREE.PlaneGeometry(1,1.78,32,20),o=mesh(geo,fabric);o.name=side<0?'Left animated curtain':'Right animated curtain';curtainPanels.push({o,side});interactObject(o,'curtains','Открыть / закрыть шторы',toggleCurtains);}
    const handle=box(.032,.09,.025,1.815,1.6,-2.185,materials.gold);interactObject(handle,'curtains','Открыть / закрыть шторы',toggleCurtains);
    updateRoomDetails(0,0);
  }
  function toggleCurtains(){curtainsClosed=!curtainsClosed;clickSound();notice(curtainsClosed?'Шторы закрываются':'Шторы открываются');}
  function personalDetails(){
    // A wire paper bin next to the writing desk, clear of the chair and walking route.
    const bin=group(1.59,0,-1.67),wire=mat('#404344',{metalness:.5,roughness:.55});
    cyl(.116,.095,.015,0,.025,0,wire,bin,20);
    for(const y of [.035,.14,.245,.34]){const ring=mesh(new THREE.TorusGeometry(.095+y*.062,.004,4,24),wire,bin);ring.rotation.x=Math.PI/2;ring.position.y=y;}
    for(let i=0;i<24;i++){const a=i*Math.PI/12;rod(V(Math.cos(a)*.097,.035,Math.sin(a)*.097),V(Math.cos(a)*.117,.34,Math.sin(a)*.117),.0025,wire,bin);}
    for(let i=0;i<9;i++){const p=mesh(new THREE.IcosahedronGeometry(.035+random()*.015,0),mat('#d8d0b9'),bin);p.position.set((random()-.5)*.14,.07+i*.027,(random()-.5)*.13);p.rotation.set(random()*3,random()*3,random()*3);}
    collision(1.46,1.72,-1.80,-1.54);
    wateringCan=group(1.62,.821,-.07);const enamel=mat('#648678',{metalness:.35,roughness:.46});
    cyl(.047,.057,.097,0,.049,0,enamel,wateringCan,12);cyl(.024,.024,.007,0,.100,0,materials.black,wateringCan,12);
    rod(V(.034,.035,0),V(.114,.115,0),.009,enamel,wateringCan);sphere(.013,.12,.12,0,enamel,wateringCan);
    const handle=mesh(new THREE.TorusGeometry(.05,.006,6,16,Math.PI*1.65),enamel,wateringCan);handle.position.set(-.052,.06,0);handle.rotation.z=.5;
    interactObject(wateringCan,'water','Полить растение',waterPlant);
  }
  function waterPlant(){
    if(watering)return;if(performance.now()<wateredUntil){notice('Растение уже полито');return;}
    const drops=new THREE.Group();scene.add(drops);for(let i=0;i<18;i++){const d=sphere(.004,0,0,0,new THREE.MeshBasicMaterial({color:'#b9d7e1',transparent:true,opacity:.7}),drops);d.userData.phase=i/18;}
    watering={start:performance.now(),home:wateringCan.position.clone(),drops};clickSound();
  }
  function autumnExterior(){
    const bark=mat('#2a292a'),needles=mat('#111f2a');
    // Narrow foreground trees hide the house mass while leaving its glowing windows.
    for(const [x,z,h] of [[2.16,-5.25,3.9],[3.28,-5.55,4.3],[4.13,-5.65,3.8],[.20,-6.3,4.6]]){rod(V(x,0,z),V(x,h,z),.055,bark);for(let j=0;j<6;j++){const cone=mesh(new THREE.ConeGeometry(.46-j*.055,.82,9),needles);cone.position.set(x,.72+j*.52,z);}}
    for(const [x,z,h] of [[-.30,-4.4,3.8],[1.15,-6.1,4.5],[4.9,-6.4,4.1],[-2.2,-7.4,5]]){
      rod(V(x,0,z),V(x+.12,h,z),.043,bark);
      for(let j=0;j<11;j++){const y=h*(.3+j*.056),s=j%2?1:-1,p=V(x+.08,y,z),q=V(x+s*(.33+random()*.5),y+.35,z+(random()-.5)*.5);rod(p,q,.017,bark);for(let k=0;k<3;k++){const a=p.clone().lerp(q,.5+k*.2);rod(a,a.clone().add(V(s*.16,.23+random()*.22,(random()-.5)*.3)),.006,bark);}}
    }
    const road=box(12,.018,1.25,1,.022,-4.05,mat('#292c30',{roughness:.88}));road.castShadow=false;
    for(let i=0;i<12;i++){const puddle=mesh(new THREE.CircleGeometry(.16+random()*.24,18),mat('#455c73',{metalness:.5,roughness:.17,transparent:true,opacity:.75}));puddle.rotation.x=-Math.PI/2;puddle.scale.y=.38+random()*.4;puddle.position.set(-3+i*.69,.033,-3.6-random()*.88);puddle.castShadow=false;autumnDetails.push(puddle);}
    const leafMats=['#936438','#70462d','#ba8745'].map(c=>mat(c,{side:THREE.DoubleSide}));
    const leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.042,.07),leafMats[0],160),dummy=new THREE.Object3D();
    for(let i=0;i<160;i++){dummy.position.set(-4+random()*11,.038,-3.35-random()*1.43);dummy.rotation.set(-Math.PI/2,0,random()*Math.PI*2);dummy.scale.setScalar(.6+random());dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color(['#936438','#70462d','#ba8745'][i%3]));}scene.add(leaves);autumnDetails.push(leaves);
    const cloudMat=mat('#344456',{transparent:true,opacity:.55,depthWrite:false});
    for(let i=0;i<7;i++){const g=group(-15+i*5,6.5+random()*1.5,-17-random()*6);for(let j=0;j<4;j++){const o=sphere(1, j*1.5,random()*.25,random(),cloudMat,g);o.scale.set(2.2,.32,.72);o.castShadow=false;}cloudObjects.push({o:g,x:g.position.x});}
  }
  function domesticHallway(){
    const cream=mat('#ede6d4'),wood=mat('#aa845a');
    for(const x of [-3.35,.30])box(.03,.14,2.2,x,.07,4.1,cream);
    const lamp=new THREE.PointLight('#fff0d1',1.7,5,2);lamp.position.set(-1.525,2.40,4.2);scene.add(lamp);
    cyl(.20,.20,.035,-1.525,2.68,4.25,cream);cyl(.15,.15,.02,-1.525,2.65,4.25,mat('#fff1d8',{emissive:'#ffe0ad',emissiveIntensity:.5}));
    // Small domestic switch and plain white door casing visible from the corridor.
    box(.075,.095,.013,-.91,1.05,3.08,cream);box(.036,.06,.015,-.91,1.05,3.09,mat('#ddd6c7'));
    for(const x of [-2.035,-1.015])box(.075,2.22,.06,x,1.11,3.075,cream);box(1.10,.075,.06,-1.525,2.20,3.075,cream);
  }
  function updateRoomDetails(dt,time){
    const target=curtainsClosed?1:0;curtainProgress=reducedMotion?target:THREE.MathUtils.damp(curtainProgress,target,4.5,dt);if(Math.abs(curtainProgress-target)<.0001)curtainProgress=target;
    for(const {o,side} of curtainPanels){const p=o.geometry.attributes.position,w=THREE.MathUtils.lerp(.24,.88,curtainProgress),x=side<0?THREE.MathUtils.lerp(.32,.695,curtainProgress):THREE.MathUtils.lerp(2.03,1.565,curtainProgress);for(let i=0;i<p.count;i++){const u=(i%33)/32,v=Math.floor(i/33)/20,wind=reducedMotion?0:Math.sin(time*.7+u*5+side)*.012*v;p.setXYZ(i,(u-.5)*w,.81-v*1.62,Math.cos(u*Math.PI*12)*.022+wind);}p.needsUpdate=true;o.position.set(x,1.91,-2.265);o.geometry.computeVertexNormals();}
    for(const c of cloudObjects)c.o.position.x=c.x+(reducedMotion?0:Math.sin(time*.018+c.x)*.65);
    for(const o of autumnDetails)o.visible=seasonKey!=='winter';
    if(watering){const t=(performance.now()-watering.start)/1000,raise=Math.min(t/.7,1),lower=t>2.3?Math.min((t-2.3)/.7,1):0,a=raise*(1-lower);wateringCan.position.copy(watering.home).lerp(V(1.625,1.12,-.01),a);wateringCan.rotation.z=-.55*a;const nozzle=wateringCan.localToWorld(V(.12,.12,0));for(const d of watering.drops.children){const k=(t*1.5+d.userData.phase)%1;d.visible=t>.65&&t<2.35;d.position.copy(nozzle).lerp(V(1.79,.95,-.01),k);d.position.x+=(d.userData.phase-.5)*.018;}if(t>=3){wateringCan.position.copy(watering.home);wateringCan.rotation.z=0;scene.remove(watering.drops);watering.drops.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});watering=null;wateredUntil=performance.now()+18000;notice('Растение полито');}}
  }

  function batchStaticDetails(model){
    scene.updateMatrixWorld(true);const buckets=new Map(),animated=new Set([model,seasonalGroup,door,ps1Lid,wateringCan,...cloudObjects.map(c=>c.o)]);
    scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent)return;for(let p=o;p;p=p.parent)if(animated.has(p)||p.userData.action)return;
      const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
    });
    for(const objects of buckets.values()){if(objects.length<3)continue;const geometries=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);return g;}),geometry=new THREE.BufferGeometry();
      for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const count=geometries.reduce((n,g)=>n+g.attributes.position.count,0),array=new Float32Array(count*size);let offset=0;for(const g of geometries){if(g.attributes[name])array.set(g.attributes[name].array,offset);offset+=g.attributes.position.count*size;}geometry.setAttribute(name,new THREE.BufferAttribute(array,size));}
      const combined=new THREE.Mesh(geometry,objects[0].material);combined.castShadow=objects[0].castShadow;combined.receiveShadow=objects[0].receiveShadow;combined.name='Static room details';scene.add(combined);for(const o of objects)o.removeFromParent();for(const g of geometries)g.dispose();
    }
  }
  async function loadBlenderRoom(){
    const gltf=await new THREE.GLTFLoader().loadAsync('./assets/room.glb?v=6',e=>{if(e.total)$('load-progress').value=5+90*e.loaded/e.total;});
    const model=gltf.scene;scene.add(model);model.name='After midnight / Blender v6';
    const parts={};model.updateMatrixWorld(true);
    model.traverse(o=>{if(o.isMesh){if(o.name.includes('22-extended-ground'))o.position.y-=.07;const role=o.userData.role||o.name.split('__')[0];(parts[role]??=[]).push(o);o.castShadow=!['exterior','ps1'].includes(role);o.receiveShadow=true;const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{if(m.map){m.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}if(/Window clear glass/.test(m.name)){m.transparent=true;m.opacity=.08;m.depthWrite=false;}if(/Translucent storage/.test(m.name)){m.transparent=true;m.opacity=.24;m.depthWrite=false;}});}});
    function bind(role,label,action){for(const o of parts[role]||[])interactObject(o,role,label,action);}
    door=new THREE.Group();door.position.set(-1.975,0,2.85);scene.add(door);(parts.door||[]).forEach(o=>door.attach(o));door.position.y=.025;
    ps1Model=new THREE.Group();scene.add(ps1Model);(parts.ps1||[]).forEach(o=>ps1Model.attach(o));
    bind('notebook','Тетрадь',()=>openNotebook('about'));bind('music','Магнитофон',()=>openDialog('music-dialog'));
    bind('vcr','Выбрать кассету',()=>openDialog('tapes-dialog'));bind('tapes','Выбрать VHS',()=>openDialog('tapes-dialog'));
    bind('tv','Смотреть телевизор',()=>playing?openScreen():openDialog('tapes-dialog'));
    setupPS1Lid(parts);
    function point(color,intensity,distance,pos,shadow=false){const l=new THREE.PointLight(color,intensity,distance,2);l.position.copy(pos);l.castShadow=shadow&&!coarse;if(l.castShadow){l.shadow.mapSize.set(1024,1024);l.shadow.bias=-.001;l.shadow.normalBias=.025;}scene.add(l);return l;}
    const deskLight=point('#ffd28a',1.15,3,V(1.84,1.12,-.13));bind('deskLamp','Настольная лампа',()=>{deskLight.visible=!deskLight.visible;clickSound();});
    point('#386dff',1.6,6,V(1.13,1.9,-2.15));point('#e5bd8c',.55,6,V(-.3,2.48,.30));
    const outside=new THREE.DirectionalLight('#628aff',1.2);outside.position.set(2,6,-8);scene.add(outside);
    const threshold=flat(.85,.045,-1.525,.02,2.885,new THREE.MeshBasicMaterial({color:'#ffd18a',side:THREE.DoubleSide}));threshold.castShadow=false;
    point('#ffc87c',.7,2.4,V(-1.525,.08,3.05));
    seasonalGroup=new THREE.Group();scene.add(seasonalGroup);(parts.exterior||[]).forEach(o=>seasonalGroup.attach(o));
    collision(-2.2,-1.06,-2.40,-.10);collision(-2.2,-1.55,.14,1.90);collision(1.37,2.2,-1.5,.16);collision(.94,1.43,-.95,-.28);collision(1.68,2.2,.12,1.24);collision(-.10,.34,-1.67,-.96);
    // Link the three physical VHS cover meshes to the same projects as the menu.
    const artNames=['iron-giant-poster.jpg','metal-gear-solid-cover.jpg','warcraft-iii-reference.jpg','spider-man-reference.jpg','tmnt-reference.jpg','guyver-reference.jpg','max-payne-reference.jpg','painkiller-reference.jpg','courage-poster.png'];
    const loader=new THREE.TextureLoader();await Promise.all(artNames.map(async name=>{const t=await loader.loadAsync('./assets/'+name);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;artTextures[name]=t;}));
    restoreTVZone();restoredPrints();createCurtains();personalDetails();autumnExterior();domesticHallway();childhoodShelves();clothesWardrobe();batchStaticDetails(model);
    const grain=$('analog-grain'),gc=grain.getContext('2d');grain.width=192;grain.height=128;
    const noise=gc.createImageData(192,128);let noiseFrame=0;
    function updateGrain(){if(!document.hidden&&!document.body.classList.contains('tv-view')){for(let i=0;i<noise.data.length;i+=4){const v=Math.random()*255;noise.data[i]=v;noise.data[i+1]=v;noise.data[i+2]=v;noise.data[i+3]=255;}gc.putImageData(noise,0,0);}noiseFrame=setTimeout(updateGrain,reducedMotion?1000000:100);}
    updateGrain();window.addEventListener('pagehide',()=>clearTimeout(noiseFrame),{once:true});
  }

  async function init(){
    try{
      renderer=new THREE.WebGLRenderer({canvas:$('room'),antialias:false,alpha:false,powerPreference:'high-performance'});
      renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=!coarse;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      scene=new THREE.Scene();scene.background=new THREE.Color('#080d1b');scene.fog=new THREE.FogExp2('#0e1320',.023);
      camera=new THREE.PerspectiveCamera(61,window.innerWidth/window.innerHeight,.04,55);camera.rotation.order='YXZ';
      const skyLight=new THREE.HemisphereLight('#a6b3ce','#745434',.55);scene.add(skyLight);scene.add(new THREE.AmbientLight('#687394',.10));
      buildMaterials();
      resize();
      await loadBlenderRoom();
      updateSeason();setInterval(updateSeason,60000);roomReady=true;applyLanguage();
      resize();goTo('entrance',true);drawTV(0);renderer.compile(scene,camera);$('loading').hidden=true;$('entrance').hidden=false;
      $('room').addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(animationId);notice('Изображение приостановлено. Восстанавливаю комнату…');});
      $('room').addEventListener('webglcontextrestored',()=>{notice('Комната снова доступна');animationId=requestAnimationFrame(tick);});
      animationId=requestAnimationFrame(tick);
      // Feature-detected WebMCP shares the same public interaction handlers.
      if(document.modelContext?.registerTool){const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(_){}};
        register({name:'room_status',description:'Read room state, imported PS1, season, language and playback status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>{const {canMove,...state}=window.__roomDiagnostics();return state;}});
        register({name:'view_room_object',description:'Move to a room object using the same camera navigation as the room buttons.',inputSchema:{type:'object',properties:{object:{type:'string',enum:['room','tv','desk','ps1','bike','wardrobe','curtains']}},required:['object'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!['room','tv','desk','ps1','bike','wardrobe','curtains'].includes(input?.object))throw new Error('Unknown room object');goTo(input.object);return{view:input.object};}});
        register({name:'use_room_object',description:'Open or close the PS1 disc lid or the curtains, using the same interaction as clicking the object.',inputSchema:{type:'object',properties:{object:{type:'string',enum:['ps1','curtains']}},required:['object'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!entered||entering||transition||dialogOpen())throw new Error('Enter the room and finish moving first');if(input?.object==='ps1')togglePS1();else if(input?.object==='curtains')toggleCurtains();else throw new Error('Unknown room object');return{ps1Open,curtainsClosed};}});
        register({name:'list_vhs_tapes',description:'List the available demo VHS tapes in the room.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({tapes:PROJECTS.map(({id,title,number})=>({id,title,number,demo:true})),playing:playing?.id||null})});
        register({name:'open_vhs_cover',description:'Open a VHS cover for inspection. This does not start playback.',inputSchema:{type:'object',properties:{id:{type:'string',enum:PROJECTS.map(p=>p.id)}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='id'))throw new Error('Expected a tape id');const p=PROJECTS.find(p=>p.id===input.id);if(!p)throw new Error('Unknown tape');selectTape(p);return{id:p.id,view:'cover'};}});
        window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
      }
      window.__roomDiagnostics=()=>({three:THREE.REVISION,entered,entering,doorAngle:door.rotation.y,playing:playing?.id||null,curtainsClosed,curtainProgress,watering:!!watering,watered:performance.now()<wateredUntil,mouseLook:document.pointerLockElement===$('room')||freeLook,sceneObjects:scene.children.length,colliders:colliders.length,camera:camera.position.toArray(),frames:lastFrame>0,ps1Loaded:!!ps1Model,ps1Bounds:ps1Model?new THREE.Box3().setFromObject(ps1Model):null,modelError,season:seasonKey,language,music:{wanted:musicWanted,paused:music.paused,track:musicIndex,duration:music.duration,duck:musicDuck},roomModel:'blender-hybrid-v6',ps1Open,ps1Angle,soundOn,soundEvents:[...soundEvents],analog:!document.body.classList.contains('tv-view'),shelfBoards:4,visibleTapeCount:PROJECTS.filter(p=>p.sceneObject?.visible).length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,canMove});
    }catch(error){console.error('Room initialization:',error);renderer=null;$('loading').hidden=true;$('fallback').hidden=false;$('entrance').hidden=true;$('quick-nav').hidden=true;notice('Можно открыть концепт комнаты через меню.');}
  }
  // Current concept: physical objects, local music and the supplied GLB.
  let entranceSequence=0;
  let roomReady=false, ps1Model=null, activePage='about', seasonalGroup=null, seasonKey='', modelError=false;

  const artTextures={};
  const tapeObjects=[];
  const music=new Audio();music.preload='metadata';
  let musicIndex=0,musicWanted=false,musicMuted=false,musicNode=null,musicPanner=null,musicBus=null,musicContext=null;
  const musicPosition=V(1.98,1.10,.66);

  function hierarchyVisible(object){for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;}
  function visibleTarget(hit){
    const block=raycaster.intersectObjects(scene.children,true).find(h=>hierarchyVisible(h.object)&&h.object.material&&!h.object.material.transparent&&h.object.type==='Mesh');
    return !block||block.distance>=hit.distance-.06||block.object.userData.action===hit.object.userData.action;
  }
  async function loadPS1(){
    const gltf=await new THREE.GLTFLoader().loadAsync('./assets/ps1.glb',e=>{if(e.total)$('load-progress').value=45+Math.round(e.loaded/e.total*45);});
    ps1Model=gltf.scene;ps1Model.name='PS1-supplied-model';
    const bounds=new THREE.Box3().setFromObject(ps1Model),size=bounds.getSize(V());
    const scale=.74/size.x;ps1Model.scale.setScalar(scale);
    ps1Model.position.set(.89-(bounds.min.x+bounds.max.x)*.5*scale,.02-bounds.min.y*scale,-1.84);
    ps1Model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;}});
    scene.add(ps1Model);interactObject(ps1Model,'ps1','PlayStation',()=>goTo('ps1'));floorShadow(.89,-1.5,1.1,1.8);
    cable([[.91,.05,-1.95],[.72,.035,-2.08],[.57,.035,-2.29],[.24,.035,-2.40],[.16,.20,-3.4],[.03,1.12,-3.39]],.012);
    collision(.46,1.30,-2.19,-1.59);
  }
  function photoPanel(w,h,x,y,z,key,uv,parent){
    const geometry=new THREE.PlaneGeometry(w,h),a=geometry.attributes.uv;
    const coordinates=uv||[[0,0],[1,0],[1,1],[0,1]];
    [coordinates[0],coordinates[1],coordinates[3],coordinates[2]].forEach((p,i)=>a.setXY(i,p[0],1-p[1]));
    const m=mesh(geometry,mat('#fff',{map:artTextures[key],side:THREE.DoubleSide}),parent);m.position.set(x,y,z);m.castShadow=false;return m;
  }
  function showObject(title,key){
    $('object-heading').textContent=title;
    $('object-image').hidden=!key;if(key)$('object-image').src='./assets/'+key;
    $('object-image').alt=title;
    $('object-description').textContent=content.stories[title]?.[language]||txt('Эта вещь — часть моей коллекции. История появится здесь чуть позже.','A piece of my collection. Its story will be added here soon.');
    openDialog('object-dialog');
  }
  function collectible(parent,x,y,w,h,key,title,uv){
    const g=new THREE.Group();parent.add(g);g.position.set(x,y,0);
    box(w,h,.085,0,0,0,materials.black,g);photoPanel(w-.015,h-.015,0,0,.048,key,uv,g);
    interactObject(g,'collection',title,()=>showObject(title,key));return g;
  }
  function pineShelf(){
    const pine=mat('#dbab69',{map:textures.wood});
    const g=group(2.51,0,1.00,-.16);g.name='pine-shelf-four-boards';
    for(const x of [-.69,.69])for(const z of [-.25,.25])box(.09,2.68,.09,x,1.34,z,pine,g);
    for(const y of [.15,.89,1.65,2.38]){const board=box(1.43,.065,.61,0,y,0,pine,g);board.name='shelf-board';}
    for(const x of [-.69,.69])for(const y of [.15,.89,1.65,2.38]){const screw=cyl(.012,.012,.005,x,y,.297,materials.metal,g,8);screw.rotation.x=Math.PI/2;}
    const marks=canvasTexture(64,256,(c,w,h)=>{c.clearRect(0,0,w,h);c.strokeStyle='#2b251a';c.fillStyle='#2b251a';c.font='15px monospace';for(let i=0;i<10;i++){const y=10+i*24;c.fillText((i+1)*5,27,y+8);c.beginPath();c.moveTo(0,y);c.lineTo(25-(i%3)*5,y);c.stroke();}});
    flat(.076,.43,-.69,1.89,.301,new THREE.MeshBasicMaterial({map:marks,transparent:true}),g);
    const bookColors=['#263a4c','#764338','#bb9b62','#626553','#302a39'];
    const books=(start,y,count)=>{for(let i=0;i<count;i++){const height=.26+(i%3)*.028;box(.052,height,.21,start+i*.057,y+height/2+.037,-.04,mat(bookColors[i%5]),g);box(.043,.012,.003,start+i*.057,y+.115,.068,mat('#bbaa85'),g);}};
    books(-.57,.15,6);books(-.57,.89,4);books(-.57,1.65,3);
    const basketTex=canvasTexture(64,64,c=>{c.fillStyle='#b2a99b';c.fillRect(0,0,64,64);for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){c.fillStyle=(x+y)%32?'#494844':'#89887e';c.beginPath();c.moveTo(x,y);c.lineTo(x+16,y+16);c.lineTo(x,y+16);c.fill();}});
    box(.49,.46,.44,.35,.42,.025,mat('#d5c5a9',{map:basketTex}),g);
    collectible(g,.10,1.18,.87,.49,'tmnt-reference.jpg','Teenage Mutant Ninja Turtles',[[.018,.307],[.988,.295],[.988,.763],[.02,.763]]);
    collectible(g,-.18,1.96,.32,.53,'spider-man-reference.jpg','Spider-Man',[[.091,.110],[.917,.110],[.865,.918],[.09,.885]]);
    collectible(g,.17,1.91,.27,.42,'max-payne-reference.jpg','Max Payne',[[.11,.083],[.882,.084],[.89,.875],[.14,.90]]);
    collectible(g,.48,1.91,.27,.42,'painkiller-reference.jpg','Painkiller',[[.15,.042],[.815,.029],[.947,.914],[.09,.954]]);
    collectible(g,.06,2.67,.26,.48,'guyver-reference.jpg','Guyver');
    const ship=new THREE.Group();g.add(ship);ship.position.set(-.43,2.47,0);box(.32,.08,.21,0,0,0,mat('#688ca5'),ship);box(.1,.1,.17,0,.08,0,mat('#a7b3bb'),ship);for(const s of [-1,1])box(.11,.04,.32,s*.16,-.018,.02,mat('#536d85'),ship);box(.08,.065,.1,0,.05,.10,mat('#214263'),ship);
    const bin=box(.34,.24,.32,.43,2.535,-.015,mat('#b7c1c1',{transparent:true,opacity:.30,depthWrite:false}),g);
    for(let i=0;i<18;i++)box(.06,.045,.04,.32+(i%3)*.07,2.45+Math.floor(i/6)*.052,-.1+(Math.floor(i/3)%2)*.09,mat(['#b7412e','#d5b24a','#358a99'][i%3]),g);
    box(.24,.028,.20,-.08,.20,.07,mat('#77815a'),g);box(.1,.17,.10,-.08,.29,.07,mat('#c0b69d'),g);
    collision(1.73,3.30,.55,1.48);floorShadow(2.51,1.0,1.7,1.0);
  }
  function deskObjects(){
    const g=group(2.72,0,-.93,-Math.PI/2);
    const notebook=new THREE.Group();g.add(notebook);notebook.position.set(.18,.994,.18);notebook.rotation.y=-.13;
    box(.61,.025,.40,0,0,0,mat('#243945'),notebook);box(.59,.018,.38,0,.022,0,mat('#ded0b0'),notebook);
    const paper=canvasTexture(256,160,(c,w,h)=>{c.fillStyle='#d6c6a3';c.fillRect(0,0,w,h);c.strokeStyle='#84745a55';for(let y=27;y<h-9;y+=15){c.beginPath();c.moveTo(12,y);c.lineTo(w-12,y);c.stroke();}c.fillStyle='#3b4547';c.font='italic 18px Georgia';c.fillText('After midnight',14,24);c.fillStyle='#887653';c.fillRect(125,0,4,h);});
    const surface=flat(.58,.37,0,.033,0,mat('#fff',{map:paper}),notebook);surface.rotation.x=-Math.PI/2;
    interactObject(notebook,'notebook','Тетрадь',()=>openNotebook('about'));
    rod(V(.37,1.032,.18),V(.61,1.032,.27),.006,mat('#b8914a'),g);
    const radio=new THREE.Group();g.add(radio);radio.position.set(-.70,1.16,-.13);
    box(.65,.36,.20,0,0,0,mat('#383937'),radio);box(.62,.32,.018,0,0,.11,mat('#45463f'),radio);
    for(const x of [-.215,.215]){const speaker=cyl(.104,.104,.018,x,-.018,.129,mat('#1a2223'),radio,16);speaker.rotation.x=Math.PI/2;for(let n=0;n<8;n++)box(.17,.006,.003,x,-.085+n*.022,.143,mat('#5d6056'),radio);}
    box(.17,.13,.015,0,-.025,.134,materials.black,radio);box(.135,.067,.008,0,-.025,.146,mat('#919680'),radio);
    for(const x of [-.042,.042]){const reel=cyl(.023,.023,.01,x,-.025,.157,materials.black,radio);reel.rotation.x=Math.PI/2;}
    for(let i=0;i<5;i++)box(.036,.017,.04,-.09+i*.045,.19,.033,mat('#9c9c8a'),radio);
    box(.37,.035,.045,0,.25,-.02,materials.black,radio);for(const x of [-.185,.185])box(.025,.08,.045,x,.21,-.02,materials.black,radio);
    flat(.19,.037,0,.107,.13,new THREE.MeshBasicMaterial({map:labelTexture('STEREO','#ceb988','#303831')}),radio);
    interactObject(radio,'music','Магнитофон',()=>openDialog('music-dialog'));
    const lamp=group(3.02,1.0,-.13);cyl(.095,.10,.025,0,0,0,materials.black,lamp);rod(V(0,0,0),V(-.10,.34,0),.013,materials.black,lamp);const shade=cyl(.055,.105,.13,-.11,.32,0,mat('#272a2b',{emissive:'#9c7432',emissiveIntensity:.20}),lamp);shade.rotation.z=-.55;
    const light=new THREE.PointLight('#ffd39a',.85,3.1,2);light.position.set(2.88,1.31,-.15);scene.add(light);
    interactObject(lamp,'lamp','Настольная лампа',()=>{light.visible=!light.visible;clickSound();});
    collectible(g,-.21,1.22,.34,.43,'metal-gear-solid-cover.jpg','Metal Gear Solid').position.z=-.35;
    collectible(g,.19,1.22,.35,.43,'warcraft-iii-reference.jpg','Warcraft III',[[.038,.332],[.418,.265],[.453,.613],[.139,.648]]).position.z=-.35;
  }
  function calendarSeason(date=new Date()){
    let month=Number(new Intl.DateTimeFormat('en',{timeZone:content.calendar.timeZone,month:'numeric'}).format(date))-1;
    if(content.calendar.hemisphere==='south')month=(month+6)%12;
    return ['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][month];
  }
  function updateSeason(){
    const next=calendarSeason();if(next===seasonKey)return;seasonKey=next;
    // Keep the supplied forest and house; vary only seasonal surfaces.
    if(seasonalGroup)seasonalGroup.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(/Blue forest ground|Exterior extended forest ground/.test(m.name))m.color.set(seasonKey==='winter'?'#a8b5c6':seasonKey==='autumn'?'#514238':'#304039');if(/Cool slate roof/.test(m.name))m.color.set(seasonKey==='winter'?'#b0bdcf':'#394258');});});
    syncSeasonLabel();
  }
  function syncSeasonLabel(){const names={winter:['ЗИМА','WINTER'],spring:['ВЕСНА','SPRING'],summer:['ЛЕТО','SUMMER'],autumn:['ОСЕНЬ','AUTUMN']};$('season-label').textContent=(names[seasonKey]||names[calendarSeason()])[language==='ru'?0:1];}
  function openNotebook(page){activePage=page;renderNotebook();openDialog('notebook-dialog');}
  function renderNotebook(){
    const labels={about:txt('Обо мне','About me'),process:txt('Процесс','Process'),contact:txt('Контакты','Contact')};
    $('notebook-heading').textContent=labels[activePage];
    document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===activePage);b.textContent=labels[b.dataset.page];b.setAttribute('aria-pressed',b.dataset.page===activePage);});
    const lead={about:(content.name&&typeof content.name==='object'?content.name[language]:content.name)||txt('Моушн-дизайнер.\nКомната, собранная из интересов.','Motion designer.\nA room made of interests.'),process:txt('От первой заметки\nдо последнего кадра.','From the first note\nto the final frame.'),contact:txt('Оставим место\nдля разговора.','A place to start\na conversation.')};
    $('notebook-lead').textContent=lead[activePage];
    const body=$('notebook-body');body.replaceChildren();
    const add=s=>{const p=document.createElement('p');p.textContent=s;body.append(p);};
    if(activePage==='contact'){
      if(!content.contacts.length)add(txt('Контакты появятся здесь чуть позже.','Contact details will be added here soon.'));
      content.contacts.forEach(contact=>{const a=document.createElement('a');a.textContent=typeof contact.label==='object'?contact.label[language]:contact.label;a.href=contact.url;a.rel='noopener noreferrer';body.append(a);});
    }else{
      const supplied=content[activePage]?.[language];
      add(supplied||txt('Эта страница пока не заполнена.','This page has not been written yet.'));
      if(activePage==='about'&&!supplied)add(txt('А пока можно осмотреть комнату, выбрать музыку и заглянуть на полки.','Meanwhile, explore the room, choose some music and look around the shelves.'));
    }
    document.querySelector('.paper-number').textContent=String(['about','process','contact'].indexOf(activePage)+1).padStart(2,'0')+' / 03';
    document.querySelector('.paper-kicker').textContent=txt('ЛИЧНЫЕ ЗАМЕТКИ','PERSONAL NOTES');
  }
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{activePage=b.dataset.page;renderNotebook();});
  $('notebook-menu').onclick=()=>openNotebook('about');$('music-menu').onclick=()=>openDialog('music-dialog');
  const stamp=seconds=>{if(!Number.isFinite(seconds))return '00:00';return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');};
  function musicUI(){
    const track=content.tracks[musicIndex];$('track-title').textContent=track.title;$('track-author').textContent=track.author+' · '+track.license;$('music-source').href=track.source;
    $('music-play').textContent=musicWanted?'Ⅱ':'▶';$('music-play').setAttribute('aria-label',musicWanted?txt('Пауза','Pause'):txt('Воспроизвести музыку','Play music'));
    $('music-status').textContent=musicWanted?(playing?txt('ТВ / ПАУЗА','TV / PAUSE'):(musicMuted?txt('БЕЗ ЗВУКА','MUTE'):txt('ИГРАЕТ','PLAY'))):txt('СТОП','STOP');
    document.querySelectorAll('[data-track]').forEach(b=>b.classList.toggle('active',Number(b.dataset.track)===musicIndex));
  }
  function selectMusic(index,play=musicWanted){musicIndex=(index+content.tracks.length)%content.tracks.length;music.src=content.tracks[musicIndex].src;musicWanted=play;$('music-error').hidden=true;if(play)playMusic();musicUI();}
  async function playMusic(){
    try{
      if(!soundOn)await roomSoundToggle();musicMuted=false;
      if(!musicContext){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(AC){musicContext=new AC();musicNode=musicContext.createMediaElementSource(music);musicPanner=musicContext.createPanner();musicPanner.panningModel='HRTF';musicPanner.distanceModel='inverse';musicPanner.refDistance=1.7;musicPanner.rolloffFactor=.6;musicPanner.setPosition(...musicPosition.toArray());musicBus=musicContext.createGain();musicNode.connect(musicPanner);musicPanner.connect(musicBus);musicBus.connect(musicContext.destination);}
      }
      if(musicContext)await musicContext.resume();musicWanted=true;
      if(!playing&&!document.hidden)await music.play();musicUI();
    }catch(e){musicWanted=false;$('music-error').textContent=txt('Не удалось включить запись. Попробуйте ещё раз или выберите другой трек.','Could not play this recording. Try again or select another track.');$('music-error').hidden=false;musicUI();}
  }
  $('music-play').onclick=()=>{if(musicWanted){musicWanted=false;music.pause();musicUI();}else playMusic();};
  $('music-prev').onclick=()=>selectMusic(musicIndex-1);$('music-next').onclick=()=>selectMusic(musicIndex+1);
  $('music-volume').oninput=()=>{music.volume=Number($('music-volume').value);};music.volume=.35;
  $('music-seek').oninput=()=>{if(Number.isFinite(music.duration))music.currentTime=music.duration*Number($('music-seek').value)/100;};
  music.addEventListener('timeupdate',()=>{$('music-time').textContent=stamp(music.currentTime);$('music-duration').textContent=stamp(music.duration);$('music-seek').value=Number.isFinite(music.duration)?music.currentTime/music.duration*100:0;});
  music.addEventListener('ended',()=>selectMusic(musicIndex+1,true));
  music.addEventListener('error',()=>{musicWanted=false;$('music-error').hidden=false;$('music-error').textContent=txt('Запись недоступна. Выберите другой трек.','Recording unavailable. Choose another track.');musicUI();});
  content.tracks.forEach((track,index)=>{const b=document.createElement('button');b.dataset.track=index;b.textContent=String(index+1).padStart(2,'0')+'   '+track.title+' — '+track.author;b.onclick=()=>selectMusic(index,true);$('music-tracks').append(b);});
  const roomSoundToggle=$('sound').onclick;$('sound').onclick=async()=>{await roomSoundToggle();musicMuted=!soundOn;musicUI();};
  selectMusic(0,false);
  let musicDuck=1;
  function musicTick(dt){
    if(!musicContext||!camera)return;
    const listener=musicContext.listener,p=camera.position,forward=camera.getWorldDirection(V());
    listener.setPosition(p.x,p.y,p.z);listener.setOrientation(forward.x,forward.y,forward.z,0,1,0);
    const target=playing||document.hidden||musicMuted?0:1;musicDuck+=(target-musicDuck)*Math.min(1,dt*5);musicBus.gain.setTargetAtTime(musicDuck,musicContext.currentTime,.05);
    if(playing&&musicDuck<.01&&!music.paused)music.pause();
    if(!playing&&musicWanted&&music.paused&&!document.hidden)music.play().catch(()=>{musicWanted=false;musicUI();});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)music.pause();else if(musicWanted&&!playing)music.play().catch(()=>{});});

  const languagePairs={
    'ПОСЛЕ':'AFTER','ПОЛУНОЧИ':'MIDNIGHT','Кассеты':'Tapes','Тетрадь':'Notebook','Концепт':'Concept','ПО ТУ СТОРОНУ ДВЕРИ':'ON THE OTHER SIDE','Войти':'Enter','W / щелчок':'W / click','Пропустить вступление':'Skip entrance','Комната':'Room','Телевизор':'Television','Стол':'Desk','ТВ':'TV','На весь экран':'Full screen',
    'На полке':'On the shelf','Выберите кассету. Дальше — к телевизору.':'Choose a tape. Next stop: the television.','Демонстрационные кассеты для проверки просмотра. Авторские видео будут добавлены отдельно.':'Demo tapes to explore playback. Portfolio projects will be added separately.','Демонстрационный этюд':'Demo study','Вставить в видеомагнитофон':'Insert into VCR','Все кассеты':'All tapes','ДЕМО':'DEMO','ПОСЛЕ ПОЛУНОЧИ':'AFTER MIDNIGHT',
    'Одна комната. Два ракурса.':'The room concept','От двери':'From the doorway','У стола':'At the desk','Тёплая лампа, холодный экран, свободный центр комнаты.':'Warm lamps, a cool screen, space to wander.','ОСВАИВАЙТЕСЬ':'MAKE YOURSELF AT HOME','Осмотритесь.':'Look around.','Ходить по комнате':'Walk around','Мышь / касание':'Mouse / touch','Потянуть, чтобы осмотреться':'Drag to look around','Взаимодействовать с предметом':'Interact with an object','Свободный обзор мышью':'Free mouse look','Освободить мышь / закрыть окно':'Release mouse / close','Кнопки внизу перенесут к телевизору и столу. Кассеты всегда доступны через меню сверху.':'Use the buttons below to move to the TV and desk. Tapes are also available in the top menu.','Звук включается только по вашему желанию.':'Sound starts only when you turn it on.',
    'движение':'move','потяните мышью для осмотра':'drag to look around','Проведите пальцем, чтобы осмотреться':'Swipe to look around','СТЕРЕО / КАССЕТА A':'STEREO / SIDE A','Магнитофон':'Tape player','Громкость':'Volume','Материалы':'Credits','Записи':'Recordings','Модель':'Model','Оптимизирована для сайта.':'Optimized for this site.','Источник записи / CC0':'Recording source / CC0','КОЛЛЕКЦИЯ':'COLLECTION','После полуночи':'After midnight','Выбрать кассету':'Choose a tape','Смотреть телевизор':'Watch TV','Включить / выключить лампу':'Toggle lamp','Настольная лампа':'Desk lamp','Взаимодействовать':'Interact','Игровой стол':'Desk','Выбрать VHS':'Choose VHS',
    'Движение':'Motion','Пространство':'Space','Текстуры':'Textures','Ритм и форма':'Rhythm and form','Свет и перспектива':'Light and perspective','Волны и отражения':'Waves and reflections','Пауза':'Pause','Продолжить':'Resume','Кассета извлечена':'Tape ejected',
    'Красная лента, петли и непрерывный ритм. Демонстрационный этюд для просмотра через VHS.':'A red ribbon, loops and continuous rhythm. A demo study for VHS playback.',
    'Свет в конце коридора. Демонстрационный этюд о глубине и медленном движении.':'Light at the end of a corridor. A demo study of depth and slow movement.',
    'Вода, блики и аналоговый шум. Демонстрационный этюд для синего экрана после полуночи.':'Water, reflections and analog noise. A demo study for the blue screen after midnight.',
    'В этом браузере не удалось включить 3D. Можно рассмотреть концепт комнаты и обложки кассет.':'3D is unavailable in this browser. You can still view the room concept and tape covers.','Посмотреть комнату':'View room','Нажмите воспроизведение на видео.':'Press play on the video.','Видео не удалось загрузить. Проверьте файл проекта.':'The video could not be loaded.','В этом браузере звук недоступен.':'Audio is unavailable in this browser.','Потяните мышью, чтобы осмотреться.':'Drag to look around.',
    'Закрыть':'Close','Управление':'Controls','Включить звук':'Enable sound','Выключить звук':'Mute sound','Извлечь кассету':'Eject tape','Закрыть полноэкранный просмотр':'Close full-screen view','Вход в комнату':'Room entrance','Главное меню':'Main menu','Вернуться к входу':'Return to the door','Перемещение по комнате':'Move around the room','Шаг вперёд':'Step forward','Шаг влево':'Step left','Шаг назад':'Step back','Шаг вправо':'Step right','Интерактивная 3D-комната':'Interactive 3D room','Предыдущий трек':'Previous track','Следующий трек':'Next track','Позиция воспроизведения':'Playback position','Загрузка комнаты':'Loading room','Страницы тетради':'Notebook pages','Полноэкранный просмотр':'Full-screen playback','Ракурс':'View','Движение по комнате':'Move around the room','Свет уже горит…':'The light is already on…','Изображение приостановлено. Восстанавливаю комнату…':'The image is paused. Restoring the room…','Комната снова доступна':'The room is available again','Можно открыть концепт комнаты через меню.':'You can open the room concept from the menu.','Для интерактивной комнаты нужен JavaScript.':'JavaScript is required for the interactive room.','КОЛЛЕКЦИЯ VHS / 01—03':'VHS COLLECTION / 01—03'
  };
  Object.assign(languagePairs,{'Открыть / закрыть дисковод':'Open / close disc lid','Дисковод открыт':'Disc lid open','Дисковод закрыт':'Disc lid closed','мышь — осмотр · Esc — меню':'mouse — look · Esc — menu','Двигать мышью; на телефоне — провести пальцем':'Move the mouse; swipe on touchscreens','Открыть / закрыть шторы':'Open / close curtains','Шторы закрываются':'Closing curtains','Шторы открываются':'Opening curtains','Полить растение':'Water the plant','Растение полито':'Plant watered','Растение уже полито':'The plant has already been watered'});
  const reversePairs=Object.fromEntries(Object.entries(languagePairs).map(([ru,en])=>[en,ru]));Object.assign(reversePairs,{Desk:'Стол','Move around the room':'Перемещение по комнате'});
  function translated(value){const key=reversePairs[value]||value;return language==='en'?(languagePairs[key]||value):key;}
  function applyLanguage(){
    document.documentElement.lang=language;document.title=txt('После полуночи — комната','After midnight — a room');
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const n=walker.currentNode;if(['SCRIPT','STYLE','CANVAS'].includes(n.parentElement?.tagName))continue;const trimmed=n.textContent.trim();if(languagePairs[trimmed]||reversePairs[trimmed])n.textContent=n.textContent.replace(trimmed,translated(trimmed));}
    document.querySelectorAll('[aria-label]').forEach(el=>el.setAttribute('aria-label',translated(el.getAttribute('aria-label'))));
    $('room').setAttribute('aria-label',txt('3D-комната. WASD — движение, мышь — осмотр, Esc — меню.','3D room. WASD to move, mouse to look, Esc for menus.'));
    PROJECTS.forEach((p,i)=>{p.title=translated(p.title);p.subtitle=translated(p.subtitle);p.description=translated(p.description);makeCover(p,i);if(p.coverTexture){p.coverTexture.image=p.coverCanvas;p.coverTexture.needsUpdate=true;}});
    populateTapes();$('language').textContent=language==='ru'?'EN':'RU';$('language').setAttribute('aria-label',txt('Switch to English','Переключить на русский'));
    if(playing){$('playing-title').textContent=playing.title;$('full-title').textContent=playing.title;}
    if($('tape-dialog').open){$('tape-heading').textContent=selected.title;$('tape-description').textContent=selected.description;$('tape-number').textContent=txt('КАССЕТА ','TAPE ')+selected.number+' / VHS';}
    document.querySelectorAll('.dialog-language').forEach(b=>{b.textContent=language==='ru'?'EN':'RU';b.setAttribute('aria-label',txt('Switch to English','Переключить на русский'));});
    document.querySelector('meta[name=description]').content=txt('После полуночи — личная интерактивная комната. Работы на ТВ, заметки в тетради, музыка на кассете.','After midnight — a personal interactive room. Projects on TV, notes in a notebook, music on tape.');
    renderNotebook();musicUI();syncSeasonLabel();
  }
  $('language').onclick=()=>{language=language==='ru'?'en':'ru';try{localStorage.setItem('midnight-language',language);}catch(_){}applyLanguage();};

  document.querySelectorAll('dialog').forEach(d=>{const b=document.createElement('button');b.className='dialog-language';b.textContent='EN';b.onclick=()=>$('language').click();d.prepend(b);});
  applyLanguage();
  init();
})();


