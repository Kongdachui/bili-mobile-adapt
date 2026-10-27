// ==UserScript==
// @name         bilibili 桌面版 → 手机适配
// @namespace    https://github.com/Kongdachui
// @version      2.7.0
// @description  手机浏览器（桌面 UA）打开 bilibili 网页版时重排为手机布局：真 viewport、紧凑顶栏、刷掉番剧/直播/会员购等入口与番剧推荐位、双列推荐流、字体随分辨率自适应、横竖屏分别排版、播放页默认宽屏。右下角两个小圆点：手＝开关适配，宽＝宽屏播放。
// @author       ck kong
// @updateURL    https://cdn.jsdelivr.net/gh/Kongdachui/bili-mobile-adapt@main/bilibili-desktop-mobile.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/Kongdachui/bili-mobile-adapt@main/bilibili-desktop-mobile.user.js
// @supportURL   https://github.com/Kongdachui/bili-mobile-adapt
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @match        https://space.bilibili.com/*
// @match        https://t.bilibili.com/*
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var ON_KEY = 'biliMobileAdapt:on';
  var WIDE_KEY = 'biliMobileWide';
  var ROOT_CLASS = 'bili-mobile-adapt';
  var WIDE_CLASS = 'bili-wide';
  var VERSION = '2.7.0';
  var VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover';

  // 只在窄屏生效：平板/桌面端装了也不会动布局
  if (window.innerWidth > 820 && screen.width > 820) return;

  /* ---------------- 0. 等 <head> 出现 ---------------- */
  // document-start 注入时 document.documentElement / head 可能还是 null，
  // 直接 new MutationObserver(null) 会抛异常把整个脚本打断，所以用轮询。
  function whenHead(fn) {
    if (document.head) { fn(); return; }
    var tries = 0;
    var t = setInterval(function () {
      if (document.head || ++tries > 400) { clearInterval(t); fn(); }
    }, 10);
  }

  /* ---------------- 1. 补上 viewport（关键一步） ---------------- */
  // www 的 <head> 里根本没有 viewport meta，手机就按 980~1100px 排版再整体缩到
  // 35%——这是"字小得看不清"的第一元凶。space/t 有但值不统一，一并覆盖。
  function applyViewport() {
    if (!document.head) return false;
    var m = document.querySelector('meta[name="viewport"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'viewport');
      document.head.appendChild(m);
    }
    if (m.getAttribute('content') !== VIEWPORT) m.setAttribute('content', VIEWPORT);
    return true;
  }

  /* ---------------- 2. 样式 ---------------- */
  var CSS = [
    /* ---- 全局钳制：不许有任何东西把页面撑宽 ---- */
    'html.' + ROOT_CLASS + '{-webkit-text-size-adjust:100%;}',
    /* 桌面版把 min-width 写死在 body / #app / .bili-header 上（首页顶栏 1100px、
       搜索页 #app 1100px、t 站 1044px、页脚 999px），不归零整页就被缩成 35% */
    'html.' + ROOT_CLASS + ' body,html.' + ROOT_CLASS + ' #app,html.' + ROOT_CLASS + ' main,',
    'html.' + ROOT_CLASS + ' .bili-footer-overseas,html.' + ROOT_CLASS + ' .bili-header,',
    'html.' + ROOT_CLASS + ' .bili-header__bar,html.' + ROOT_CLASS + ' .bili-header__banner,',
    'html.' + ROOT_CLASS + ' .upinfo.header-upinfo{min-width:0!important;max-width:100%!important;}',
    'html.' + ROOT_CLASS + ' body{overflow-x:hidden!important;}',
    'html.' + ROOT_CLASS + ' img,html.' + ROOT_CLASS + ' video,html.' + ROOT_CLASS + ' iframe{max-width:100%;}',

    /* ---- 顶栏 ---- */
    'html.' + ROOT_CLASS + ' .bili-header{width:100%!important;height:auto!important;}',
    'html.' + ROOT_CLASS + ' .bili-header__banner{display:none!important;}',
    'html.' + ROOT_CLASS + ' .bili-header__bar{display:flex!important;align-items:center;gap:4px;',
    '  height:48px!important;padding:0 6px!important;position:sticky!important;top:0;z-index:90;}',
    'html.' + ROOT_CLASS + ' .bili-header__bar a,html.' + ROOT_CLASS + ' .bili-header__bar .v-popover-wrap{',
    '  min-height:32px;display:flex;align-items:center;}',
    /* 左侧导航：横向可滑，不换行，最多占 45% 宽度 */
    'html.' + ROOT_CLASS + ' .left-entry.menu-left{flex:0 1 auto!important;min-width:0;max-width:45%;',
    '  overflow-x:auto;overflow-y:hidden;scrollbar-width:none;}',
    'html.' + ROOT_CLASS + ' .left-entry::-webkit-scrollbar{display:none;}',
    'html.' + ROOT_CLASS + ' .left-entry-main{flex-wrap:nowrap!important;}',
    'html.' + ROOT_CLASS + ' .left-entry__item{flex:none;font-size:clamp(12px,3.2vw,15px)!important;}',
    'html.' + ROOT_CLASS + ' .left-entry__item-txt{font-size:clamp(12px,3.2vw,15px)!important;}',
    /* 中间搜索：吃掉剩余宽度，但不许被挤没 */
    'html.' + ROOT_CLASS + ' .center-search-container.menu-center{flex:1 1 140px!important;width:auto!important;',
    '  min-width:110px!important;margin:0 4px!important;}',
    'html.' + ROOT_CLASS + ' .center-search__bar{width:100%!important;margin:0!important;min-width:0!important;}',
    'html.' + ROOT_CLASS + ' .center-search__bar form,html.' + ROOT_CLASS + ' .center-search__bar #nav-searchform{',
    '  width:100%!important;min-width:0!important;}',
    'html.' + ROOT_CLASS + ' .nav-search-content{width:auto!important;min-width:0!important;}',
    'html.' + ROOT_CLASS + ' .nav-search-input{font-size:clamp(13px,3.4vw,16px)!important;}',
    /* 右侧：动态/收藏/历史/消息都要能看见 —— 头像从 82px 缩到 28px 腾地方 */
    'html.' + ROOT_CLASS + ' .right-entry.menu-right{flex:0 1 auto!important;max-width:62%;',
    '  overflow-x:auto;overflow-y:hidden;scrollbar-width:none;}',
    'html.' + ROOT_CLASS + ' .right-entry::-webkit-scrollbar{display:none;}',
    'html.' + ROOT_CLASS + ' .right-entry__main{gap:4px!important;flex-wrap:nowrap!important;',
    '  justify-content:flex-start!important;}',
    'html.' + ROOT_CLASS + ' .right-entry__item{flex:none;font-size:clamp(12px,3.2vw,15px)!important;',
    '  padding:0 2px!important;}',
    'html.' + ROOT_CLASS + ' .right-entry__loading{width:auto!important;max-width:100%!important;}',
    /* 头像原生 82px（内联样式），手机上必须缩，否则挤掉后面所有图标 */
    'html.' + ROOT_CLASS + ' .header-avatar-wrap .bili-avatar,',
    'html.' + ROOT_CLASS + ' .header-avatar-wrap .bili-avatar-img,',
    'html.' + ROOT_CLASS + ' .header-entry-avatar,html.' + ROOT_CLASS + ' .header-entry-mini{',
    '  width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;}',
    'html.' + ROOT_CLASS + ' .right-entry__item .trigger-icon{width:22px!important;height:22px!important;}',
    /* 大会员入口 + 它的弹层，整块不要 */
    'html.' + ROOT_CLASS + ' .vip-entry,html.' + ROOT_CLASS + ' .vip-popover-content,',
    'html.' + ROOT_CLASS + ' .vip-entry-containter{display:none!important;}',
    /* 创作中心：窄屏下 b 站会把 .trigger-text 藏掉，按文字匹配可能失效，按链接再兜一层 */
    'html.' + ROOT_CLASS + ' .right-entry__item:has(a[href*="member.bilibili.com/platform/home"]){',
    '  display:none!important;}',
    'html.' + ROOT_CLASS + ' .header-channel{overflow-x:auto;flex-wrap:nowrap!important;scrollbar-width:none;}',
    'html.' + ROOT_CLASS + ' .fixed-channel-shim{display:none!important;}',
    /* 顶栏下面的"频道栏"（番剧/国创/综艺/动画/娱乐…）：
       它在窄屏下宽 1020px，既撑出横向滚动，又压在首页内容上方。
       用户只要推荐流，整块去掉。 */
    'html.' + ROOT_CLASS + ' .bili-header__channel,html.' + ROOT_CLASS + ' .header-channel-fixed,',
    'html.' + ROOT_CLASS + ' .channel-icons{display:none!important;}',
    /* 顶栏内导航项原生 64px 高，塞进 48px 的 bar 会上下各溢出 8px（图标被切） */
    'html.' + ROOT_CLASS + ' .left-entry.menu-left,html.' + ROOT_CLASS + ' .right-entry.menu-right{',
    '  max-height:44px!important;align-items:center!important;}',
    /* 首页顶部的巨型轮播 banner：网格里的第一格 .recommended-swipe 占 461px，纯占地方 */
    'html.' + ROOT_CLASS + ' .recommended-swipe,html.' + ROOT_CLASS + ' .carousel-area,',
    'html.' + ROOT_CLASS + ' .vui_carousel,html.' + ROOT_CLASS + ' .feed2 .carousel-container,',
    'html.' + ROOT_CLASS + ' .bili-feed4-layout .carousel-container,',
    'html.' + ROOT_CLASS + ' .container.is-version8 .carousel{display:none!important;}',

    /* ---- 首页推荐流 ---- */
    'html.' + ROOT_CLASS + ' main.bili-feed4-layout{max-width:100%!important;padding:0!important;margin:0!important;}',
    'html.' + ROOT_CLASS + ' .feed2,html.' + ROOT_CLASS + ' .recommended-container_overseas{',
    '  width:auto!important;max-width:100%!important;margin:0!important;padding:0 6px!important;}',
    'html.' + ROOT_CLASS + ' .container.is-version8{width:auto!important;max-width:100%!important;margin:0!important;',
    '  padding:6px!important;gap:12px 8px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;}',
    'html.' + ROOT_CLASS + ' .bili-video-card,html.' + ROOT_CLASS + ' .bili-video-card__wrap{',
    '  width:auto!important;max-width:100%!important;}',
    /* 字体随屏幕分辨率自适应：vw 跟随屏宽，clamp 兜住上下限 */
    'html.' + ROOT_CLASS + ' .bili-video-card__info--tit{font-size:clamp(13px,3.6vw,17px)!important;',
    '  line-height:1.35!important;}',
    'html.' + ROOT_CLASS + ' .bili-video-card__info--bottom,html.' + ROOT_CLASS + ' .bili-video-card__stats,',
    'html.' + ROOT_CLASS + ' .bili-video-card__info--author{font-size:clamp(11px,3vw,14px)!important;}',
    'html.' + ROOT_CLASS + ' .palette-button-outer,html.' + ROOT_CLASS + ' .palette-button-inner{',
    '  max-width:100vw!important;overflow:hidden;}',

    /* ---- 播放页：左右分栏 → 上下堆叠 ---- */
    'html.' + ROOT_CLASS + ' .video-container-v1{display:block!important;padding:0!important;}',
    'html.' + ROOT_CLASS + ' .left-container{width:100%!important;max-width:100%!important;',
    '  padding:0!important;position:static!important;}',
    'html.' + ROOT_CLASS + ' .right-container{width:100%!important;max-width:100%!important;',
    '  margin:0!important;padding:8px!important;box-sizing:border-box;}',
    'html.' + ROOT_CLASS + ' #playerWrap,html.' + ROOT_CLASS + ' #bilibili-player,',
    'html.' + ROOT_CLASS + ' .bpx-player-container{width:100%!important;max-width:100%!important;',
    '  height:auto!important;aspect-ratio:16/9;}',
    /* 竖屏：播放器吸顶，往下滑看简介/评论时画面不跑掉 */
    'html.' + ROOT_CLASS + ' #playerWrap{position:sticky;top:0;z-index:80;background:#000;}',
    'html.' + ROOT_CLASS + ' .video-info-container,html.' + ROOT_CLASS + ' .video-toolbar-container,',
    'html.' + ROOT_CLASS + ' #commentapp,html.' + ROOT_CLASS + ' .comment-container{',
    '  width:100%!important;max-width:100%!important;padding-left:8px!important;padding-right:8px!important;',
    '  box-sizing:border-box;}',
    'html.' + ROOT_CLASS + ' .video-title{font-size:clamp(16px,4.4vw,21px)!important;line-height:1.4!important;}',
    'html.' + ROOT_CLASS + ' .up-info-container,html.' + ROOT_CLASS + ' .recommend-list-v1,',
    'html.' + ROOT_CLASS + ' .danmaku-wrap{width:100%!important;max-width:100%!important;}',
    /* 播放器按钮/文字放大，手指点得中 */
    'html.' + ROOT_CLASS + ' .bpx-player-ctrl-btn{min-width:34px!important;min-height:34px!important;}',
    'html.' + ROOT_CLASS + ' .bpx-player-ctrl-btn svg{width:22px!important;height:22px!important;}',
    'html.' + ROOT_CLASS + ' .bpx-player-control-bottom{height:46px!important;}',
    'html.' + ROOT_CLASS + ' .bpx-player-ctrl-time-label,html.' + ROOT_CLASS + ' .bpx-player-ctrl-time{',
    '  font-size:13px!important;}',
    /* 只留播放必需：播放/时间/画质/倍速/音量/全屏。
       设置、字幕、画中画、宽屏、网页全屏、看点 一律收掉（弹幕开关不是 ctrl-btn，保留）
       注意：整条选择器必须写在一个字符串里，换行会被当成后代选择器，规则直接失效 */
    'html.' + ROOT_CLASS + ' .bpx-player-ctrl-btn:not(.bpx-player-ctrl-play):not(.bpx-player-ctrl-time):not(.bpx-player-ctrl-quality):not(.bpx-player-ctrl-playbackrate):not(.bpx-player-ctrl-volume):not(.bpx-player-ctrl-full){display:none!important;}',
    /* 点赞/投币/收藏/分享/举报/笔记/更多/用手机看 —— 看视频用不到 */
    'html.' + ROOT_CLASS + ' .video-toolbar-left-item,html.' + ROOT_CLASS + ' .video-complaint,',
    'html.' + ROOT_CLASS + ' .video-note,html.' + ROOT_CLASS + ' .video-tool-more,',
    'html.' + ROOT_CLASS + ' .video-use-phone{display:none!important;}',
    /* 宽屏模式：播放器浮到整个视口（横屏默认开，竖屏可手动开） */
    'html.' + ROOT_CLASS + '.' + WIDE_CLASS + ' #playerWrap{position:fixed!important;inset:0!important;',
    '  width:100vw!important;height:100vh!important;max-width:none!important;aspect-ratio:auto!important;',
    '  z-index:2147482000!important;background:#000!important;}',
    'html.' + ROOT_CLASS + '.' + WIDE_CLASS + ' #playerWrap #bilibili-player,',
    'html.' + ROOT_CLASS + '.' + WIDE_CLASS + ' #playerWrap .bpx-player-container{',
    '  width:100%!important;height:100%!important;aspect-ratio:auto!important;}',
    'html.' + ROOT_CLASS + '.' + WIDE_CLASS + ' .bili-header__bar{display:none!important;}',

    /* ---- 搜索页 ---- */
    'html.' + ROOT_CLASS + ' .search-page,html.' + ROOT_CLASS + ' .search-content,',
    'html.' + ROOT_CLASS + ' .search-layout,html.' + ROOT_CLASS + ' .search-header{',
    '  width:auto!important;max-width:100%!important;padding-left:8px!important;padding-right:8px!important;',
    '  box-sizing:border-box;}',
    'html.' + ROOT_CLASS + ' .search-input{width:100%!important;}',
    'html.' + ROOT_CLASS + ' .video-list{width:auto!important;max-width:100%!important;gap:8px!important;}',
    'html.' + ROOT_CLASS + ' .video-list>div{flex:0 0 calc(50% - 4px)!important;max-width:calc(50% - 4px)!important;}',
    'html.' + ROOT_CLASS + ' .vui_tabs{width:auto!important;max-width:100%!important;overflow-x:auto;white-space:nowrap;}',
    'html.' + ROOT_CLASS + ' .bili-video-card.is-search,html.' + ROOT_CLASS + ' .video-list .bili-video-card{',
    '  width:100%!important;}',
    'html.' + ROOT_CLASS + ' .vui_pagenation,html.' + ROOT_CLASS + ' .vui_pagenation--btns{',
    '  width:auto!important;max-width:100%!important;overflow-x:auto;}',
    'html.' + ROOT_CLASS + ' .side-buttons-container{width:auto!important;max-width:100vw!important;',
    '  overflow:hidden!important;}',
    'html.' + ROOT_CLASS + ' .info-card{max-width:100%!important;}',

    /* ---- 个人主页 / 动态页 ---- */
    /* 动态页是 左栏 194 + 主列 + 右栏 246 的三栏 flex，窄屏下主列被压成 21px
       （正文只剩一条缝）——必须拆成单栏，侧栏在手机上直接不要 */
    'html.' + ROOT_CLASS + ' .bili-dyn-home--member{display:block!important;',
    '  width:100%!important;max-width:100%!important;}',
    'html.' + ROOT_CLASS + ' .bili-dyn-home--member>aside.left,',
    'html.' + ROOT_CLASS + ' .bili-dyn-home--member>aside.right,',
    'html.' + ROOT_CLASS + ' .bili-dyn-sidebar{display:none!important;}',
    'html.' + ROOT_CLASS + ' .bili-dyn-home--member>main{width:100%!important;max-width:100%!important;',
    '  padding:0!important;margin:0!important;}',
    'html.' + ROOT_CLASS + ' .bili-dyn-list,html.' + ROOT_CLASS + ' .bili-dyn-list__item,',
    'html.' + ROOT_CLASS + ' .bili-dyn-item,html.' + ROOT_CLASS + ' .bili-dyn-content,',
    'html.' + ROOT_CLASS + ' .bili-dyn-card-video,html.' + ROOT_CLASS + ' .bili-rich-text{',
    '  width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box;}',
    'html.' + ROOT_CLASS + ' .bili-dyn-title__text,html.' + ROOT_CLASS + ' .bili-rich-text{',
    '  font-size:clamp(14px,3.8vw,17px)!important;line-height:1.5!important;}',
    /* 个人主页：同样是多栏，窄屏拆开；顶部 .nav-bar__main 写死 1100px 会撑出横向滚动 */
    'html.' + ROOT_CLASS + ' .space-container,html.' + ROOT_CLASS + ' .upinfo,',
    'html.' + ROOT_CLASS + ' .space-main{width:100%!important;min-width:0!important;',
    '  max-width:100%!important;box-sizing:border-box;}',
    'html.' + ROOT_CLASS + ' .nav-bar,html.' + ROOT_CLASS + ' .nav-bar__main,',
    'html.' + ROOT_CLASS + ' .nav-bar__wrap{width:100%!important;min-width:0!important;',
    '  max-width:100%!important;overflow-x:auto;scrollbar-width:none;}',
    'html.' + ROOT_CLASS + ' .nav-bar::-webkit-scrollbar{display:none;}',
    /* 个人主页顶栏的「投稿」按钮伸到视口外 23px，撑出横向滚动 */
    'html.' + ROOT_CLASS + ' .upload-entry{display:none!important;}',

    /* ---- 番剧/影视推荐位（CSS 兜底；JS 再尝试把外层空格子一起收掉） ---- */
    'html.' + ROOT_CLASS + ' .floor-card,html.' + ROOT_CLASS + ' .floor-single-card{display:none!important;}',
    /* 直播推荐卡（含自动播放的 v-inline-live-player），整块不要 */
    'html.' + ROOT_CLASS + ' .bili-live-card{display:none!important;}',

    /* ---- 广告 / 劝装 App ---- */
    'html.' + ROOT_CLASS + ' .download-app,html.' + ROOT_CLASS + ' .launcher-app,',
    'html.' + ROOT_CLASS + ' .old-browser-tip,html.' + ROOT_CLASS + ' .browser-tip,',
    'html.' + ROOT_CLASS + ' .international-header-tip{display:none!important;}',
    /* 站内广告位容器：视频页左右下角 banner（.ad-report.strip-ad.left-banner）、
       通栏条幅、广告楼层等。用 [class*=] 兜住同类变体 */
    'html.' + ROOT_CLASS + ' .ad-report,html.' + ROOT_CLASS + ' .strip-ad,',
    'html.' + ROOT_CLASS + ' .left-banner,html.' + ROOT_CLASS + ' .right-banner,',
    'html.' + ROOT_CLASS + ' .ad-floor,html.' + ROOT_CLASS + ' .ad-banner,',
    'html.' + ROOT_CLASS + ' [class*="ad-report"],html.' + ROOT_CLASS + ' [class*="strip-ad"],',
    'html.' + ROOT_CLASS + ' [class*="ad-floor"],html.' + ROOT_CLASS + ' [class*="ad-banner"]{',
    '  display:none!important;}',
    'html.' + ROOT_CLASS + ' .bili-footer,html.' + ROOT_CLASS + ' .international-footer{padding:12px 8px!important;}',

    /* ---- 横竖屏分别排版 ---- */
    '@media (orientation:landscape){',
    '  html.' + ROOT_CLASS + ' .container.is-version8{grid-template-columns:repeat(3,minmax(0,1fr))!important;}',
    '  html.' + ROOT_CLASS + ' .bili-header__bar{height:40px!important;}',
    '}',
    '@media (orientation:landscape) and (min-width:700px){',
    '  html.' + ROOT_CLASS + ' .container.is-version8{grid-template-columns:repeat(4,minmax(0,1fr))!important;}',
    '}',
    '@media (orientation:portrait){',
    '  html.' + ROOT_CLASS + ' .container.is-version8{grid-template-columns:repeat(2,minmax(0,1fr))!important;}',
    '}',

    /* ---- 右下角小圆点 ---- */
    '#bili-mobile-toggle,#bili-mobile-wide{position:fixed;right:6px;z-index:2147483000;',
    '  width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;',
    '  font:12px/1 -apple-system,"PingFang SC",sans-serif;color:#fff;background:rgba(0,0,0,.35);',
    '  opacity:.45;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;}',
    '#bili-mobile-toggle{bottom:calc(60px + env(safe-area-inset-bottom));}',
    '#bili-mobile-wide{bottom:calc(100px + env(safe-area-inset-bottom));display:none;background:rgba(0,0,0,.45);}',
    '#bili-mobile-toggle:active,#bili-mobile-wide:active{opacity:1;background:rgba(251,114,153,.95);}'
  ].join('\n');

  function injectStyle() {
    if (!document.head) return false;
    var s = document.createElement('style');
    s.id = 'bili-mobile-adapt-style';
    s.textContent = CSS;
    document.head.appendChild(s);
    return true;
  }

  whenHead(function () {
    applyViewport();
    injectStyle();
  });

  /* ---------------- 3. 开关 ---------------- */
  function isOn() {
    try { return localStorage.getItem(ON_KEY) !== '0'; } catch (e) { return true; }
  }
  function setOn(on) {
    var root = document.documentElement;
    if (on) root.classList.add(ROOT_CLASS);
    else { root.classList.remove(ROOT_CLASS); root.classList.remove(WIDE_CLASS); }
    try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch (e) {}
    var btn = document.getElementById('bili-mobile-toggle');
    if (btn) btn.title = on ? '手机适配：开（点击关闭） v' + VERSION : '手机适配：关（点击开启） v' + VERSION;
  }

  /* ---------------- 4. 过滤：顶栏入口 + 番剧/直播推荐位 ---------------- */
  // 按可见文字精确匹配，改版后最多是"没隐藏"，不会误伤别的元素。
  // 想留哪个就从这个数组里删。
  var HIDE_LEFT = ['番剧', '国创', '电影', '电视剧', '综艺', '纪录片', '动画',
                   '直播', '游戏中心', '会员购', '漫画', '赛事', '赛事中心',
                   '专栏', '活动', '下载客户端'];
  var HIDE_RIGHT = ['创作中心', '投稿'];

  function pruneByText(scopeSel, hideList) {
    var items = document.querySelectorAll(scopeSel);
    for (var i = 0; i < items.length; i++) {
      // 用 textContent 而不是 innerText：窄屏下 b 站会把 .trigger-text 隐藏，
      // innerText 读到空字符串，按文字匹配就全废了
      var labelEl = items[i].querySelector('.trigger-text, .left-entry__item-txt');
      var t = ((labelEl ? labelEl.textContent : items[i].textContent) || '').replace(/\s+/g, '');
      if (!t) continue;
      for (var j = 0; j < hideList.length; j++) {
        if (t === hideList[j]) { items[i].style.display = 'none'; break; }
      }
    }
  }

  // 番剧推荐位、直播卡、广告卡整块去掉；连外层 .feed-card 一起收，
  // 否则网格里会留一个空格子
  function hideCell(el) {
    if (!el || el.getAttribute('data-bili-hidden')) return;
    var cell = el.closest('.feed-card, .bili-feed-card') || el;
    cell.style.display = 'none';
    cell.setAttribute('data-bili-hidden', '1');
  }

  // 广告位识别（命中任意一条即判为广告）：
  //   1. 跳转经过 bilibili 广告服务器 cm.bilibili.com，或带 ad_card 标记
  //   2. 角标文字含「广告」
  //   3. 卡片主链接指向站外（广告落地页）
  // 注意：data-mod="tianma.*" 是 b 站整个推荐系统的埋点，普通视频卡也带，
  // 拿它当广告标记会把大半个推荐流干掉——别用。
  function isAdCard(card) {
    if (card.querySelector('a[href*="cm.bilibili.com"], a[data-target-url*="cm.bilibili.com"], a[href*="ad_card"]')) return true;
    var badge = card.querySelector('.bili-video-card__stats--text');
    if (badge && (badge.textContent || '').indexOf('广告') >= 0) return true;
    if (card.querySelector('.bili-video-card__info--ad')) return true;
    var a = card.querySelector('a[href]');
    if (a) {
      try {
        var h = new URL(a.href, location.href).host;
        if (h && !/(^|\.)bilibili\.com$/.test(h)) return true;
      } catch (e) {}
    }
    return false;
  }

  function pruneFeed() {
    var drop = document.querySelectorAll('.floor-card, .floor-single-card, .bili-live-card');
    for (var i = 0; i < drop.length; i++) hideCell(drop[i]);

    var cards = document.querySelectorAll('.bili-video-card');
    for (var k = 0; k < cards.length; k++) {
      var c = cards[k];
      if (c.getAttribute('data-bili-hidden')) continue;
      if (isAdCard(c)) { hideCell(c); continue; }
      if (c.querySelector('a[href*="live.bilibili.com"]')) hideCell(c);
    }
  }

  function pruneNav() {
    pruneByText('.left-entry .left-entry__item', HIDE_LEFT);
    pruneByText('.right-entry .right-entry__item', HIDE_RIGHT);
    pruneFeed();
  }

  /* ---------------- 5. 宽屏播放 ---------------- */
  function isVideoPage() { return !!document.querySelector('#playerWrap, #bilibili-player'); }

  function setWide(on) {
    var root = document.documentElement;
    if (on) root.classList.add(WIDE_CLASS); else root.classList.remove(WIDE_CLASS);
    var b = document.getElementById('bili-mobile-wide');
    if (b) b.title = on ? '宽屏：开（点击还原）' : '宽屏：关（点击全屏播放）';
    try { localStorage.setItem(WIDE_KEY, on ? '1' : '0'); } catch (e) {}
  }
  function autoWide() {
    var btn = document.getElementById('bili-mobile-wide');
    if (!isVideoPage()) {
      if (btn) btn.style.display = 'none';
      document.documentElement.classList.remove(WIDE_CLASS);
      return;
    }
    if (btn) btn.style.display = 'flex';
    if (!isOn()) return;
    var landscape = window.innerWidth > window.innerHeight;
    var pref = null;
    try { pref = localStorage.getItem(WIDE_KEY); } catch (e) {}
    // 用户手动关过（竖屏关 / 横屏也关）就别自动开
    if (pref === '0' && landscape) return;
    setWide(landscape);
  }

  function addButtons() {
    if (!document.getElementById('bili-mobile-toggle')) {
      var btn = document.createElement('div');
      btn.id = 'bili-mobile-toggle';
      btn.textContent = '手';
      btn.title = '手机适配：开（点击关闭） v' + VERSION;
      btn.addEventListener('click', function () { setOn(!isOn()); });
      document.body.appendChild(btn);
    }
    if (!document.getElementById('bili-mobile-wide')) {
      var w = document.createElement('div');
      w.id = 'bili-mobile-wide';
      w.textContent = '宽';
      w.title = '宽屏：关（点击全屏播放）';
      w.addEventListener('click', function () {
        setWide(!document.documentElement.classList.contains(WIDE_CLASS));
      });
      document.body.appendChild(w);
    }
  }

  /* ---------------- 6. 启动 ---------------- */
  function boot() {
    if (!document.body || !document.documentElement) { setTimeout(boot, 50); return; }
    try {
      setOn(isOn());
      addButtons();
      autoWide();

      // 顶栏/推荐流都是异步渲染的；而且无限滚动会持续插入新卡片（新卡片里照样有广告），
      // 所以监听不能像以前那样 20 秒后就断开，改成长期挂 + 滚动补刀
      [0, 400, 1200, 3000, 6000].forEach(function (ms) { setTimeout(pruneNav, ms); });
      var timer = null;
      var schedule = function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(pruneNav, 400);
      };
      var mo = new MutationObserver(schedule);
      mo.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('scroll', schedule, { passive: true });
      // 兜底轮询：前 2 分钟每 3 秒，之后降到 15 秒（防广告在无 DOM 变动时插入）
      var fast = setInterval(pruneNav, 3000);
      setTimeout(function () {
        clearInterval(fast);
        setInterval(pruneNav, 15000);
      }, 120000);

      var rot = null;
      window.addEventListener('resize', function () {
        if (rot) clearTimeout(rot);
        rot = setTimeout(autoWide, 200);
      });
      window.addEventListener('orientationchange', function () { setTimeout(autoWide, 300); });
    } catch (e) {
      // 静默失败最难查：出错也要留下痕迹
      if (window.console) console.error('[bili-mobile] boot 失败', e);
    }

    // 页面侧排障入口（@grant none，window 就是页面 window）
    window.__biliMobile = {
      version: VERSION,
      isOn: isOn,
      setOn: setOn,
      setWide: setWide,
      autoWide: autoWide,
      viewport: applyViewport,
      style: injectStyle,
      prune: pruneNav,
      hideLeft: HIDE_LEFT,
      hideRight: HIDE_RIGHT,
      css: CSS
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
    setTimeout(boot, 1500); // DOMContentLoaded 早于 body 时的兜底
  } else {
    boot();
  }

  // SPA 局部跳转后补一次（播放页换 P、首页换分区不整页刷新）
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function () {
      var r = orig.apply(this, arguments);
      try { pruneNav(); autoWide(); } catch (e) {}
      return r;
    };
  });
})();
