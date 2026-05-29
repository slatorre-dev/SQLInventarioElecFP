FROM node:20-alpine
WORKDIR /app
COPY server/package.json .
RUN npm install --omit=dev
COPY server/ .
ENV PORT=3001
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=inventarioelec
ENV DB_PASS=QuesoFrito_1
ENV DB_NAME=inventario-departamento
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
