[![npm version](https://badge.fury.io/js/%40doughtnerd%2Fmessage-store-connector.svg)](https://badge.fury.io/js/%40doughtnerd%2Fmessage-store-connector)
![Build and Deploy Workflow](https://github.com/doughtnerd/message-store-connector/actions/workflows/npm-package-workflow.yml/badge.svg)
![Global Coverage](https://github.com/doughtnerd/message-store-connector/blob/master/badges/coverage-global%20coverage.svg)
![Function Coverage](https://github.com/doughtnerd/message-store-connector/blob/master/badges/coverage-functions.svg)
![Branch Coverage](https://github.com/doughtnerd/message-store-connector/blob/master/badges/coverage-branches.svg)
![Statement Coverage](https://github.com/doughtnerd/message-store-connector/blob/master/badges/coverage-statements.svg)

# Message Store Connector
These docs are under active development, as the library develops, better docs will be added.

## What is it?
NodeJS library to connect to and operate on [Eventide Project's](http://docs.eventide-project.org/) [Message DB](http://docs.eventide-project.org/user-guide/message-db/).

## Why is it?
A long time ago, in a galaxy far far away I worked at a company that used [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) and [CQRS](https://martinfowler.com/bliki/CQRS.html) - specifically utilizing Eventide's Message DB. In that company we had a JS Message DB client library supporting usage of Message DB. I really enjoyed using that library and couldn't find a better equivalent in the wild. Since I've now left that company and the proprietary library behind, I figured it would be a good idea to make my own library to facilitate my personal usage of Message DB in hobby projects.

## How do I use it?

### Installation
Via npm
```bash
npm install @doughtnerd/message-store-connector
```

Via yarn
```bash
yarn add @doughtnerd/message-store-connector
```

### Code Usage


#### Connect
Everything starts with a ___connection___.
Specifically the main export of the library is this ```connect``` function:
```Javascript
import { connect } from '@doughtnerd/message-store-connector';
```

The connect function takes a single config argument, which looks like this:

```Javascript
const messageStoreConfig = {
  messageStoreHost: 'localhost', // Or wherever your MessageDB is
  messageStorePassword: 'password', // Or whatever your actual password is
  logger: console, // The logger you want the library to use internally
};
```

Put it all together and you have this:
```JavaScript
import { connect } from '@doughtnerd/message-store-connector';

const messageStoreConfig = {
  messageStoreHost: 'localhost', 
  messageStorePassword: 'password', 
  logger: console, 
};

connect(messageStoreConfig).then(messageStore => {
  // Do the things!
})
```

#### Call all the functions!
The library supports most of the MessageDB interactions listed [here](http://docs.eventide-project.org/user-guide/message-db/server-functions.html)
Once you have your connection, you can use the ```messageStore``` object to interact with your MessageDB.

```JavaScript
connect(messageStoreConfig).then(async (messageStore) => {
  const streamName = 'rickRoll-43cf527b-0fa1-433f-bad0-6834b927e243'

  const event = {
    id: '42b85f29-088e-4c53-8ba8-e2ffa9a239ea',
    type: 'UserWasRickRolled',
    data: {
      neverGonna: [
        'Give you up',
        'Let you down',
        'Turn around and forget you'
      ]
    },
    metadata: {}
  }

  await messageStore.writeMessage(streamName, event)
})
```