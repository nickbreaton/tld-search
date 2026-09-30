import { SiteLinks } from "./SiteLinks";

export function Header() {
  return (
    <div class="flex items-start justify-between gap-4">
      <h1 class="text-3xl leading-8 font-bold max-w-2xl text-balance">
        Find the perfect top-level domain for your project.
      </h1>
      <div class="hidden sm:block shrink-0">
        <SiteLinks />
      </div>
    </div>
  );
}
