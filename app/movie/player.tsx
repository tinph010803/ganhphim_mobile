import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StatusBar, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRef, useEffect, useState, useCallback } from 'react';
import { saveWatchProgress } from '@/lib/watchHistory';
import { useAuth } from '@/context/AuthContext';
import * as NavigationBar from 'expo-navigation-bar';

type _SrvEp = { name: string; link_embed: string; link_m3u8: string };
type _SrvItem = { name: string; episodes: _SrvEp[] };

function buildPlayerHtml(m3u8Url: string, title: string, episode: string, initialTime = 0, serversData: _SrvItem[] = [], initSrvIdx = 0): string {
  const safeUrl = JSON.stringify(m3u8Url);
  const safeTitle = JSON.stringify(title);
  const safeEpisode = JSON.stringify(episode);
  const safeInitTime = JSON.stringify(initialTime);
  const safeServersLit = JSON.stringify(serversData);
  const safeInitSrv = initSrvIdx;
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
#topbar{display:flex;align-items:center;padding:14px 12px 8px;flex-shrink:0;gap:2px}
.tb-btn{background:none;border:none;color:#fff;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.tb-btn:active{background:rgba(255,255,255,.15)}
#top-info{flex:1;text-align:center;min-width:0;padding:0 2px}
#top-title{font-size:15px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#top-ep{display:none}
/* Center controls */
#center{flex:1;display:flex;align-items:center;justify-content:center;gap:32px}
.c-btn{background:rgba(0,0,0,.4);border:none;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,transform .12s;flex-shrink:0}
.c-btn:active{background:rgba(255,255,255,.2);transform:scale(.88)}
/* Bottom bar */
#botbar{display:flex;flex-direction:column;align-items:center;padding:0 0 10px;flex-shrink:0}
/* Progress */
#prog-wrap{display:flex;flex-direction:column;align-items:stretch;width:75%;align-self:center}
#prog{position:relative;width:100%;height:22px;display:flex;align-items:center;cursor:pointer;touch-action:none}
#timerow{display:flex;align-items:center;width:100%;padding:2px 0 5px}
.pb{position:absolute;left:0;top:50%;transform:translateY(-50%);height:2px;border-radius:2px;pointer-events:none;transition:height .12s}
#prog:active .pb,#prog.drag .pb{height:4px}
#pb-bg{width:100%;background:rgba(255,255,255,.22)}
#pb-buf{background:rgba(255,255,255,.35);width:0%}
#pb-fill{background:#e50914;width:0%}
#pb-thumb{position:absolute;top:50%;left:0%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#e50914;pointer-events:none;box-shadow:0 0 4px rgba(229,9,20,.55)}
#prog:active #pb-thumb,#prog.drag #pb-thumb{transform:translate(-50%,-50%) scale(1.4)}
/* Time row */
#timerow{display:flex;align-items:center;width:100%;padding:2px 0 5px}
#t-cur,#t-dur{font-size:12px;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:.2px}
.tsep{font-size:12px;color:rgba(255,255,255,.45);padding:0 2px}
#t-sp{flex:1}
#btn-fs{display:none}
/* Icon row */
#icrow{display:flex;align-items:center;justify-content:center;padding-top:6px;margin-top:2px;gap:0;width:100%}
.ic-btn{background:none;border:none;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;padding:4px 18px;flex-shrink:0}
.ic-btn:active{opacity:.55}
.ic-label{font-size:9.5px;color:rgba(255,255,255,.8);white-space:nowrap}
.ic-sep{display:none}
/* Skip intro */
#btn-skip{position:absolute;bottom:105px;right:48px;z-index:50;background:transparent;border:1.5px solid rgba(255,255,255,.6);color:#fff;font-size:12px;font-weight:600;padding:6px 16px;border-radius:6px;cursor:pointer;display:none;pointer-events:all}
#btn-skip.show{display:block}
#btn-skip:active{opacity:.7}
/* Lock2 (unlock button, always on top outside #ov) */
#btn-lock2{position:absolute;top:14px;left:54px;z-index:200;background:none;border:none;color:#fff;width:42px;height:42px;border-radius:50%;display:none;align-items:center;justify-content:center;cursor:pointer;pointer-events:all}
#btn-lock2:active{background:rgba(255,255,255,.15)}
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
#smenu{position:absolute;top:60px;right:14px;background:rgba(20,20,20,.97);border-radius:10px;min-width:200px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.7);display:none;z-index:50;animation:sm-in .15s ease}
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
.sm-opt.on{color:#e50914;font-weight:600}
/* Right panel */
#rpanel{position:absolute;top:0;right:0;bottom:0;width:62%;background:rgba(15,18,35,.97);transform:translateX(100%);transition:transform .25s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;z-index:100;border-left:1px solid rgba(255,255,255,.08)}
#rpanel.open{transform:translateX(0)}
.rp-head{display:flex;align-items:center;padding:16px 14px 12px;font-size:16px;font-weight:600;color:#fff;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.rp-title{flex:1}.rp-close{background:none;border:none;color:rgba(255,255,255,.55);width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;flex-shrink:0;font-size:18px;padding:0}
.rp-close:active{background:rgba(255,255,255,.12)}
.rp-srv-list{overflow-y:auto;flex:1}
.rp-srv-item{display:flex;align-items:center;justify-content:space-between;padding:15px 16px;font-size:14px;color:rgba(255,255,255,.75);cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)}
.rp-srv-item:active{background:rgba(255,255,255,.07)}
.rp-srv-item.on{color:#fff;font-weight:600}
.rp-ep-top{display:flex;align-items:center;padding:11px 14px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.08);gap:5px;flex-shrink:0;position:relative}
.rp-ep-top:active{background:rgba(255,255,255,.06)}
#rp-srv-dd{position:absolute;top:100%;left:0;right:0;background:rgba(18,20,40,.99);z-index:101;display:none;max-height:180px;overflow-y:auto;border-bottom:1px solid rgba(255,255,255,.1)}
.rp-dd-item{padding:12px 16px;font-size:13px;color:rgba(255,255,255,.75);cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)}
.rp-dd-item:active{background:rgba(255,255,255,.07)}
.rp-dd-item.on{color:#e50914;font-weight:600}
.rp-ep-grid{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-wrap:wrap;gap:7px;align-content:flex-start}
.ep-btn{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.8);font-size:12px;padding:10px 4px;border-radius:6px;cursor:pointer;width:calc(33.33% - 5px);flex:0 0 calc(33.33% - 5px);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ep-btn:active{background:rgba(255,255,255,.2)}
.ep-btn.epa{background:#e50914;color:#fff;font-weight:700}
</style>
</head>
<body>
<div id="wrap">
  <video id="v" playsinline preload="auto"></video>
  <div id="spin-wrap"><div id="spinner"></div></div>
  <div class="dtfb" id="dtfb-l"><div class="dtfb-circle"></div><div class="dtfb-label"></div></div>
  <div class="dtfb" id="dtfb-r"><div class="dtfb-circle"></div><div class="dtfb-label"></div></div>
  <button id="btn-skip">B&#x1ECF; qua gi&#x1EDB;i thi&#x1EC7;u</button>
  <button id="btn-lock2" style="display:none">
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>
  </button>
  <div id="ov">
    <div id="topbar">
      <button class="tb-btn" id="btn-back">
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <button class="tb-btn" id="btn-lock">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
      </button>
      <div id="top-info">
        <div id="top-title"></div>
        <div id="top-ep" style="display:none"></div>
      </div>
      <button class="tb-btn" id="btn-cast">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>
      </button>
      <button class="tb-btn" id="btn-set">
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      </button>
    </div>
    <div id="center">
      <button class="c-btn" id="c-back" style="width:58px;height:58px">
        <svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          <text x="12" y="15.5" text-anchor="middle" font-size="5.5" fill="white" font-family="sans-serif" font-weight="bold">10</text>
        </svg>
      </button>
      <button class="c-btn" id="c-play" style="width:72px;height:72px">
        <svg id="ico-play" viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="c-btn" id="c-fwd" style="width:58px;height:58px">
        <svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34">
          <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
          <text x="12" y="15.5" text-anchor="middle" font-size="5.5" fill="white" font-family="sans-serif" font-weight="bold">10</text>
        </svg>
      </button>
    </div>
    <div id="botbar">
      <div id="prog-wrap">
        <div id="prog">
          <div class="pb" id="pb-bg"></div>
          <div class="pb" id="pb-buf"></div>
          <div class="pb" id="pb-fill"></div>
          <div id="pb-thumb"></div>
        </div>
        <div id="timerow">
          <span id="t-cur">0:00</span><div id="t-sp"></div><span id="t-dur">0:00</span>
          <button id="btn-fs"><svg id="ico-fs" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
        </div>
      </div>
      <div id="icrow">
        <button class="ic-btn" id="btn-ratio">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/></svg>
          <span class="ic-label" id="ratio-lbl">T&#x1EF7; l&#x1EC7;</span>
        </button>
        <div class="ic-sep"></div>
        <button class="ic-btn" id="btn-audio">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V21h2v-2.28c3.28-.49 6-3.3 6-6.72h-1.7z"/></svg>
          <span class="ic-label">Ti&#x1EBF;ng g&#x1ED1;c</span>
        </button>
        <div class="ic-sep"></div>
        <button class="ic-btn" id="btn-eplist">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z"/></svg>
          <span class="ic-label">Danh s&#xE1;ch t&#x1EAD;p</span>
        </button>
        <div class="ic-sep"></div>
        <button class="ic-btn" id="btn-next">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          <span class="ic-label">T&#x1EAD;p ti&#x1EBF;p theo</span>
        </button>
      </div>
    </div>
  </div>
  <div id="rpanel">
    <div id="rp-server" style="display:flex;flex-direction:column;height:100%">
      <div class="rp-head"><span class="rp-title">&#194;m thanh</span><button class="rp-close" id="rp-srv-close">&#x2715;</button></div>
      <div class="rp-srv-list" id="rp-srv-list"></div>
    </div>
    <div id="rp-ep" style="display:none;flex-direction:column;height:100%">
      <div class="rp-head"><span class="rp-title">Danh s&#225;ch t&#7853;p</span><button class="rp-close" id="rp-ep-close">&#x2715;</button></div>
      <div class="rp-ep-top" id="rp-ep-top">
        <span id="rp-ep-srv-lbl"></span>
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M7 10l5 5 5-5z"/></svg>
        <div id="rp-srv-dd"></div>
      </div>
      <div class="rp-ep-grid" id="rp-ep-grid"></div>
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
  skipBtn=document.getElementById('btn-skip'),
  lockBar=document.getElementById('lock-bar'),
  ratioLbl=document.getElementById('ratio-lbl'),
  spdLbl=null,qlLbl=null;

document.getElementById('top-title').textContent=EP?TT+' | '+(EP.trim()!==''&&!isNaN(Number(EP.trim()))?'T\u1eadp '+EP:EP):TT;

var hls=null,dur=0,quals=[],curQ=-1,curSpd=1,hideTimer=null,ctrlOn=false,locked=false,skipExpired=false;
var SPDS=[0.25,0.5,0.75,1,1.25,1.5,2];
var RATIOS=['contain','cover','fill'];
var RATIO_LABELS=['T\u1ef7 l\u1ec7','\u0110\u1ea7y m\u00e0n h\u00ecnh','K\u00e9o gi\u00e3n'];
var chk='<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
var chevR='<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
var backIco='<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
var SERVERS=${safeServersLit},CUR_SRV=${safeInitSrv},CUR_EP=EP;
var rpanel=document.getElementById('rpanel'),
  rpServer=document.getElementById('rp-server'),
  rpEp=document.getElementById('rp-ep'),
  rpSrvList=document.getElementById('rp-srv-list'),
  rpEpGrid=document.getElementById('rp-ep-grid'),
  rpEpSrvLbl=document.getElementById('rp-ep-srv-lbl'),
  rpSrvDd=document.getElementById('rp-srv-dd'),
  epDdOpen=false;
function rpClose(){rpanel.classList.remove('open');rpSrvDd.style.display='none';epDdOpen=false;}
function epLabel(n){var t=(n||'').trim();return!isNaN(Number(t))&&t!==''&&parseInt(t)>0?'T\u1eadp '+parseInt(t):n;}

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
  if(!skipExpired&&v.currentTime>0&&v.currentTime<=15){skipBtn.classList.add('show');}
  else{if(v.currentTime>15)skipExpired=true;skipBtn.classList.remove('show');}
});
v.addEventListener('loadedmetadata',function(){dur=v.duration;tDur.textContent=fmt(dur);if(INIT_TIME>5&&INIT_TIME<dur-5){v.currentTime=INIT_TIME;}});
v.addEventListener('durationchange',function(){dur=v.duration;tDur.textContent=fmt(dur);});

// Skip intro
skipBtn.addEventListener('click',function(e){e.stopPropagation();skipExpired=true;skipBtn.classList.remove('show');v.currentTime=90;});

// Progress reporting every 10s
setInterval(function(){
  if(!v.paused&&dur>0&&v.currentTime>0){
    var msg=JSON.stringify({type:'progress',time:v.currentTime,duration:dur});
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
  }
},10000);

// Controls show/hide
function showCtrl(keep){
  if(locked)return;
  ctrlOn=true;ov.classList.add('show');
  if(hideTimer)clearTimeout(hideTimer);
  if(!keep)hideTimer=setTimeout(function(){if(!v.paused&&!scrubbing&&!smenu.classList.contains('open')&&!rpanel.classList.contains('open'))hideCtrl();},3000);
}
function hideCtrl(){ctrlOn=false;ov.classList.remove('show');smenu.classList.remove('open');rpanel.classList.remove('open');rpSrvDd.style.display='none';epDdOpen=false;}
function toggleCtrl(){if(locked)return;ctrlOn?hideCtrl():showCtrl();}
showCtrl();

// Lock
var lockBtn2=document.getElementById('btn-lock2');
document.getElementById('btn-lock').addEventListener('click',function(e){
  e.stopPropagation();
  locked=true;
  if(hideTimer)clearTimeout(hideTimer);
  hideCtrl();
  lockBtn2.style.display='flex';
});
lockBtn2.addEventListener('click',function(e){
  e.stopPropagation();
  locked=false;
  lockBtn2.style.display='none';
  showCtrl();
});

// Tap + double-tap handling
var dtTimer=null,dtSide=null,dtFbTimer=null,scrubbing=false;
wrap.addEventListener('click',function(e){
  if(locked){
    return;
  }
  if(rpanel.classList.contains('open')&&!e.target.closest('#rpanel')){rpClose();return;}
  if(e.target.closest('#ov button')||e.target.closest('.c-btn')||e.target.closest('#prog')||e.target.closest('#smenu')||e.target.closest('#btn-skip'))return;
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
prog.addEventListener('touchstart',function(e){e.stopPropagation();scrubbing=true;prog.classList.add('drag');doSeek(e.touches[0].clientX);showCtrl(true);},{passive:false});
prog.addEventListener('touchmove',function(e){if(!scrubbing)return;e.stopPropagation();e.preventDefault();doSeek(e.touches[0].clientX);},{passive:false});
prog.addEventListener('touchend',function(e){e.stopPropagation();scrubbing=false;prog.classList.remove('drag');showCtrl();},{passive:false});
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

// Aspect ratio cycle
var curRatio=0;
document.getElementById('btn-ratio').addEventListener('click',function(e){
  e.stopPropagation();
  curRatio=(curRatio+1)%3;
  v.style.objectFit=RATIOS[curRatio];
  ratioLbl.textContent=RATIO_LABELS[curRatio];
  showCtrl();
});

// Server/audio selector
document.getElementById('btn-audio').addEventListener('click',function(e){
  e.stopPropagation();
  if(!SERVERS||SERVERS.length===0){showCtrl();return;}
  buildSrvPanel();
  rpanel.classList.add('open');
  showCtrl(true);
});

// Episode list
document.getElementById('btn-eplist').addEventListener('click',function(e){
  e.stopPropagation();
  if(!SERVERS||SERVERS.length===0){
    if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'eplist'}));
    showCtrl();return;
  }
  buildEpPanel();
  rpanel.classList.add('open');
  showCtrl(true);
});

// Next episode
document.getElementById('btn-next').addEventListener('click',function(e){
  e.stopPropagation();
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'next'}));
  showCtrl();
});

