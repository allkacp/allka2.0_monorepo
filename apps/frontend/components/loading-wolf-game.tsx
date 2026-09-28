"use client";

// Jogo do "lobinho" — igual ao dinossauro do Chrome offline, com a mascote
// da Allka. Fica no "future slot" da tela de carregamento (login-loading-
// overlay) pra distrair enquanto os dados carregam. Pedido do usuário
// 2026-09-28: "igual tem do Google, só que com o lobinho correndo".
// Ajuste 2026-09-28: tela pequena demais lembrava a página de "sem
// internet" do navegador — agora ocupa a largura do card de login. E o
// lobo tinha orelhas/focinho quadrados (parecia cabrito) — redesenhado com
// silhueta de lobo de verdade (orelhas triangulares, focinho comprido,
// rabo felpudo).
//
// Autocontido: sem imagens externas (tudo desenhado em <canvas>), sem
// dependências novas.
import { useEffect, useRef, useState } from "react";

const H = 220;
const GROUND_Y = 176;
const GRAVITY = 0.62;
const JUMP_VELOCITY = -12.4;
const BASE_SPEED = 5;
const SPEED_RAMP = 0.0012;

type Obstacle = { x: number; w: number; h: number; type: "cactus" | "rock" };

export function LoadingWolfGame() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let W = 380;
    function resize() {
      W = Math.max(320, Math.min(640, wrap!.clientWidth));
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let running = true;
    let started = false;
    let gameOver = false;
    let score = 0;
    let best = 0;
    try { best = Number(window.localStorage.getItem("allka:wolf-game-best") ?? 0) || 0; } catch { /* sem armazenamento */ }
    let speed = BASE_SPEED;
    let groundOffset = 0;
    let wolfY = 0;
    let wolfVy = 0;
    let jumping = false;
    let legPhase = 0;
    let obstacles: Obstacle[] = [];
    let nextSpawnIn = 70;
    let clouds = [220, 380, 520].map((x, i) => ({ x, y: 26 + i * 14 }));

    function reset() {
      score = 0;
      speed = BASE_SPEED;
      wolfY = 0;
      wolfVy = 0;
      jumping = false;
      obstacles = [];
      nextSpawnIn = 70;
      gameOver = false;
      started = true;
    }

    function jump() {
      if (!started || gameOver) { reset(); return; }
      if (!jumping) { jumping = true; wolfVy = JUMP_VELOCITY; }
    }

    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    }
    function onClick() { jump(); }
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onClick);

    // ── desenho ──────────────────────────────────────────────────────────
    function drawGround() {
      ctx!.strokeStyle = "#c7cdea";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, GROUND_Y);
      ctx!.lineTo(W, GROUND_Y);
      ctx!.stroke();
      ctx!.fillStyle = "#c7cdea";
      for (let x = -((groundOffset) % 18); x < W; x += 18) {
        ctx!.fillRect(x, GROUND_Y + 5, 8, 3);
      }
    }

    function drawClouds() {
      ctx!.fillStyle = "#dfe3fa";
      for (const c of clouds) {
        ctx!.fillRect(c.x, c.y, 26, 9);
        ctx!.fillRect(c.x + 6, c.y - 6, 18, 6);
      }
    }

    // Silhueta de lobo de verdade: corpo alongado, cabeça com focinho
    // comprido, orelhas TRIANGULARES eretas, rabo felpudo em ziguezague.
    function drawWolf(x: number, y: number) {
      const bob = jumping ? 0 : Math.sin(legPhase) * 2;
      const gy = GROUND_Y - 40 + y - bob; // topo do corpo
      const body = "#6E2C96";
      const dark = "#4a1c6b";
      const belly = "#d9d3ff";

      ctx!.save();
      ctx!.translate(x, gy);

      // rabo felpudo (atrás)
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.moveTo(-4, 22);
      ctx!.lineTo(-16, 10);
      ctx!.lineTo(-10, 16);
      ctx!.lineTo(-20, 8);
      ctx!.lineTo(-12, 14);
      ctx!.lineTo(-18, 4);
      ctx!.lineTo(-2, 14);
      ctx!.closePath();
      ctx!.fill();

      // patas traseiras/dianteiras (correndo)
      ctx!.fillStyle = dark;
      const legOffset = jumping ? 5 : Math.sin(legPhase) * 5;
      ctx!.fillRect(4, 30, 6, 10 + legOffset);
      ctx!.fillRect(30, 30, 6, 10 - legOffset);

      // corpo (tronco alongado, mais alto na garupa)
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.moveTo(-2, 26);
      ctx!.lineTo(-2, 12);
      ctx!.quadraticCurveTo(10, 2, 26, 4);
      ctx!.lineTo(40, 12);
      ctx!.lineTo(40, 28);
      ctx!.lineTo(-2, 28);
      ctx!.closePath();
      ctx!.fill();

      // barriga clara
      ctx!.fillStyle = belly;
      ctx!.fillRect(6, 20, 26, 6);

      // pescoço/cabeça (focinho comprido apontando pra frente)
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.moveTo(30, 4);
      ctx!.lineTo(44, -6);
      ctx!.lineTo(56, -4);
      ctx!.lineTo(58, 2);
      ctx!.lineTo(46, 4);
      ctx!.lineTo(40, 12);
      ctx!.lineTo(28, 12);
      ctx!.closePath();
      ctx!.fill();

      // orelhas TRIANGULARES eretas (o que faltava pra não parecer cabrito)
      ctx!.fillStyle = dark;
      ctx!.beginPath();
      ctx!.moveTo(32, -6);
      ctx!.lineTo(35, -18);
      ctx!.lineTo(40, -7);
      ctx!.closePath();
      ctx!.fill();
      ctx!.beginPath();
      ctx!.moveTo(41, -7);
      ctx!.lineTo(45, -19);
      ctx!.lineTo(49, -8);
      ctx!.closePath();
      ctx!.fill();

      // focinho claro + nariz
      ctx!.fillStyle = belly;
      ctx!.fillRect(48, -3, 9, 5);
      ctx!.fillStyle = "#1a1035";
      ctx!.fillRect(55, -2, 3, 3);
      // olho
      ctx!.fillRect(41, -3, 2.5, 2.5);

      ctx!.restore();
    }

    function drawObstacle(o: Obstacle) {
      if (o.type === "cactus") {
        ctx!.fillStyle = "#8b6fd6";
        ctx!.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
        ctx!.fillRect(o.x - 5, GROUND_Y - o.h + 6, 5, 6);
        ctx!.fillRect(o.x + o.w, GROUND_Y - o.h + 10, 5, 6);
      } else {
        ctx!.fillStyle = "#8b8fb0";
        ctx!.beginPath();
        ctx!.moveTo(o.x, GROUND_Y);
        ctx!.lineTo(o.x + o.w * 0.3, GROUND_Y - o.h);
        ctx!.lineTo(o.x + o.w * 0.7, GROUND_Y - o.h * 0.8);
        ctx!.lineTo(o.x + o.w, GROUND_Y);
        ctx!.closePath();
        ctx!.fill();
      }
    }

    function frame() {
      if (!running) return;
      ctx!.clearRect(0, 0, W, H);
      drawClouds();
      drawGround();

      if (started && !gameOver) {
        speed += SPEED_RAMP;
        groundOffset += speed;
        legPhase += 0.35;
        score += speed * 0.045;

        wolfVy += GRAVITY;
        wolfY += wolfVy;
        if (wolfY > 0) { wolfY = 0; wolfVy = 0; jumping = false; }

        nextSpawnIn -= speed;
        if (nextSpawnIn <= 0) {
          const isRock = Math.random() < 0.35;
          obstacles.push(isRock ? { x: W, w: 16, h: 18, type: "rock" } : { x: W, w: 10, h: 28, type: "cactus" });
          nextSpawnIn = 80 + Math.random() * 80;
        }
        for (const o of obstacles) o.x -= speed;
        obstacles = obstacles.filter((o) => o.x + o.w > -6);

        const wolfBox = { x: 50, y: GROUND_Y - 40 + wolfY, w: 32, h: 40 };
        for (const o of obstacles) {
          const obBox = { x: o.x, y: GROUND_Y - o.h, w: o.w, h: o.h };
          const hit = wolfBox.x < obBox.x + obBox.w && wolfBox.x + wolfBox.w > obBox.x && wolfBox.y < obBox.y + obBox.h && wolfBox.y + wolfBox.h > obBox.y;
          if (hit) {
            gameOver = true;
            if (Math.floor(score) > best) {
              best = Math.floor(score);
              try { window.localStorage.setItem("allka:wolf-game-best", String(best)); } catch { /* sem armazenamento */ }
            }
          }
        }
        for (const c of clouds) { c.x -= speed * 0.25; if (c.x < -30) c.x = W + Math.random() * 60; }
      }

      for (const o of obstacles) drawObstacle(o);
      drawWolf(50, wolfY);

      ctx!.fillStyle = "#5c1fae";
      ctx!.font = "bold 14px monospace";
      ctx!.textAlign = "right";
      ctx!.fillText(`Pontuação: ${Math.floor(score)}  Recorde: ${best}`, W - 10, 24);

      if (!started) {
        ctx!.textAlign = "center";
        ctx!.font = "bold 16px monospace";
        ctx!.fillText("Pressione espaço ou clique para começar", W / 2, H / 2);
      } else if (gameOver) {
        ctx!.fillStyle = "rgba(255,255,255,0.78)";
        ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = "#3a1466";
        ctx!.textAlign = "center";
        ctx!.font = "bold 18px monospace";
        ctx!.fillText("Fim de jogo", W / 2, H / 2 - 14);
        ctx!.font = "14px monospace";
        ctx!.fillText("Pressione espaço ou clique para reiniciar", W / 2, H / 2 + 14);
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    setReady(true);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onClick);
    };
  }, []);

  return (
    <div ref={wrapRef} className="mt-8 flex w-full flex-col items-center gap-2">
      <p className="text-white/50 text-[11px] uppercase tracking-widest">Enquanto isso, que tal um probleminha?</p>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Minijogo do lobinho: pressione espaço ou toque para pular os obstáculos"
        className="w-full max-w-[640px] rounded-xl border border-white/15 bg-white/95 shadow-lg cursor-pointer touch-none select-none"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 300ms" }}
      />
    </div>
  );
}
