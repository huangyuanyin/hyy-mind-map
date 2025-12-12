# Mind Map Monorepo

A monorepo project for mind map application and library.

## Project Structure

```
mind-map/
├── apps/
│   └── mind-map/          # React application with Rsbuild
├── packages/
│   └── simple-mind-map/   # TypeScript library with Rslib
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

Start the development server for the React app:

```bash
pnpm dev
```

Build the library in watch mode:

```bash
pnpm --filter simple-mind-map dev
```

### Build

Build all packages:

```bash
pnpm build
```

Build library only:

```bash
pnpm build:lib
```

Build app only:

```bash
pnpm build:app
```

## Packages

### apps/mind-map

React application built with Rsbuild for visualizing and editing mind maps.

- **Tech Stack**: React 18, TypeScript, Rsbuild
- **Port**: 3000

### packages/simple-mind-map

Core mind map library providing data structures and basic functionality.

- **Tech Stack**: TypeScript, Rslib
- **Exports**: ESM and CJS formats

## License

MIT
