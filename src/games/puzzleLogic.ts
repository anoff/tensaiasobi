import { shuffle } from '../utils/shuffle';

// Types & Helper Functions


export interface EdgeProfile {
  top: 'none' | 'tab' | 'blank';
  right: 'none' | 'tab' | 'blank';
  bottom: 'none' | 'tab' | 'blank';
  left: 'none' | 'tab' | 'blank';
}


export function generateEdgeProfiles(size: number): EdgeProfile[] {
  const profiles: EdgeProfile[] = Array.from({ length: size * size }, () => ({
    top: 'none',
    right: 'none',
    bottom: 'none',
    left: 'none',
  }));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;


      if (r === 0) {
        profiles[idx].top = 'none';
      } else {
        const topIdx = (r - 1) * size + c;
        profiles[idx].top = profiles[topIdx].bottom === 'tab' ? 'blank' : 'tab';
      }


      if (c === 0) {
        profiles[idx].left = 'none';
      } else {
        const leftIdx = r * size + (c - 1);
        profiles[idx].left = profiles[leftIdx].right === 'tab' ? 'blank' : 'tab';
      }


      if (c === size - 1) {
        profiles[idx].right = 'none';
      } else {
        profiles[idx].right = Math.random() < 0.5 ? 'tab' : 'blank';
      }


      if (r === size - 1) {
        profiles[idx].bottom = 'none';
      } else {
        profiles[idx].bottom = Math.random() < 0.5 ? 'tab' : 'blank';
      }
    }
  }

  return profiles;
}


export function getJigsawPath(profile: EdgeProfile): string {
  let path = 'M 0,0';

  // Top edge (0,0 to 100,0)
  if (profile.top === 'none') {
    path += ' L 100,0';
  } else if (profile.top === 'tab') {
    path += ' L 40,0 C 35,-6 35,-18 50,-18 C 65,-18 65,-6 60,0 L 100,0';
  } else {
    path += ' L 40,0 C 35,6 35,18 50,18 C 65,18 65,6 60,0 L 100,0';
  }

  // Right edge (100,0 to 100,100)
  if (profile.right === 'none') {
    path += ' L 100,100';
  } else if (profile.right === 'tab') {
    path += ' L 100,40 C 106,35 118,35 118,50 C 118,65 106,65 100,60 L 100,100';
  } else {
    path += ' L 100,40 C 94,35 82,35 82,50 C 82,65 94,65 100,60 L 100,100';
  }

  // Bottom edge (100,100 to 0,100)
  if (profile.bottom === 'none') {
    path += ' L 0,100';
  } else if (profile.bottom === 'tab') {
    path += ' L 60,100 C 65,106 65,118 50,118 C 35,118 35,106 40,100 L 0,100';
  } else {
    path += ' L 60,100 C 65,94 65,82 50,82 C 35,82 35,94 40,100 L 0,100';
  }

  // Left edge (0,100 to 0,0)
  if (profile.left === 'none') {
    path += ' L 0,0';
  } else if (profile.left === 'tab') {
    path += ' L 0,60 C -6,65 -18,65 -18,50 C -18,35 -6,35 0,40 L 0,0';
  } else {
    path += ' L 0,60 C 6,65 18,65 18,50 C 18,35 6,35 0,40 L 0,0';
  }

  path += ' Z';
  return path;
}

interface GameInitData {
  initialBoard: (number | null)[];
  initialTray: number[];
}


export function generateInitialState(size: number): GameInitData {
  const total = size * size;
  
  const initialBoard: (number | null)[] = Array.from({ length: total }, () => null);


  const initialTray = shuffle(Array.from({ length: total }, (_, i) => i));

  return {
    initialBoard,
    initialTray,
  };
}


