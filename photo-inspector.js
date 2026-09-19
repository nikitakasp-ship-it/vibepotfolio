/* An inspected frame uses a second, on-demand scene; its place on the desk is restored on close. */
window.PhotoInspector=class PhotoInspector {
  constructor(dialog){
    this.dialog=dialog;this.canvas=dialog.querySelector('canvas');this.pointer=null;
    this.canvas.addEventListener('pointerdown',e=>{if(e.button!==0||this.pointer)return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);this.canvas.focus();});
    this.canvas.addEventListener('pointermove',e=>{if(this.pointer?.id!==e.pointerId)return;this.rotate((e.clientX-this.pointer.x)*.009,(e.clientY-this.pointer.y)*.009);this.pointer.x=e.clientX;this.pointer.y=e.clientY;});
    const end=e=>{if(this.pointer?.id===e.pointerId){this.pointer=null;if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);}};
    this.canvas.addEventListener('pointerup',end);this.canvas.addEventListener('pointercancel',end);this.canvas.addEventListener('lostpointercapture',()=>{this.pointer=null;});
    this.canvas.addEventListener('keydown',e=>{const keys={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]};if(keys[e.key]){e.preventDefault();e.stopPropagation();this.rotate(...keys[e.key]);}});
    dialog.querySelector('[data-photo-reset]').onclick=()=>{if(this.object){this.object.rotation.set(0,0,0);this.draw();}};
    dialog.addEventListener('close',()=>{if(!dialog.open)this.release();});
    this.resizeObserver=new ResizeObserver(()=>{if(dialog.open)this.draw();});this.resizeObserver.observe(this.canvas);
  }
  open(source){
    this.release();
    if(!this.renderer){
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputEncoding=THREE.sRGBEncoding;
      this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(38,1,.01,10);
      this.scene.add(new THREE.HemisphereLight('#fff6df','#5f657c',1.4));const light=new THREE.DirectionalLight('#ffe5c3',.9);light.position.set(-1,2,3);this.scene.add(light);
    }
    this.source=source;source.visible=false;this.object=source.clone(true);this.object.visible=true;
    this.object.position.set(0,0,0);this.object.rotation.set(0,0,0);this.object.scale.setScalar(1);this.scene.add(this.object);
    this.dialog.showModal();this.draw();this.canvas.focus({preventScroll:true});
  }
  rotate(y,x){if(!this.object)return;this.object.rotation.y+=y;this.object.rotation.x+=x;this.draw();}
  draw(){
    if(!this.object||!this.dialog.open)return;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
    const radius=this.source.userData.inspectRadius||.17;
    this.camera.position.set(0,0,radius/Math.sin(19*Math.PI/180)/Math.min(1,w/h)*1.15);this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);
  }
  release(){
    this.pointer=null;if(this.source)this.source.visible=true;
    if(this.object)this.scene.remove(this.object);
    // Clones share geometry/materials with the original: do not dispose them.
    this.object=null;this.source=null;
  }
};
