FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Set default env variables for browser connection to host backend
ENV NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
ENV NEXT_PUBLIC_WS_BASE_URL=ws://127.0.0.1:8000

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
