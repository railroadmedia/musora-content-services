# Musora Content Services - TEST

Welcome to the **musora-content-services** repository. This package provides a collection of utility functions designed 
to fetch and manage content from our Sanity Studio. These functions are tailored to interact with our Sanity backend, 
allowing you to easily retrieve, filter, and manipulate content for use in various applications.

## Setup
To set up the Musora Content Services project for local development, follow these steps:
- Pull the latest railenvironment `php-8-3-upgrade` branch changes
- In the railenvironment directory, start up the container with the `./rrr.sh` command
- Run `r setup musora-content-services`
- Run `npm install --save-dev jest`
- Create a new `.env` file in the root of the project and copy the contents from 1Password "musora-content-services .env"

You're now set for doing basic development and running tests through npm. To set up an even better developer experience, 
you can also do the following:
- Find the location of node within the container by running `which node` in your terminal (inside the rrr shell)
  - This should be something along the lines of _/home/.nvm/versions/node/v20.14.0/bin/node_
- Add the Node interpreter to your IDE. The following steps are for PHPStorm:
  - Go to File > Settings
  - Under Languages & Frameworks, click on Node.js
  - Under the Node interpreter dropdown, click "Add..." and select "Add Remote..."
  - In the next window, choose the Docker option
    - Set the Server to Docker
    - For the Image name, use the dropdown to select _railenvironment_docker-manager:latest_ (this is the docker image 
    that we're in when running the rrr shell)
    - For the Node.js interpreter path, paste in the path from step 1 (e.g. /home/.nvm/versions/node/v20.14.0/bin/node) 
  - Apply the changes and click OK
 - You now have a Node interpreter set up that will assist in linting, tests, etc.

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

## Generating index.js and index.d.ts

The `index.js` and `index.d.ts` files provide all exported functions from this package, and are generated automatically.
Simply run `npm run build-index` to build these files. It works by running the `tools/generate-index.js` file, which simply 
parses the files under the `src/services` directory and builds up the index files with any functions tagged with `export`.

If you want to exclude any of your exported functions from the generated index files, be sure to add the function name to 
the `excludeFromGeneratedIndex` array inside the service file.

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

This repo uses JSDoc to generate API documentation. To update the docs, run:

```bash
npm run doc
```

## GitHub Page Documentation

https://railroadmedia.github.io/musora-content-services/

## Run tests
Ensure that the setup process has been completed, including copying .env file from 1Password "musora-content-services .env" 
and having jest installed (`npm install --save-dev jest`). To run the full test suite, simply run the following:
```
npm test
```
You can also filter down to specific tests with the `-- -t="..."` option. e.g. you can run the userContext test suite 
with `npm test -- -t="userContext"` or just the contentLiked test with `npm test -- -t="contentLiked"`