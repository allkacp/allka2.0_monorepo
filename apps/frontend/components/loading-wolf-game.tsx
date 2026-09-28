"use client";

// Jogo do "lobinho" — igual ao dinossauro do Chrome offline, com a mascote
// da Allka. Fica no "future slot" da tela de carregamento (login-loading-
// overlay) pra distrair enquanto os dados carregam. Pedido do usuário
// 2026-09-28: "igual tem do Google, só que com o lobinho correndo".
//
// Autocontido: sem imagens externas (tudo desenhado em <canvas>), sem
// dependências novas, funciona em qualquer tamanho de tela e não trava o
// carregamento real (é só decoração — nunca bloqueia onContinueAnyway/onRetry
// do overlay).
import { useEffect, useRef, useState } from "react";

const GROUND_Y = 132;
const GRAVITY = 0.62;
const JUMP_VELOCITY = -11.2;
const BASE_SPEED = 4.4;
const SPEED_RAMP = 0.0011;

type Obstacle = { x: number; w: number; h: number; type: "cactus" | "rock" };

export function LoadingWolfGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = 380;
    const H = 150;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

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
    let nextSpawnIn = 60;
    let clouds = [180, 300].map((x) => ({ x, y: 22 + (x % 20) }));

    function reset() {
      score = 0;
      speed = BASE_SPEED;
      wolfY = 0;
      wolfVy = 0;
      jumping = false;
      obstacles = [];
      nextSpawnIn = 60;
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
      for (let x = -((groundOffset) % 14); x < W; x += 14) {
        ctx!.fillRect(x, GROUND_Y + 4, 6, 2);
      }
    }

    function drawClouds() {
      ctx!.fillStyle = "#dfe3fa";
      for (const c of clouds) {
        ctx!.fillRect(c.x, c.y, 18, 6);
        ctx!.fillRect(c.x + 4, c.y - 4, 12, 4);
      }
    }

    function drawWolf(x: number, y: number) {
      const bob = jumping ? 0 : Math.sin(legPhase) * 1.5;
      const baseY = GROUND_Y - 26 + y - bob;
      ctx!.fillStyle = "#7b2cdb";
      // corpo
      ctx!.fillRect(x, baseY, 30, 18);
      ctx!.fillRect(x + 24, baseY - 10, 14, 14); // cabeça
      // orelhas
      ctx!.fillStyle = "#5c1fae";
      ctx!.fillRect(x + 26, baseY - 16, 4, 6);
      ctx!.fillRect(x + 34, baseY - 16, 4, 6);
      // focinho
      ctx!.fillStyle = "#d9d3ff";
      ctx!.fillRect(x + 36, baseY - 2, 6, 5);
      // olho
      ctx!.fillStyle = "#1a1035";
      ctx!.fillRect(x + 31, baseY - 6, 2, 2);
      // patas (correndo)
      ctx!.fillStyle = "#5c1fae";
      const legOffset = jumping ? 4 : Math.sin(legPhase) * 4;
      ctx!.fillRect(x + 2, baseY + 18, 5, 6 + legOffset);
      ctx!.fillRect(x + 20, baseY + 18, 5, 6 - legOffset);
      // rabo
      ctx!.fillStyle = "#7b2cdb";
      ctx!.fillRect(x - 6, baseY + 2, 8, 5);
    }

    function drawObstacle(o: Obstacle) {
      ctx!.fillStyle = o.type === "cactus" ? "#a78bfa" : "#8b8fb0";
      ctx!.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
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
          obstacles.push(isRock ? { x: W, w: 12, h: 14, type: "rock" } : { x: W, w: 8, h: 22, type: "cactus" });
          nextSpawnIn = 70 + Math.random() * 70;
        }
        for (const o of obstacles) o.x -= speed;
        obstacles = obstacles.filter((o) => o.x + o.w > -4);

        // colisão (caixa simplificada, um pouco generosa)
        const wolfBox = { x: 38, y: GROUND_Y - 26 + wolfY, w: 24, h: 26 };
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
        for (const c of clouds) { c.x -= speed * 0.25; if (c.x < -20) c.x = W + Math.random() * 40; }
      }

      for (const o of obstacles) drawObstacle(o);
      drawWolf(38, wolfY);

      ctx!.fillStyle = "#5c1fae";
      ctx!.font = "bold 11px monospace";
      ctx!.textAlign = "right";
      ctx!.fillText(`Pontuação: ${Math.floor(score)}  Recorde: ${best}`, W - 6, 16);

      if (!started) {
        ctx!.textAlign = "center";
        ctx!.font = "bold 12px monospace";
        ctx!.fillText("Pressione espaço ou clique para começar", W / 2, H / 2);
      } else if (gameOver) {
        ctx!.fillStyle = "rgba(255,255,255,0.72)";
        ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = "#3a1466";
        ctx!.textAlign = "center";
        ctx!.font = "bold 14px monospace";
        ctx!.fillText("Fim de jogo", W / 2, H / 2 - 10);
        ctx!.font = "11px monospace";
        ctx!.fillText("Pressione espaço ou clique para reiniciar", W / 2, H / 2 + 12);
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    setReady(true);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onClick);
    };
  }, []);

  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="text-white/50 text-[11px] uppercase tracking-widest">Enquanto isso, que tal um probleminha?</p>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Minijogo do lobinho: pressione espaço ou toque para pular os obstáculos"
        className="rounded-xl border border-white/15 bg-white/95 shadow-lg cursor-pointer touch-none select-none"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 300ms" }}
      />
    </div>
  );
}
