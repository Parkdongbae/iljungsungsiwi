import * as A from './astro.js';
const KO={ra:222.6764,dec:74.1555}; const lat=37.5788, lon=126.977, D=Math.PI/180;
const ax=p=>{const r=p*D;return{X:[-1,0,0],Y:[0,-Math.sin(r),Math.cos(r)]}}; const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const ang=(v,a)=>Math.atan2(dot(v,a.X),dot(v,a.Y))/D; const a=ax(lat);
let maxN=0,maxD=0;
for(let i=0;i<2000;i++){ const ms=Date.UTC(2026,0,1)+Math.random()*365*864e5; const s=A.sunAt(ms,lat,lon);
 if(s.altApp>0){const T=A.mod((ang(s.vApp,a)+180)/15,24); maxD=Math.max(maxD,Math.abs(A.wrap180((T-s.ast)*15))*4)}
 if(s.altApp<-9){const st=A.starAt(KO.ra,KO.dec,ms,lat,lon); const dj=A.lastDongji(ms,lon); const s0=A.starAt(KO.ra,KO.dec,dj.midnight,lat,lon); const d=Math.round((ms-dj.midnight)/864e5); const rho=ang(s0.vApp,a)+180+d*360/365.25; const T=A.mod((ang(st.vApp,a)+180-rho)/15,24); maxN=Math.max(maxN,Math.abs(A.wrap180((T-s.lmt)*15))*4)}}
console.log('day max err (min)',maxD.toFixed(3),'night max err vs LMT (min)',maxN.toFixed(2));
for (const y of [1437,2026]) console.log(y, 'Polaris pd',(90-A.precess(37.9545,89.2641,y)[1]).toFixed(3),'Kochab pd',(90-A.precess(KO.ra,KO.dec,y)[1]).toFixed(3));
