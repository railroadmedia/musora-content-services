

type ContentId = number
type Branch = "essentials" | "classical" | "blues"

interface LearningPath {
  id: ContentId
  thumbnail?: string
  title: string
  difficulty?: number
  branch: Branch
  intro_video_id?: number // only if we have intro videos
  published_on?: string
  // ... any other content-related fields we need
}

interface Connection {
  id: string // `${source}:${target}`, stable key
  source: ContentId // prerequisite LP
  target: ContentId // up_next LP
  branch: Branch // which branch this connection belongs to
}

interface BranchIndex {
  node_ids: ContentId[]
  edge_ids: string[]
}

interface CanonicalMapData {
  nodes: Record<ContentId, LearningPath>
  edges: Connection[]
  branches: Record<Branch, BranchIndex>
}

// example CanonicalMapData:
const exampleCurriculumMap: CanonicalMapData = {
   "nodes": {
     "1": { "id": 1, "title": "Essentials 1", "branch": "essentials" },
     "2": { "id": 2, "title": "Essentials 2", "branch": "essentials" },
     "3": { "id": 3, "title": "Essentials 3", "branch": "essentials" },
     "4": { "id": 4, "title": "Classical 1", "branch": "classical" },
     "5": { "id": 5, "title": "Classical 2", "branch": "classical" },
     "6": { "id": 6, "title": "Classical 3", "branch": "classical" },
     "7": { "id": 7, "title": "Blues 1", "branch": "blues" },
     "8": { "id": 8, "title": "Blues 2", "branch": "blues" },
     "9": { "id": 9, "title": "Blues 3", "branch": "blues" },
   },
   "edges": [
     { "id": "1-2", "source": 1, "target": 2, "branch": "essentials" },
     { "id": "2-3", "source": 2, "target": 3, "branch": "essentials" },
     { "id": "3-4", "source": 3, "target": 4, "branch": "classical" },
     { "id": "4-5", "source": 4, "target": 5, "branch": "classical" },
     { "id": "5-6", "source": 5, "target": 6, "branch": "classical" },
     { "id": "3-7", "source": 3, "target": 7, "branch": "blues" },
     { "id": "7-8", "source": 7, "target": 8, "branch": "blues" },
     { "id": "8-9", "source": 8, "target": 9, "branch": "blues" },
   ],
   "branches": {
     "essentials": {
       "node_ids": [1, 2, 3],
       "edge_ids": ["1-2", "2-3"],
     },
     "classical": {
       "node_ids": [4, 5, 6],
       "edge_ids": ["3-4", "4-5", "5-6"],
     },
     "blues": {
       "node_ids": [7, 8, 9],
       "edge_ids": ["3-7", "7-8", "8-9"],
     },
   }
 }


const exampleSongSelectionDTO =
  [
    {
      learning_path_id: 8,
      song_id: 101,
      song_title: "Fur Elise",
      song_artist: "Beethoven",
      song_difficulty: 3,
      song_thumbnail: "https://example.com/fur_elise_thumbnail.jpg",
      song_preview: "https://example.com/fur_elise_preview.mp3"
    },
  //   ... more song selections
  ]

const myPathMap = [
  "path-node-1",
  "path-node-2",
  // ... more path nodes
]

const pathNode = {
  "_id": "path-node-1",
  "name": "Learning Path 1",
  "pathStreamArray": [
    {
      "lpReferences": [
        "LP1" // learning path 1
      ],
      "isInABTest": true,
      "specificInstrument": "all"
    },
    {
      "lpReferences": [
        "LP1.1", // LP1 split into 2 smaller LPs
        "LP1.2"
      ],
      "isInABTest": true,
      "specificInstrument": "all"
    },
    {
      "lpReferences": [
        "LP1_pad-only" // a pad-only version of LP1
      ],
      "isInABTest": false,
      "specificInstrument": "pad" // matches Placement Quiz instrument options
    }
  ]
}

