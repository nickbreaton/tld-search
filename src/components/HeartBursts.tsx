import { For } from "solid-js";
import favoriteFilledIcon from "@material-symbols/svg-400/rounded/favorite-fill.svg?raw";
import type { HeartBurst } from "../state/createHeartBursts";

export function HeartBursts(props: { bursts: HeartBurst[] }) {
  return (
    <div class="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <For each={props.bursts}>
        {(burst) => (
          <For each={burst.particles}>
            {(particle) => (
              <span
                aria-hidden="true"
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
  );
}
