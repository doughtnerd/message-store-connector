FROM node:latest AS base

WORKDIR /usr/src

FROM base as dependencies
COPY package.json .
COPY yarn.lock .
RUN yarn install

FROM dependencies AS dev
COPY . .

# FROM dev as build
# RUN yarn run build

# FROM node:alpine AS prod