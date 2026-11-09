# Project guidance

- This is a React + Vite frontend with a local Express server and PostgreSQL persistence.
- Preserve the existing design and wording unless the user requests changes.
- Keep database credentials and private draft links out of logs, commits, and browser bundles.
- Keep server schema validation consistent with application field definitions.
- Run `npm run build` after frontend changes and `npm run test:backend` after API changes.
- Use synthetic data for verification. Do not send agency emails during testing.
- Default to local execution. Hosting or deployment requires a user request.
