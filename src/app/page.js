"use client";
import { useEffect, useRef, useState } from "react";

export default function DeluluPage() {
  const sketchRef = useRef();
  const [started, setStarted] = useState(false);
  const myp5Ref = useRef(null);

  useEffect(() => {
    if (!started) return;

    const loadP5 = async () => {
      const p5module = await import("p5");
      window.p5 = p5module.default;
      await import("p5.sound");

      let mic, amp;
      let myp5;
      const objects = [];

      // 夢境物件類別 (多種形狀)
      class DreamObject {
        constructor(p, x, y, size, shapeType, direction) {
          this.p = p;
          this.x = x;
          this.y = y;
          this.size = size;
          this.shapeType = shapeType;
          this.alpha = 200;
          this.direction = direction; // 1 往下, -1 往上
          this.speedY = p.random(1, 3) * this.direction;
          this.rotation = p.random(p.TWO_PI);
          this.rotationSpeed = p.random(-0.02, 0.02);
          this.stopped = false;

          this.stayTimer = 0; // 停留計時器
          this.stayDuration = p.floor(p.random(180, 300)); // 3~5秒，60FPS
        }

        update() {
          if (!this.stopped) {
            this.y += this.speedY;
            if (
              (this.direction === 1 && this.y >= this.p.height - this.size / 2) ||
              (this.direction === -1 && this.y <= this.size / 2)
            ) {
              this.y = this.direction === 1
                ? this.p.height - this.size / 2
                : this.size / 2;
              this.stopped = true;
              this.speedY = 0;
            }
          } else {
            this.stayTimer++;
            if (this.stayTimer > this.stayDuration) {
              this.alpha -= 0.5; // 停留時間過後開始淡出
            }
          }
          this.rotation += this.rotationSpeed;
        }

        isOffscreen() {
          return this.alpha <= 0;
        }

        draw() {
          const p = this.p;
          p.push();
          p.translate(this.x, this.y);
          p.rotate(this.rotation);
          p.noStroke();
          p.fill(150, 180, 255, this.alpha);

          switch (this.shapeType) {
            case "circle":
              p.ellipse(0, 0, this.size);
              break;
            case "star":
              drawStar(p, 0, 0, this.size / 2, this.size, 5);
              break;
            case "triangle":
              p.triangle(
                -this.size / 2,
                this.size / 2,
                0,
                -this.size / 2,
                this.size / 2,
                this.size / 2
              );
              break;
            case "diamond":
              p.quad(
                0,
                -this.size / 2,
                this.size / 2,
                0,
                0,
                this.size / 2,
                -this.size / 2,
                0
              );
              break;
          }

          p.pop();
        }
      }

      // 輔助函數：畫五角星
      function drawStar(p, x, y, radius1, radius2, npoints) {
        let angle = p.TWO_PI / npoints;
        let halfAngle = angle / 2.0;
        p.beginShape();
        for (let a = 0; a < p.TWO_PI; a += angle) {
          let sx = x + p.cos(a) * radius2;
          let sy = y + p.sin(a) * radius2;
          p.vertex(sx, sy);
          sx = x + p.cos(a + halfAngle) * radius1;
          sy = y + p.sin(a + halfAngle) * radius1;
          p.vertex(sx, sy);
        }
        p.endShape(p.CLOSE);
      }

      const sketch = (p) => {
        p.setup = () => {
          p.createCanvas(p.windowWidth, p.windowHeight);
          p.background(20);
          mic = new p5.AudioIn();
          mic.start();
          amp = new p5.Amplitude();
          amp.setInput(mic);
          p.noStroke();
        };

        p.draw = () => {
          // 夢幻殘影透明背景
          p.background(20, 20, 40, 30);

          // 取得音量
          let vol = amp.getLevel();

          // 根據音量決定新增物件數量
          let addCount = Math.floor(p.map(vol, 0, 0.3, 0, 10, true));
          for (let i = 0; i < addCount; i++) {
            let size = p.random(20, 70) * p.map(vol, 0, 0.3, 0.3, 1.5);
            const shapeTypes = ["circle", "star", "triangle", "diamond"];
            let shapeType = shapeTypes[Math.floor(p.random(shapeTypes.length))];

            // 隨機方向，上方或下方產生
            let direction = p.random() < 0.5 ? 1 : -1;
            let startY = direction === 1 ? -size : p.height + size;

            objects.push(new DreamObject(p, p.random(p.width), startY, size, shapeType, direction));
          }

          // 限制最多物件數量，超過刪除最舊
          const maxObjects = 50;
          while (objects.length > maxObjects) {
            objects.shift();
          }

          // 更新繪製並移除透明消失物件
          for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            obj.update();
            obj.draw();
            if (obj.isOffscreen()) {
              objects.splice(i, 1);
            }
          }
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        p.keyPressed = () => {
          if (p.key === "s" || p.key === "S") {
            p.saveCanvas("delulu-dream", "png");
          }
        };
      };

      myp5 = new p5(sketch, sketchRef.current);
      myp5Ref.current = myp5;
    };

    loadP5();

    return () => {
      if (myp5Ref.current) {
        myp5Ref.current.remove();
        myp5Ref.current = null;
      }
    };
  }, [started]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-black relative">
      {!started && (
        <button
          onClick={() => setStarted(true)}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          px-8 py-6 bg-gradient-to-r from-purple-600 to-blue-500 text-white
          font-bold rounded-xl shadow-lg hover:brightness-110 transition"
        >
          🌀 開始你的夢
        </button>
      )}
      <div ref={sketchRef} />
    </main>
  );
}
