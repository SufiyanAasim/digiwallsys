# Development

Install dependencies from the repository root with `npm install`. Run the API
and mobile client in separate terminals with `npm run start:api` and
`npm run start:mobile`. Run `npm run verify` before each pull request.

Use Node.js 20 LTS in development and CI. Keep controller changes small and
make database invariants explicit in schema constraints and tests.
