import { createSignal, For, onSettled, Show } from "solid-js";
import { Portal, type JSX } from "@solidjs/web";
import favoriteFilledIcon from "@material-symbols/svg-400/rounded/favorite-fill.svg?raw";

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

export function HeartBursts(props: {
  children: (spawn: (element: Element) => void) => JSX.Element;
}) {
  const [bursts, setBursts] = createSignal<HeartBurst[]>([]);
  let nextId = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  onSettled(() => () => {
    for (const timer of timers) clearTimeout(timer);
  });

  const spawn = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + window.scrollX;
    const y = rect.top + rect.height / 2 + window.scrollY;
    const id = nextId++;

    setBursts((current) => [...current, { id, x, y, particles: createParticles() }]);

    const timer = setTimeout(() => {
      timers.delete(timer);
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, BURST_LIFETIME_MS);

    timers.add(timer);
  };

  return (
    <>
      {props.children(spawn)}
      <Show when={bursts().length > 0}>
        <Portal mount={document.body}>
          <div aria-hidden="true" class="pointer-events-none absolute inset-0 z-50 overflow-x-clip">
            <For each={bursts()}>
              {(burst) => (
                <For each={burst.particles}>
                  {(particle) => (
                    <span
                      class="heart-burst-particle fill-red-500 absolute [&_svg]:size-full"
                      style={{
                        left: `${burst.x}px`,
                        top: `${burst.y}px`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        "--heart-dx": `${particle.dx}px`,
                        "--heart-dy": `${particle.dy}px`,
                        "--heart-rotate": `${particle.rotate}deg`,
                        "animation-duration": `${particle.duration}ms`,
                        "animation-delay": `${particle.delay}ms`,
                      }}
                      innerHTML={favoriteFilledIcon}
                    />
                  )}
                </For>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  );
}
