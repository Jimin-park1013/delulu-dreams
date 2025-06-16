"use client";
import { useEffect, useRef, useState } from "react";

export default function DeluluPage() {
  const sketchRef = useRef();
  const myp5Ref = useRef(null);
  const [started, setStarted] = useState(false);

  async function loadP5() {
    const p5module = await import("p5");
    window.p5 = p5module.default;
    await import("p5.sound");

    let mic, amp;
    let particles = [];
    const maxParticles = 150;
    let triggered = false;
    let triggerTimer = 0;

    const themes = [
      { hueStart: 220, hueEnd: 10 }, // 冰藍→火紅
      { hueStart: 60, hueEnd: 300 }, // 螢光黃→電紫
      { hueStart: 0, hueEnd: 120 },  // 紅→綠
    ];
    let currentTheme = 0;
    let themeTimer = 0;
    const themeDuration = 600; // 約10秒 (60fps * 10)

    const sketch = (p) => {
      class Particle {
        constructor() {
          this.pos = p.createVector(p.random(p.width), p.random(p.height));
          this.vel = p.createVector(0, 0);
          this.acc = p.createVector(0, 0);
          this.size = p.random(2, 6);
          this.alpha = 255;
          this.angle = p.random(p.TWO_PI);
          this.angularSpeed = p.random(-0.05, 0.05);
          this.hue = p.random(themes[currentTheme].hueStart, themes[currentTheme].hueEnd);
        }

        applyForce(force) {
          this.acc.add(force);
        }

        update(vol) {
          let flow = p.noise(this.pos.x * 0.005, this.pos.y * 0.005, p.frameCount * 0.01);
          let angle = flow * p.TWO_PI * 2;
          let flowForce = p5.Vector.fromAngle(angle);
          flowForce.mult(0.05);
          this.applyForce(flowForce);

          const flameForce = p.createVector(p.random(-0.02, 0.02), -0.02 * vol);
          this.applyForce(flameForce);

          this.vel.add(this.acc);
          this.vel.limit(1.2);
          this.pos.add(this.vel);
          this.acc.mult(0);

          this.angle += this.angularSpeed;

          this.size = p.lerp(this.size, 3 + vol * 6, 0.1);
          this.alpha = p.map(this.vel.mag(), 0, 1.2, 50, 255);

          if (this.pos.x < 0) this.pos.x = p.width;
          if (this.pos.x > p.width) this.pos.x = 0;
          if (this.pos.y < 0) this.pos.y = p.height;
          if (this.pos.y > p.height) this.pos.y = 0;

          // 隨著音量微調色相，保持在主題範圍內
          let theme = themes[currentTheme];
          this.hue = p.lerp(this.hue, p.map(vol, 0, 0.4, theme.hueStart, theme.hueEnd, true), 0.05);
        }

        draw() {
          p.push();
          p.translate(this.pos.x, this.pos.y);
          p.rotate(this.angle);

          p.colorMode(p.HSB, 360, 100, 100, 255);
          let col = p.color(this.hue, 80, 100, this.alpha * 0.8);
          p.fill(col);
          p.stroke(p.hue(col), 90, 100, this.alpha);
          p.strokeWeight(1.8);

          p.ellipse(0, 0, this.size, this.size * 2.5);
          p.pop();
        }
      }

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 360, 100, 100, 255);
        p.background(220, 10, 10);

        mic = new p5.AudioIn();
        mic.start();

        amp = new p5.Amplitude();
        amp.setInput(mic);

        for (let i = 0; i < maxParticles; i++) {
          particles.push(new Particle());
        }

        p.noStroke();
        p.frameRate(60);
      };

      p.draw = () => {
        let vol = amp ? amp.getLevel() : 0;
        let theme = themes[currentTheme];
        let bgHue = p.map(vol, 0, 0.4, theme.hueStart, theme.hueEnd, true);
        p.background(bgHue, 50, 10, 80);

        // 主題切換計時器
        themeTimer++;
        if (themeTimer > themeDuration) {
          currentTheme = (currentTheme + 1) % themes.length;
          themeTimer = 0;
        }

        const volScaled = p.constrain(p.map(vol, 0, 0.3, 0, 3), 0, 3);

        // 節奏爆點觸發
        let threshold = 0.12;
        if (vol > threshold && !triggered) {
          triggered = true;
          triggerTimer = 10;

          for (let i = 0; i < 80; i++) {
            particles.push(new Particle());
            if (particles.length > maxParticles) particles.shift();
          }

          // 閃光爆點
          p.background(60, 100, 100, 120);
          p.blendMode(p.ADD);
          p.noStroke();
          for (let i = 0; i < 30; i++) {
            let x = p.random(p.width);
            let y = p.random(p.height);
            let size = p.random(30, 80);
            p.fill(p.random(10, 50), 100, 100, 50);
            p.ellipse(x, y, size, size);
          }
          p.blendMode(p.BLEND);
        }
        if (triggerTimer > 0) {
          triggerTimer--;
        } else {
          triggered = false;
        }

        // 擴散波紋
        let waveSize = p.map(vol, 0, 0.3, 0, p.width * 0.6);
        p.noFill();
        p.stroke(0, 0, 100, 50 + vol * 200);
        p.strokeWeight(2);
        p.ellipse(p.width / 2, p.height / 2, waveSize, waveSize);

        // 粒子更新繪製
        particles.forEach((pt) => {
          pt.update(volScaled);
          pt.draw();
        });

        // 閃爍火光粒子
        for (let i = 0; i < 30; i++) {
          let x = p.random(p.width);
          let y = p.random(p.height);
          let alpha = p.random(50, 180) * volScaled;
          let size = p.random(1, 4) * volScaled;

          let flickHue = p.random() < 0.5 ? p.map(vol, 0, 0.4, theme.hueStart, theme.hueEnd) : (theme.hueStart + theme.hueEnd) / 2;
          p.noStroke();
          p.fill(flickHue, 90, 100, alpha);
          p.ellipse(x, y, size, size * 1.2);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };

      p.keyPressed = () => {
        if (p.key === "s" || p.key === "S") {
          p.saveCanvas("flameflow", "png");
        }
      };
    };

    const myp5 = new p5(sketch, sketchRef.current);
    myp5Ref.current = myp5;
  }

  useEffect(() => {
    if (!started) return;

    loadP5();

    return () => {
      if (myp5Ref.current) {
        myp5Ref.current.remove();
        myp5Ref.current = null;
      }
    };
  }, [started]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-black relative text-cyan-100 font-mono select-none">
      {/* 流動背景 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-20 bg-gradient-to-tr from-cyan-800 via-black to-cyan-900 animate-gradientShift"
        style={{
          backgroundSize: "400% 400%",
        }}
      />

      {/* 飄動星塵 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10"
      >
        {[...Array(60)].map((_, i) => (
          <span
            key={i}
            className="absolute bg-white rounded-full opacity-30 animate-starTwinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/80 backdrop-blur-sm p-12 text-center px-6 md:px-20 rounded-lg shadow-lg border border-cyan-600/30">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-widest text-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.9)] neon-flicker">
            DELULU PARTY
          </h1>
          <p className="max-w-3xl text-base md:text-lg text-cyan-200 leading-relaxed tracking-wide drop-shadow-sm">
            對著麥克風大聲喊，或放你最狂的歌，音浪越強烈，粒子越狂野。<br />
            沒有規則，只有律動，夢境在你話語間狂歡。<br />
            儲存畫面：按下 <code className="text-white bg-cyan-900 px-1 rounded">S</code> 鍵
          </p>
          <button
            onClick={() => setStarted(true)}
            className="relative px-12 py-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-semibold rounded-3xl shadow-lg transition-all duration-300 ease-in-out
              before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-r before:from-cyan-400 before:via-cyan-300 before:to-cyan-500 before:opacity-60 before:blur-xl before:scale-110 before:-z-10
              focus:outline-none focus:ring-4 focus:ring-cyan-300 animate-breathing"
            aria-label="啟動夢境狂歡派對"
          >
            開啟你的夢境狂歡
            {/* 點擊波紋效果容器 */}
            <span className="ripple-container absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"></span>
          </button>
        </div>
      )}
      <div ref={sketchRef} />
      <style>{`
        /* 背景漸變緩慢流動 */
        @keyframes gradientShift {
          0% { background-position: 0% 50%;}
          50% { background-position: 100% 50%;}
          100% { background-position: 0% 50%;}
        }
        .animate-gradientShift {
          animation: gradientShift 25s ease infinite;
          background-size: 400% 400%;
        }

        /* 星塵閃爍 */
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        .animate-starTwinkle {
          animation: starTwinkle 3s ease-in-out infinite;
        }

        /* 霓虹字閃爍 */
        @keyframes neonFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow:
              0 0 5px #0ff,
              0 0 10px #0ff,
              0 0 20px #0ff,
              0 0 30px #0ff,
              0 0 40px #0ff,
              0 0 50px #0ff,
              0 0 60px #0ff;
            opacity: 1;
          }
          20%, 22%, 24%, 55% {
            text-shadow: none;
            opacity: 0.8;
          }
        }
        .neon-flicker {
          animation: neonFlicker 3s linear infinite;
        }

        /* 按鈕呼吸動畫 */
        @keyframes breathing {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 0 10px #22d3ee,
              0 0 20px #06b6d4,
              0 0 30px #22d3ee;
          }
          50% {
            transform: scale(1.05);
            box-shadow:
              0 0 20px #22d3ee,
              0 0 40px #06b6d4,
              0 0 60px #22d3ee;
          }
        }
        .animate-breathing {
          animation: breathing 3.5s ease-in-out infinite;
        }

        /* 點擊波紋效果 */
        button {
          position: relative;
          overflow: hidden;
        }
        .ripple-container {
          position: absolute;
          border-radius: inherit;
        }
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          animation: ripple 0.6s linear;
          pointer-events: none;
          transform: scale(0);
        }
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}     