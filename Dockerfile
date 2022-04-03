FROM node:latest AS base

WORKDIR /usr/src

FROM base as dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install --no-audit --prefer-offline

FROM dependencies AS dev
COPY . .

# FROM dev as build
# RUN yarn run build

# FROM node:alpine AS prod