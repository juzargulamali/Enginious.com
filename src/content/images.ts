// Image registry. Mirrors the planned CMS table `media_assets` (see supabase/migrations/*_media_assets.sql):
// every field below (file, alt text, focal point, crop, licence, status) is editable in the CMS without code changes.
//
//  status  real            = supplied by Enginious / the person shown; may be used for what it depicts
//          concept         = AI-generated environment: an illustrative concept, NOT a photograph of an Enginious project
//          fictional-portrait = AI-generated person: a preview placeholder, NOT a real employee
//          (every non-"real" image must be replaced before launch; see docs/licences/README.md)
//          stock           = licensed stock photograph: ILLUSTRATIVE only, never presented as an Enginious installation
//          preview-portrait= stock portrait standing in for a team member: a preview placeholder, not an employee
//
// Add a photo with: node scripts/images/ingest.mjs <id> <file> --alt ... --focal x,y --licence ... --source ... --credit ...
// then paste the printed entry here. Slots (below) say where each photo is used; swap a slot's `id` to replace it.

export type ImageStatus = "real" | "stock" | "preview-portrait" | "concept" | "fictional-portrait";

export interface ImageAsset {
  id: string;
  kind: "portrait" | "scene";
  status: ImageStatus;
  src: string; // base path; files are <src>-<width>.webp
  widths: number[];
  width: number;
  height: number;
  /** Focal point as fractions (0-1) of the image. Drives object-position and any crop. */
  focal: [number, number];
  alt: string;
  blur?: string;
  credit: string;
  source: string;
  licence: string;
}

import generated from "./images.generated.json";

export const IMAGES: Record<string, ImageAsset> = {
  ...(generated as unknown as Record<string, ImageAsset>),
  "region-dubai": {
      "id": "region-dubai", "kind": "scene", "status": "stock", "src": "/photos/region-dubai", "widths": [480, 960, 1600, 2000], "width": 2000, "height": 1250, "focal": [0.3, 0.45],
      "alt": "Dubai skyline at night with the Burj Khalifa and the Sheikh Zayed Road interchanges", "credit": "Atul Mohan, Pexels", "source": "https://www.pexels.com/photo/17914746/", "licence": "Free to use under the Pexels licence"
  } as unknown as ImageAsset,
  "region-riyadh": {
      "id": "region-riyadh", "kind": "scene", "status": "stock", "src": "/photos/region-riyadh", "widths": [480, 960, 1600, 2000], "width": 2000, "height": 1334, "focal": [0.4, 0.45],
      "alt": "Riyadh at dusk with the Kingdom Centre tower lit in blue", "credit": "Abul Lais, Pexels", "source": "https://www.pexels.com/photo/39470846/", "licence": "Free to use under the Pexels licence"
  } as unknown as ImageAsset,
  "region-poznan": {
      "id": "region-poznan", "kind": "scene", "status": "stock", "src": "/photos/region-poznan", "widths": [480, 960, 1500], "width": 1500, "height": 1001, "focal": [0.48, 0.1],
      "alt": "Poznań old town square at night with the town hall tower and café terraces", "credit": "Supplied by the site owner", "source": "Supplied by the site owner", "licence": "Free to use under the Pexels licence"
  } as unknown as ImageAsset,
  "juzar-gulamali": {
      "id": "juzar-gulamali",
      "kind": "portrait",
      "status": "real",
      "src": "/photos/juzar-gulamali",
      "widths": [
          480,
          960
      ],
      "width": 1122,
      "height": 1402,
      "focal": [
          0.48,
          0.22
      ],
      "alt": "Juzar Gulamali, Founder and CEO of Enginious",
      "credit": "Juzar Gulamali",
      "source": "Supplied by the owner",
      "licence": "Supplied by Juzar Gulamali for use on this website",
      "blur": "data:image/webp;base64,UklGRvAAAABXRUJQVlA4IOQAAABwBQCdASoYAB4APu1urlKppiQiqAgBMB2JQBb37XJsxh4yeSwaveVaWJzVS1j0kjiUkStYAP7ackQH9IeunkEAIe6Nc7u9BcsMNyp9F6ovv77siK3aUGD7my8uJQkqWpKB97zlKN+HR59EwfZcDcTztE6rwgI96occGwgDdNCbNhj508/UQn/lZXvfdxmU3Sxol8jiJv/rwB0RfV+TrCZouGlsEZW2tsug0WOAfxxP9CP09GyCKtxVzLEQ2TfQBIPJB/juPtttR/CVhw1/B79hATRNxOHVB4VA1YtZ/VsBk+VNnAA="
  },
};

/** Named slots: where a photo is used. A slot whose image is not registered renders the designed (unlabelled) fallback. */
export const SLOTS = {
  leaderCEO: "juzar-gulamali",
  capEvents: "events-exhibitions",
  capCentres: "immersive-installations",
  capPermanent: "interactive-technology",
  previewMale: "preview-portrait-male",
  previewFemale: "preview-portrait-female",
  contactScene: "contact-scene",
  regionUae: "region-dubai",
  regionKsa: "region-riyadh",
  regionEurope: "region-poznan",
  heroPoster: "hero-poster",
} as const;
export type SlotName = keyof typeof SLOTS | (string & {});

export const imageFor = (slot: SlotName): ImageAsset | undefined => {
  const id = (SLOTS as Record<string, string>)[slot];
  return id ? IMAGES[id] : undefined;
};