// Cast (visual only)
document.getElementById('btn-cast').addEventListener('click',function(e){e.stopPropagation();showCtrl();});

// Right panel: build functions
function buildSrvPanel(){
  rpServer.style.display='flex';rpEp.style.display='none';
  var html='';
  SERVERS.forEach(function(s,i){
    var on=i===CUR_SRV?' on':'';
    html+='<div class="rp-srv-item'+on+'" data-i="'+i+'">'+s.name+(i===CUR_SRV?chk:'')+'</div>';
  });
  rpSrvList.innerHTML=html;
  rpSrvList.querySelectorAll('.rp-srv-item').forEach(function(el){
    el.addEventListener('click',function(){
      var i=parseInt(el.getAttribute('data-i'));
      if(i===CUR_SRV){rpClose();return;}
      CUR_SRV=i;
      var eps=SERVERS[i]?SERVERS[i].episodes:[];
      var ep=eps[0];
      if(ep)switchEp(ep.link_m3u8||ep.link_embed,ep.name,i);
      rpClose();
    });
  });
}
function buildSrvDd(){
  var html='';
  SERVERS.forEach(function(s,i){
    var on=i===CUR_SRV?' on':'';
    html+='<div class="rp-dd-item'+on+'" data-i="'+i+'">'+s.name+'</div>';
  });
  rpSrvDd.innerHTML=html;
  rpSrvDd.querySelectorAll('.rp-dd-item').forEach(function(el){
    el.addEventListener('click',function(e){
      e.stopPropagation();
      var i=parseInt(el.getAttribute('data-i'));
      CUR_SRV=i;
      rpEpSrvLbl.textContent=SERVERS[i].name;
      rpSrvDd.style.display='none';epDdOpen=false;
      buildEpGrid();buildSrvDd();
    });
  });
}
function buildEpGrid(){
  var eps=SERVERS[CUR_SRV]?SERVERS[CUR_SRV].episodes:[];
  var html='';
  eps.forEach(function(ep){
    var active=ep.name===CUR_EP?' epa':'';
    var url=ep.link_m3u8||ep.link_embed;
    html+='<button class="ep-btn'+active+'" data-url="'+url+'" data-ep="'+ep.name+'">'+epLabel(ep.name)+'</button>';
  });
  rpEpGrid.innerHTML=html;
  rpEpGrid.querySelectorAll('.ep-btn').forEach(function(el){
    el.addEventListener('click',function(){
      var u=el.getAttribute('data-url'),ep=el.getAttribute('data-ep');
      switchEp(u,ep,CUR_SRV);rpClose();
    });
  });
}
function buildEpPanel(){
  rpServer.style.display='none';rpEp.style.display='flex';
  rpEpSrvLbl.textContent=SERVERS[CUR_SRV]?SERVERS[CUR_SRV].name:'';
  buildEpGrid();buildSrvDd();
}
document.getElementById('rp-ep-top').addEventListener('click',function(e){
  e.stopPropagation();
  epDdOpen=!epDdOpen;
  rpSrvDd.style.display=epDdOpen?'block':'none';
});
document.getElementById('rp-srv-close').addEventListener('click',function(e){e.stopPropagation();rpClose();showCtrl();});
document.getElementById('rp-ep-close').addEventListener('click',function(e){e.stopPropagation();rpClose();showCtrl();});
function switchEp(url,epName,srvIdx){
  CUR_EP=epName;
  if(srvIdx!==undefined&&srvIdx!==null)CUR_SRV=srvIdx;
  M=url;
  if(hls){hls.destroy();hls=null;}
  spin.classList.add('show');
  if(typeof Hls!=='undefined'&&Hls.isSupported()){
    hls=new Hls({maxBufferLength:30,maxMaxBufferLength:60,enableWorker:false,xhrSetup:function(xhr){xhr.withCredentials=false;}});
    hls.loadSource(url);hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED,function(e,d){
      quals=d.levels.map(function(l,i){return{id:i,label:l.height?l.height+'p':'Level '+i};});
      curQ=-1;buildSmMain();v.play().catch(function(){});
    });
    hls.on(Hls.Events.ERROR,function(ev,d){
      if(d.fatal){
        if(d.type===Hls.ErrorTypes.NETWORK_ERROR)setTimeout(function(){if(hls)hls.startLoad();},1500);
        else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){if(hls)hls.recoverMediaError();}
      }
    });
  }else if(v.canPlayType('application/vnd.apple.mpegurl')){
    v.src=url;v.play().catch(function(){});
  }
  var srvName=SERVERS[CUR_SRV]?SERVERS[CUR_SRV].name:'';
  var dispEp=epLabel(epName);
  document.getElementById('top-title').textContent=TT+(dispEp?' | '+dispEp:'');
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'episodeChange',episode:epName,serverLabel:srvName,url:url}));
}

