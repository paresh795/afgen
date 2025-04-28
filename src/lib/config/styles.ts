export interface Style {
  id: string;
  name: string;
  description?: string;
}

export const styles: Style[] = [
  {
    id: 'superhero',
    name: 'Superhero',
    description: 'Classic superhero pose with cape and muscular design'
  },
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    description: 'Futuristic space warrior with high-tech armor and gadgets'
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Magical warrior with fantasy-themed clothing and accessories'
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Stylized anime character with exaggerated features'
  },
  {
    id: 'western',
    name: 'Western',
    description: 'Cowboy/cowgirl style with western-themed accessories'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary everyday hero with casual clothing'
  },
  {
    id: 'medieval',
    name: 'Medieval',
    description: 'Knight or warrior with armor and medieval weapons'
  },
  {
    id: 'spy',
    name: 'Secret Agent',
    description: 'Sophisticated spy with gadgets and formal attire'
  }
]; 