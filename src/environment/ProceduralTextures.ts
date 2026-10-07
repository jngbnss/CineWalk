import * as THREE from 'three';

/**
 * Canvas-generated textures so worlds look decent with zero downloaded assets.
 * UVs from World.box() are in metres, so `repeat = 1 / tileSizeMetres`.
 * Swap any of these for Poly Haven / ambientCG PBR sets later (README › Assets).
 */

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

let seed = 1337;
function rand(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

export function canvasTexture(size: number, draw: Draw, tileMetres = 1, srgb = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / tileMetres, 1 / tileMetres);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, size: number, count: number, alpha: number, light = true): void {
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * alpha})`;
    const s = 1 + rand() * 2;
    ctx.fillRect(rand() * size, rand() * size, s, s);
  }
}

function veins(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.beginPath();
    let px = x + rand() * w;
    let py = y;
    ctx.moveTo(px, py);
    while (py < y + h) {
      px += (rand() - 0.5) * 18;
      py += 6 + rand() * 10;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Black & white marble checkerboard, 1 m tiles (texture spans 2 m). */
export function marbleChecker(): THREE.CanvasTexture {
  return canvasTexture(
    512,
    (ctx, s) => {
      const h = s / 2;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const white = (i + j) % 2 === 0;
          ctx.fillStyle = white ? '#e9e4da' : '#141414';
          ctx.fillRect(i * h, j * h, h, h);
          veins(ctx, i * h, j * h, h, h, white ? 'rgba(120,110,100,0.35)' : 'rgba(190,170,120,0.25)');
        }
      ctx.strokeStyle = 'rgba(180,150,80,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, s, s);
      ctx.beginPath();
      ctx.moveTo(h, 0);
      ctx.lineTo(h, s);
      ctx.moveTo(0, h);
      ctx.lineTo(s, h);
      ctx.stroke();
    },
    2,
  );
}

export function grass(tint = '#2c4a26'): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 4000, 0.12, true);
      noise(ctx, s, 4000, 0.2, false);
    },
    3,
  );
}

/** Art-deco fan wallpaper — dark emerald with gold fans. */
export function artDeco(): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#10241f';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(212,175,95,0.75)';
      ctx.lineWidth = 2;
      const r = s / 2;
      for (const [cx, cy] of [
        [r, s],
        [0, r],
        [s, r],
      ] as const) {
        for (let k = 1; k <= 4; k++) {
          ctx.beginPath();
          ctx.arc(cx, cy, (r * k) / 4, Math.PI, 2 * Math.PI);
          ctx.stroke();
        }
        for (let a = 0; a <= 6; a++) {
          const ang = Math.PI + (a / 6) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
          ctx.stroke();
        }
      }
    },
    1.2,
  );
}

export function books(): THREE.CanvasTexture {
  const colors = ['#5a1e1e', '#1e3a5a', '#2d4a2a', '#6b4a1e', '#3a2a4a', '#7a6a4a', '#202020'];
  return canvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(0, 0, s, s);
      const rows = 4;
      const rh = s / rows;
      for (let r = 0; r < rows; r++) {
        let x = 4;
        while (x < s - 4) {
          const w = 8 + rand() * 14;
          const h = rh * (0.65 + rand() * 0.25);
          ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
          ctx.fillRect(x, r * rh + rh - h - 6, w - 1, h);
          ctx.fillStyle = 'rgba(212,175,95,0.6)';
          ctx.fillRect(x + 1, r * rh + rh - h + 6, w - 3, 2);
          x += w;
        }
        ctx.fillStyle = '#3d2614';
        ctx.fillRect(0, r * rh + rh - 6, s, 6);
      }
    },
    2,
  );
}

export function wood(base = '#4a2c17'): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.12})`;
        ctx.lineWidth = 1 + rand() * 2;
        const y = rand() * s;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(s * 0.3, y + rand() * 8, s * 0.6, y - rand() * 8, s, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let p = 0; p < 4; p++) ctx.fillRect(0, (p * s) / 4, s, 2);
    },
    1.5,
  );
}

export function concrete(base = '#d9d6d0'): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 3000, 0.06, false);
      noise(ctx, s, 1500, 0.08, true);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.strokeRect(0, 0, s, s);
    },
    3,
  );
}

export function rock(): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#5b5148';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,240,220' : '20,15,10'},${rand() * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(rand() * s, rand() * s, 4 + rand() * 30, 2 + rand() * 8, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    6,
  );
}

/** Dark hex grid for the lab floor; doubles as its emissive map. */
export function hexGrid(): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(70,200,255,0.55)';
      ctx.lineWidth = 1.5;
      const r = s / 8;
      const h = Math.sqrt(3) * r;
      for (let row = -1; row < 6; row++)
        for (let col = -1; col < 6; col++) {
          const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0);
          const cy = row * (h / 2);
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const a = (Math.PI / 3) * k;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            if (k) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
    },
    2,
  );
}

/** Fake holographic UI for screens. */
export function holoScreen(title: string): THREE.CanvasTexture {
  return canvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#02101a';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(80,220,255,0.9)';
      ctx.fillStyle = 'rgba(80,220,255,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, s - 24, s - 24);
      ctx.font = '600 28px Inter, sans-serif';
      ctx.fillText(title, 32, 56);
      for (let i = 0; i < 8; i++) {
        const w = 60 + rand() * 260;
        ctx.globalAlpha = 0.35 + rand() * 0.5;
        ctx.fillRect(32, 90 + i * 22, w, 8);
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(s * 0.72, s * 0.62, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.72, s * 0.62, 60, -1, 2.2);
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(32, s - 60);
      for (let x = 32; x < s * 0.5; x += 8) ctx.lineTo(x, s - 60 - Math.abs(Math.sin(x * 0.07)) * 70 * rand());
      ctx.stroke();
    },
    1,
  );
}
