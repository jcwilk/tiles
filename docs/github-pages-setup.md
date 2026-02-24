# GitHub Pages Setup

The deploy workflow (`.github/workflows/deploy.yml`) builds the frontend and uploads it as a Pages artifact. For the site to be served at `https://<user>.github.io/tiles/`, the repository must be configured to use that artifact.

## One-Time Manual Step

GitHub Pages source selection cannot be automated via workflow files. Configure it once in the repository settings:

1. Open the repository on GitHub.
2. Go to **Settings** → **Pages** (under "Code and automation").
3. Under **Build and deployment** → **Source**, select **GitHub Actions** (not "Deploy from a branch").

Once set, each push to `master` will deploy the built frontend to GitHub Pages. The site will be available at `https://<user>.github.io/tiles/` (replace `<user>` with the repository owner).

## Workflow Behavior

The deploy workflow:

- Builds the frontend with Vite (`frontend/dist`)
- Uploads the artifact via `actions/upload-pages-artifact`
- Deploys via `actions/deploy-pages` (requires the `github-pages` environment)

If Pages source is set to a branch instead of GitHub Actions, the workflow will succeed but the site will not be served from the artifact.
