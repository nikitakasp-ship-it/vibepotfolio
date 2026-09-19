/* Input state is independent of viewport size and pointer-lock support. */
(() => {
  'use strict';
  window.RoomLookInput = class {
    constructor(){this.reset();}
    reset(){this.pointerId=null;this.moved=false;this.start=null;this.last=null;}
    begin(e){
      if(this.pointerId!==null)return false;
      this.pointerId=e.pointerId;this.start=this.last={x:e.clientX,y:e.clientY};this.moved=false;return true;
    }
    move(e){
      if(e.pointerId!==this.pointerId||!this.last)return null;
      const delta={x:e.clientX-this.last.x,y:e.clientY-this.last.y};
      this.last={x:e.clientX,y:e.clientY};
      if(Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>6)this.moved=true;
      return delta;
    }
    end(e){
      if(e.pointerId!==this.pointerId)return null;
      const tap=!this.moved;this.reset();return tap;
    }
    static rotate(yaw,pitch,dx,dy){
      if(![yaw,pitch,dx,dy].every(Number.isFinite))return null;
      return {yaw:yaw-dx*.0026,pitch:Math.min(1.45,Math.max(-1.45,pitch-dy*.0022))};
    }
  };
})();
