(function () {
  'use strict';

  const Views = {
    main: 'view-main',
    settings: 'view-settings',
    lottery: 'view-lottery',
    cover: 'view-cover',
    results: 'view-results'
  };

  const STORAGE_KEY = 'activity-lottery-data';
  const MUSIC_DB_NAME = 'activity-lottery-music';
  const MUSIC_STORE_NAME = 'music';

  const defaultFont = () => ({ family: 'Microsoft YaHei', size: 24, bold: true, color: '#000000' });

  const defaultState = {
    mainTitle: '某某活动主标题',
    subTitle: '某某活动副标题',
    showMainTitle: true,
    showSubTitle: true,
    names: ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '王十二'],
    prizes: [
      { id: 1, name: '特等奖', giftName: '苹果iPhone6一台', count: 1, drawn: 0, drawOnce: 1, displayCols: 1, marginTop: 20, marginLeft: 20, align: 'center', prizeImage: '', showPrizeImage: false, prizeImageHeight: 200 },
      { id: 2, name: '一等奖', giftName: '笔记本电脑', count: 2, drawn: 0, drawOnce: 1, displayCols: 1, marginTop: 20, marginLeft: 20, align: 'center', prizeImage: '', showPrizeImage: false, prizeImageHeight: 200 },
      { id: 3, name: '二等奖', giftName: '平板电脑', count: 3, drawn: 0, drawOnce: 1, displayCols: 1, marginTop: 20, marginLeft: 20, align: 'center', prizeImage: '', showPrizeImage: false, prizeImageHeight: 200 },
      { id: 4, name: '三等奖', giftName: 'IPAD', count: 4, drawn: 0, drawOnce: 1, displayCols: 1, marginTop: 20, marginLeft: 20, align: 'center', prizeImage: '', showPrizeImage: false, prizeImageHeight: 200 }
    ],
    noRepeat: true,
    scrollSpeed: 30,
    winners: {},
    hintText: '按 回车 或 空格 开始/停止',
    soundScroll: true,
    soundWin: true,
    resultPageFontSize: 16,
    resultPageShowPrizeName: true,
    resultPageBgImage: '',
    coverTitle: '',
    coverSub: '',
    coverTitleLeft: 50,
    coverTitleTop: 35,
    coverSubLeft: 50,
    coverSubTop: 70,
    coverBgImage: '',
    settingsPassword: '',
    fontMainTitle: defaultFont(),
    fontSubTitle: defaultFont(),
    fontPrizeName: defaultFont(),
    fontWinnerList: defaultFont(),
    fontResultPageTitle: { family: 'Microsoft YaHei', size: 20, bold: true, color: '#ffc107' },
    bgImage: '',
    bgMode: 'stretch',
    mainBgImage: '',
    validatePrizeNames: false,
    musicStart: '',
    musicScroll: '',
    musicWin: '',
    tempWinners: [],
    lotteryType: 'text',
    advSettings: false,
    nameImages: [],
    lotteryLayout: null
  };

  let state = loadState();

  let scrollTimer = null;
  let currentPrizeIndex = 0;
  let pool = []; // 当前奖池（未中奖名单）
  let isRolling = false;
  let pendingTempPrize = null; // { name, count } 配置后进入临时抽奖，按空格开始/停止，不立即抽
  let afterTempWaitingNext = false; // 临时抽奖刚结束，等待按回车后才显示下一档奖项内容
  let lastTempWinnerNames = []; // 上一轮临时中奖名单，用于在“待显示下一档”期间继续显示
  let drawOnceEditingPrizeId = null; // 焦点进入「一次抽取数」时记录的奖项 id，blur 时只修正该奖项，避免误改其它奖项
  let scrollAudio = null; // 滚动时播放的音频实例，用于在停止时暂停
  let startAudio = null;  // 启动音乐实例

  function pauseStartMusic() {
    if (startAudio) try { startAudio.pause(); } catch (e) {}
  }

  function playMusicStart() {
    if (!state.musicStart) return;
    try {
      if (startAudio) {
        startAudio.pause();
        startAudio.currentTime = 0;
      }
      startAudio = new Audio(state.musicStart);
      startAudio.loop = true;
      startAudio.play().catch(function () {});
    } catch (e) {}
  }

  function playMusicScroll() {
    pauseStartMusic();
    if (state.soundScroll !== false && state.musicScroll) {
      try {
        if (scrollAudio) {
          scrollAudio.pause();
          scrollAudio.currentTime = 0;
          if (scrollAudio.src !== state.musicScroll) scrollAudio.src = state.musicScroll;
        } else {
          scrollAudio = new Audio(state.musicScroll);
          scrollAudio.loop = true;
        }
        scrollAudio.play().catch(function () {});
      } catch (e) {}
    }
  }

  function stopMusicScroll() {
    if (scrollAudio) {
      try { scrollAudio.pause(); scrollAudio.currentTime = 0; } catch (e) {}
      scrollAudio = null;
    }
  }

  function playMusicWin() {
    if (state.soundWin !== false && state.musicWin) {
      var a = new Audio(state.musicWin);
      a.addEventListener('ended', function () { playMusicStart(); });
      a.play().catch(function () { playMusicStart(); });
    } else {
      playMusicStart();
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const out = JSON.parse(JSON.stringify(defaultState));
        out.winners = s.winners || {};
        out.names = (s.names && s.names.length) ? s.names : out.names;
        out.mainTitle = s.mainTitle !== undefined ? s.mainTitle : out.mainTitle;
        out.subTitle = s.subTitle !== undefined ? s.subTitle : out.subTitle;
        out.showMainTitle = s.showMainTitle !== undefined ? s.showMainTitle : out.showMainTitle;
        out.showSubTitle = s.showSubTitle !== undefined ? s.showSubTitle : out.showSubTitle;
        out.scrollSpeed = s.scrollSpeed !== undefined ? s.scrollSpeed : out.scrollSpeed;
        out.noRepeat = s.noRepeat !== undefined ? s.noRepeat : out.noRepeat;
        out.hintText = s.hintText !== undefined ? s.hintText : out.hintText;
        out.soundScroll = s.soundScroll !== undefined ? s.soundScroll : out.soundScroll;
        out.soundWin = s.soundWin !== undefined ? s.soundWin : out.soundWin;
        out.resultPageFontSize = s.resultPageFontSize !== undefined ? s.resultPageFontSize : out.resultPageFontSize;
        out.resultPageShowPrizeName = s.resultPageShowPrizeName !== undefined ? s.resultPageShowPrizeName : out.resultPageShowPrizeName;
        out.resultPageBgImage = (typeof s.resultPageBgImage === 'string') ? s.resultPageBgImage : '';
        out.coverTitle = s.coverTitle !== undefined ? s.coverTitle : out.coverTitle;
        out.coverSub = s.coverSub !== undefined ? s.coverSub : out.coverSub;
        out.coverTitleLeft = Math.max(0, Math.min(100, (s.coverTitleLeft !== undefined ? s.coverTitleLeft : out.coverTitleLeft)));
        out.coverTitleTop = Math.max(0, Math.min(100, (s.coverTitleTop !== undefined ? s.coverTitleTop : out.coverTitleTop)));
        out.coverSubLeft = Math.max(0, Math.min(100, (s.coverSubLeft !== undefined ? s.coverSubLeft : out.coverSubLeft)));
        out.coverSubTop = Math.max(0, Math.min(100, (s.coverSubTop !== undefined ? s.coverSubTop : out.coverSubTop)));
        out.coverBgImage = (typeof s.coverBgImage === 'string') ? s.coverBgImage : '';
        out.settingsPassword = s.settingsPassword !== undefined ? s.settingsPassword : out.settingsPassword;
        const mergeFont = (v) => (v && typeof v === 'object') ? { ...defaultFont(), ...v } : defaultFont();
        out.fontMainTitle = mergeFont(s.fontMainTitle);
        out.fontSubTitle = mergeFont(s.fontSubTitle);
        out.fontPrizeName = mergeFont(s.fontPrizeName);
        out.fontWinnerList = mergeFont(s.fontWinnerList);
        out.fontResultPageTitle = (s.fontResultPageTitle && typeof s.fontResultPageTitle === 'object') ? mergeFont(s.fontResultPageTitle) : { family: 'Microsoft YaHei', size: 20, bold: true, color: '#ffc107' };
        out.bgImage = s.bgImage !== undefined ? s.bgImage : out.bgImage;
        out.bgMode = (s.bgMode === 'stretch' || s.bgMode === 'tile' || s.bgMode === 'center') ? s.bgMode : out.bgMode;
        out.mainBgImage = (typeof s.mainBgImage === 'string') ? s.mainBgImage : '';
        out.validatePrizeNames = s.validatePrizeNames === true;
        out.musicStart = (typeof s.musicStart === 'string') ? s.musicStart : '';
        out.musicScroll = (typeof s.musicScroll === 'string') ? s.musicScroll : '';
        out.musicWin = (typeof s.musicWin === 'string') ? s.musicWin : '';
        out.lotteryType = (s.lotteryType === 'image' ? 'image' : 'text');
        out.advSettings = s.advSettings === true;
        out.nameImages = Array.isArray(s.nameImages) ? s.nameImages : [];
        out.lotteryLayout = (s.lotteryLayout && typeof s.lotteryLayout === 'object') ? s.lotteryLayout : null;
        const rawTemp = Array.isArray(s.tempWinners) ? s.tempWinners : [];
        out.tempWinners = rawTemp.map(item => Array.isArray(item) ? { name: '临时补奖', names: item } : (item && item.names ? item : { name: (item && item.name) || '临时补奖', names: (item && item.names) || [] }));
        const rawPrizes = (s.prizes && s.prizes.length) ? s.prizes : out.prizes;
        out.prizes = rawPrizes.map(p => ({
          ...p,
          drawOnce: Math.min(50, Math.max(1, p.drawOnce ?? 1)),
          displayCols: p.displayCols ?? 1,
          marginTop: p.marginTop ?? 20,
          marginLeft: p.marginLeft ?? 20,
          align: p.align || 'center',
          prizeImage: p.prizeImage || '',
          showPrizeImage: !!p.showPrizeImage,
          prizeImageHeight: Math.max(60, Math.min(700, p.prizeImageHeight || 200))
        }));
        return out;
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(defaultState));
  }

  function openMusicDB() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(MUSIC_DB_NAME, 1);
      r.onerror = function () { reject(r.error); };
      r.onsuccess = function () { resolve(r.result); };
      r.onupgradeneeded = function (e) {
        if (!e.target.result.objectStoreNames.contains(MUSIC_STORE_NAME)) {
          e.target.result.createObjectStore(MUSIC_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  function saveMusicToIndexedDB(start, scroll, win) {
    openMusicDB().then(function (db) {
      var tx = db.transaction(MUSIC_STORE_NAME, 'readwrite');
      tx.objectStore(MUSIC_STORE_NAME).put({
        id: 'blobs',
        musicStart: (typeof start === 'string') ? start : '',
        musicScroll: (typeof scroll === 'string') ? scroll : '',
        musicWin: (typeof win === 'string') ? win : ''
      });
      db.close();
    }).catch(function () {});
  }

  function loadMusicFromIndexedDB() {
    return openMusicDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MUSIC_STORE_NAME, 'readonly');
        var req = tx.objectStore(MUSIC_STORE_NAME).get('blobs');
        req.onsuccess = function () {
          db.close();
          resolve(req.result || {});
        };
        req.onerror = function () {
          db.close();
          reject(req.error);
        };
      });
    });
  }

  function saveState() {
    try {
      var payload = JSON.parse(JSON.stringify(state));
      payload.musicStart = '';
      payload.musicScroll = '';
      payload.musicWin = '';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      saveMusicToIndexedDB(state.musicStart, state.musicScroll, state.musicWin);
      return true;
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('localStorage 已满，保存失败');
      }
      return false;
    }
  }

  function compressImageForStorage(dataUrl, maxEdge, quality, done) {
    if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 100) {
      done(dataUrl || '');
      return;
    }
    var img = new Image();
    img.onload = function () {
      try {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) { done(dataUrl); return; }
        if (w > maxEdge || h > maxEdge) {
          if (w >= h) {
            h = Math.round(h * maxEdge / w);
            w = maxEdge;
          } else {
            w = Math.round(w * maxEdge / h);
            h = maxEdge;
          }
        }
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var ctx = c.getContext('2d');
        if (!ctx) { done(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        var out = c.toDataURL('image/jpeg', quality);
        done(out || dataUrl);
      } catch (err) {
        done(dataUrl);
      }
    };
    img.onerror = function () { done(dataUrl); };
    img.src = dataUrl;
  }

  function showView(id) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    if (id === Views.lottery) {
      applyLotteryLayout();
      playMusicStart();
    }
  }

  function applyLotteryLayout() {
    var view = document.getElementById(Views.lottery);
    var L = state.lotteryLayout;
    if (!view || !L) return;
    var header = view.querySelector('.lottery-header');
    var left = view.querySelector('.lottery-left-panel');
    var right = view.querySelector('.lottery-right-panel');
    var panels = view.querySelector('.lottery-panels');
    if (header && L.header) {
      header.style.top = (L.header.top != null ? L.header.top : 2) + '%';
      header.style.left = (L.header.left != null ? L.header.left : 50) + '%';
      header.style.transform = (L.header.left === 50 || L.header.left == null) ? 'translateX(-50%)' : 'none';
    }
    if (panels) panels.style.position = 'relative';
    if (left && L.left) {
      left.style.position = 'absolute';
      left.style.top = (L.left.top != null ? L.left.top : 12) + '%';
      left.style.left = (L.left.left != null ? L.left.left : 2) + '%';
      left.style.width = (L.left.w != null ? L.left.w : 38) + '%';
      left.style.height = (L.left.h != null ? L.left.h : 76) + '%';
      left.style.maxWidth = 'none';
    }
    if (right && L.right) {
      right.style.position = 'absolute';
      right.style.top = (L.right.top != null ? L.right.top : 12) + '%';
      right.style.left = (L.right.left != null ? L.right.left : 42) + '%';
      right.style.width = (L.right.w != null ? L.right.w : 54) + '%';
      right.style.height = (L.right.h != null ? L.right.h : 76) + '%';
      right.style.maxWidth = 'none';
    }
  }

  function captureAndSaveLotteryLayout() {
    var view = document.getElementById(Views.lottery);
    if (!view) return;
    var vr = view.getBoundingClientRect();
    var header = view.querySelector('.lottery-header');
    var left = view.querySelector('.lottery-left-panel');
    var right = view.querySelector('.lottery-right-panel');
    if (!vr.width || !vr.height) return;
    var toPct = function (v, isWidth) { return Math.round((v / (isWidth ? vr.width : vr.height)) * 100); };
    state.lotteryLayout = {};
    if (header) {
      var hr = header.getBoundingClientRect();
      state.lotteryLayout.header = { top: toPct(hr.top - vr.top, false), left: Math.round(((hr.left - vr.left) + hr.width / 2) / vr.width * 100) };
    }
    if (left) {
      var lr = left.getBoundingClientRect();
      state.lotteryLayout.left = { top: toPct(lr.top - vr.top, false), left: toPct(lr.left - vr.left, true), w: toPct(lr.width, true), h: toPct(lr.height, false) };
    }
    if (right) {
      var rr = right.getBoundingClientRect();
      state.lotteryLayout.right = { top: toPct(rr.top - vr.top, false), left: toPct(rr.left - vr.left, true), w: toPct(rr.width, true), h: toPct(rr.height, false) };
    }
    saveState();
  }

  function initLotteryDrag() {
    var view = document.getElementById(Views.lottery);
    if (!view) return;
    view.addEventListener('mousedown', function (e) {
      var handle = e.target.closest('.lottery-drag-handle');
      if (!handle) return;
      e.preventDefault();
      if (isRolling) return;
      var areaEl = handle.closest('[data-drag-area]');
      if (!areaEl) return;
      var area = areaEl.getAttribute('data-drag-area');
      if (state.lotteryLayout == null) {
        captureAndSaveLotteryLayout();
        applyLotteryLayout();
      }
      var viewRect = view.getBoundingClientRect();
      var elRect = areaEl.getBoundingClientRect();
      var startX = e.clientX;
      var startY = e.clientY;
      var startLeft = elRect.left - viewRect.left;
      var startTop = elRect.top - viewRect.top;
      if (area === 'left' || area === 'right') {
        areaEl.style.width = elRect.width + 'px';
        areaEl.style.height = elRect.height + 'px';
      }
      var onMove = function (e2) {
        var dx = e2.clientX - startX;
        var dy = e2.clientY - startY;
        var newLeft = startLeft + dx;
        var newTop = startTop + dy;
        areaEl.style.position = 'absolute';
        areaEl.style.left = newLeft + 'px';
        areaEl.style.top = newTop + 'px';
        if (area === 'header') areaEl.style.transform = 'none';
      };
      var onUp = function () {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        captureAndSaveLotteryLayout();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function getTotalPrizeCount() {
    return (state.prizes || []).reduce(function (s, p) { return s + (p.count || 0); }, 0);
  }

  function initPool() {
    const drawn = new Set();
    Object.values(state.winners).forEach(arr => arr.forEach(n => drawn.add(n)));
    (state.tempWinners || []).forEach(row => {
      const names = (row && row.names) ? row.names : (Array.isArray(row) ? row : []);
      names.forEach(n => drawn.add(n));
    });
    if (state.noRepeat) {
      pool = state.names.filter(n => !drawn.has(n));
    } else {
      pool = [...state.names];
    }
  }

  function stopAnyRolling() {
    isRolling = false;
    stopMusicScroll();
    if (scrollTimer) {
      clearInterval(scrollTimer);
      scrollTimer = null;
    }
  }

  function getCurrentPrize() {
    const list = state.prizes;
    if (!list || !list.length) return null;
    const drawIdx = typeof currentPrizeIndex === 'number' ? currentPrizeIndex : 0;
    const idx = list.length - 1 - drawIdx;
    if (idx < 0) return null;
    return list[idx] || list[list.length - 1];
  }

  function getNextPrize() {
    const list = state.prizes;
    if (!list || !list.length) return null;
    const drawIdx = (typeof currentPrizeIndex === 'number' ? currentPrizeIndex : 0) + 1;
    const idx = list.length - 1 - drawIdx;
    if (idx < 0) return null;
    return list[idx] || null;
  }

  function getImageForName(name) {
    if (!state.names || !Array.isArray(state.nameImages)) return '';
    var idx = state.names.indexOf(name);
    return (idx >= 0 && state.nameImages[idx]) ? state.nameImages[idx] : '';
  }

  function startRolling() {
    if (isRolling) return;
    let cardCount = 0;
    if (pendingTempPrize) {
      if (pool.length === 0) {
        alert('当前奖池无人可抽。');
        return;
      }
      cardCount = Math.min(pendingTempPrize.count, pool.length);
      if (cardCount <= 0) return;
    } else {
      const prize = getCurrentPrize();
      const left = prize.count - prize.drawn;
      if (left <= 0) {
        advancePrizeOrEnd();
        return;
      }
      if (pool.length === 0) return;
      const perDraw = Math.max(1, prize.drawOnce ?? 1);
      cardCount = Math.min(left, perDraw, pool.length);
      if (cardCount <= 0) return;
    }
    isRolling = true;
    playMusicScroll();
    setLotteryNamesHint(''); // 状态提示改在下方按钮上显示
    setBtnStartDrawText('正在抽奖…');
    const grid = document.getElementById('lotteryWinnersGrid');
    if (!grid) return;
    const isImageMode = (state.lotteryType || 'text') === 'image';
    grid.innerHTML = '';
    for (let i = 0; i < cardCount; i++) {
      const card = document.createElement('div');
      card.className = 'lottery-name-card';
      var name = pool[Math.floor(Math.random() * pool.length)];
      var imgUrl = isImageMode ? getImageForName(name) : '';
      if (isImageMode && imgUrl) {
        var img = document.createElement('img');
        img.className = 'lottery-name-card-img';
        img.src = imgUrl;
        img.alt = name;
        card.appendChild(img);
        var label = document.createElement('span');
        label.className = 'lottery-name-card-label';
        label.textContent = name;
        if (state.fontWinnerList) {
          label.style.font = fontToCss(state.fontWinnerList);
          label.style.color = '#fff';
        }
        card.appendChild(label);
      } else {
        var text = document.createElement('span');
        text.className = 'lottery-name-card-text';
        text.textContent = name;
        if (state.fontWinnerList) {
          text.style.font = fontToCss(state.fontWinnerList);
          text.style.color = '#fff';
        }
        card.appendChild(text);
      }
      grid.appendChild(card);
    }
    setWinnerCardScale(grid, cardCount);
    const speed = Math.max(50, (state.scrollSpeed || 30) * 10);
    function tick() {
      const cards = grid.querySelectorAll('.lottery-name-card');
      for (let j = 0; j < cards.length; j++) {
        var n = pool[Math.floor(Math.random() * pool.length)];
        var url = isImageMode ? getImageForName(n) : '';
        cards[j].innerHTML = '';
        if (isImageMode && url) {
          var img = document.createElement('img');
          img.className = 'lottery-name-card-img';
          img.src = url;
          img.alt = n;
          cards[j].appendChild(img);
          var label = document.createElement('span');
          label.className = 'lottery-name-card-label';
          label.textContent = n;
          if (state.fontWinnerList) {
            label.style.font = fontToCss(state.fontWinnerList);
            label.style.color = '#fff';
          }
          cards[j].appendChild(label);
        } else {
          var span = document.createElement('span');
          span.className = 'lottery-name-card-text';
          span.textContent = n;
          if (state.fontWinnerList) {
            span.style.font = fontToCss(state.fontWinnerList);
            span.style.color = '#fff';
          }
          cards[j].appendChild(span);
        }
      }
    }
    scrollTimer = setInterval(tick, speed);
  }

  function setRollingCardsToNames(names) {
    const grid = document.getElementById('lotteryWinnersGrid');
    if (!grid || !names || names.length === 0) return;
    const cards = grid.querySelectorAll('.lottery-name-card');
    const isImageMode = (state.lotteryType || 'text') === 'image';
    for (let i = 0; i < names.length && i < cards.length; i++) {
      var n = names[i];
      var url = isImageMode ? getImageForName(n) : '';
      cards[i].innerHTML = '';
      if (isImageMode && url) {
        var img = document.createElement('img');
        img.className = 'lottery-name-card-img';
        img.src = url;
        img.alt = n;
        cards[i].appendChild(img);
        var label = document.createElement('span');
        label.className = 'lottery-name-card-label';
        label.textContent = n;
        if (state.fontWinnerList) {
          label.style.font = fontToCss(state.fontWinnerList);
          label.style.color = '#fff';
        }
        cards[i].appendChild(label);
      } else {
        var span = document.createElement('span');
        span.className = 'lottery-name-card-text';
        span.textContent = n;
        if (state.fontWinnerList) {
          span.style.font = fontToCss(state.fontWinnerList);
          span.style.color = '#fff';
        }
        cards[i].appendChild(span);
      }
    }
  }

  function clearRightPanelCards() {
    const grid = document.getElementById('lotteryWinnersGrid');
    if (grid) {
      grid.innerHTML = '';
      setWinnerCardScale(grid, 0);
    }
  }

  function setWinnerCardScale(grid, n) {
    if (!grid) return;
    var scale = 1;
    if (n <= 0) scale = 1;
    else if (n === 1) scale = 1.5;
    else if (n === 2) scale = 1.3;
    else if (n === 3) scale = 1.15;
    else if (n === 4) scale = 1;
    else if (n === 5) scale = 0.9;
    else scale = Math.max(0.55, 1.2 - n * 0.08);
    grid.style.setProperty('--winner-card-scale', String(scale));
  }

  function setLotteryNamesHint(hint) {
    const namesEl = document.getElementById('lotteryNames');
    if (namesEl) {
      namesEl.classList.remove('lottery-names-cards');
      namesEl.textContent = hint || '';
    }
  }

  function setBtnStartDrawText(txt) {
    const btn = document.getElementById('btnStartDraw');
    if (btn) btn.textContent = txt || '开始抽奖';
  }

  function stopRolling() {
    if (!isRolling) return;
    isRolling = false;
    stopMusicScroll();
    playMusicWin();
    if (scrollTimer) {
      clearInterval(scrollTimer);
      scrollTimer = null;
    }
    if (pendingTempPrize) {
      const take = Math.min(pendingTempPrize.count, pool.length);
      if (take <= 0) {
        pendingTempPrize = null;
        updateLotteryUI({ namesHint: '按 回车 继续下一档正式抽奖' });
        return;
      }
      const picked = [];
      for (let i = 0; i < take; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool[idx]);
        pool.splice(idx, 1);
      }
      state.tempWinners = state.tempWinners || [];
      state.tempWinners.push({ name: pendingTempPrize.name || '临时补奖', names: picked });
      saveState();
      const finishedName = pendingTempPrize.name || '临时补奖';
      pendingTempPrize = null;
      lastTempWinnerNames = picked;
      afterTempWaitingNext = true;
      setRollingCardsToNames(picked);
      setLotteryNamesHint(''); // 临时补奖后不再在卡片中央显示黄字，仅保留底部按钮与说明
      setBtnStartDrawText('按 回车 显示下一档');
      updateLotteryUI();
      const nextPrize = getNextPrize();
      const hintMsg = nextPrize ? `【${finishedName}】已抽完。按 回车 显示下一档并开始` : `【${finishedName}】已抽完。按 回车 返回`;
      const hintEl = document.getElementById('lotteryControlHint');
      if (hintEl) hintEl.textContent = hintMsg;
      return;
    }
    const prize = getCurrentPrize();
    const perDraw = Math.max(1, prize.drawOnce ?? 1);
    const need = Math.min(prize.count - prize.drawn, perDraw, pool.length);
    if (need <= 0) {
      advancePrizeOrEnd();
      return;
    }
    const picked = [];
    for (let i = 0; i < need; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    state.winners[prize.id] = state.winners[prize.id] || [];
    state.winners[prize.id].push(...picked);
    prize.drawn += picked.length;
    saveState();
    setRollingCardsToNames(picked);
    updateLotteryUI();
    const prizeNow = getCurrentPrize();
    if (prizeNow && (prizeNow.drawn || 0) >= (prizeNow.count || 0)) {
      setBtnStartDrawText('点击开始抽取下一档');
      setLotteryNamesHint('');
      pauseStartMusic();
    } else {
      setBtnStartDrawText('开始抽奖');
      setLotteryNamesHint('按 空格 继续抽取');
    }
  }

  function advancePrizeOrEnd() {
    const list = state.prizes;
    const next = currentPrizeIndex + 1;
    if (next < list.length) {
      currentPrizeIndex = next;
      initPool();
      clearRightPanelCards();
      updateLotteryUI();
      setLotteryNamesHint('按 空格 开始抽奖');
      setBtnStartDrawText('开始抽奖');
      playMusicStart();
    } else {
      showResults(); // 全部抽完后进入中奖页面，不回到主菜单
    }
  }

  function fontToCss(f) {
    if (!f) return '';
    const w = (f.bold ? 'bold ' : '') + (f.size || 24) + 'px ';
    return w + (f.family || 'Microsoft YaHei');
  }

  function applyMainBg() {
    const el = document.getElementById('view-main');
    const layer = el?.querySelector('.main-bg');
    if (!el) return;
    if (state.mainBgImage) {
      el.style.background = 'url(' + state.mainBgImage + ') center/cover no-repeat';
      if (layer) layer.style.background = 'none';
    } else {
      el.style.background = '';
      if (layer) layer.style.background = '';
    }
  }

  function applyResultPageBg() {
    const el = document.getElementById('view-results');
    const layer = el?.querySelector('.results-bg') || document.getElementById('resultsBgLayer');
    if (!el) return;
    if (state.resultPageBgImage && layer) {
      layer.style.backgroundImage = 'url(' + state.resultPageBgImage + ')';
      layer.style.backgroundSize = 'cover';
      layer.style.backgroundPosition = 'center';
      layer.style.backgroundRepeat = 'no-repeat';
      el.style.background = 'transparent';
    } else {
      if (layer) {
        layer.style.backgroundImage = 'none';
        layer.style.backgroundSize = '';
        layer.style.backgroundPosition = '';
        layer.style.backgroundRepeat = '';
      }
      el.style.background = '#f5f5f5';
    }
  }

  function applyViewStyles() {
    const bg = state.bgImage;
    const mode = state.bgMode || 'stretch';
    const size = mode === 'stretch' ? '100% 100%' : mode === 'tile' ? 'auto' : 'contain';
    const position = mode === 'center' ? 'center center' : '0 0';
    const repeat = mode === 'tile' ? 'repeat' : 'no-repeat';
    const viewLottery = document.getElementById('view-lottery');
    if (viewLottery) {
      let layer = viewLottery.querySelector('.custom-bg-layer');
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'custom-bg-layer';
        layer.setAttribute('aria-hidden', 'true');
        viewLottery.insertBefore(layer, viewLottery.firstChild);
      }
      layer.style.backgroundImage = bg ? 'url(' + bg + ')' : 'none';
      layer.style.backgroundSize = size;
      layer.style.backgroundPosition = position;
      layer.style.backgroundRepeat = repeat;
    }
    const viewCover = document.getElementById('view-cover');
    if (viewCover) {
      let layer = viewCover.querySelector('.custom-bg-layer');
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'custom-bg-layer';
        layer.setAttribute('aria-hidden', 'true');
        viewCover.insertBefore(layer, viewCover.firstChild);
      }
      const coverBg = state.coverBgImage || bg;
      layer.style.backgroundImage = coverBg ? 'url(' + coverBg + ')' : 'none';
      layer.style.backgroundSize = size;
      layer.style.backgroundPosition = position;
      layer.style.backgroundRepeat = repeat;
    }
    const setFont = (el, f) => { if (el && f) { el.style.font = fontToCss(f); el.style.color = (f.color || '#000000'); } };
    const title = document.getElementById('lotteryTitle');
    const sub = document.getElementById('lotterySubtitle');
    const namesEl = document.getElementById('lotteryNames');
    setFont(title, state.fontMainTitle);
    setFont(sub, state.fontSubTitle);
    if (title) title.style.display = (state.showMainTitle !== false) ? '' : 'none';
    if (sub) sub.style.display = (state.showSubTitle !== false) ? '' : 'none';
    const coverTitleEl = document.getElementById('coverTitleDisplay');
    const coverSubEl = document.getElementById('coverSubDisplay');
    if (coverTitleEl) coverTitleEl.style.display = (state.showMainTitle !== false) ? '' : 'none';
    if (coverSubEl) coverSubEl.style.display = (state.showSubTitle !== false) ? '' : 'none';
    document.querySelectorAll('#lotteryWinnersGrid .lottery-name-card-text').forEach(function (el) {
      if (el && state.fontWinnerList) { el.style.font = fontToCss(state.fontWinnerList); el.style.color = '#fff'; }
    });
    const levelEl = document.getElementById('lotteryPrizeLevel');
    const nameEl = document.getElementById('lotteryPrizeName');
    if (levelEl) setFont(levelEl, state.fontPrizeName);
    if (nameEl) setFont(nameEl, state.fontPrizeName);
    const coverTitle = document.getElementById('coverTitleDisplay');
    const coverSub = document.getElementById('coverSubDisplay');
    setFont(coverTitle, state.fontMainTitle);
    setFont(coverSub, state.fontSubTitle);
    const titleLeft = Math.max(0, Math.min(100, state.coverTitleLeft ?? 50));
    const titleTop = Math.max(0, Math.min(100, state.coverTitleTop ?? 35));
    const subLeft = Math.max(0, Math.min(100, state.coverSubLeft ?? 50));
    const subTop = Math.max(0, Math.min(100, state.coverSubTop ?? 70));
    if (coverTitle) {
      coverTitle.style.position = 'absolute';
      coverTitle.style.left = titleLeft + '%';
      coverTitle.style.top = titleTop + '%';
      coverTitle.style.transform = 'translate(-50%, -50%)';
    }
    if (coverSub) {
      coverSub.style.position = 'absolute';
      coverSub.style.left = subLeft + '%';
      coverSub.style.top = subTop + '%';
      coverSub.style.transform = 'translate(-50%, -50%)';
    }
  }

  function updateLotteryUI(options) {
    const opts = options || {};
    const info = document.getElementById('lotteryPrizeInfo');
    const elLevel = document.getElementById('lotteryPrizeLevel');
    const elImg = document.getElementById('lotteryPrizeImg');
    const elImgBox = info ? info.querySelector('.prize-image-box') : null;
    const elName = document.getElementById('lotteryPrizeName');
    const elStats = info ? info.querySelector('.prize-stats') : null;

    if (info && elLevel && elName && elStats) {
      if (pendingTempPrize) {
        const level = pendingTempPrize.name || '临时补奖';
        const total = pendingTempPrize.count || 1;
        elLevel.textContent = level;
        elName.textContent = '临时奖项';
        if (elImg) { elImg.src = ''; elImg.removeAttribute('style'); }
        if (elImgBox) elImgBox.style.display = 'none';
        elStats.innerHTML = '参与人数: <span id="poolCount">' + pool.length + '</span>　名额: <span id="prizeTotal">' + total + '</span>　一次抽取: <span id="drawOnceVal">' + total + '</span>　已抽取: <span id="drawnCount">0</span>　未抽取: <span id="leftCount">' + total + '</span>';
      } else if (afterTempWaitingNext) {
        const nextPrize = getNextPrize();
        const nextName = (nextPrize && nextPrize.name) ? nextPrize.name : '—';
        elLevel.textContent = '待开始';
        elName.textContent = nextName;
        if (elImg) { elImg.src = ''; elImg.removeAttribute('style'); }
        if (elImgBox) elImgBox.style.display = 'none';
        elStats.textContent = '';
      } else {
        const prize = getCurrentPrize();
        const level = prize.name;
        const name = prize.giftName || prize.name;
        const drawn = prize.drawn || 0;
        const left = Math.max(0, (prize.count || 0) - drawn);
        elLevel.textContent = level;
        elName.textContent = name;
        if (elImg && elImgBox) {
          if (prize.showPrizeImage && prize.prizeImage) {
            elImg.src = prize.prizeImage;
            var userH = Math.max(60, prize.prizeImageHeight || 200);
            var vhH = Math.min(700, Math.max(userH, (window.innerHeight || 720) * 0.32));
            elImg.style.maxHeight = vhH + 'px';
            elImgBox.style.display = '';
          } else {
            elImg.src = '';
            elImgBox.style.display = 'none';
          }
        }
        const once = Math.max(1, prize.drawOnce ?? 1);
        elStats.innerHTML = '参与人数: <span id="poolCount">' + pool.length + '</span>　名额: <span id="prizeTotal">' + (prize.count || 0) + '</span>　一次抽取: <span id="drawOnceVal">' + once + '</span>　已抽取: <span id="drawnCount">' + drawn + '</span>　未抽取: <span id="leftCount">' + left + '</span>';
      }
      applyViewStyles();
    }

    const title = document.getElementById('lotteryTitle');
    const sub = document.getElementById('lotterySubtitle');
    if (title) title.textContent = state.mainTitle || '抽奖活动';
    if (sub) sub.textContent = state.subTitle ? '— ' + state.subTitle + ' —' : '— 活动现场 —';
    const grid = document.getElementById('lotteryWinnersGrid');
    if (grid) {
      const prize = getCurrentPrize();
      const cols = (prize && prize.displayCols) ? Math.max(1, parseInt(prize.displayCols, 10) || 1) : 1;
      if (cols <= 1) {
        grid.classList.remove('multi-cols');
        grid.style.removeProperty('--display-cols');
      } else {
        grid.classList.add('multi-cols');
        grid.style.setProperty('--display-cols', String(cols));
      }
    }
    if (opts.namesHint !== undefined) {
      setLotteryNamesHint(opts.namesHint);
    }
  }

  function openSettings() {
    if (state.settingsPassword) {
      const pwd = prompt('请输入设置密码：');
      if (pwd !== state.settingsPassword) {
        if (pwd !== null) alert('密码错误');
        return;
      }
    }
    bindSettingsFromState();
    showView(Views.settings);
  }

  function updateNameListCount() {
    const wrap = document.getElementById('nameListCountWrap');
    const numEl = document.getElementById('nameListCount');
    const n = (state.names || []).length;
    if (numEl) numEl.textContent = n;
    if (wrap) wrap.style.display = '';
  }

  function bindSettingsFromState() {
    const el = (id) => document.getElementById(id);
    if (el('lotteryTypeText')) el('lotteryTypeText').checked = (state.lotteryType || 'text') === 'text';
    if (el('lotteryTypeImage')) el('lotteryTypeImage').checked = (state.lotteryType || 'text') === 'image';
    if (el('mainTitle')) el('mainTitle').value = state.mainTitle || '';
    if (el('subTitle')) el('subTitle').value = state.subTitle || '';
    if (el('showMainTitle')) el('showMainTitle').checked = state.showMainTitle !== false;
    if (el('showSubTitle')) el('showSubTitle').checked = state.showSubTitle !== false;
    if (el('scrollSpeed')) el('scrollSpeed').value = state.scrollSpeed ?? 30;
    if (el('repeatMode')) el('repeatMode').value = state.noRepeat ? 'no-repeat' : 'allow-repeat';
    const list = document.getElementById('prizeList');
    if (list && state.prizes && state.prizes.length) {
      list.innerHTML = state.prizes.map(p => `<li data-id="${p.id}">${p.name}</li>`).join('');
      list.querySelector('li')?.classList.add('active');
      syncPrizeDetailToForm(state.prizes[0]);
    }
    if (el('soundScroll')) el('soundScroll').checked = state.soundScroll !== false;
    if (el('soundWin')) el('soundWin').checked = state.soundWin !== false;
    if (el('resultPageFontSize')) el('resultPageFontSize').value = state.resultPageFontSize ?? 16;
    if (el('resultPageShowPrizeName')) el('resultPageShowPrizeName').checked = state.resultPageShowPrizeName !== false;
    if (el('coverTitle')) el('coverTitle').value = state.coverTitle || '';
    if (el('coverSub')) el('coverSub').value = state.coverSub || '';
    if (el('coverTitleLeft')) el('coverTitleLeft').value = Math.max(0, Math.min(100, state.coverTitleLeft ?? 50));
    if (el('coverTitleTop')) el('coverTitleTop').value = Math.max(0, Math.min(100, state.coverTitleTop ?? 35));
    if (el('coverSubLeft')) el('coverSubLeft').value = Math.max(0, Math.min(100, state.coverSubLeft ?? 50));
    if (el('coverSubTop')) el('coverSubTop').value = Math.max(0, Math.min(100, state.coverSubTop ?? 70));
    if (el('bgMode')) el('bgMode').value = state.bgMode || 'stretch';
    if (el('validatePrizeNames')) el('validatePrizeNames').checked = state.validatePrizeNames === true;
    if (el('musicStartLabel')) el('musicStartLabel').textContent = state.musicStart ? '已设置' : '未设置';
    if (el('musicScrollLabel')) el('musicScrollLabel').textContent = state.musicScroll ? '已设置' : '未设置';
    if (el('musicWinLabel')) el('musicWinLabel').textContent = state.musicWin ? '已设置' : '未设置';
    updateNameListCount();
  }

  function syncPrizeDetailToForm(prize) {
    if (!prize) return;
    const el = (id) => document.getElementById(id);
    if (el('prizeName')) el('prizeName').value = prize.name || '';
    if (el('prizeCount')) el('prizeCount').value = prize.count ?? 1;
    if (el('drawOnce')) el('drawOnce').value = Math.min(50, Math.max(1, prize.drawOnce ?? 1));
    if (el('displayCols')) el('displayCols').value = prize.displayCols ?? 1;
    if (el('marginTop')) el('marginTop').value = prize.marginTop ?? 20;
    if (el('marginLeft')) el('marginLeft').value = prize.marginLeft ?? 20;
    if (el('align')) el('align').value = prize.align || 'center';
    if (el('giftName')) el('giftName').value = prize.giftName || '';
    if (el('showPrizeImage')) el('showPrizeImage').checked = !!prize.showPrizeImage;
    if (el('prizeImageHeight')) el('prizeImageHeight').value = Math.max(60, Math.min(700, prize.prizeImageHeight || 200));
    const preview = document.getElementById('prizeImagePreview');
    const tip = document.getElementById('prizeImageTip');
    if (preview) preview.src = prize.prizeImage || '';
    if (tip) tip.style.display = prize.prizeImage ? 'none' : 'block';
  }

  function saveCurrentPrizeFromForm() {
    const activeLi = document.querySelector('#prizeList li.active');
    if (!activeLi || !state.prizes) return true;
    const id = parseInt(activeLi.dataset.id, 10);
    const p = state.prizes.find(x => x.id === id);
    if (!p) return true;
    const el = (id) => document.getElementById(id);
    const rawName = (el('prizeName') && el('prizeName').value.trim()) || '';
    const newName = rawName || p.name;
    const doValidate = el('validatePrizeNames') ? el('validatePrizeNames').checked : state.validatePrizeNames;
    if (doValidate && newName) {
      const other = state.prizes.find(x => x.id !== id && (x.name || '').trim() === newName);
      if (other) {
        alert('奖项名称「' + newName + '」已存在，请修改或关闭「奖项名称校验」。');
        if (el('prizeName')) el('prizeName').value = p.name || '';
        return false;
      }
    }
    p.name = newName;
    p.count = Math.max(1, parseInt(el('prizeCount')?.value, 10) || 1);
    var drawOnceInput = el('drawOnce');
    var drawOnceRaw = parseInt(drawOnceInput?.value, 10);
    if (drawOnceInput && !isNaN(drawOnceRaw) && drawOnceRaw > 50) drawOnceRaw = 1;
    p.drawOnce = Math.max(1, Math.min(50, Math.min(p.count, (drawOnceRaw || 1))));
    p.displayCols = Math.max(1, parseInt(el('displayCols')?.value, 10) || 1);
    p.marginTop = parseInt(el('marginTop')?.value, 10) || 20;
    p.marginLeft = parseInt(el('marginLeft')?.value, 10) || 20;
    p.align = (el('align') && el('align').value) || 'center';
    p.giftName = (el('giftName') && el('giftName').value.trim()) || p.giftName;
    p.showPrizeImage = !!(el('showPrizeImage') && el('showPrizeImage').checked);
    p.prizeImageHeight = Math.max(60, Math.min(700, parseInt(el('prizeImageHeight')?.value, 10) || 200));
    return true;
  }

  function saveSettingsFromForm() {
    const el = (id) => document.getElementById(id);
    state.lotteryType = (el('lotteryTypeImage') && el('lotteryTypeImage').checked) ? 'image' : 'text';
    state.validatePrizeNames = !!(el('validatePrizeNames') && el('validatePrizeNames').checked);
    state.mainTitle = (el('mainTitle') && el('mainTitle').value.trim()) || state.mainTitle;
    state.subTitle = (el('subTitle') && el('subTitle').value.trim()) || state.subTitle;
    state.showMainTitle = !!(el('showMainTitle') && el('showMainTitle').checked);
    state.showSubTitle = !!(el('showSubTitle') && el('showSubTitle').checked);
    state.scrollSpeed = Math.max(1, Math.min(100, parseInt(el('scrollSpeed')?.value, 10) || 30));
    state.noRepeat = (el('repeatMode') && el('repeatMode').value === 'no-repeat') || false;
    if (saveCurrentPrizeFromForm() === false) return;
    if (el('soundScroll')) state.soundScroll = el('soundScroll').checked;
    if (el('soundWin')) state.soundWin = el('soundWin').checked;
    if (el('resultPageFontSize')) state.resultPageFontSize = Math.max(12, parseInt(el('resultPageFontSize').value, 10) || 16);
    if (el('resultPageShowPrizeName')) state.resultPageShowPrizeName = el('resultPageShowPrizeName').checked;
    if (el('coverTitle')) state.coverTitle = (el('coverTitle').value || '').trim();
    if (el('coverSub')) state.coverSub = (el('coverSub').value || '').trim();
    if (el('coverTitleLeft')) state.coverTitleLeft = Math.max(0, Math.min(100, parseInt(el('coverTitleLeft').value, 10) || 50));
    if (el('coverTitleTop')) state.coverTitleTop = Math.max(0, Math.min(100, parseInt(el('coverTitleTop').value, 10) || 35));
    if (el('coverSubLeft')) state.coverSubLeft = Math.max(0, Math.min(100, parseInt(el('coverSubLeft').value, 10) || 50));
    if (el('coverSubTop')) state.coverSubTop = Math.max(0, Math.min(100, parseInt(el('coverSubTop').value, 10) || 70));
    if (el('bgMode')) state.bgMode = (el('bgMode').value === 'tile' || el('bgMode').value === 'center') ? el('bgMode').value : 'stretch';
    saveState();
  }

  function openLottery() {
    const totalPrizes = getTotalPrizeCount();
    const nameCount = (state.names || []).length;
    if (nameCount < totalPrizes) {
      alert('抽奖人数（' + nameCount + '）不能小于奖品总数量（' + totalPrizes + '），请检查「抽奖名单」或「奖项中奖数量」设置。');
      return;
    }
    stopAnyRolling();
    afterTempWaitingNext = false;
    lastTempWinnerNames = [];
    currentPrizeIndex = 0;
    initPool();
    clearRightPanelCards();
    updateLotteryUI();
    applyViewStyles();
    setLotteryNamesHint('按 回车 或 空格 开始抽奖');
    setBtnStartDrawText('开始抽奖');
    const hintEl = document.getElementById('lotteryControlHint');
    if (hintEl) hintEl.textContent = state.hintText || '按 回车 或 空格 开始/停止';
    showView(Views.lottery);
  }

  function redoLottery() {
    stopAnyRolling();
    state.winners = {};
    state.tempWinners = [];
    pendingTempPrize = null;
    afterTempWaitingNext = false;
    state.prizes.forEach(p => { p.drawn = 0; });
    saveState();
    openLottery();
  }

  function showCover() {
    saveSettingsFromForm(); // 先同步表单到 state，确保 F1 封面使用最新配置
    const t = document.getElementById('coverTitleDisplay');
    const s = document.getElementById('coverSubDisplay');
    if (t) t.textContent = (state.coverTitle || state.mainTitle || '欢迎来到活动现场').trim() || '欢迎来到活动现场';
    if (s) s.textContent = '— ' + ((state.coverSub || state.subTitle || '抽奖即将开始').trim() || '抽奖即将开始') + ' —';
    applyViewStyles();
    showView(Views.cover);
  }

  function showResults() {
    const body = document.getElementById('resultsBody');
    if (!body) return;
    const fs = Math.max(12, state.resultPageFontSize || 16);
    const showPrize = state.resultPageShowPrizeName !== false;
    const fWinner = fontToCss(state.fontWinnerList);
    const cWinner = (state.fontWinnerList && state.fontWinnerList.color) || '#000000';
    const style = `font-size: ${fs}px; color: ${cWinner};${fWinner ? ' font: ' + fWinner + ';' : ''}`;
    const fTitle = state.fontResultPageTitle;
    const cTitle = (fTitle && fTitle.color) || '#ffc107';
    const titleStyle = fTitle ? ('font: ' + fontToCss(fTitle) + '; color: ' + cTitle + ';') : ('font: bold 20px Microsoft YaHei; color: #ffc107;');
    const isImageMode = (state.lotteryType || 'text') === 'image';
    let html = '';
    (state.prizes || []).forEach(prize => {
      const arr = (state.winners && state.winners[prize.id]) || [];
      const title = showPrize ? `${prize.name}（${prize.giftName || ''}）` : prize.name;
      var namesHtml = '';
      if (isImageMode) {
        namesHtml = arr.map(function (n) {
          var url = getImageForName(n);
          if (url) return '<span class="result-winner-item result-winner-with-img"><img src="' + url + '" alt="' + (n || '').replace(/"/g, '&quot;') + '" class="result-winner-img"><span class="result-winner-name" style="' + style + '">' + (n || '').replace(/</g, '&lt;') + '</span></span>';
          return '<span class="result-winner-item" style="' + style + '">' + (n || '').replace(/</g, '&lt;') + '</span>';
        }).join('') || '暂无';
      } else {
        namesHtml = (arr.map(n => '<span>' + (n || '').replace(/</g, '&lt;') + '</span>').join('') || '暂无');
      }
      html += '<div class="result-group"><h3 style="' + titleStyle + '">' + (title || '').replace(/</g, '&lt;') + '</h3><div class="result-names" style="' + (isImageMode ? '' : style) + '">' + namesHtml + '</div></div>';
    });
    if (state.tempWinners && state.tempWinners.length) {
      html += '<div class="result-group result-group-temp"><h3 style="' + titleStyle + '">临时补奖</h3>';
      state.tempWinners.forEach((item, i) => {
        const row = item && item.names ? item : { name: '临时补奖', names: Array.isArray(item) ? item : [] };
        const label = state.tempWinners.length > 1 ? `第${i + 1}轮 · ${row.name}` : row.name;
        var namesPart = '';
        if (isImageMode && (row.names || []).length) {
          namesPart = (row.names || []).map(function (n) {
            var url = getImageForName(n);
            if (url) return '<span class="result-winner-item result-winner-with-img"><img src="' + url + '" alt="' + (n || '').replace(/"/g, '&quot;') + '" class="result-winner-img"><span class="result-winner-name" style="' + style + '">' + (n || '').replace(/</g, '&lt;') + '</span></span>';
            return '<span class="result-winner-item" style="' + style + '">' + (n || '').replace(/</g, '&lt;') + '</span>';
          }).join('');
        } else {
          namesPart = (row.names || []).map(n => '<span>' + (n || '').replace(/</g, '&lt;') + '</span>').join('');
        }
        html += '<div class="result-temp-round"><strong>' + label + '</strong> <span class="result-names" style="' + (isImageMode ? '' : style) + '">' + namesPart + '</span></div>';
      });
      html += '</div>';
    }
    applyResultPageBg();
    body.innerHTML = '<div class="results-scroll-viewport"><div class="results-scroll-track"><div class="results-scroll-part">' + html + '</div><div class="results-scroll-part">' + html + '</div></div></div>';
    showView(Views.results);
  }

  function openTempPrizeDlg() {
    const view = document.querySelector('.view.active');
    if (!view || view.id !== Views.lottery) return;
    if (pendingTempPrize) return; // 已在临时抽奖中不再弹窗
    const dlg = document.getElementById('dlg-temp-prize');
    const nameInput = document.getElementById('tempPrizeName');
    const countInput = document.getElementById('tempPrizeCount');
    const hint = document.getElementById('tempPrizePoolHint');
    if (hint) hint.textContent = '当前奖池剩余 ' + pool.length + ' 人';
    if (nameInput) nameInput.value = '临时补奖';
    if (countInput) { countInput.value = '1'; countInput.max = String(Math.max(1, pool.length)); }
    dlg?.showModal();
  }

  function startTempPrizeFromDlg() {
    const nameInput = document.getElementById('tempPrizeName');
    const countInput = document.getElementById('tempPrizeCount');
    const name = (nameInput && nameInput.value.trim()) || '临时补奖';
    const n = Math.max(1, parseInt(countInput?.value, 10) || 1);
    if (pool.length <= 0) {
      alert('当前奖池无人可抽，请检查名单或出奖方式。');
      return;
    }
    const take = Math.min(n, pool.length);
    pendingTempPrize = { name: name, count: take };
    document.getElementById('dlg-temp-prize')?.close();
    clearRightPanelCards();
    updateLotteryUI();
    setLotteryNamesHint('');
    setBtnStartDrawText('按 空格 开始抽奖');
  }

  function exitLottery() {
    if (typeof window.close === 'function') window.close();
    else showView(Views.main);
  }

  function handleKeyDown(e) {
    const view = document.querySelector('.view.active');
    if (!view) return;
    const id = view.id;

    if (e.key === 'Escape') {
      var openDlg = document.querySelector('dialog[open]');
      if (openDlg) {
        openDlg.close();
        e.preventDefault();
        return;
      }
      if (id === Views.settings) { saveSettingsFromForm(); showView(Views.main); e.preventDefault(); }
      else if (id === Views.results) { showView(Views.main); e.preventDefault(); }
      else if (id === Views.cover) { showView(Views.main); e.preventDefault(); }
      else if (id === Views.lottery) {
        if (isRolling) {
          stopAnyRolling();
          e.preventDefault();
          return;
        }
        stopAnyRolling();
        pauseStartMusic();
        showView(Views.main);
        e.preventDefault();
      }
      return;
    }

    if (id === Views.lottery) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (afterTempWaitingNext) {
          afterTempWaitingNext = false;
          lastTempWinnerNames = [];
          currentPrizeIndex = Math.min(currentPrizeIndex + 1, (state.prizes && state.prizes.length) ? state.prizes.length - 1 : 0);
          clearRightPanelCards();
          updateLotteryUI();
          setLotteryNamesHint('按 空格 开始抽奖');
          setBtnStartDrawText('开始抽奖');
          const h = document.getElementById('lotteryControlHint');
          if (h) h.textContent = state.hintText || '按 回车 或 空格 开始/停止';
          return;
        }
        if (!isRolling && !pendingTempPrize) {
          const p = getCurrentPrize();
          if (p && (p.drawn || 0) >= (p.count || 0)) {
            advancePrizeOrEnd();
            return;
          }
        }
        if (isRolling) stopRolling(); else startRolling();
      }
    }

    if (e.key === 'F1') { e.preventDefault(); showCover(); }
    if (e.key === 'F8') { e.preventDefault(); showResults(); }
    if (e.key === 'F4') { e.preventDefault(); if (id === Views.lottery) openTempPrizeDlg(); }
  }

  function initTabs() {
    document.querySelectorAll('.settings-tabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        saveSettingsFromForm();
        document.querySelectorAll('.settings-tabs .tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById('panel-' + btn.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });
  }

  function syncPrizeNameToList() {
    const list = document.getElementById('prizeList');
    const nameInput = document.getElementById('prizeName');
    if (!list || !nameInput) return;
    const active = list.querySelector('li.active');
    if (!active) return;
    const id = parseInt(active.dataset.id, 10);
    const p = (state.prizes || []).find(x => x.id === id);
    if (!p) return;
    const v = nameInput.value.trim();
    active.textContent = v || p.name || '新奖项';
    p.name = v || p.name;
  }

  function initPrizeList() {
    const list = document.getElementById('prizeList');
    if (!list) return;
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li || li.classList.contains('active')) return;
      if (saveCurrentPrizeFromForm() === false) return;
      saveState();
      list.querySelectorAll('li').forEach(l => l.classList.remove('active'));
      li.classList.add('active');
      const id = parseInt(li.dataset.id, 10);
      const p = (state.prizes || []).find(x => x.id === id);
      syncPrizeDetailToForm(p);
    });
    const nameInput = document.getElementById('prizeName');
    if (nameInput) nameInput.addEventListener('input', () => { syncPrizeNameToList(); saveState(); });
    if (nameInput) nameInput.addEventListener('change', () => { syncPrizeNameToList(); saveState(); });
    var drawOnceEl = document.getElementById('drawOnce');
    if (drawOnceEl) {
      drawOnceEl.addEventListener('focus', function () {
        var activeLi = document.querySelector('#prizeList li.active');
        if (activeLi) drawOnceEditingPrizeId = parseInt(activeLi.dataset.id, 10);
      });
      drawOnceEl.addEventListener('blur', function () {
        // 在任意其它逻辑之前固定“本次要更新的奖项 id”，避免事件顺序导致误改其它奖项
        var targetId = drawOnceEditingPrizeId != null ? drawOnceEditingPrizeId : (function () {
          var li = document.querySelector('#prizeList li.active');
          return li ? parseInt(li.dataset.id, 10) : null;
        })();
        var v = parseInt(this.value, 10);
        if (!isNaN(v) && v > 50) {
          alert('一次抽取数最多为50，已恢复为1。');
          this.value = '1';
          if (targetId != null && state.prizes) {
            var p = state.prizes.find(function (x) { return x.id === targetId; });
            if (p) {
              p.drawOnce = 1;
              saveState();
            }
          }
          drawOnceEditingPrizeId = null;
        }
      });
    }
  }

  function initMainButtons() {
    document.querySelectorAll('.btn-main[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.action;
        if (a === 'settings') openSettings();
        else if (a === 'start') openLottery();
        else if (a === 'redo') redoLottery();
        else if (a === 'exit') exitLottery();
      });
    });
  }

  function initSettingsActions() {
    document.querySelector('[data-action="close-settings"]')?.addEventListener('click', () => {
      saveSettingsFromForm();
      showView(Views.main);
    });
    document.querySelector('[data-action="close-results"]')?.addEventListener('click', () => showView(Views.main));
    document.querySelectorAll('.header-link[data-action="help"]').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('dlg-help')?.showModal(); });
    });
    document.querySelectorAll('.header-link[data-action="pwd"]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const dlg = document.getElementById('dlg-pwd');
        const input = document.getElementById('newPassword');
        if (input) input.value = '';
        dlg?.showModal();
      });
    });
    document.querySelector('[data-action="close-help"]')?.addEventListener('click', () => document.getElementById('dlg-help')?.close());
    document.querySelector('[data-action="close-pwd"]')?.addEventListener('click', () => document.getElementById('dlg-pwd')?.close());
    document.querySelector('[data-action="save-pwd"]')?.addEventListener('click', () => {
      const input = document.getElementById('newPassword');
      state.settingsPassword = (input && input.value.trim()) || '';
      saveState();
      document.getElementById('dlg-pwd')?.close();
      alert(state.settingsPassword ? '密码已设置。' : '已取消密码。');
    });
    document.getElementById('btnFixedPrize')?.addEventListener('click', () => document.getElementById('dlg-fixed-prize-msg')?.showModal());
    document.querySelector('[data-action="close-fixed-prize-msg"]')?.addEventListener('click', () => document.getElementById('dlg-fixed-prize-msg')?.close());
  }

  function initTempPrizeDialog() {
    const dlg = document.getElementById('dlg-temp-prize');
    document.getElementById('btnTempPrize')?.addEventListener('click', openTempPrizeDlg);
    document.getElementById('btnStartDraw')?.addEventListener('click', function () {
      const view = document.querySelector('.view.active');
      if (!view || view.id !== Views.lottery) return;
      if (afterTempWaitingNext) {
        afterTempWaitingNext = false;
        lastTempWinnerNames = [];
        currentPrizeIndex = Math.min(currentPrizeIndex + 1, (state.prizes && state.prizes.length) ? state.prizes.length - 1 : 0);
        clearRightPanelCards();
        updateLotteryUI();
        setLotteryNamesHint('按 空格 开始抽奖');
        setBtnStartDrawText('开始抽奖');
        const h = document.getElementById('lotteryControlHint');
        if (h) h.textContent = state.hintText || '按 回车 或 空格 开始/停止';
        return;
      }
      if (!isRolling && !pendingTempPrize) {
        const p = getCurrentPrize();
        if (p && (p.drawn || 0) >= (p.count || 0)) {
          advancePrizeOrEnd();
          return;
        }
      }
      if (isRolling) stopRolling(); else startRolling();
    });
    document.querySelector('[data-action="close-temp-prize"]')?.addEventListener('click', () => dlg?.close());
    document.querySelector('[data-action="start-temp-prize"]')?.addEventListener('click', startTempPrizeFromDlg);
  }

  let currentFontTarget = null;

  function initFontDialog() {
    const dlg = document.getElementById('dlg-font');
    const titles = { mainTitle: '主标题字体', subTitle: '副标题字体', prizeName: '奖项/奖品名称字体', winnerList: '左侧滚动提示字体', resultPageTitle: '结果页奖项标题字体' };
    document.querySelectorAll('.btn-font[data-font-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFontTarget = btn.dataset.fontTarget;
        const k = currentFontTarget === 'mainTitle' ? 'fontMainTitle' : currentFontTarget === 'subTitle' ? 'fontSubTitle' : currentFontTarget === 'prizeName' ? 'fontPrizeName' : currentFontTarget === 'winnerList' ? 'fontWinnerList' : currentFontTarget === 'resultPageTitle' ? 'fontResultPageTitle' : 'fontMainTitle';
        const f = state[k] || defaultFont();
        document.getElementById('dlgFontTitle').textContent = (titles[currentFontTarget] || '字体') + '设置';
        document.getElementById('fontFamily').value = f.family || 'Microsoft YaHei';
        document.getElementById('fontSize').value = f.size || 24;
        document.getElementById('fontBold').checked = !!f.bold;
        const colorVal = (f.color && /^#[0-9A-Fa-f]{6}$/.test(f.color)) ? f.color : '#000000';
        const colorEl = document.getElementById('fontColor');
        const hexEl = document.getElementById('fontColorHex');
        if (colorEl) colorEl.value = colorVal;
        if (hexEl) hexEl.textContent = colorVal;
        dlg.showModal();
      });
    });
    const fontColorEl = document.getElementById('fontColor');
    const fontColorHexEl = document.getElementById('fontColorHex');
    if (fontColorEl && fontColorHexEl) fontColorEl.addEventListener('input', () => { fontColorHexEl.textContent = fontColorEl.value; });
    document.querySelector('[data-action="close-font"]')?.addEventListener('click', () => dlg.close());
    document.querySelector('[data-action="apply-font"]')?.addEventListener('click', () => {
      if (!currentFontTarget) return;
      const k = currentFontTarget === 'mainTitle' ? 'fontMainTitle' : currentFontTarget === 'subTitle' ? 'fontSubTitle' : currentFontTarget === 'prizeName' ? 'fontPrizeName' : currentFontTarget === 'winnerList' ? 'fontWinnerList' : currentFontTarget === 'resultPageTitle' ? 'fontResultPageTitle' : 'fontMainTitle';
      const colorVal = (document.getElementById('fontColor') && document.getElementById('fontColor').value) || '#000000';
      state[k] = {
        family: document.getElementById('fontFamily').value || 'Microsoft YaHei',
        size: Math.max(12, parseInt(document.getElementById('fontSize').value, 10) || 24),
        bold: !!document.getElementById('fontBold').checked,
        color: /^#[0-9A-Fa-f]{6}$/.test(colorVal) ? colorVal : '#000000'
      };
      saveState();
      applyViewStyles();
      dlg.close();
    });
  }

  function initBgImage() {
    const btn = document.getElementById('btnBg');
    const input = document.getElementById('bgImageInput');
    const modeEl = document.getElementById('bgMode');
    if (btn && input) {
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          var raw = r.result || '';
          compressImageForStorage(raw, 1920, 0.82, function (compressed) {
            state.bgImage = compressed;
            if (!saveState()) {
              alert('存储空间不足，抽奖/封面背景未保存成功。请换一张更小的图片再试。');
            }
            applyViewStyles();
          });
        };
        r.readAsDataURL(f);
        input.value = '';
      });
    }
    if (modeEl) modeEl.addEventListener('change', () => { state.bgMode = modeEl.value || 'stretch'; saveState(); applyViewStyles(); });
    document.getElementById('btnBgReset')?.addEventListener('click', () => {
      state.bgImage = '';
      saveState();
      applyViewStyles();
    });
  }

  function initMainBg() {
    const btn = document.getElementById('btnMainBg');
    const input = document.getElementById('mainBgImageInput');
    if (btn && input) {
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          var raw = r.result || '';
          compressImageForStorage(raw, 1920, 0.82, function (compressed) {
            state.mainBgImage = compressed;
            if (!saveState()) {
              alert('存储空间不足，主页面背景未保存成功。请换一张更小的图片再试。');
            }
            applyMainBg();
          });
        };
        r.readAsDataURL(f);
        input.value = '';
      });
    }
    document.getElementById('btnMainBgReset')?.addEventListener('click', () => {
      state.mainBgImage = '';
      saveState();
      applyMainBg();
    });
    applyMainBg();
  }

  function initCoverBg() {
    const btn = document.getElementById('btnCoverBg');
    const input = document.getElementById('coverBgImageInput');
    if (btn && input) {
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          var raw = r.result || '';
          compressImageForStorage(raw, 1920, 0.82, function (compressed) {
            state.coverBgImage = compressed;
            if (!saveState()) {
              alert('存储空间不足，封面背景未保存成功。请换一张更小的图片再试。');
            }
            applyViewStyles();
          });
        };
        r.readAsDataURL(f);
        input.value = '';
      });
    }
    document.getElementById('btnCoverBgReset')?.addEventListener('click', () => {
      state.coverBgImage = '';
      saveState();
      applyViewStyles();
    });
  }

  function initResultPageBg() {
    const btn = document.getElementById('btnResultPageBg');
    const input = document.getElementById('resultPageBgImageInput');
    if (btn && input) {
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          var raw = r.result || '';
          compressImageForStorage(raw, 1920, 0.82, function (compressed) {
            state.resultPageBgImage = compressed;
            if (!saveState()) {
              alert('存储空间不足，抽奖结果页背景未保存成功。请换一张更小的图片再试。');
            }
            applyResultPageBg();
          });
        };
        r.readAsDataURL(f);
        input.value = '';
      });
    }
    document.getElementById('btnResultPageBgReset')?.addEventListener('click', () => {
      state.resultPageBgImage = '';
      saveState();
      applyResultPageBg();
    });
    applyResultPageBg();
  }

  function refreshPrizeListDOM() {
    const list = document.getElementById('prizeList');
    if (!list || !state.prizes) return;
    const activeId = (list.querySelector('li.active') || {}).dataset?.id;
    list.innerHTML = state.prizes.map(p => `<li data-id="${p.id}"${p.id === parseInt(activeId, 10) ? ' class="active"' : ''}>${p.name}</li>`).join('');
    const sel = list.querySelector('li.active') || list.querySelector('li');
    if (sel) {
      list.querySelectorAll('li').forEach(l => l.classList.remove('active'));
      sel.classList.add('active');
      const p = state.prizes.find(x => x.id === parseInt(sel.dataset.id, 10));
      syncPrizeDetailToForm(p);
    }
  }

  function initPrizeToolbar() {
    const list = document.getElementById('prizeList');
    if (!list) return;
    list.closest('.prize-list-panel')?.querySelectorAll('.toolbar [data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (saveCurrentPrizeFromForm() === false) return;
        const act = btn.dataset.action;
        const idx = state.prizes.findIndex(p => p.id === parseInt((list.querySelector('li.active') || {}).dataset?.id, 10));
        if (act === 'prize-add') {
          const maxId = state.prizes.length ? Math.max(...state.prizes.map(p => p.id)) : 0;
          state.prizes.push({ id: maxId + 1, name: '新奖项', giftName: '', count: 1, drawn: 0, drawOnce: 1, displayCols: 1, marginTop: 20, marginLeft: 20, align: 'center', prizeImage: '', showPrizeImage: false, prizeImageHeight: 200 });
          refreshPrizeListDOM();
          const lastLi = list.querySelector('li:last-child');
          if (lastLi) { list.querySelectorAll('li').forEach(l => l.classList.remove('active')); lastLi.classList.add('active'); syncPrizeDetailToForm(state.prizes[state.prizes.length - 1]); }
        } else if (act === 'prize-remove' && state.prizes.length > 1 && idx >= 0) {
          const removedId = state.prizes[idx].id;
          state.prizes.splice(idx, 1);
          delete state.winners[removedId];
          refreshPrizeListDOM();
        } else if (act === 'prize-up' && idx > 0) {
          [state.prizes[idx - 1], state.prizes[idx]] = [state.prizes[idx], state.prizes[idx - 1]];
          refreshPrizeListDOM();
        } else if (act === 'prize-down' && idx >= 0 && idx < state.prizes.length - 1) {
          [state.prizes[idx], state.prizes[idx + 1]] = [state.prizes[idx + 1], state.prizes[idx]];
          refreshPrizeListDOM();
        }
        saveState();
      });
    });
  }

  function initPrizeImageUpload() {
    const placeholder = document.getElementById('prizeImagePlaceholder');
    const input = document.getElementById('prizeImageInput');
    if (!placeholder || !input) return;
    placeholder.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const activeLi = document.querySelector('#prizeList li.active');
      if (!activeLi || !state.prizes) return;
      const p = state.prizes.find(x => x.id === parseInt(activeLi.dataset.id, 10));
      if (!p) return;
      const r = new FileReader();
      r.onload = () => {
        p.prizeImage = r.result || '';
        const preview = document.getElementById('prizeImagePreview');
        const tip = document.getElementById('prizeImageTip');
        if (preview) preview.src = p.prizeImage;
        if (tip) tip.style.display = p.prizeImage ? 'none' : 'block';
        saveState();
      };
      r.readAsDataURL(f);
      input.value = '';
    });
  }

  function openNameListDialog() {
    const dlg = document.getElementById('dlg-name-list');
    const text = document.getElementById('nameListText');
    if (text) text.value = (state.names || []).join('\n');
    var imgBlock = document.getElementById('nameListImageBlock');
    var imgCountEl = document.getElementById('nameListImagesCount');
    var isImageMode = !!(document.getElementById('lotteryTypeImage') && document.getElementById('lotteryTypeImage').checked);
    if (imgBlock) imgBlock.style.display = isImageMode ? '' : 'none';
    if (imgCountEl) {
      var n = (state.names || []).length;
      imgCountEl.textContent = n ? '已录入 ' + n + ' 人（来自图片）' : '';
    }
    dlg?.showModal();
  }

  function initNameListDialog() {
    const dlg = document.getElementById('dlg-name-list');
    const text = document.getElementById('nameListText');
    const openBtn = document.getElementById('btnNameList');
    const viewBtn = document.getElementById('btnViewNameList');
    openBtn?.addEventListener('click', openNameListDialog);
    viewBtn?.addEventListener('click', openNameListDialog);
    dlg?.querySelector('[data-action="close-dlg"]')?.addEventListener('click', () => dlg.close());
    dlg?.querySelector('[data-action="clear-names"]')?.addEventListener('click', () => {
      if (!confirm('确定要清除全部抽奖名单吗？清除后需重新录入或导入。')) return;
      state.names = [];
      if (text) text.value = '';
      saveState();
      updateNameListCount();
    });
    dlg?.querySelector('[data-action="save-names"]')?.addEventListener('click', () => {
      const raw = (text && text.value) || '';
      state.names = raw.split(/[\r\n]+/).map(s => s.trim()).filter(Boolean);
      if (state.names.length === 0) state.names = defaultState.names.slice();
      if (!state.nameImages) state.nameImages = [];
      while (state.nameImages.length > state.names.length) state.nameImages.pop();
      while (state.nameImages.length < state.names.length) state.nameImages.push('');
      saveState();
      updateNameListCount();
      dlg.close();
    });
    var btnImages = document.getElementById('btnNameListImages');
    var inputImages = document.getElementById('nameListImagesInput');
    var imgCountEl = document.getElementById('nameListImagesCount');
    var btnClearImages = document.getElementById('btnClearNameImages');
    if (btnClearImages && imgCountEl) {
      btnClearImages.addEventListener('click', function () {
        if (!confirm('确定要清空人员图片与名单吗？（图片抽奖的名单来自上传的图片）')) return;
        state.nameImages = [];
        state.names = [];
        if (text) text.value = '';
        saveState();
        updateNameListCount();
        imgCountEl.textContent = '';
      });
    }
    if (btnImages && inputImages) {
      btnImages.addEventListener('click', () => inputImages.click());
      inputImages.addEventListener('change', function () {
        var files = this.files && [].slice.call(this.files);
        this.value = '';
        if (!files || !files.length) return;
        function getBaseName(fname) {
          return (fname || '').replace(/\.[^/.]+$/, '').trim();
        }
        state.names = [];
        state.nameImages = [];
        var idx = 0;
        function readNext() {
          if (idx >= files.length) {
            if (text) text.value = (state.names || []).join('\n');
            saveState();
            updateNameListCount();
            if (imgCountEl) imgCountEl.textContent = '已录入 ' + (state.names || []).length + ' 人（来自图片）';
            return;
          }
          var f = files[idx];
          var baseName = getBaseName(f.name);
          if (!baseName) {
            idx++;
            readNext();
            return;
          }
          var r = new FileReader();
          r.onload = function () {
            state.names.push(baseName);
            state.nameImages.push(r.result || '');
            idx++;
            readNext();
          };
          r.readAsDataURL(f);
        }
        readNext();
      });
    }
    dlg?.querySelector('[data-action="import-names"]')?.addEventListener('click', () => {
      const applyNames = (list) => {
        if (list && list.length) {
          state.names = list;
          if (text) text.value = state.names.join('\n');
          saveState();
          updateNameListCount();
        }
      };
      if (typeof window.lotteryAPI !== 'undefined' && window.lotteryAPI.importNamesFromFile) {
        window.lotteryAPI.importNamesFromFile().then(function (res) {
          if (res && res.names) applyNames(res.names);
          if (res && res.error) alert('导入失败：' + res.error);
        }).catch(function (e) {
          alert('导入失败：' + (e && e.message ? e.message : '未知错误'));
        });
        return;
      }
      const nameHeaders = ['姓名', '名字', '名称', '人员姓名', '员工姓名', '名单', '姓名列', '参与人', '候选人', '人员', '人员名单', '中奖名单', '抽奖名单', '员工', '员工姓名'];
      function findNameCol(rows) {
        if (!rows || rows.length === 0) return { col: -1, headerRow: 0 };
        var normalize = function (s) { return (s != null ? String(s).trim().replace(/\s+/g, '') : ''); };
        var isName = function (cell) {
          var n = normalize(cell);
          return n && nameHeaders.some(function (h) { return n === h || n.indexOf(h) !== -1; });
        };
        for (var r = 0; r < Math.min(3, rows.length); r++) {
          var row = rows[r];
          var arr = Array.isArray(row) ? row : [row];
          for (var c = 0; c < arr.length; c++) {
            if (isName(arr[c])) return { col: c, headerRow: r };
          }
        }
        return { col: -1, headerRow: 0 };
      }
      function parseExcelInPage(buf, cb) {
        if (typeof XLSX === 'undefined') {
          cb(null);
          return;
        }
        try {
          var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
          var sn = wb.SheetNames[0];
          if (!sn) { cb([]); return; }
          var ws = wb.Sheets[sn];
          var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          var out = findNameCol(rows);
          var names = [];
          if (out.col >= 0) {
            for (var i = out.headerRow + 1; i < rows.length; i++) {
              var row = rows[i];
              var arr = Array.isArray(row) ? row : [row];
              var v = arr[out.col] != null ? String(arr[out.col]).trim() : '';
              if (v) names.push(v);
            }
          } else {
            for (var j = 0; j < rows.length; j++) {
              var r = rows[j];
              var a = Array.isArray(r) ? r : [r];
              for (var k = 0; k < a.length; k++) {
                var val = a[k] != null ? String(a[k]).trim() : '';
                if (val) names.push(val);
              }
            }
          }
          cb(names);
        } catch (e) {
          cb(null);
        }
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.csv,.xlsx,.xls';
      input.onchange = () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const name = (f.name || '').toLowerCase();
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
          var reader = new FileReader();
          reader.onload = function () {
            parseExcelInPage(reader.result, function (names) {
              if (names) {
                applyNames(names);
              } else {
                alert('无法解析该 Excel 文件。请完全退出程序后重新打开再试，或改用 .txt / .csv 文件。');
              }
            });
          };
          reader.readAsArrayBuffer(f);
          return;
        }
        const r = new FileReader();
        r.onload = () => {
          const s = (r.result || '').toString();
          const lines = s.split(/[\r\n]+/).map(x => x.trim()).filter(Boolean);
          applyNames(lines.length ? lines : null);
        };
        r.readAsText(f, 'utf-8');
      };
      input.click();
    });
  }

  function initMusicUpload() {
    const el = (id) => document.getElementById(id);
    const bindMusic = (inputId, btnId, clearId, labelId, stateKey) => {
      const input = el(inputId);
      const btn = el(btnId);
      const clearBtn = el(clearId);
      const label = el(labelId);
      if (!input || !btn || !label) return;
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          state[stateKey] = r.result || '';
          if (label) label.textContent = f.name || '已设置';
          saveState();
        };
        r.readAsDataURL(f);
        input.value = '';
      });
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          state[stateKey] = '';
          if (label) label.textContent = '未设置';
          saveState();
        });
      }
    };
    bindMusic('musicStartInput', 'btnMusicStart', 'btnMusicStartClear', 'musicStartLabel', 'musicStart');
    bindMusic('musicScrollInput', 'btnMusicScroll', 'btnMusicScrollClear', 'musicScrollLabel', 'musicScroll');
    bindMusic('musicWinInput', 'btnMusicWin', 'btnMusicWinClear', 'musicWinLabel', 'musicWin');
  }

  function updateMusicLabels() {
    var el = function (id) { return document.getElementById(id); };
    if (el('musicStartLabel')) el('musicStartLabel').textContent = state.musicStart ? '已设置' : '未设置';
    if (el('musicScrollLabel')) el('musicScrollLabel').textContent = state.musicScroll ? '已设置' : '未设置';
    if (el('musicWinLabel')) el('musicWinLabel').textContent = state.musicWin ? '已设置' : '未设置';
  }

  function init() {
    initTabs();
    initPrizeList();
    initPrizeToolbar();
    initMainButtons();
    initSettingsActions();
    initTempPrizeDialog();
    initFontDialog();
    initBgImage();
    initMainBg();
    initCoverBg();
    initResultPageBg();
    initPrizeImageUpload();
    initNameListDialog();
    initMusicUpload();
    initLotteryDrag();
    document.addEventListener('keydown', handleKeyDown);
    showView(Views.main);
    loadMusicFromIndexedDB().then(function (data) {
      if (data && (data.musicStart || data.musicScroll || data.musicWin)) {
        if (data.musicStart) state.musicStart = data.musicStart;
        if (data.musicScroll) state.musicScroll = data.musicScroll;
        if (data.musicWin) state.musicWin = data.musicWin;
        updateMusicLabels();
      }
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
