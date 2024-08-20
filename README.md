# Musora Content Services

Welcome to the **musora-content-services** repository. This package provides a collection of utility functions designed to fetch and manage content from our Sanity Studio. These functions are tailored to interact with our Sanity backend, allowing you to easily retrieve, filter, and manipulate content for use in various applications.

## Features

- **Fetch Content by ID**: Retrieve specific content items using their unique Railcontent ID.
- **Fetch All Songs**: Get a list of all songs for a brand with pagination and search capabilities.
- **Filter Options**: Generate filtering options based on difficulty, genre, and more.
- **Fetch Related Content**: Easily fetch related lessons, songs, and content items.
- **Sanity Integration**: Simplified interaction with the Sanity API using customizable configurations.

## Installation

To install the package, use npm:

```bash
npm install musora-content-services
```

## Publishing Package Updates

To publish a new version to NPM run, 

```bash
./publish.sh
```

## Symlinking 

To link this package to the MWP repo for local development run,  

```bash
./link_mcs.sh
```

If either of these commands fail due to permissions, 

```
chmod +x <command>
```

## Publish Documentation

This repo uses JSDoc to generate API documention. To update the docs, run:

```bash
npm run doc
```

## Github Page Documentation

https://railroadmedia.github.io/musora-content-services/

## Run tests
Copy .env file from 1Password "musora-content-services .env"
Run the following to execute the tests
You may need to install jest (npm install --save-dev jest)
```
npm test
```