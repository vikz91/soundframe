This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Code quality checks

Install dependencies with `bun install`. The `prepare` script installs Husky hooks for this checkout.

- Before a commit, lint-staged fixes ESLint issues and formats supported staged files with Prettier. ESLint warnings block the commit.
- Before a push, `bun run check` checks the whole project with ESLint, Prettier, and TypeScript. Any failure blocks the push.
- TypeScript checks generate Next.js route types, then run `tsc --noEmit --incremental false` without emitting JavaScript or a TypeScript build cache. They do not replace a production build or runtime tests.

Run the checks manually:

```bash
bun run check
# Individual checks
bun run lint
bun run format:check
bun run typecheck
# Apply fixes
bun run lint:fix
bun run format
```

Git hooks run locally and require Bun on your PATH. If hooks are missing, run `bun run prepare`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
