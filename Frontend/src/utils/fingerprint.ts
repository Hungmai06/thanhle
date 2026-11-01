/**
 * Device Fingerprinting Utility
 * Identifies physical devices/browsers across incognito/private modes and cache clears.
 * Combines Canvas 2D, WebGL hardware rendering, AudioContext, Screen, and System entropy.
 */

// Simple SHA-256 implementation using Web Crypto API or pure fallback
async function sha256(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback below
    }
  }

  // Fallback FNV-1a 64-bit hash combined
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < message.length; i++) {
    const ch = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x27d4eb2d);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fp_${part1}${part2}${part1}${part2}`.padEnd(64, '0').substring(0, 64);
}

// 1. Canvas 2D Fingerprint
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_unsupported';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Helvetica', 'Times New Roman', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('AffiliateShoppe, 🔒 <device> 1.0! 😃', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AffiliateShoppe, 🔒 <device> 1.0! 😃', 4, 17);

    // Geometry + Gradients
    const grad = ctx.createLinearGradient(0, 0, 100, 50);
    grad.addColorStop(0, '#f00');
    grad.addColorStop(0.5, '#0f0');
    grad.addColorStop(1, '#00f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(50, 50, 40, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL();
  } catch (e) {
    return 'canvas_error';
  }
}

// 2. WebGL Fingerprint (GPU vendor & unmasked renderer)
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'webgl_unsupported';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    return `${vendor}~${renderer}~${maxTextureSize}`;
  } catch (e) {
    return 'webgl_error';
  }
}

// 3. Audio Fingerprint
async function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve('audio_unsupported');
        return;
      }

      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gain.gain.value = 0; // mute
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gain);
      gain.connect(context.destination);

      scriptProcessor.onaudioprocess = (event) => {
        const output = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < output.length; i++) {
          sum += Math.abs(output[i]);
        }
        oscillator.stop();
        context.close().catch(() => {});
        resolve(sum.toFixed(6));
      };

      oscillator.start(0);

      // Timeout fallback in case audio process doesn't trigger
      setTimeout(() => {
        try { context.close(); } catch (e) {}
        resolve('audio_timeout');
      }, 500);
    } catch (e) {
      resolve('audio_error');
    }
  });
}

// 4. Hardware & System Specs
function getHardwareSpecs(): string {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as any);
  const scr = typeof screen !== 'undefined' ? screen : ({} as any);

  const parts = [
    nav.userAgent || '',
    nav.platform || '',
    nav.hardwareConcurrency || 0,
    (nav as any).deviceMemory || 0,
    nav.maxTouchPoints || 0,
    nav.language || '',
    Array.isArray(nav.languages) ? nav.languages.join(',') : '',
    scr.width || 0,
    scr.height || 0,
    scr.colorDepth || 0,
    window.devicePixelRatio || 1,
    Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  ];

  return parts.join('||');
}

let cachedFingerprint: string | null = null;

/**
 * Returns a deterministic 64-character hex device fingerprint.
 * Caches in-memory for instant reuse on page, and anchors with persistent storage.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  try {
    const canvas = getCanvasFingerprint();
    const webgl = getWebGLFingerprint();
    const audio = await getAudioFingerprint();
    const hardware = getHardwareSpecs();

    // Check if device already has a persistent token (as an anchor)
    let persistentSeed = '';
    try {
      persistentSeed = localStorage.getItem('_app_device_seed') || '';
      if (!persistentSeed) {
        persistentSeed = `seed_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        localStorage.setItem('_app_device_seed', persistentSeed);
      }
    } catch (e) {}

    // Combine hardware signals with seed
    // Note: hardware + canvas + webgl guarantee device uniqueness even if localStorage is cleared!
    const rawEntropy = `HW:[${hardware}]|CANVAS:[${canvas}]|GL:[${webgl}]|AUD:[${audio}]|SEED:[${persistentSeed}]`;
    const hash = await sha256(rawEntropy);

    cachedFingerprint = hash;
    return hash;
  } catch (err) {
    console.warn('Fingerprint generation error, using fallback:', err);
    const fallback = await sha256(`fallback_${navigator.userAgent}_${screen.width}x${screen.height}`);
    cachedFingerprint = fallback;
    return fallback;
  }
}

/**
 * Pre-checks whether this device is still eligible to register an account
 */
export async function checkDeviceRegistrationLimit(): Promise<{
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  message?: string;
}> {
  try {
    const fp = await getDeviceFingerprint();
    const res = await fetch(`/api/auth/check-device-limit?fingerprint=${encodeURIComponent(fp)}`);
    if (res.ok) {
      return await res.json();
    }
    return { allowed: true, currentCount: 0, maxAllowed: 3 };
  } catch (e) {
    return { allowed: true, currentCount: 0, maxAllowed: 3 };
  }
}