// Settings
function buildSmMain(){
  var html='<div class="sm-head">C\u00e0i \u0111\u1eb7t</div>';
  if(quals.length>0)html+='<div class="sm-row" id="sm-row-ql"><span>Ch\u1ea5t l\u01b0\u1ee3ng</span><span class="sm-val"><span id="sm-ql-lbl">T\u1ef1 \u0111\u1ed9ng</span>'+chevR+'</span></div>';
  html+='<div class="sm-row" id="sm-row-spd"><span>T\u1ed1c \u0111\u1ed9 ph\u00e1t</span><span class="sm-val"><span id="sm-spd-lbl">B\u00ecnh th\u01b0\u1eddng</span>'+chevR+'</span></div>';
  smMain.innerHTML=html;smSub.style.display='none';smMain.style.display='block';
  spdLbl=document.getElementById('sm-spd-lbl');qlLbl=document.getElementById('sm-ql-lbl');
  var rowQl=document.getElementById('sm-row-ql');if(rowQl)rowQl.onclick=buildQlPage;
  document.getElementById('sm-row-spd').onclick=buildSpdPage;
}
function buildSpdPage(){
  var html='<div class="sm-back" id="sm-back">'+backIco+' T\u1ed1c \u0111\u1ed9 ph\u00e1t</div>';
  SPDS.forEach(function(s){var on=s===curSpd?' on':'';html+='<div class="sm-opt'+on+'" data-s="'+s+'">'+spdLabel(s)+(s===curSpd?chk:'')+'</div>';});
  smMain.style.display='none';smSub.innerHTML=html;smSub.style.display='block';
  document.getElementById('sm-back').onclick=function(){buildSmMain();};
  smSub.querySelectorAll('.sm-opt').forEach(function(el){el.onclick=function(){
    var s=parseFloat(el.getAttribute('data-s'));v.playbackRate=s;curSpd=s;
    if(spdLbl)spdLbl.textContent=spdLabel(s);
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
smenu.addEventListener('click',function(e){e.stopPropagation();});
document.addEventListener('click',function(e){if(!e.target.closest('#smenu')&&!e.target.closest('#btn-set'))smenu.classList.remove('open');});

// Back button
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
  const { user } = useAuth();
  const userId = user?.id;
  const { url, title, episode, movieId, movieSlug, serverLabel, poster, initialTime, servers } =
    useLocalSearchParams<{
      url: string;
      title: string;
      episode?: string;
      movieId?: string;
      movieSlug?: string;
      serverLabel?: string;
      poster?: string;
      initialTime?: string;
      servers?: string;
    }>();
  const webViewRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Orientation already locked to LANDSCAPE before navigating here.
    // Only need to unlock when leaving.
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    }
    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SO = require('expo-screen-orientation');
        SO.lockAsync(SO.OrientationLock.PORTRAIT_UP).catch(() => {});
      } catch (_) {}
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
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

  const safeServersData = (() => {
    const raw = Array.isArray(servers) ? servers[0] : (servers ?? '[]');
    try { return JSON.parse(raw) as _SrvItem[]; } catch { return [] as _SrvItem[]; }
  })();
  const safeSrvIdx = safeServersData.findIndex((s) => s.name === safeServerLabel);

  const htmlContent = buildPlayerHtml(safeUrl, safeTitle, safeEpisode, safeInitialTime, safeServersData, safeSrvIdx >= 0 ? safeSrvIdx : 0);

  const currentEpisodeRef = useRef(safeEpisode);
  const currentServerRef = useRef(safeServerLabel);

  const handleMessage = useCallback(
    (event: any) => {
      const data = event.nativeEvent.data;
      if (data === 'back') {
        router.back();
        return;
      }
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'episodeChange') {
          if (msg.episode) currentEpisodeRef.current = msg.episode;
          if (msg.serverLabel) currentServerRef.current = msg.serverLabel;
        } else if (msg.type === 'progress' && safeMovieId && safeMovieSlug) {
          saveWatchProgress({
            movieId: safeMovieId,
            movieSlug: safeMovieSlug,
            movieTitle: safeTitle,
            posterUrl: safePoster,
            episodeName: currentEpisodeRef.current,
            serverLabel: currentServerRef.current,
            time: msg.time,
            duration: msg.duration,
          }, userId).catch(() => {});
        }
      } catch {}
    },
    [safeMovieId, safeMovieSlug, safeTitle, safePoster, userId]
  );

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]}>
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
