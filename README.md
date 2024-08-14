# Address Tags Query Submodule

This repository contains a sample TypeScript-based submodule for the Address Tags Query registry. The submodule allows for querying and returning formatted data for various blockchain addresses and their associated metadata tags.

## Prerequisites

- Node.js (recommended version 14 or higher)
- Yarn package manager

## Setup

To set up the submodule for development, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/greentea135/uniswap-v3-pools-atq-module
   ```
2. Navigate into the repository directory:

`cd your-submodule-repo`

Install the dependencies:

`yarn install`

## Development

When developing the submodule, you should adhere to the predefined settings in the `tsconfig.json` and `package.json` files provided in this repository (thought double check the registry policy to be sure). Please note that no additional packages should be used beyond what is specified within these configuration files.

## Building the Submodule

To build the submodule, run the following command:

`yarn build`

This command compiles the TypeScript files to ECMAScript modules in the dist directory.
