FROM node:20-alpine AS base

WORKDIR /app

COPY . .

RUN apk add --no-cache sudo jq

# Only re-install dependencies when there is a change to dependency definitions
RUN sudo find . \! -name "package*.json" -mindepth 3 -maxdepth 3 -print | xargs rm -rf
RUN sudo find . \! -name "package*.json" -type f -maxdepth 1 -delete
RUN sudo find . -name "package.json" -mindepth 1 -maxdepth 3 -exec sh -c 'jq "with_entries(select(.key == \"name\" or .key == \"version\" or .key == \"workspaces\" or .key == \"dependencies\" or .key == \"devDependencies\" or .key == \"optionalDependencies\" or .key == \"peerDependencies\"))" {} > tmp.$$ && mv tmp.$$ {}' \;


RUN npm ci -f --loglevel=warn

COPY . .

RUN npm run build

RUN npm ci -f --omit=dev --loglevel=warn
# For some reason, not all dev dependencies are pruned. This is a workaround.
RUN npm prune -f --omit=dev

ENV NODE_ENV=production

CMD ["npx", "tsx", "./server-build/main.js"]
