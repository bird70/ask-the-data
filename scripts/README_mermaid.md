CI Mermaid rendering
===================

Overview
--------
This repository uses a CI-only flow to render Mermaid diagrams into static SVG assets during the GitHub Actions site build. Diagrams are extracted from fenced ```mermaid``` code blocks in your markdown files and written as `.mmd` files under `assets/images/diagrams/`. Those `.mmd` files are then rendered to `assets/images/diagrams/svg/*.svg` using `@mermaid-js/mermaid-cli` (mmdc) in the workflow.

Why this approach
- Works without custom Jekyll plugins (compatible with GitHub Pages restrictions)
- Produces static SVGs that are fast to serve and can be used as `header.image`/`teaser` or inline images
- Keeps diagram rendering reproducible and under source control if you choose to commit generated assets

How it works (high level)
1. CI installs Node and `@mermaid-js/mermaid-cli`.
2. `node scripts/extract_mermaid.js` scans markdown for ```mermaid``` fences and writes `.mmd` files into `assets/images/diagrams/`.
3. The workflow runs `mmdc` to render `assets/images/diagrams/*.mmd` into `assets/images/diagrams/svg/*.svg`.
4. Jekyll builds the site; rendered SVGs are included in the generated `_site` and served.

Including diagrams in posts
- Recommended (works with baseurl):

  ```markdown
  ```mermaid
  graph TD
    A-->B
  ```

  ![diagram]({{ "/assets/images/diagrams/yourfile.svg" | absolute_url }})
  ```

- Notes:
  - The extractor will name generated files using a sanitized version of the markdown file path plus an index, e.g. `_posts_2025-11-28-Enterprise-CICD-GitHub-Actions.md_0.svg` for the first mermaid block in `_posts/2025-11-28-Enterprise-CICD-GitHub-Actions.md`.
  - Use the `absolute_url` filter so the inserted image uses the full canonical URL: `{{ '/assets/images/diagrams/name.svg' | absolute_url }}`. Ensure `site.url` and `site.baseurl` are configured in `_config.yml` so `absolute_url` resolves correctly.
  - You can keep the mermaid source block in the post for readers; the image is the rendered version displayed to readers.

Committing rendered SVGs (optional)
- Currently the CI renders SVGs at build time and does not commit them. If you want SVGs committed to the repo (for PR previews or caching), ask and I can add a workflow step to commit `assets/images/diagrams/svg/*.svg` back to the branch.

Troubleshooting
- If a diagram does not appear after CI build:
  1. Check Actions logs — `Extract Mermaid blocks` and `Render Mermaid .mmd files` steps log wrote/failed files.
  2. Confirm the predicted filename (sanitized path + index). The extractor now uses a per-file index (starts at 0) to make names deterministic.
  3. Ensure your post includes an image reference pointing to the correct file. If you prefer, I can insert image links automatically for you.

Contact
- If you'd like automatic insertion of image references after mermaid blocks, I can update the extractor to modify markdown files in CI or edit specific posts in the repo.

Automatic insertion
- The extractor now automatically inserts an image reference after each `mermaid` block when it generates the corresponding `.mmd` file. The inserted image looks like:

  ```html
  <img src="{{ "/assets/images/diagrams/yourfile.svg" | absolute_url }}" alt="diagram" onerror="this.onerror=null;this.src='{{ '/assets/images/diagrams/yourfile.svg' | relative_url }}'" />
  ```

  The script avoids duplicate insertions by checking for an existing reference to the same SVG within the next ~400 characters.

  If you prefer a different inserted format (alt text or HTML wrapper), let me know and I can change the behavior.
