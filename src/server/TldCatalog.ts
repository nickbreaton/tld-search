import * as Schema from "effect/Schema";

export class Tld extends Schema.Class<Tld>("Tld")({
  domain: Schema.String,
  label: Schema.String,
  description: Schema.String,
}) {}

export const tlds = [
  new Tld({
    domain: ".app",
    label: "App",
    description: "Applications, software products, and mobile services",
  }),
  new Tld({
    domain: ".art",
    label: "Art",
    description: "Artists, galleries, exhibitions, and creative work",
  }),
  new Tld({
    domain: ".blog",
    label: "Blog",
    description: "Writing, publishing, essays, and personal journals",
  }),
  new Tld({
    domain: ".cafe",
    label: "Cafe",
    description: "Cafes, coffee shops, bakeries, and neighborhood hospitality",
  }),
  new Tld({
    domain: ".coffee",
    label: "Coffee",
    description: "Coffee roasters, shops, equipment, and culture",
  }),
  new Tld({
    domain: ".design",
    label: "Design",
    description: "Designers, studios, portfolios, and creative products",
  }),
  new Tld({
    domain: ".dev",
    label: "Dev",
    description: "Software developers, documentation, and engineering tools",
  }),
  new Tld({
    domain: ".gallery",
    label: "Gallery",
    description: "Art galleries, collections, exhibitions, and portfolios",
  }),
  new Tld({
    domain: ".io",
    label: "IO",
    description: "Technology products, startups, developer tools, and software",
  }),
  new Tld({
    domain: ".law",
    label: "Law",
    description: "Law firms, attorneys, and legal services",
  }),
  new Tld({
    domain: ".me",
    label: "Me",
    description: "Personal sites, resumes, portfolios, and individual identity",
  }),
  new Tld({
    domain: ".org",
    label: "Organization",
    description: "Organizations, communities, nonprofits, and public-interest work",
  }),
  new Tld({
    domain: ".photography",
    label: "Photography",
    description: "Photographers, photo studios, portfolios, and image collections",
  }),
  new Tld({
    domain: ".shop",
    label: "Shop",
    description: "Online stores, retail brands, products, and commerce",
  }),
  new Tld({
    domain: ".studio",
    label: "Studio",
    description: "Creative studios, production companies, artists, and agencies",
  }),
  new Tld({
    domain: ".tech",
    label: "Tech",
    description: "Technology companies, products, research, and services",
  }),
] as const;

export const initialTlds = tlds.slice(0, 6);
