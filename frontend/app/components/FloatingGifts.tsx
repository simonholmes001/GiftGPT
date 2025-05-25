import { useEffect, useState } from "react";

const GIFT_ICONS = ["🎁", "🎈", "🎉", "🛍️", "🎂", "🧸", "💐", "🍫"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function FloatingGifts() {
  const GIFT_COUNT = 14;
  const [giftData, setGiftData] = useState<Array<{
    left: string;
    top: string;
    delay: string;
    icon: string;
    duration: string;
    key: string;
    anim: string;
  }>>([]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const animate = () => {
      const data = Array.from({ length: GIFT_COUNT }).map((_, i) => {
        const left = `${randomBetween(5, 85)}%`;
        const top = `${randomBetween(5, 85)}%`;
        const delay = `${randomBetween(0, 4)}s`;
        const icon = GIFT_ICONS[Math.floor(Math.random() * GIFT_ICONS.length)];
        const duration = `${randomBetween(6, 12)}s`;
        const anims = [
          'gift-float-curve1',
          'gift-float-curve2',
          'gift-float-curve3',
          'gift-float-curve4',
        ];
        const anim = anims[Math.floor(Math.random() * anims.length)];
        return {
          left,
          top,
          delay,
          icon,
          duration,
          key: `${i}-${Date.now()}`,
          anim,
        };
      });
      setGiftData(data);
      // Find the max duration for this batch
      const maxDuration = Math.max(...data.map(d => parseFloat(d.duration))) * 1000 + 4000;
      timeout = setTimeout(animate, maxDuration);
    };
    animate();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {giftData.map((pos) => (
        <span
          key={pos.key}
          className={`gift-emoji absolute text-3xl select-none animate-gift-float ${'animate-' + pos.anim}`}
          style={{
            left: pos.left,
            top: pos.top,
            animationDelay: pos.delay,
            animationDuration: pos.duration,
          }}
        >
          {pos.icon}
        </span>
      ))}
    </div>
  );
}
