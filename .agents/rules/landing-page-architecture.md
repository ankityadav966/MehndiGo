# Landing Page Architecture & Workflow

The landing page located at `landing-page-mehindgo/` is an independent sub-project and sub-repository within the workspace.

## Key Invariants:
1. **Sub-Repository Isolation**:
   - `landing-page-mehindgo/` maintains its own separate `.git` repository and dependency tree (`package.json`).
   - Git queries (`git status`, `git log`, `git diff`) and commits for landing page assets MUST be executed with working directory set to `c:/MehndiGo/landing-page-mehindgo`.
2. **Build & Validation**:
   - The landing page uses Next.js (App Router, Turbopack) configured for OpenNext / Cloudflare.
   - Always run verification builds (`npm run build`) in `c:/MehndiGo/landing-page-mehindgo` to ensure no broken imports, schema issues, or TypeScript errors.
3. **Component Structure**:
   - Reusable sections live in `sections/` and standalone components in `components/`.
   - Modifying or removing UI sections must ensure schema (`lib/schema.ts`) and analytics tracking (`lib/analytics.ts`) remain clean and error-free.
