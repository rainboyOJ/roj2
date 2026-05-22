FROM node:25-bookworm-slim

WORKDIR /app

ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci --ignore-scripts --include=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "dev:api"]
