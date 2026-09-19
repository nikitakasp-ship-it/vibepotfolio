/* Weather data foundation. No scene effects or presets. Collection stays off until launch. */
(function(root){
  'use strict';
  const config=Object.freeze({enabled:false});
  const fail=code=>Object.assign(new Error(code),{code});
  const coarse=n=>Math.round(n*10)/10; // ~11 km latitude grid, sufficient for local model weather.
  function normalize(data){
    const c=data?.current;
    if(!c||!Number.isFinite(c.rain)||!Number.isFinite(c.wind_speed_10m)||!Number.isFinite(c.cloud_cover)||!Number.isFinite(c.wind_direction_10m)||!Number.isFinite(c.wind_gusts_10m)||typeof c.time!=='string')throw fail('invalid-data');
    return Object.freeze({rainMm:Math.max(0,c.rain),windMps:Math.max(0,c.wind_speed_10m),gustMps:Math.max(0,c.wind_gusts_10m),windDegrees:((c.wind_direction_10m%360)+360)%360,cloudFraction:Math.min(1,Math.max(0,c.cloud_cover/100)),observedAt:c.time+'Z',source:'Open-Meteo'});
  }
  async function openMeteo(location,signal,fetcher=root.fetch.bind(root)){
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.search=new URLSearchParams({latitude:coarse(location.latitude),longitude:coarse(location.longitude),current:'rain,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover',wind_speed_unit:'ms',timezone:'GMT',forecast_days:'1'}).toString();
    const response=await fetcher(url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    if(!response.ok)throw fail('network');
    return normalize(await response.json());
  }
  class WeatherContext {
    constructor({enabled=config.enabled,geolocation=root.navigator?.geolocation,provider=openMeteo,secure=root.isSecureContext,onChange=()=>{}}={}){
      this.enabled=enabled;this.geolocation=geolocation;this.provider=provider;this.secure=secure;this.onChange=onChange;this.token=0;this.controller=null;this.timer=null;
      this.state=Object.freeze({status:'off',weather:null,error:null});
    }
    publish(status,weather=null,error=null){this.state=Object.freeze({status,weather,error});this.onChange(this.state);}
    async enable({consent=false}={}){
      if(!this.enabled)return;
      if(!consent)throw fail('consent-required');
      this.disable();const token=++this.token;
      if(!this.secure||!this.geolocation){this.publish('error',null,'unavailable');return;}
      this.publish('locating');
      try{
        const location=await new Promise((resolve,reject)=>{
          this.cancelLocation=()=>reject(fail('cancelled'));
          this.geolocation.getCurrentPosition(position=>{
            if(token!==this.token)return;
            const {latitude,longitude}=position.coords;
            if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){reject(fail('unavailable'));return;}
            resolve({latitude:coarse(latitude),longitude:coarse(longitude)});
          },error=>reject(fail(error.code===1?'denied':error.code===3?'timeout':'unavailable')),{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
        });
        if(token!==this.token)return;
        this.cancelLocation=null;this.controller=new AbortController();
        this.timer=setTimeout(()=>this.controller?.abort(),12000);this.publish('loading');
        const weather=await this.provider(location,this.controller.signal);
        if(token===this.token)this.publish('ready',weather);
      }catch(error){
        if(token===this.token)this.publish('error',null,error.name==='AbortError'?'timeout':(['denied','timeout','unavailable'].includes(error.code)?error.code:'network'));
      }finally{if(token===this.token){clearTimeout(this.timer);this.timer=null;this.controller=null;this.cancelLocation=null;}}
    }
    disable(){
      ++this.token;this.cancelLocation?.();this.cancelLocation=null;this.controller?.abort();this.controller=null;clearTimeout(this.timer);this.timer=null;this.publish('off');
    }
  }
  root.RoomWeather=Object.freeze({config,WeatherContext,openMeteo,normalize});
  if(typeof module!=='undefined')module.exports=root.RoomWeather;
})(typeof window!=='undefined'?window:globalThis);
