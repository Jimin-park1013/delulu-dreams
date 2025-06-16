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

    const sketch = (p) => {
      class Particle {
        constructor() {
          this.pos = p.createVector(p.random(p.width), p.random(p.height));
          this.vel = p.createVector(0, 0);
          this.acc = p.createVector(0, 0);
          this.size = p.random(2, 6);
          this.alpha = 255;
          this.colorBase = p.random() < 0.5 ? "green" : "red";
          this.angle = p.random(p.TWO_PI);
          this.angularSpeed = p.random(-0.05, 0.05);
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
        }

        draw() {
          p.push();
          p.translate(this.pos.x, this.pos.y);
          p.rotate(this.angle);
          if (this.colorBase === "green") {
            p.stroke(50, 255, 100, this.alpha);
            p.fill(50, 255, 100, this.alpha * 0.3);
          } else {
            p.stroke(255, 80, 20, this.alpha);
            p.fill(255, 80, 20, this.alpha * 0.3);
          }
          p.strokeWeight(1.8);
          p.ellipse(0, 0, this.size, this.size * 2.5);
          p.pop();
        }
      }

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.background(10, 10, 10);
      
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
        p.background(10, 10, 10, 80);

        let vol = 0;
        if (amp) {
          vol = amp.getLevel();
        }
        const volScaled = p.constrain(p.map(vol, 0, 0.3, 0, 3), 0, 3);

        // ✅ 節奏爆點觸發（音量瞬間超過）
        let threshold = 0.12;
        if (vol > threshold && !triggered) {
          triggered = true;
          triggerTimer = 10;

          for (let i = 0; i < 80; i++) {
            particles.push(new Particle());
            if (particles.length > maxParticles) particles.shift();
          }

          p.background(255, 80); // 閃一下
        }
        if (triggerTimer > 0) {
          triggerTimer--;
        } else {
          triggered = false;
        }

        // ✅ 擴散波紋：音量顯示
        let waveSize = p.map(vol, 0, 0.3, 0, p.width * 0.6);
        p.noFill();
        p.stroke(255, 255, 255, 50 + vol * 200);
        p.strokeWeight(2);
        p.ellipse(p.width / 2, p.height / 2, waveSize, waveSize);

        // ✅ 粒子更新繪製
        particles.forEach((pt) => {
          pt.update(volScaled);
          pt.draw();
        });

        // ✅ 閃爍火光粒子
        for (let i = 0; i < 30; i++) {
          let x = p.random(p.width);
          let y = p.random(p.height);
          let alpha = p.random(50, 180) * volScaled;
          let size = p.random(1, 4) * volScaled;
          let flickerColor = p.random() < 0.5 ? [50, 255, 100, alpha] : [255, 80, 20, alpha];

          p.noStroke();
          p.fill(...flickerColor);
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
    <main className="w-screen h-screen overflow-hidden bg-black relative text-cyan-100 font-mono">
      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-black via-[#001b2e] to-[#003d52] p-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold leading-snug tracking-wide text-cyan-300">
            🧠 DREAM LINK INITIALIZED
          </h1>
          <p className="max-w-2xl text-sm md:text-base text-cyan-200 leading-relaxed tracking-wide">
            請對著麥克風說話或播放一首歌，開始創造你的夢。
            <br />
            幻想不只是逃避，更是一種創造。
            <br />
            儲存畫面：按下 <code className="text-white">S</code> 鍵
          </p>
          <button
            onClick={() => setStarted(true)}
            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl shadow-md transition"
          >
            🔊 啟動夢境生成器
          </button>
        </div>
      )}
      <div ref={sketchRef} />
    </main>
  );
}
