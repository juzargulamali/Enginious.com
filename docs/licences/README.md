# Image sources and licences

Every photograph used on the site has a record here (`<id>.json`, written by `scripts/images/ingest.mjs`) and an entry in `src/content/images.ts`.

| id | status | source | licence |
|---|---|---|---|
| juzar-gulamali | real | Supplied by Juzar Gulamali | Supplied by the owner for use on this website |

## Stock photography: NOT yet added
The build environment could not reach Unsplash, Pexels, Pixabay or Wikimedia (network policy), and the stock links mentioned in the brief were not included in the message, so **no stock photograph has been downloaded**. Nothing has been hotlinked. To add stock:
1. Send the links (or the downloaded files), or allow `images.unsplash.com`, `unsplash.com`, `images.pexels.com`, `pexels.com` in the environment's network settings.
2. For each chosen photo run `node scripts/images/ingest.mjs <id> <file> --alt "..." --focal 0.5,0.4 --licence "Unsplash License" --source <page url> --credit "<photographer>"` and paste the printed entry into `src/content/images.ts`, then assign it to a slot.

Rules: stock is illustrative and never presented as an Enginious installation (it carries a discreet "Illustrative image" label); stock portraits are "Preview" placeholders, never implied to be employees.
