FROM node:20-alpine
WORKDIR /app

COPY railway/package.json railway/package-lock.json* ./railway/
RUN npm install --prefix railway --omit=dev

COPY railway ./railway
COPY website ./website

ENV NODE_ENV=production

WORKDIR /app/railway
CMD ["npm", "start"]
