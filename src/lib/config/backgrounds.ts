export interface Background {
  id: string;
  name: string;
  description?: string;
}

export const backgrounds: Background[] = [
  {
    id: 'city',
    name: 'City Skyline',
    description: 'Urban environment with tall buildings and city lights'
  },
  {
    id: 'space',
    name: 'Outer Space',
    description: 'Cosmic background with stars, planets, and nebulae'
  },
  {
    id: 'mountains',
    name: 'Mountains',
    description: 'Majestic mountain range with snow-capped peaks'
  },
  {
    id: 'beach',
    name: 'Beach',
    description: 'Tropical beach with sand, ocean, and palm trees'
  },
  {
    id: 'forest',
    name: 'Enchanted Forest',
    description: 'Mystical forest with ancient trees and magical atmosphere'
  },
  {
    id: 'battlefield',
    name: 'Battlefield',
    description: 'Epic battle scene with dramatic lighting and effects'
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    description: 'High-tech lab with scientific equipment and experiments'
  },
  {
    id: 'none',
    name: 'None',
    description: 'Plain background for focus on the figure only'
  }
]; 