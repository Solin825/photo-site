/* =========================================================
   Solin · Personal Site — interactions

   目录
   00 Helpers     滚动 / 尺寸事件统一派发
   01 Header      导航栏滚动态
   02 Reveal      滚动入场
   03 Menu        移动端全屏菜单
   04 Footer      年份
   05 Hero        首页封面轮播
   06 ScrollHint  首页向下箭头
   07 Aurora      极光夜空背景（WebGL，非首页）
   08 Cursor      自定义光标（遁光光点）
   09 Lightbox    照片墙灯箱（缩放 / 左右切换 / 参数行）
   10 Swatch      色谱点击复制
   11 ToTop       回到顶部按钮
   12 Tilt        缩略图 3D 倾斜
   13 FakeScroll  悬浮滚动条
   14 Books       书单 / 动画 手风琴
   15 GyjRef      고윤정 外链子菜单
   16 Intro       门页 + 星流穿越
   17 Transition  页面转场

   整站脚本集中在一个 IIFE 内，每段都先取元素再判断（元素不存在就跳过），
   所以三个页面共用同一份 main.js，不需要按页拆文件。
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 00 Helpers：滚动 / 尺寸订阅 ----------
     多个区块都要读 scrollY 与窗口尺寸，这里合并成一次监听 + 一帧一次派发，
     既避免同一帧里重复触发回调，也让各段逻辑互不干扰。 */
  const scrollFns = [];
  const onScroll = (fn, immediate = true) => {
    scrollFns.push(fn);
    if (immediate) fn(); // 订阅时先跑一次，保证首屏状态正确
  };
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollFns.forEach((fn) => fn());
      scrollQueued = false;
    });
  }, { passive: true });

  const resizeFns = [];
  const onResize = (fn) => resizeFns.push(fn);
  window.addEventListener('resize', () => { resizeFns.forEach((fn) => fn()); }, { passive: true });

  /* ---------- 01 Header：下滑后加毛玻璃底 ---------- */
  const header = document.querySelector('.site-header');
  onScroll(() => header?.classList.toggle('is-scrolled', window.scrollY > 24));

  /* ---------- 02 Reveal：进入视口后淡入上移，只播一次 ---------- */
  const revealTargets = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  }

  /* ---------- 03 Menu：移动端全屏菜单（Esc / 点导航后关闭） ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('nav');

  const closeMenu = () => {
    nav?.classList.remove('is-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
  };

  menuBtn?.addEventListener('click', () => {
    const open = nav?.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(!!open));
    body.classList.toggle('menu-open', !!open);
    /* 不再用 body.style.overflow 锁滚动：那会让整篇文档重排一次，
       页面滑到深处时展开菜单就会卡一下。全屏菜单自己吃手势（见 CSS 的 touch-action） */
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- 04 Footer：年份自动填当年 ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 05 Hero：首页封面轮播（日出 / 桥，每 10 秒淡入淡出） ----------
     两层图叠放靠 .is-on 切 opacity，CSS 里做 4s 过渡，所以这里只切类名。 */
  const heroLayers = document.querySelectorAll('.hero__photo');
  if (heroLayers.length > 1 && !reduced) {
    let heroIdx = 0;
    const HERO_INTERVAL = 10000; // 每张停留 10 秒
    setInterval(() => {
      if (document.hidden) return; // 页面不可见时不切，回来自动继续
      heroLayers[heroIdx].classList.remove('is-on');
      heroIdx = (heroIdx + 1) % heroLayers.length;
      heroLayers[heroIdx].classList.add('is-on');
    }, HERO_INTERVAL);
  }

  /* ---------- 06 ScrollHint：首页向下箭头（点击滚到第二屏，下滑淡出） ---------- */
  const scrollHint = document.getElementById('scrollHint');
  const whySection = document.getElementById('why');
  scrollHint?.addEventListener('click', () => {
    whySection?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  if (scrollHint) {
    onScroll(() => scrollHint.classList.toggle('is-hidden', window.scrollY > 140));
  }

  /* ---------- 07 Aurora：斜向极光飘带 + 闪烁星空（WebGL，仅非首页） ----------
     手机端也启用，但走更保守的参数：渲染分辨率降到 0.7、保留绘制缓冲（preserveDrawingBuffer），
     并把横幅的横向坐标按至少 1 展开，避免竖屏窄画布上帘褶退化成几条竖带。
     若某台设备仍然渲染异常，把 auroraEligible 加一条 window.innerWidth >= 820 即可退回 CSS 极光层。 */
  const narrowAurora = window.innerWidth < 820;
  const auroraEligible = !body.classList.contains('is-home');

  if (auroraEligible) {
    const cv = document.createElement('canvas');
    cv.className = 'aurora-canvas';
    cv.setAttribute('aria-hidden', 'true');
    body.appendChild(cv);

    const SCALE = narrowAurora ? 0.7 : 0.8; // 渲染分辨率（0.55 时放大后偏糊，0.8 保留丝状细节）
    const gl = cv.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false,
      /* 安卓整屏合成时，未保留的绘制缓冲会读到半帧，出现横向/竖向黑色撕裂条 */
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    const VS = `attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

    const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform float u_oct;   /* 1 = 桌面（三层噪声），0 = 手机（省一层） */

/* 稳定哈希：不用 sin-dot 哈希，避免低端 GPU 溢出成噪点 */
float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/* 值噪声的 2～3 层叠加，输出 0..1（均值约 0.5）。
   oct = 1 用于桌面（三层），0 用于手机（省掉最细一层，减轻 GPU 负担） */
float fbm(vec2 p, float oct){
  float v = noise(p) * 0.60 + noise(p * 2.03 + 17.3) * 0.30;
  v += oct * noise(p * 4.11 + 39.1) * 0.12;
  return v;
}

/* 一条极光帘幕。
   参考真实极光照片（储卫民）：横向铺开、带弧势（沿大圆走，天然是弧不是直线），
   下缘亮而窄、上沿散成长辉光，帘幕里是一束束竖直的光帘 + 上浮的竖向射线。
   所有起伏都来自随时间漂移的噪声，不用正弦（正弦会在拐点退化成直线）。 */
float curtain(vec2 p, float base, float bow, float thick, float drift, float seed, float oct, out float across){
  float t = u_time * drift;
  /* 每条帘幕自己的漂移方向与速度：避免整片天空朝同一个方向平移 */
  float sg = fract(seed * 0.37) > 0.5 ? 1.0 : -1.0;

  /* 弧势：抛物线（弧顶在画面中间、两端下垂）叠一层很慢的长波起伏 */
  float warp = fbm(vec2(p.x * 0.38 + seed * 2.7 - sg * t * 0.10, seed * 1.9 + sg * t * 0.05), oct) - 0.5;
  float cy = base + bow * p.x * p.x + warp * 0.18;

  float d = p.y - cy;
  float above = max(d, 0.0);
  float below = max(-d, 0.0);

  /* 厚度沿弧长度变化：有的地方摊成整片光幕，有的地方收成一道薄幕 */
  float wr = fbm(vec2(p.x * 0.50 + sg * t * 0.07, seed * 6.1), oct);
  float th = thick * (0.55 + 1.30 * wr);
  float tn = max(th, 1e-4);

  /* 下缘收得紧、上沿略微散开——真实帘幕的截面就是这种不对称 */
  float qd = (below / tn) * (below / tn);
  float qu = (above / tn) * (above / tn);
  float coreD = exp(-qd * 3.40);
  float coreU = exp(-qu * 2.10);
  float uu = above / (tn * 1.9);
  float haloU = exp(-uu * uu);

  /* 竖向光帘：整束竖直、宽窄不一，沿弧方向缓慢流过（方向随种子不同）。
     两频噪声相乘：束宽忽宽忽窄，不会是一排等距的条纹 */
  float b1 = fbm(vec2(p.x * 11.0 + seed * 9.0 - sg * t * 0.28, seed * 4.3), oct);
  float b2 = noise(vec2(p.x * 29.0 + seed * 15.0 + sg * t * 0.20, seed * 7.1));
  /* gate：一条帘幕里只有若干段明显分束，其余段落糊成整片光——避免一排等距条纹 */
  float gate = 0.30 + 0.70 * fbm(vec2(p.x * 3.10 + sg * t * 0.10, seed * 10.5), oct);
  float beams = gate * (0.15 + 0.85 * pow(b1 * (0.55 + 0.45 * b2), 1.6));

  /* 上浮的竖向射线：位置随机、速度各不相同，越往上越淡 */
  float rays = pow(noise(vec2(p.x * 33.0 + seed * 12.0 - sg * t * 0.14, seed * 2.5 - sg * t * 0.16)), 2.0);
  float rr = above / (tn * 3.0);
  float rayFade = exp(-rr * rr);

  /* 亮的部分只在帘幕本体里（按竖向光帘分束），外围辉光保持平滑、不再竖着分条 */
  float v = (coreU * 0.34 + coreD * 0.86) * beams + haloU * 0.10 + rayFade * 0.16 * rays;

  /* 缓慢呼吸 + 中尺度断带：整条帘幕时强时弱，某些段落会明显变暗、断开 */
  float breath = 0.30 + 0.70 * fbm(vec2(p.x * 0.35 + sg * t * 0.15, seed * 3.3), oct);
  float patch = 0.45 + 0.55 * fbm(vec2(p.x * 2.60 - sg * t * 0.25, seed * 8.9), oct);
  v *= breath * patch;

  across = clamp((d / tn) * 0.5 + 0.5, 0.0, 1.0);
  return v;
}

/* 带内配色：下缘绿 → 中部青 → 上缘极淡的紫（真实极光的垂直色阶） */
vec3 bandColor(float across){
  vec3 c = mix(vec3(0.20, 0.92, 0.54), vec3(0.14, 0.68, 0.76), smoothstep(0.34, 0.78, across));
  c = mix(c, vec3(0.40, 0.34, 0.78), smoothstep(0.82, 1.0, across) * 0.55);
  return c;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float asp = u_res.x / u_res.y;
  vec2 p = vec2((uv.x - 0.5) * asp, 0.5 - uv.y);  /* 中心为原点，y 向上 */
  /* 竖屏画布很窄：横幅的横向跨度至少按 1.0 计，否则帘褶只铺满几个格子，会退化成几条竖带 */
  vec2 rp = vec2((uv.x - 0.5) * max(asp, 1.0), 0.5 - uv.y);
  float g = uv.y;                                 /* 0 = 天顶，1 = 地平线 */
  float t = u_time;

  /* ---------- 夜空：深蓝，越靠地平线越泛一点青 ---------- */
  vec3 sky = mix(vec3(0.012, 0.022, 0.060), vec3(0.024, 0.055, 0.115), smoothstep(0.0, 0.58, g));
  sky = mix(sky, vec3(0.055, 0.115, 0.150), smoothstep(0.52, 0.98, g));
  sky += vec3(0.012, 0.050, 0.046) * pow(smoothstep(0.28, 1.0, g), 2.2);

  /* ---------- 星星：三层密度，各自独立闪烁（相位与频率互不相关） ---------- */
  float stars = 0.0;
  vec2 sp = rot(t * 0.0035) * p;   /* 极慢的周日旋转 */
  for (int i = 0; i < 3; i++) {
    float sc = 150.0 + float(i) * 120.0;
    vec2 gp = sp * sc;
    vec2 cell = floor(gp);
    float h = hash(cell);
    if (h > 0.982) {
      /* 星点在格子里随机偏移，不会排成整齐点阵 */
      vec2 jit = vec2(hash(cell + 17.31), hash(cell + 91.77)) - 0.5;
      vec2 fr = fract(gp) - 0.5 - jit * 0.62;
      float dd = length(fr);

      /* 每颗星自己的相位和频率：有的缓慢呼吸，有的快眨；
         再叠一个不同频率的副波，闪烁既不整齐也不规律 */
      float ph = hash(cell + 41.17) * 6.2831;
      float f1 = 0.30 + 1.85 * hash(cell + 73.31);
      float f2 = 0.55 + 2.60 * hash(cell + 12.53);
      float wave = 0.55 + 0.45 * sin(t * f1 + ph);
      wave *= 0.72 + 0.28 * sin(t * f2 + ph * 2.3);
      float tw = pow(clamp(wave, 0.0, 1.0), 1.9);

      float size = 0.30 - float(i) * 0.055;
      stars += (1.0 - smoothstep(0.0, size, dd)) * (0.10 + 0.90 * tw) * (0.40 + 0.60 * (h - 0.982) * 55.5);
    }
  }
  stars *= (1.0 - smoothstep(0.42, 0.94, g)) * 0.85;
  sky += vec3(0.84, 0.91, 1.0) * stars;

  /* ---------- 极光：一条主帘幕 + 一条更高的淡帘 + 下方一片弥散光，弧势各不相同 ---------- */
  float across;
  vec3 aur = vec3(0.0);
  float v;

  v = curtain(rp, 0.20, -0.28, 0.030, 0.30, 2.3, u_oct, across);
  aur += bandColor(across) * v * 0.95;

  v = curtain(rp, 0.40, -0.10, 0.022, -0.22, 6.1, u_oct, across);
  aur += bandColor(across) * v * 0.28;

  v = curtain(rp, -0.18, 0.22, 0.045, 0.16, 11.7, u_oct, across);
  aur += bandColor(across) * v * 0.08;

  /* 极光主要铺在天顶到中天，越靠近地平线越暗——天空下半部留给夜色 */
  aur *= smoothstep(-0.34, 0.02, p.y);

  /* ---------- 雪地：地平线以下一片极淡的雪光，没有任何山影轮廓 ---------- */
  float ground = smoothstep(0.90, 1.02, g);
  float snowTex = noise(vec2(p.x * 6.0, 4.0)) * 0.5 + 0.5;
  vec3 snowCol = vec3(0.070, 0.105, 0.128) * (0.85 + 0.30 * snowTex);

  vec3 col = sky + aur;
  col = mix(col, snowCol + aur * 0.30, ground * 0.92);  /* 雪面反射一点极光 */

  /* 轻度 tonemap：亮部不糊成死白，保留绿/青的色相 */
  col = col / (1.0 + col * 0.42);

  /* 轻微暗角 */
  float vig = 1.0 - smoothstep(0.55, 1.30, length(vec2((uv.x - 0.5) * asp, uv.y - 0.5)) * 1.10);
  col *= 0.86 + 0.14 * vig;

  /* 抖动，消除天空渐变的色带 */
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}`;

    let uRes = null;
    let uTime = null;
    let t0 = 0;

    const setup = () => {
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.warn('[aurora] shader:', gl.getShaderInfoLog(sh));
          gl.deleteShader(sh);
          return null;
        }
        return sh;
      };

      const vs = compile(gl.VERTEX_SHADER, VS);
      const fs = compile(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return false;

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn('[aurora] link:', gl.getProgramInfoLog(prog));
        return false;
      }
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      uRes = gl.getUniformLocation(prog, 'u_res');
      uTime = gl.getUniformLocation(prog, 'u_time');
      gl.uniform1f(gl.getUniformLocation(prog, 'u_oct'), narrowAurora ? 0 : 1);
      return true;
    };

    /* highp 不支持的 GPU 上，极光细丝和帘褶会退化成条带，宁可不画 */
    const fragHigh = gl && gl.getShaderPrecisionFormat
      ? gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision
      : 0;

    if (gl && fragHigh >= 16 && setup()) {
      body.classList.add('has-aurora');
      const resize = () => {
        const w = Math.max(1, Math.round(window.innerWidth * SCALE));
        const h = Math.max(1, Math.round(window.innerHeight * SCALE));
        if (cv.width !== w || cv.height !== h) {
          cv.width = w;
          cv.height = h;
        }
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      };
      resize();
      onResize(resize);

      const draw = (t) => {
        gl.uniform1f(uTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      if (reduced) {
        draw(9.0);
      } else {
        let last = 0;
        const loop = (ts) => {
          if (!t0) t0 = ts;
          // 浅色主题下画布被 CSS 隐藏、或全屏菜单盖住时，跳过绘制省电（也避免和菜单动画抢 GPU）
          if (cv.offsetWidth > 0 && !body.classList.contains('menu-open') && ts - last > 33) {
            last = ts;
            draw((ts - t0) / 1000);
          }
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    } else {
      cv.remove();
    }
  }
  /* ---------- 08 Cursor：遁光光点 ----------
     光点 + 若干尾巴逐帧插值跟随；位置存 sessionStorage，切页后直接落在原处。 */
  // 记录指针位置，切页后光点直接出现在鼠标所在处（而不是屏幕中间）
  let persistPointer = () => {};
  if (finePointer && !reduced) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.innerHTML = '<span class="cursor__core"></span>';

    const TRAILS = 6;
    const trails = [];
    for (let i = 0; i < TRAILS; i++) {
      const dot = document.createElement('span');
      dot.className = 'cursor__trail';
      const size = 4.6 - i * 0.6;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.opacity = String(0.3 - i * 0.04);
      cursor.appendChild(dot);
      trails.push({ el: dot, x: -100, y: -100 });
    }
    body.appendChild(cursor);
    root.classList.add('cursor-on');

    const core = cursor.querySelector('.cursor__core');
    const pos = { x: -100, y: -100 };
    const target = { x: -100, y: -100 };
    let seen = false;
    let wasOut = false;
    let outTimer = 0;

    // 光点重新出现时直接落到指针当前位置：
    // 否则会从上次离开的位置一路滑过来，看起来像光点“被拉走”
    const snap = () => {
      pos.x = target.x;
      pos.y = target.y;
      trails.forEach((t) => { t.x = pos.x; t.y = pos.y; });
    };

    const show = () => {
      clearTimeout(outTimer);
      if (!seen) {
        seen = true;
        cursor.classList.add('is-on');
        snap();
      } else if (wasOut) {
        wasOut = false;
        snap();
      }
      cursor.classList.remove('is-out');
    };

    // 延迟一瞬再隐藏：快速掠过页面边缘时 mouseleave/mouseenter
    // 交替触发，直接隐藏会让光点在边缘闪烁、回弹
    const hide = () => {
      clearTimeout(outTimer);
      outTimer = setTimeout(() => {
        wasOut = true;
        cursor.classList.add('is-out');
      }, 60);
    };

    const savePointer = () => {
      try {
        sessionStorage.setItem('solin-pointer',
          `${Math.round(target.x)},${Math.round(target.y)}`);
      } catch (e) {}
    };
    persistPointer = savePointer;

    let saveTick = 0;
    window.addEventListener('pointermove', (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      show();
      const now = performance.now();
      if (now - saveTick > 240) { saveTick = now; savePointer(); }
    }, { passive: true });

    document.addEventListener('mouseleave', hide);
    window.addEventListener('blur', hide);
    document.addEventListener('mouseenter', show);
    window.addEventListener('pagehide', savePointer);

    window.addEventListener('pointerdown', (e) => {
      if (!seen) {
        target.x = e.clientX;
        target.y = e.clientY;
        show();
      }
      cursor.classList.add('is-down');
      savePointer();
    });
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));

    document.addEventListener('pointerover', (e) => {
      const hot = e.target.closest('a, button, .shot, .swatch, .books__row');
      cursor.classList.toggle('is-hot', !!hot);
    });

    // 有上一次的位置：直接落在鼠标处；没有则等第一次移动再出现
    let savedPos = null;
    try {
      const s = sessionStorage.getItem('solin-pointer');
      if (s) {
        const [x, y] = s.split(',').map(Number);
        if (Number.isFinite(x) && Number.isFinite(y)) savedPos = { x, y };
      }
    } catch (e) {}
    if (savedPos) {
      seen = true;
      pos.x = target.x = savedPos.x;
      pos.y = target.y = savedPos.y;
      trails.forEach((t) => { t.x = pos.x; t.y = pos.y; });
      cursor.classList.add('is-on');
    }

    const renderCursor = () => {
      if (seen) {
        pos.x += (target.x - pos.x) * 0.35;
        pos.y += (target.y - pos.y) * 0.35;
        core.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

        let prevX = pos.x;
        let prevY = pos.y;
        trails.forEach((t, i) => {
          const k = 0.32 - i * 0.028;
          t.x += (prevX - t.x) * k;
          t.y += (prevY - t.y) * k;
          t.el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) translate(-50%, -50%)`;
          prevX = t.x;
          prevY = t.y;
        });
      }

      requestAnimationFrame(renderCursor);
    };
    requestAnimationFrame(renderCursor);
  }

  /* ---------- 09 Lightbox：照片墙编号 + 灯箱 ----------
     编号写进 data-num 供 CSS ::after 显示；灯箱支持滚轮/滑杆缩放、左右切换。 */
  // CSS 变量里的 url() 会按样式表目录解析，这里统一转成绝对地址再交给灯箱背景
  const absBg = (bg) => String(bg || '').replace(
    /url\((['"]?)([^'")]+)\1\)/g,
    (m, q, u) => {
      try {
        return `url("${new URL(u, document.baseURI).href}")`;
      } catch (e) {
        return m;
      }
    }
  );
  const shots = [...document.querySelectorAll('.shot')];
  shots.forEach((item, i) => {
    item.dataset.num = String(i + 1).padStart(3, '0');
  });

  const lightbox = document.getElementById('lightbox');
  if (lightbox && shots.length) {
    const viewport = document.getElementById('lbViewport');
    const photo = document.getElementById('lbPhoto');
    const bar = document.getElementById('lbBar');
    const thumb = document.getElementById('lbThumb');
    const zoomVal = document.getElementById('lbZoomVal');
    const prevBtn = document.getElementById('lbPrev');
    const nextBtn = document.getElementById('lbNext');
    const closeBtn = document.getElementById('lbClose');

    /* ---- 拍摄参数：桌面显示一行文字（无参数时不显示图标）；
       手机显示「查看拍摄参数」按钮，点开底部参数面板 ---- */
    const exifInline = document.getElementById('lbExifInline');
    const exifTextEl = document.getElementById('lbExif');
    const exifBtn = document.getElementById('lbExifBtn');
    const exifNone = document.getElementById('lbExifNone');
    const sheet = document.getElementById('lbSheet');
    const sheetGrid = document.getElementById('lbSheetGrid');
    const sheetClose = document.getElementById('lbSheetClose');

    const EXIF_FIELDS = [
      ['device', '机身'], ['focal', '焦距'], ['aperture', '光圈'],
      ['shutter', '快门'], ['iso', '感光度'], ['date', '拍摄时间'],
    ];

    // data-exif 的格式是「设备 · 焦距 · 光圈 · 快门 · ISO · 日期」，按特征归位
    const parseExif = (text) => {
      const out = {};
      String(text || '').split('·').map((s) => s.trim()).filter(Boolean).forEach((tok) => {
        if (/^iso/i.test(tok)) out.iso = tok.replace(/^iso/i, 'ISO');
        else if (/^f\//i.test(tok)) out.aperture = tok.toLowerCase();
        else if (/mm$/i.test(tok)) out.focal = tok;
        else if (/^\d+\/\d+\s?s$/i.test(tok) || /^\d+(\.\d+)?\s?s$/i.test(tok)) out.shutter = tok;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(tok)) out.date = tok;
        else if (!out.device) out.device = tok;
      });
      return out;
    };

    const closeSheet = () => {
      if (!sheet) return;
      sheet.classList.remove('is-open');
      exifBtn?.setAttribute('aria-expanded', 'false');
    };

    const fillSheet = (fields) => {
      if (!sheetGrid) return;
      sheetGrid.textContent = '';
      EXIF_FIELDS.forEach(([key, label]) => {
        const value = fields[key];
        if (!value) return;
        const cell = document.createElement('div');
        cell.className = 'lb-sheet__cell';
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        cell.append(dt, dd);
        sheetGrid.appendChild(cell);
      });
    };

    // 有参数：桌面一行文字 + 手机按钮；无参数：只显示「EXIF 已丢失」，不出现任何图标
    const renderMeta = (raw) => {
      const text = String(raw || '').trim();
      const missing = !text || /丢失|lost/i.test(text);
      closeSheet();
      exifInline?.classList.toggle('is-off', missing);
      exifBtn?.classList.toggle('is-off', missing);
      exifNone?.classList.toggle('is-off', !missing);
      if (missing) { fillSheet({}); return; }
      if (exifTextEl) exifTextEl.textContent = text;
      fillSheet(parseExif(text));
    };

    const MIN_Z = 1;
    const MAX_Z = 4;
    const THUMB_W = 26;
    let index = -1;
    let zoom = 1;
    let box = { w: 0, h: 0 };
    let lastFocused = null;

    const fitBox = () => {
      const vw = viewport.clientWidth || 1;
      const vh = viewport.clientHeight || 1;
      const ar = Number(shots[index]?.dataset.ar) || 1.5;
      let w = vw;
      let h = w / ar;
      if (h > vh) { h = vh; w = h * ar; }
      box.w = Math.max(80, w - 2);
      box.h = Math.max(60, h - 2);
    };

    const applyZoom = () => {
      const bw = bar.clientWidth || 200;
      const p = (zoom - MIN_Z) / (MAX_Z - MIN_Z);
      photo.style.width = `${Math.round(box.w * zoom)}px`;
      photo.style.height = `${Math.round(box.h * zoom)}px`;
      zoomVal.textContent = `${Math.round(zoom * 100)}%`;
      thumb.style.left = `${p * (bw - THUMB_W) + THUMB_W / 2}px`;
    };

    // 以视口内某一点为锚点缩放（滚轮用鼠标位置，滚动条用图片中心）
    const setZoomAt = (z, clientX, clientY) => {
      const next = Math.min(MAX_Z, Math.max(MIN_Z, z));
      if (Math.abs(next - zoom) < 0.0005) return;
      const pr = photo.getBoundingClientRect();
      const u = (clientX - pr.left) / zoom;
      const v = (clientY - pr.top) / zoom;
      zoom = next;
      applyZoom();
      const pr2 = photo.getBoundingClientRect();
      viewport.scrollLeft += pr2.left + u * zoom - clientX;
      viewport.scrollTop += pr2.top + v * zoom - clientY;
    };

    const setZoomCenter = (z) => {
      const r = viewport.getBoundingClientRect();
      setZoomAt(z, r.left + r.width / 2, r.top + r.height / 2);
    };

    // 灯箱图预载与缓存：先解码再一次性换图，切图不再闪白/跳动
    const imgCache = new Map();
    const CACHE_MAX = 5; // 3200px 位图单张约 30MB，最多留 5 张已解码图
    const urlOf = (item) => (item?.dataset.src
      ? new URL(item.dataset.src, document.baseURI).href
      : '');
    const keep = (url, im) => {
      imgCache.delete(url);
      imgCache.set(url, im);
      while (imgCache.size > CACHE_MAX) imgCache.delete(imgCache.keys().next().value);
    };
    const prime = (item) => {
      const url = urlOf(item);
      if (!url || imgCache.has(url)) return;
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => keep(url, im);
      im.src = url;
    };

    let renderSeq = 0;
    const render = (i) => {
      index = ((i % shots.length) + shots.length) % shots.length;
      const item = shots[index];
      const url = urlOf(item);
      const seq = ++renderSeq;

      const paint = () => {
        if (seq !== renderSeq) return;
        const bg = url
          ? `url("${url}")`
          : (item.querySelector('.shot__img')?.style.backgroundImage || '');
        photo.style.backgroundImage = bg;
        lightbox.style.setProperty('--lb-bg', absBg(bg));
        renderMeta(item.dataset.exif);
        zoom = MIN_Z;
        fitBox();
        applyZoom();
        viewport.scrollTo({ top: 0, left: 0 });
      };

      // 预取前后各一张：方向键连按时下一张通常已解码好
      prime(shots[(index + 1) % shots.length]);
      prime(shots[(index - 1 + shots.length) % shots.length]);

      if (!url || imgCache.has(url)) { paint(); return; }
      // 未缓存：等图片解码完再换，避免出现空白帧和拉伸的旧图
      const im = new Image();
      im.onload = () => { keep(url, im); paint(); };
      im.onerror = () => paint();
      im.src = url;
    };

    const openBox = (item) => {
      lastFocused = item;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      render(shots.indexOf(item));
      closeBtn?.focus({ preventScroll: true });
    };

    const closeBox = () => {
      if (!lightbox.classList.contains('is-open')) return;
      closeSheet();
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastFocused?.focus({ preventScroll: true });
    };

    shots.forEach((item) => {
      item.addEventListener('click', () => openBox(item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openBox(item);
        }
      });
    });

    // 滚轮缩放：以鼠标所在位置为准
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      setZoomAt(zoom * (e.deltaY > 0 ? 1 / 1.12 : 1.12), e.clientX, e.clientY);
    }, { passive: false });

    /* 手机手势：
       - 单指横向快速滑动 → 上一张 / 下一张（放大状态下让位给平移）
       - 双指捏合 → 缩放，以两指中点为准 */
    let swipe = null;
    let pinch = null;
    const distOf = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length >= 2) {
        swipe = null;
        const [a, b] = [e.touches[0], e.touches[1]];
        pinch = { d: Math.max(1, distOf(a, b)), z: zoom };
        return;
      }
      pinch = null;
      const t = e.touches[0];
      swipe = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length >= 2 && pinch) {
        e.preventDefault(); // 压住浏览器自身的双指缩放，改用图片缩放
        const [a, b] = [e.touches[0], e.touches[1]];
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;
        setZoomAt(pinch.z * (distOf(a, b) / pinch.d), midX, midY);
      }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
      if (!swipe) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipe.x;
      const dy = t.clientY - swipe.y;
      const dt = Date.now() - swipe.t;
      swipe = null;
      if (zoom > 1.02) return; // 放大后滑动是看画面，不切图
      if (dt < 700 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        render(index + (dx < 0 ? 1 : -1));
      }
    });
    viewport.addEventListener('touchcancel', () => { swipe = null; pinch = null; });

    // 照片下方的小滚动条：拖动即是缩放，以图片中心为准
    let sliding = false;
    const zoomFromEvent = (e) => {
      const r = bar.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width)));
      setZoomCenter(MIN_Z + p * (MAX_Z - MIN_Z));
    };
    bar.addEventListener('pointerdown', (e) => {
      sliding = true;
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
      zoomFromEvent(e);
      e.preventDefault();
    });
    bar.addEventListener('pointermove', (e) => { if (sliding) zoomFromEvent(e); });
    const endSlide = (e) => {
      sliding = false;
      try { bar.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    bar.addEventListener('pointerup', endSlide);
    bar.addEventListener('pointercancel', endSlide);

    // 双击在 100% 与 200% 之间切换（以图片中心为准）
    viewport.addEventListener('dblclick', () => setZoomCenter(zoom > 1.2 ? 1 : 2));

    prevBtn?.addEventListener('click', () => render(index - 1));
    nextBtn?.addEventListener('click', () => render(index + 1));
    closeBtn?.addEventListener('click', closeBox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeBox(); });

    // 参数面板：按钮展开/收起，面板内的点击不冒泡到灯箱背景
    exifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = sheet ? sheet.classList.toggle('is-open') : false;
      exifBtn.setAttribute('aria-expanded', String(open));
    });
    sheetClose?.addEventListener('click', (e) => { e.stopPropagation(); closeSheet(); });
    sheet?.addEventListener('click', (e) => e.stopPropagation());

    // 窗口尺寸变化：灯箱开着时按新视口重算基准尺寸，保留当前缩放倍率
    onResize(() => {
      if (!lightbox.classList.contains('is-open')) return;
      const z = zoom;
      fitBox();
      zoom = z;
      applyZoom();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        // 参数面板开着时先收面板，再退出灯箱
        if (sheet && sheet.classList.contains('is-open')) closeSheet();
        else closeBox();
      }
      else if (e.key === 'ArrowLeft') render(index - 1);
      else if (e.key === 'ArrowRight') render(index + 1);
      else if (e.key === '+' || e.key === '=') setZoomCenter(zoom * 1.15);
      else if (e.key === '-') setZoomCenter(zoom / 1.15);
    });
  }

  /* ---------- 10 Swatch：点击色谱复制色号（剪贴板不可用时退回 execCommand） ---------- */
  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('click', async () => {
      const hex = sw.dataset.hex || '';
      try {
        await navigator.clipboard.writeText(hex);
      } catch (e) {
        try {
          const ta = document.createElement('textarea');
          ta.value = hex;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        } catch (e2) {}
      }
      // 无论剪贴板是否可用都给出反馈
      sw.classList.add('is-copied');
      window.setTimeout(() => sw.classList.remove('is-copied'), 1100);
    });
  });

  /* ---------- 11 ToTop：回到顶部按钮（下滑超过 360px 淡入） ---------- */
  const toTop = document.getElementById('toTop');
  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    const toTopVisible = () => {
      toTop.classList.toggle('is-visible', window.scrollY > 360);
    };
    onScroll(toTopVisible);
  }

  /* ---------- 12 Tilt：缩略图随鼠标在 3D 空间轻微转动（指针离开归位） ---------- */
  if (finePointer && !reduced) {
    document.querySelectorAll('.shot').forEach((fig) => {
      const img = fig.querySelector('.shot__img');
      if (!img) return;
      fig.addEventListener('pointermove', (e) => {
        const r = fig.getBoundingClientRect();
        // 归一化到 [-0.5, 0.5]，越靠边缘转角越大
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        img.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
        img.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
        img.style.setProperty('--ts', '1.03');
      });
      fig.addEventListener('pointerleave', () => {
        img.style.setProperty('--rx', '0deg');
        img.style.setProperty('--ry', '0deg');
        img.style.setProperty('--ts', '1');
      });
    });
  }

  /* ---------- 13 FakeScroll：悬浮滚动条（浮在页面右侧，不占布局，可拖动） ---------- */
  if (!window.matchMedia('(max-width: 900px)').matches) {
    const bar = document.createElement('div');
    bar.className = 'fake-scroll';
    const thumb = document.createElement('div');
    thumb.className = 'fake-scroll__thumb';
    bar.appendChild(thumb);
    body.appendChild(bar);

    const viewH = () => window.innerHeight;
    const docH = () => document.documentElement.scrollHeight;
    let thumbH = 0;
    let hideTimer = 0;

    const layout = () => {
      const vh = viewH();
      const dh = docH();
      if (dh <= vh + 4) { bar.classList.remove('is-visible'); return; }
      thumbH = Math.max(44, (vh / dh) * vh);
      const top = (window.scrollY / (dh - vh)) * (vh - thumbH);
      thumb.style.height = `${thumbH}px`;
      thumb.style.transform = `translateY(${Math.max(0, Math.min(vh - thumbH, top))}px)`;
    };

    const showTemporarily = () => {
      if (docH() <= viewH() + 4) return;
      bar.classList.add('is-visible');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!bar.classList.contains('is-dragging')) bar.classList.remove('is-visible');
      }, 2000);
    };

    onScroll(() => { layout(); showTemporarily(); }, false);
    onResize(layout);
    layout();
    window.setTimeout(showTemporarily, 400);

    let dragging = false;
    let startY = 0;
    let startScroll = 0;

    thumb.addEventListener('pointerdown', (e) => {
      dragging = true;
      startY = e.clientY;
      startScroll = window.scrollY;
      bar.classList.add('is-dragging', 'is-visible');
      try { thumb.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    thumb.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const vh = viewH();
      const dh = docH();
      const ratio = (dh - vh) / Math.max(1, vh - thumbH);
      window.scrollTo({ top: startScroll + (e.clientY - startY) * ratio });
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove('is-dragging');
      try { thumb.releasePointerCapture(e.pointerId); } catch (err) {}
      showTemporarily();
    };
    thumb.addEventListener('pointerup', endDrag);
    thumb.addEventListener('pointercancel', endDrag);
  }

  /* ---------- 14 Books：书单 / 动画手风琴（点标题行展开，下方内容整体下移） ---------- */
  document.querySelectorAll('.books li').forEach((li) => {
    const row = li.querySelector('.books__row');
    if (!row) return;
    const toggle = () => {
      const open = li.classList.toggle('is-open');
      row.setAttribute('aria-expanded', String(open));
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  /* ---------- 15 GyjRef：고윤정 外链子菜单（点击展开，点击别处收起） ---------- */
  const gyjRef = document.querySelector('.gyj-ref');
  if (gyjRef) {
    const nameBtn = gyjRef.querySelector('.gyj-ref__name');
    nameBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = gyjRef.classList.toggle('is-open');
      nameBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!gyjRef.contains(e.target)) {
        gyjRef.classList.remove('is-open');
        nameBtn?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 16 Intro：门页（点击进入）→ 星流穿越 → 首页 ---------- */
  const introEl = document.getElementById('intro');
  if (introEl) {
    let played = false;
    try { played = sessionStorage.getItem('solin-intro') === '1'; } catch (e) {}

    if (reduced || played) {
      introEl.style.display = 'none';
    } else {
      body.classList.add('intro-playing');

      const ic = introEl.querySelector('canvas');
      const ictx = ic.getContext('2d');
      const gate = document.getElementById('introGate');
      const IDPR = Math.min(window.devicePixelRatio || 1, 2);
      let iw = 0;
      let ih = 0;

      const iresize = () => {
        iw = window.innerWidth;
        ih = window.innerHeight;
        ic.width = Math.round(iw * IDPR);
        ic.height = Math.round(ih * IDPR);
        ictx.setTransform(IDPR, 0, 0, IDPR, 0, 0);
      };
      iresize();
      onResize(iresize);

      // 星流：第一视角穿越，先加速飞行再缓缓减速悬停
      const newStar = (seed) => ({
        x: (Math.random() - 0.5) * 2.4,
        y: (Math.random() - 0.5) * 1.5,
        z: seed ? Math.random() * 0.92 + 0.08 : 1,
        w: 0.4 + Math.random() * 1.7,
        gold: Math.random() < 0.45,
      });
      const STARS = 420;
      const stars = Array.from({ length: STARS }, () => newStar(true));

      const DUR = 3200;
      const t0 = { v: 0 };
      let flying = false;

      const endIntro = () => {
        introEl.classList.add('is-done');
        try { sessionStorage.setItem('solin-intro', '1'); } catch (e) {}
        window.setTimeout(() => {
          body.classList.remove('intro-playing');
          introEl.style.display = 'none';
        }, 1000);
      };

      const drawIntro = (now) => {
        // rAF 时间戳可能早于脚本 t0，必须夹紧，否则负数 pow 产生 NaN
        const p = Math.max(0, Math.min(1, (now - t0.v) / DUR));
        // 速度曲线：前 58% 加速冲刺，之后长距离缓慢减速，末段近乎悬停
        const speed = p < 0.58
          ? Math.pow(p / 0.58, 1.7)
          : Math.max(0, 1 - Math.pow((p - 0.58) / 0.42, 1.9) * 0.98);
        const smooth = p * p * (3 - 2 * p); // smoothstep，收尾更柔

        ictx.clearRect(0, 0, iw, ih);

        // 中心金色微光，随推进渐亮
        const glowR = Math.min(iw, ih) * (0.18 + smooth * 0.36);
        const glow = ictx.createRadialGradient(iw / 2, ih / 2, 0, iw / 2, ih / 2, glowR);
        glow.addColorStop(0, `rgba(214, 172, 100, ${(0.1 + smooth * 0.18).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(214, 172, 100, 0)');
        ictx.fillStyle = glow;
        ictx.fillRect(0, 0, iw, ih);

        const cx = iw / 2;
        const cy = ih / 2;
        const fov = Math.min(iw, ih) * 0.5;
        const dz = 0.02 * (0.3 + speed * 2.3);

        for (const s of stars) {
          const zPrev = s.z;
          s.z -= dz;
          if (s.z < 0.06) Object.assign(s, newStar(false));

          const proj = (z) => ({
            x: cx + (s.x / z) * fov,
            y: cy + (s.y / z) * fov,
          });
          const a1 = proj(s.z);
          const a2 = proj(Math.max(0.06, zPrev));
          const near = 1 - s.z;
          const alpha = Math.min(0.95, near * 1.05) * (0.5 + speed * 0.5);
          if (alpha <= 0.02) continue;

          ictx.strokeStyle = s.gold
            ? `rgba(232, 192, 122, ${alpha.toFixed(3)})`
            : `rgba(238, 235, 226, ${(alpha * 0.85).toFixed(3)})`;
          ictx.lineWidth = s.w * (0.6 + near * 2.2);
          ictx.lineCap = 'round';
          ictx.beginPath();
          ictx.moveTo(a2.x, a2.y);
          ictx.lineTo(a1.x, a1.y);
          ictx.stroke();
        }

        if (p < 1) requestAnimationFrame(drawIntro);
        else endIntro();
      };

      const start = () => {
        if (flying) return;
        flying = true;
        // 标题在屏幕下方停一会再淡出（不再滑出画面）
        window.setTimeout(() => gate?.classList.add('is-leaving'), 1400);
        window.setTimeout(() => gate?.classList.add('is-hidden'), 2600);
        t0.v = performance.now();
        requestAnimationFrame(drawIntro);
      };

      // 不再需要点击：门页出现后自动播放（点一下仍然能提前跳过）
      const auto = window.setTimeout(start, 800);
      introEl.addEventListener('click', () => { clearTimeout(auto); start(); });
      introEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearTimeout(auto); start(); }
      });
    }
  }

  /* ---------- 17 Transition：失焦 → 模糊 → 聚焦（.veil 遮罩切换页面） ---------- */
  const LEAVE_MS = reduced ? 20 : 430;

  const focusIn = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.add('is-ready');
        window.setTimeout(() => body.classList.remove('is-entering', 'is-ready'), 700);
      });
    });
  };

  if (document.readyState === 'complete') focusIn();
  else window.addEventListener('load', focusIn, { once: true });

  window.setTimeout(() => {
    if (body.classList.contains('is-entering') && !body.classList.contains('is-ready')) {
      body.classList.add('is-ready');
      window.setTimeout(() => body.classList.remove('is-entering', 'is-ready'), 700);
    }
  }, 1600);

  let leaving = false;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link || leaving) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
        href.startsWith('tel:') || /^[a-z]+:\/\//i.test(href)) return;
    e.preventDefault();
    leaving = true;
    persistPointer();
    closeMenu();
    body.classList.remove('is-ready');
    body.classList.add('is-leaving');

    window.setTimeout(() => { window.location.href = href; }, LEAVE_MS);
  }, true);

  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    body.classList.remove('is-leaving', 'is-entering', 'is-ready');
  });
})();
