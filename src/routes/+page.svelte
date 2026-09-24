<script lang="ts">
  import { getCatalog } from './catalog.remote';
  import { recommend } from './search.remote';
  import '../styles/global.css';

  const catalog = getCatalog();

  // TODO: not final form here, need to adjust to Svelte-isms but
  // lots changing at once.

  let phrase = $state('');

  let latinOnly = $state(true);

  let excludeCountry = $state(false);

  let settledPhrase = $state('');

  let settledLatin = $state(true);

  let settledCountry = $state(false);

  $effect(() => {

    const currentPhrase = phrase.trim();

    const latin = latinOnly;

    const country = excludeCountry;

    const timer = setTimeout(() => {

      settledPhrase = currentPhrase;

      settledLatin = latin;

      settledCountry = country;
    }, currentPhrase ? 500 : 0);

    return () => clearTimeout(timer);
  });


  const search = $derived(settledPhrase ? recommend({ phrase: settledPhrase, latinOnly: settledLatin, excludeCountry: settledCountry }) : null);
</script>

<svelte:head>
  <title>TLDR — find your top-level domain</title>
</svelte:head>

<main class="flex flex-col max-w-2xl mx-auto my-5 gap-5 px-4">
  <h1 class="text-2xl font-bold">TLDR</h1>
  <p>Find the <strong>t</strong>op-<strong>l</strong>evel <strong>d</strong>omain that's <strong>r</strong>ight for your project.</p>
  <div>
    <input aria-label="Search by phrase, idea, or feeling" maxlength="140" placeholder="Search by phrase, idea, or feeling" class="bg-white outline-0 px-4 py-3 border border-solid border-zinc-200 w-sm max-w-full" bind:value={phrase} />
  </div>
  <label><input type="checkbox" bind:checked={latinOnly} /> Hide domain endings with non-Latin characters</label>
  <label><input type="checkbox" bind:checked={excludeCountry} /> Hide country domain endings</label>

  {#if phrase.trim() && (phrase.trim() !== settledPhrase || latinOnly !== settledLatin || excludeCountry !== settledCountry || search?.loading)}
    <p role="status">Searching…</p>
  {:else if search?.error}
    <p role="alert">Search failed. Please try again.</p>
  {/if}

  <svelte:boundary>
    {@const tlds = await catalog}
  <ul class="grid grid-cols-3 gap-6">
    <!-- TODO: not final form here, we may want to leave entire response in place in dom since very large -->
    <!-- then have a secondary location we render out results. this will become more apparent with a favorites section.  -->
    {#each phrase.trim() ? (phrase.trim() === settledPhrase && latinOnly === settledLatin && excludeCountry === settledCountry && !search?.loading && search?.current ? search.current.map((name) => tlds.find((tld) => tld.name === name)).filter((tld) => tld !== undefined) : []) : tlds.filter((tld) => (!latinOnly || tld.latin) && (!excludeCountry || tld.nonCountry)) as tld (tld.name)}
      <li>
        .{tld.name}
        <ol>
          {#each tld.links as link (link.registrar)}
            <li><a href={link.href} target="_blank" rel="noopener noreferrer" class="underline text-sm">{link.registrar === 'name' ? 'name.com' : link.registrar}</a></li>
          {/each}
        </ol>
      </li>
    {/each}
  </ul>
  </svelte:boundary>
</main>
