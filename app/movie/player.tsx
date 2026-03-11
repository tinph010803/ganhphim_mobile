import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRef, useEffect, useState, useCallback } from 'react';
import { saveWatchProgress } from '@/lib/watchHistory';

function buildPlayerHtml(m3u8Url: string, title: string, episode: string, initialTime = 0): string {
  const safeUrl = JSON.stringify(m3u8Url);
  const safeTitle = JSON.stringify(title);
  const safeEpisode = JSON.stringify(episode);
  const safeInitTime = JSON.stringify(initialTime);
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body,#wrap{width:100%;height:100%;background:#000;overflow:hidden}
#v{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
/* Controls overlay */
#ov{position:absolute;inset:0;display:flex;flex-direction:column;opacity:0;transition:opacity .22s;pointer-events:none;
background:linear-gradient(to bottom,rgba(0,0,0,.75) 0%,transparent 22%,transparent 68%,rgba(0,0,0,.8) 100%)}
#ov.show{opacity:1;pointer-events:all}
/* Top bar */
#topbar{display:flex;align-items:center;gap:10px;padding:10px 14px 8px;flex-shrink:0}
.tb-btn{background:none;border:none;color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.tb-btn:active{background:rgba(255,255,255,.15)}
#top-info{flex:1;min-width:0}
#top-title{font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}
#top-ep{font-size:11px;color:rgba(255,255,255,.55);margin-top:1px}
/* Center controls */
#center{flex:1;display:flex;align-items:center;justify-content:center;gap:20px}
.c-btn{background:rgba(0,0,0,.35);border:none;color:#fff;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px);transition:background .15s,transform .1s}
.c-btn:active{background:rgba(255,255,255,.2);transform:scale(.92)}
#c-play{width:62px;height:62px;}
/* Bottom bar */
#botbar{display:flex;flex-direction:column;gap:4px;padding:0 14px 10px;flex-shrink:0}
/* Progress */
#prog{position:relative;height:20px;display:flex;align-items:center;cursor:pointer;touch-action:none}
.pb{position:absolute;left:0;top:50%;transform:translateY(-50%);height:3px;border-radius:2px;pointer-events:none;transition:height .12s}
#prog:active .pb{height:5px}
#pb-bg{width:100%;background:rgba(255,255,255,.2)}
#pb-buf{background:rgba(255,255,255,.35);width:0%}
#pb-fill{background:#ff0000;width:0%}
#pb-thumb{position:absolute;top:50%;left:0%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:50%;background:#ff0000;pointer-events:none;transition:transform .1s}
#prog:active #pb-thumb{transform:translate(-50%,-50%) scale(1.4)}
/* Time row */
#timerow{display:flex;align-items:center;gap:6px}
#t-cur,#t-dur{font-size:12px;color:#fff;font-variant-numeric:tabular-nums}
.tsep{font-size:12px;color:rgba(255,255,255,.4)}
#t-sp{flex:1}
#btn-spd{background:none;border:none;color:rgba(255,255,255,.8);font-size:12px;font-weight:700;padding:4px 6px;border-radius:4px;cursor:pointer;}
#btn-spd:active{background:rgba(255,255,255,.12)}
#btn-fs{background:none;border:none;color:#fff;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer}
/* Loading spinner */
#spin-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
#spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,.15);border-top-color:#fff;border-radius:50%;animation:sp .75s linear infinite;display:none}
#spinner.show{display:block}
@keyframes sp{to{transform:rotate(360deg)}}
/* Double-tap feedback */
.dtfb{position:absolute;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;opacity:0;transition:opacity .18s}
.dtfb.show{opacity:1}
#dtfb-l{left:6%}#dtfb-r{right:6%}
.dtfb-circle{width:70px;height:70px;border-radius:50%;border:2px solid rgba(255,255,255,.5);animation:rp .4s ease-out}
.dtfb-label{font-size:11px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7);white-space:nowrap}
@keyframes rp{from{transform:scale(.5);opacity:.8}to{transform:scale(1.3);opacity:0}}
/* Settings panel */
#smenu{position:absolute;top:54px;right:14px;background:rgba(20,20,20,.97);border-radius:10px;min-width:200px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.7);display:none;z-index:50;animation:sm-in .15s ease}
#smenu.open{display:block}
@keyframes sm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.sm-head{font-size:11px;color:rgba(255,255,255,.4);padding:10px 14px 6px;letter-spacing:.5px;text-transform:uppercase}
.sm-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;font-size:14px;color:#fff;cursor:pointer}
.sm-row:active{background:rgba(255,255,255,.07)}
.sm-val{color:rgba(255,255,255,.45);font-size:12px;display:flex;align-items:center;gap:3px}
.sm-back{display:flex;align-items:center;gap:10px;padding:11px 14px;font-size:14px;color:#fff;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.07)}
.sm-back:active{background:rgba(255,255,255,.07)}
.sm-opt{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;font-size:14px;color:rgba(255,255,255,.8);cursor:pointer}
.sm-opt:active{background:rgba(255,255,255,.06)}
.sm-opt.on{color:#ff4444;font-weight:600}
</style>
</head>
<body>
<div id="wrap">
  <video id="v" playsinline preload="auto"></video>
  <div id="spin-wrap"><div id="spinner"></div></div>
  <div class="dtfb" id="dtfb-l"><div class="dtfb-circle"></div><div class="dtfb-label"></div></div>
  <div class="dtfb" id="dtfb-r"><div class="dtfb-circle"></div><div class="dtfb-label"></div></div>
  <div id="ov">
    <div id="topbar">
      <button class="tb-btn" id="btn-back">
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <div id="top-info">
        <div id="top-title"></div>
        <div id="top-ep"></div>
      </div>
      <button class="tb-btn" id="btn-set">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      </button>
    </div>
    <div id="center">
      <button class="c-btn" id="c-back">
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="8.5" y="14.5" font-size="5.5" fill="white" font-family="sans-serif" font-weight="bold">10</text></svg>
      </button>
      <button class="c-btn" id="c-play">
        <svg id="ico-play" viewBox="0 0 24 24" fill="currentColor" width="30" height="30"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="c-btn" id="c-fwd">
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/><text x="8.5" y="14.5" font-size="5.5" fill="white" font-family="sans-serif" font-weight="bold">10</text></svg>
      </button>
    </div>
    <div id="botbar">
      <div id="prog">
        <div class="pb" id="pb-bg"></div>
        <div class="pb" id="pb-buf"></div>
        <div class="pb" id="pb-fill"></div>
        <div id="pb-thumb"></div>
      </div>
      <div id="timerow">
        <span id="t-cur">0:00</span><span class="tsep">/</span><span id="t-dur">0:00</span>
        <div id="t-sp"></div>
        <button id="btn-spd">1x</button>
        <button id="btn-fs"><svg id="ico-fs" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
      </div>
    </div>
  </div>
  <div id="smenu">
    <div id="sm-main"></div>
    <div id="sm-sub" style="display:none"></div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
(function(){
var M=${safeUrl},TT=${safeTitle},EP=${safeEpisode},INIT_TIME=${safeInitTime}||0;
var v=document.getElementById('v'),
  wrap=document.getElementById('wrap'),
  ov=document.getElementById('ov'),
  spin=document.getElementById('spinner'),
  prog=document.getElementById('prog'),
  pbFill=document.getElementById('pb-fill'),
  pbBuf=document.getElementById('pb-buf'),
  pbThumb=document.getElementById('pb-thumb'),
  tCur=document.getElementById('t-cur'),
  tDur=document.getElementById('t-dur'),
  icoPlay=document.getElementById('ico-play'),
  icoFs=document.getElementById('ico-fs'),
  dtfbL=document.getElementById('dtfb-l'),
  dtfbR=document.getElementById('dtfb-r'),
  smenu=document.getElementById('smenu'),
  smMain=document.getElementById('sm-main'),
  smSub=document.getElementById('sm-sub'),
  spdLbl=null,qlLbl=null;

document.getElementById('top-title').textContent=TT;
document.getElementById('top-ep').textContent=EP?'T\u1eadp '+EP:'';

var hls=null,dur=0,quals=[],curQ=-1,curSpd=1,hideTimer=null,ctrlOn=false;
var SPDS=[0.25,0.5,0.75,1,1.25,1.5,2];
var chk='<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
var chevR='<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
var backIco='<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';

function fmt(s){if(!s||isNaN(s))return'0:00';var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=Math.floor(s%60);return h>0?h+':'+p(m)+':'+p(sc):m+':'+p(sc);}
function p(n){return n<10?'0'+n:''+n;}
function spdLabel(s){return s===1?'B\u00ecnh th\u01b0\u1eddng':s+'x';}

// HLS
function initHls(){
  if(hls){hls.destroy();hls=null;}
  spin.classList.add('show');
  if(typeof Hls!=='undefined'&&Hls.isSupported()){
    hls=new Hls({maxBufferLength:30,maxMaxBufferLength:60,enableWorker:false,xhrSetup:function(xhr){xhr.withCredentials=false;}});
    hls.loadSource(M);hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED,function(e,d){
      quals=d.levels.map(function(l,i){return{id:i,label:l.height?l.height+'p':'Level '+i};});
      curQ=-1;
      v.play().catch(function(){});
    });
    hls.on(Hls.Events.ERROR,function(ev,d){
      if(d.fatal){
        if(d.type===Hls.ErrorTypes.NETWORK_ERROR)setTimeout(function(){if(hls)hls.startLoad();},1500);
        else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){if(hls)hls.recoverMediaError();}
      }
    });
  }else if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src=M;v.play().catch(function(){});
  }
}
initHls();

// Video events
v.addEventListener('play',function(){icoPlay.innerHTML='<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';});
v.addEventListener('pause',function(){icoPlay.innerHTML='<path d="M8 5v14l11-7z"/>';});
v.addEventListener('waiting',function(){spin.classList.add('show');});
v.addEventListener('playing',function(){spin.classList.remove('show');});
v.addEventListener('canplay',function(){spin.classList.remove('show');});
v.addEventListener('timeupdate',function(){
  if(!dur||scrubbing)return;
  var pct=(v.currentTime/dur*100).toFixed(2);
  pbFill.style.width=pct+'%';pbThumb.style.left=pct+'%';
  tCur.textContent=fmt(v.currentTime);
  if(v.buffered.length>0)pbBuf.style.width=(v.buffered.end(v.buffered.length-1)/dur*100).toFixed(2)+'%';
});
v.addEventListener('loadedmetadata',function(){dur=v.duration;tDur.textContent=fmt(dur);if(INIT_TIME>5&&INIT_TIME<dur-5){v.currentTime=INIT_TIME;}});
v.addEventListener('durationchange',function(){dur=v.duration;tDur.textContent=fmt(dur);});

// Progress reporting every 15s
setInterval(function(){
  if(!v.paused&&dur>0&&v.currentTime>0){
    var msg=JSON.stringify({type:'progress',time:v.currentTime,duration:dur});
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
  }
},15000);

// Controls show/hide
function showCtrl(keep){
  ctrlOn=true;ov.classList.add('show');
  if(hideTimer)clearTimeout(hideTimer);
  if(!keep)hideTimer=setTimeout(function(){if(!v.paused&&!scrubbing&&!smenu.classList.contains('open'))hideCtrl();},3000);
}
function hideCtrl(){ctrlOn=false;ov.classList.remove('show');smenu.classList.remove('open');}
function toggleCtrl(){ctrlOn?hideCtrl():showCtrl();}
showCtrl();

// Double-tap + tap handling
var dtTimer=null,dtSide=null,dtFbTimer=null,scrubbing=false;
wrap.addEventListener('click',function(e){
  if(e.target.closest('#ov button')||e.target.closest('.c-btn')||e.target.closest('#prog')||e.target.closest('#smenu'))return;
  var x=e.clientX,w=wrap.offsetWidth;
  var side=x<w*.32?'l':x>w*.68?'r':'m';
  if(dtTimer&&dtSide===side&&side!=='m'){
    clearTimeout(dtTimer);dtTimer=null;
    if(side==='l'){v.currentTime=Math.max(0,v.currentTime-10);showDtFb(dtfbL,'\u22ea 10 gi\u00e2y');}
    else{v.currentTime=Math.min(dur||99999,v.currentTime+10);showDtFb(dtfbR,'10 gi\u00e2y \u22eb');}
    showCtrl();
  }else{
    dtSide=side;
    dtTimer=setTimeout(function(){dtTimer=null;toggleCtrl();},220);
  }
});
function showDtFb(el,lbl){
  el.querySelector('.dtfb-label').textContent=lbl;
  el.classList.add('show');
  if(dtFbTimer)clearTimeout(dtFbTimer);
  dtFbTimer=setTimeout(function(){dtfbL.classList.remove('show');dtfbR.classList.remove('show');},600);
}

// Center buttons
document.getElementById('c-play').addEventListener('click',function(e){e.stopPropagation();v.paused?v.play().catch(function(){}):v.pause();showCtrl();});
document.getElementById('c-back').addEventListener('click',function(e){e.stopPropagation();v.currentTime=Math.max(0,v.currentTime-10);showCtrl();});
document.getElementById('c-fwd').addEventListener('click',function(e){e.stopPropagation();v.currentTime=Math.min(dur||99999,v.currentTime+10);showCtrl();});

// Progress scrub
function doSeek(cx){
  var r=prog.getBoundingClientRect();
  var ratio=Math.max(0,Math.min(1,(cx-r.left)/r.width));
  var pct=(ratio*100).toFixed(2);
  pbFill.style.width=pct+'%';pbThumb.style.left=pct+'%';
  tCur.textContent=fmt(ratio*(dur||0));
  if(dur)v.currentTime=ratio*dur;
}
prog.addEventListener('touchstart',function(e){e.stopPropagation();scrubbing=true;doSeek(e.touches[0].clientX);showCtrl(true);},{passive:false});
prog.addEventListener('touchmove',function(e){if(!scrubbing)return;e.stopPropagation();e.preventDefault();doSeek(e.touches[0].clientX);},{passive:false});
prog.addEventListener('touchend',function(e){e.stopPropagation();scrubbing=false;showCtrl();},{passive:false});
prog.addEventListener('click',function(e){e.stopPropagation();doSeek(e.clientX);showCtrl();});

// Fullscreen
document.getElementById('btn-fs').addEventListener('click',function(e){
  e.stopPropagation();
  if(document.fullscreenElement||document.webkitFullscreenElement){
    (document.exitFullscreen||document.webkitExitFullscreen).call(document);
  }else{
    var req=wrap.requestFullscreen||wrap.webkitRequestFullscreen;
    if(req)req.call(wrap);else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();
  }
  showCtrl();
});
document.addEventListener('fullscreenchange',updFs);document.addEventListener('webkitfullscreenchange',updFs);
function updFs(){var fs=!!(document.fullscreenElement||document.webkitFullscreenElement);icoFs.innerHTML=fs?'<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>':'<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';}

// Settings
function buildSmMain(){
  var html='<div class="sm-head">C\u00e0i \u0111\u1eb7t</div>';
  html+='<div class="sm-row" id="sm-row-spd"><span>T\u1ed1c \u0111\u1ed9 ph\u00e1t</span><span class="sm-val"><span id="sm-spd-lbl">B\u00ecnh th\u01b0\u1eddng</span>'+chevR+'</span></div>';
  if(quals.length>0)html+='<div class="sm-row" id="sm-row-ql"><span>Ch\u1ea5t l\u01b0\u1ee3ng</span><span class="sm-val"><span id="sm-ql-lbl">T\u1ef1 \u0111\u1ed9ng</span>'+chevR+'</span></div>';
  smMain.innerHTML=html;smSub.style.display='none';smMain.style.display='block';
  spdLbl=document.getElementById('sm-spd-lbl');qlLbl=document.getElementById('sm-ql-lbl');
  document.getElementById('sm-row-spd').onclick=buildSpdPage;
  var rowQl=document.getElementById('sm-row-ql');if(rowQl)rowQl.onclick=buildQlPage;
}
function buildSpdPage(){
  var html='<div class="sm-back" id="sm-back">'+backIco+' T\u1ed1c \u0111\u1ed9 ph\u00e1t</div>';
  SPDS.forEach(function(s){var on=s===curSpd?' on':'';html+='<div class="sm-opt'+on+'" data-s="'+s+'">'+spdLabel(s)+(s===curSpd?chk:'')+'</div>';});
  smMain.style.display='none';smSub.innerHTML=html;smSub.style.display='block';
  document.getElementById('sm-back').onclick=function(){buildSmMain();};
  smSub.querySelectorAll('.sm-opt').forEach(function(el){el.onclick=function(){
    var s=parseFloat(el.getAttribute('data-s'));v.playbackRate=s;curSpd=s;
    if(spdLbl)spdLbl.textContent=spdLabel(s);
    document.getElementById('btn-spd').textContent=s===1?'1x':s+'x';
    buildSmMain();
  };});
}
function buildQlPage(){
  var html='<div class="sm-back" id="sm-back">'+backIco+' Ch\u1ea5t l\u01b0\u1ee3ng</div>';
  html+='<div class="sm-opt'+(curQ===-1?' on':'')+'" data-q="-1">T\u1ef1 \u0111\u1ed9ng'+(curQ===-1?chk:'')+'</div>';
  quals.forEach(function(q){var on=q.id===curQ?' on':'';html+='<div class="sm-opt'+on+'" data-q="'+q.id+'">'+q.label+(q.id===curQ?chk:'')+'</div>';});
  smMain.style.display='none';smSub.innerHTML=html;smSub.style.display='block';
  document.getElementById('sm-back').onclick=function(){buildSmMain();};
  smSub.querySelectorAll('.sm-opt').forEach(function(el){el.onclick=function(){
    var id=parseInt(el.getAttribute('data-q'));if(hls)hls.currentLevel=id;curQ=id;
    var lbl=id===-1?'T\u1ef1 \u0111\u1ed9ng':(quals.find(function(q){return q.id===id;})||{label:'T\u1ef1 \u0111\u1ed9ng'}).label;
    if(qlLbl)qlLbl.textContent=lbl;buildSmMain();
  };});
}
buildSmMain();
document.getElementById('btn-set').addEventListener('click',function(e){
  e.stopPropagation();smenu.classList.toggle('open');
  if(smenu.classList.contains('open')){buildSmMain();showCtrl(true);}
});
document.getElementById('btn-spd').addEventListener('click',function(e){
  e.stopPropagation();smenu.classList.add('open');buildSpdPage();showCtrl(true);
});
smenu.addEventListener('click',function(e){e.stopPropagation();});
document.addEventListener('click',function(e){if(!e.target.closest('#smenu')&&!e.target.closest('#btn-set')&&!e.target.closest('#btn-spd'))smenu.classList.remove('open');});

// Back button â€” gá»­i message vá» React Native
document.getElementById('btn-back').addEventListener('click',function(e){
  e.stopPropagation();
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage('back');
});

// Keyboard
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT')return;
  if(e.code==='Space'){e.preventDefault();v.paused?v.play().catch(function(){}):v.pause();}
  else if(e.code==='ArrowRight'){e.preventDefault();v.currentTime+=10;}
  else if(e.code==='ArrowLeft'){e.preventDefault();v.currentTime-=10;}
  else if(e.code==='KeyF')document.getElementById('btn-fs').click();
});
})();
</script>
</body>
</html>`;
}

export default function PlayerScreen() {
  const router = useRouter();
  const { url, title, episode, movieId, movieSlug, serverLabel, poster, initialTime } =
    useLocalSearchParams<{
      url: string;
      title: string;
      episode?: string;
      movieId?: string;
      movieSlug?: string;
      serverLabel?: string;
      poster?: string;
      initialTime?: string;
    }>();
  const webViewRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Orientation already locked to LANDSCAPE before navigating here.
    // Only need to unlock when leaving.
    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SO = require('expo-screen-orientation');
        SO.lockAsync(SO.OrientationLock.PORTRAIT_UP).catch(() => {});
      } catch (_) {}
    };
  }, []);

  const safeTitle = Array.isArray(title) ? title[0] : (title ?? '');
  const safeEpisode = Array.isArray(episode) ? episode[0] : (episode ?? '');
  const safeUrl = Array.isArray(url) ? url[0] : (url ?? '');
  const safeMovieId = Array.isArray(movieId) ? movieId[0] : (movieId ?? '');
  const safeMovieSlug = Array.isArray(movieSlug) ? movieSlug[0] : (movieSlug ?? '');
  const safeServerLabel = Array.isArray(serverLabel) ? serverLabel[0] : (serverLabel ?? '');
  const safePoster = Array.isArray(poster) ? poster[0] : (poster ?? '');
  const safeInitialTime = parseFloat(
    Array.isArray(initialTime) ? initialTime[0] : (initialTime ?? '0')
  ) || 0;

  const htmlContent = buildPlayerHtml(safeUrl, safeTitle, safeEpisode, safeInitialTime);

  const handleMessage = useCallback(
    (event: any) => {
      const data = event.nativeEvent.data;
      if (data === 'back') {
        router.back();
        return;
      }
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'progress' && safeMovieId && safeMovieSlug) {
          saveWatchProgress({
            movieId: safeMovieId,
            movieSlug: safeMovieSlug,
            movieTitle: safeTitle,
            posterUrl: safePoster,
            episodeName: safeEpisode,
            serverLabel: safeServerLabel,
            time: msg.time,
            duration: msg.duration,
          }).catch(() => {});
        }
      } catch {}
    },
    [safeMovieId, safeMovieSlug, safeTitle, safePoster, safeEpisode, safeServerLabel]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://ophim1.com' }}
        style={{ flex: 1, backgroundColor: '#000', opacity: loaded ? 1 : 0 }}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowFileAccess
        mixedContentMode="always"
        originWhitelist={['*']}
        onMessage={handleMessage}
        startInLoadingState={false}
        onLoadEnd={() => setLoaded(true)}
        userAgent={
          Platform.OS === 'android'
            ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        }
      />
    </View>
  );
}
