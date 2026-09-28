"use client";

// Jogo do "lobinho" — igual ao dinossauro do Chrome offline, com a mascote
// da Allka. Pedido do usuário 2026-09-28/29:
//   - NÃO aparecer sempre: só quando a internet cai (offline de verdade) ou
//     quando o carregamento está demorando demais (>6s) — igual ao Google,
//     que só mostra o dino quando a página não carrega.
//   - Quando aparece, ocupa a tela GRANDE (o card de progresso encolhe).
//   - O lobo tinha bug de colisão (pulava e sempre batia) — corrigido: o
//     primeiro toque agora já faz o lobo pular (antes só "ligava" o jogo
//     sem pular, e o primeiro obstáculo chegava rápido demais pra reagir).
//   - Lobo de verdade: silhueta de SVG livre (licença CC0/domínio público,
//     freesvg.org/wolf-vector-silhouette, autor "liftarn"), não mais
//     desenhado em retângulos.
//   - Obstáculos viraram "problemas" de marketing/cliente (Imposto, Multa,
//     Reclamação, Chargeback, Concorrência, Cancelamento…) em vez de
//     cacto/pedra genéricos.
import { useEffect, useRef, useState } from "react";

const GRAVITY = 0.62;
const JUMP_VELOCITY = -13;
const BASE_SPEED = 5;
const SPEED_RAMP = 0.0011;

// "Problemas" que o lobo pula — mesmo espírito do dino pulando cactos, só
// que com cara de marketing/cliente, como o usuário pediu.
const PROBLEMS = ["Imposto", "Multa", "Reclamação", "Chargeback", "Concorrência", "Cancelamento", "Spam", "Crise"];

type Obstacle = { x: number; w: number; h: number; label: string };

