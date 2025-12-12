# simple-mind-map

A simple mind map library built with TypeScript.

## Installation

```bash
pnpm add simple-mind-map
```

## Usage

```typescript
import { MindMap } from 'simple-mind-map';

const mindMap = new MindMap({
  container: '#mind-map',
  data: {
    id: 'root',
    text: 'Root Node',
    children: [
      {
        id: 'child1',
        text: 'Child 1',
      },
      {
        id: 'child2',
        text: 'Child 2',
      },
    ],
  },
});
```

## API

### MindMap

#### Constructor Options

- `container`: HTMLElement or selector string
- `data`: Initial mind map data
- `draggable`: Enable drag and drop (default: true)
- `zoomable`: Enable zoom (default: true)

#### Methods

- `setData(data)`: Set mind map data
- `getData()`: Get mind map data
- `getRoot()`: Get root node
- `addNode(parentId, data)`: Add a node
- `removeNode(id)`: Remove a node
- `destroy()`: Destroy mind map instance

## License

MIT
