FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
COPY scripts/prerender.mjs ./scripts/prerender.mjs
# Public analytics/ads tag IDs only (never credentials); empty values leave tags off.
ARG VITE_SITE_URL=""
ARG VITE_GA4_ID=""
ARG VITE_GOOGLE_ADS_ID=""
ARG VITE_GOOGLE_ADS_LEAD_LABEL=""
ARG VITE_GOOGLE_ADS_CALL_LABEL=""
ARG VITE_META_PIXEL_ID=""
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001
WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node src/data ./src/data
COPY --chown=node:node migrations ./migrations

USER node
EXPOSE 3001
CMD ["node", "server/index.mjs"]