export function LoadingWolfGame({ big = false }: { big?: boolean }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const H = big ? 320 : 190;
  const GROUND_Y = H - 44;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const wolfImg = new Image();
    let wolfImgReady = false;
    wolfImg.onload = () => { wolfImgReady = true; };
    wolfImg.src = "/images/wolf-runner.svg";
    const WOLF_ASPECT = 595.28 / 670; // largura/altura do SVG original

    let W = 380;
    function resize() {
      W = Math.max(320, Math.min(760, wrap!.clientWidth));
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
    let bobPhase = 0;
    let obstacles: Obstacle[] = [];
    // Buffer generoso antes do 1º obstáculo — dar tempo real de reagir
    // (bug relatado: "sempre bate" vinha do 1º obstáculo chegando junto
    // com o início do jogo).
    let nextSpawnIn = 170;
    let clouds = [220, 380, 520, 660].map((x, i) => ({ x, y: 26 + ((i * 17) % 40) }));

    const WOLF_H = big ? 62 : 40;
    const WOLF_W = WOLF_H * WOLF_ASPECT;
    const WOLF_X = big ? 70 : 46;

    function reset() {
      score = 0;
      speed = BASE_SPEED;
      wolfY = 0;
      wolfVy = 0;
      jumping = false;
      obstacles = [];
      nextSpawnIn = 170;
      gameOver = false;
      started = true;
    }

    // Corrige o bug relatado: antes, o primeiro toque só "ligava" o jogo e
    // NÃO pulava — o lobo ficava parado justamente quando o 1º obstáculo já
    // estava chegando. Agora o mesmo toque liga e já pula.
    function jump() {
      if (!started || gameOver) reset();
      if (!jumping) { jumping = true; wolfVy = JUMP_VELOCITY; }
    }

    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    }
    function onClick() { jump(); }
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onClick);

    function drawGround() {
      ctx!.strokeStyle = "#c7cdea";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(0, GROUND_Y);
      ctx!.lineTo(W, GROUND_Y);
      ctx!.stroke();
      ctx!.fillStyle = "#c7cdea";
      for (let x = -((groundOffset) % 18); x < W; x += 18) ctx!.fillRect(x, GROUND_Y + 5, 8, 3);
    }

    function drawClouds() {
      ctx!.fillStyle = "#dfe3fa";
      for (const c of clouds) {
        ctx!.fillRect(c.x, c.y, 26, 9);
        ctx!.fillRect(c.x + 6, c.y - 6, 18, 6);
      }
    }

    function drawWolf(x: number, y: number) {
      const bob = jumping ? 0 : Math.sin(bobPhase) * (big ? 3 : 2);
      const drawY = GROUND_Y - WOLF_H + y - bob;
      if (wolfImgReady) {
        ctx!.save();
        // A silhueta original olha pra ESQUERDA — espelha pra correr pra
        // a direita, na direção do movimento.
        ctx!.translate(x + WOLF_W, drawY);
        ctx!.scale(-1, 1);
        ctx!.drawImage(wolfImg, 0, 0, WOLF_W, WOLF_H);
        ctx!.restore();
      } else {
        ctx!.fillStyle = "#6E2C96";
        ctx!.fillRect(x, drawY, WOLF_W, WOLF_H);
      }
    }

    // "Problema" = etiqueta com o nome, tipo placa — o lobo pula por cima.
    function drawObstacle(o: Obstacle) {
      ctx!.fillStyle = "#c0392b";
      ctx!.fillRect(o.x, GROUND_Y - o.h, o.w, o.h - 8);
      ctx!.fillStyle = "#8b8fb0";
      ctx!.fillRect(o.x + o.w / 2 - 1.5, GROUND_Y - 8, 3, 8);
      ctx!.fillStyle = "#fff";
      ctx!.font = `bold ${big ? 11 : 8}px sans-serif`;
      ctx!.textAlign = "center";
      ctx!.save();
      ctx!.translate(o.x + o.w / 2, GROUND_Y - o.h / 2 - 4);
      ctx!.rotate(-Math.PI / 2);
      ctx!.fillText(o.label, 0, 3);
      ctx!.restore();
    }

    function frame() {
      if (!running) return;
      ctx!.clearRect(0, 0, W, H);
      drawClouds();
      drawGround();

      if (started && !gameOver) {
        speed += SPEED_RAMP;
        groundOffset += speed;
        bobPhase += 0.3;
        score += speed * 0.045;

        wolfVy += GRAVITY;
        wolfY += wolfVy;
        if (wolfY > 0) { wolfY = 0; wolfVy = 0; jumping = false; }

        nextSpawnIn -= speed;
        if (nextSpawnIn <= 0) {
          const label = PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];
          const h = (big ? 34 : 24) + Math.min(14, label.length);
          obstacles.push({ x: W, w: big ? 26 : 18, h, label });
          nextSpawnIn = 110 + Math.random() * 90;
        }
        for (const o of obstacles) o.x -= speed;
        obstacles = obstacles.filter((o) => o.x + o.w > -6);

        // Hitbox um pouco MENOR que o desenho (mais justo/perdoável — jogo
        // de reflexo não pode punir quase-acertos).
        const inset = big ? 10 : 6;
        const wolfBox = { x: WOLF_X + inset, y: GROUND_Y - WOLF_H + wolfY + inset, w: WOLF_W - inset * 2, h: WOLF_H - inset };
        for (const o of obstacles) {
          const obBox = { x: o.x + 2, y: GROUND_Y - o.h, w: o.w - 4, h: o.h };
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
      drawWolf(WOLF_X, wolfY);

      ctx!.fillStyle = "#5c1fae";
      ctx!.font = `bold ${big ? 15 : 12}px monospace`;
      ctx!.textAlign = "right";
      ctx!.fillText(`Pontuação: ${Math.floor(score)}  Recorde: ${best}`, W - 10, big ? 26 : 18);

      if (!started) {
        ctx!.textAlign = "center";
        ctx!.font = `bold ${big ? 17 : 13}px monospace`;
        ctx!.fillText("Pressione espaço ou toque para pular os problemas", W / 2, H / 2);
      } else if (gameOver) {
        ctx!.fillStyle = "rgba(255,255,255,0.78)";
        ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = "#3a1466";
        ctx!.textAlign = "center";
        ctx!.font = `bold ${big ? 19 : 15}px monospace`;
        ctx!.fillText("Fim de jogo", W / 2, H / 2 - 14);
        ctx!.font = `${big ? 14 : 11}px monospace`;
        ctx!.fillText("Pressione espaço ou toque para reiniciar", W / 2, H / 2 + 14);
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
  }, [big, GROUND_Y, H]);

  return (
    <div ref={wrapRef} className="flex w-full flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Minijogo do lobinho: pressione espaço ou toque para pular os problemas"
        className="w-full max-w-[760px] rounded-xl border border-white/15 bg-white/95 shadow-lg cursor-pointer touch-none select-none"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 300ms" }}
      />
    </div>
  );
}
