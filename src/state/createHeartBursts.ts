import { createSignal } from "solid-js";

type HeartParticle = {
  dx: number;
  dy: number;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
};

export type HeartBurst = {
  id: number;
  x: number;
  y: number;
  particles: HeartParticle[];
};

const PARTICLE_COUNT = 7;

const BURST_LIFETIME_MS = 900;

let nextId = 0;

function createParticles(): HeartParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (360 / PARTICLE_COUNT) * index + (Math.random() * 40 - 20);
    const radians = (angle * Math.PI) / 180;
    const distance = 24 + Math.random() * 36;

    return {
      dx: Math.cos(radians) * distance,
      dy: Math.sin(radians) * distance,
      size: 10 + Math.random() * 12,
      duration: 450 + Math.random() * 400,
      delay: Math.random() * 60,
      rotate: Math.random() * 60 - 30,
    };
  });
}

export function createHeartBursts() {
  const [bursts, setBursts] = createSignal<HeartBurst[]>([]);

  const spawn = (x: number, y: number) => {
    const id = nextId++;

    setBursts((current) => [...current, { id, x, y, particles: createParticles() }]);
    setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, BURST_LIFETIME_MS);
  };

  return { bursts, spawn };
}
