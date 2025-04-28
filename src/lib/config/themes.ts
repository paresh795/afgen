export interface Theme {
  id: string;
  name: string;
  description?: string;
  colorScheme?: {
    primary: string;
    secondary: string;
    accent?: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'heroic',
    name: 'Heroic',
    description: 'Bold, bright colors with emphasis on primary tones',
    colorScheme: {
      primary: '#3498db',
      secondary: '#e74c3c',
      accent: '#f1c40f'
    }
  },
  {
    id: 'villain',
    name: 'Villain',
    description: 'Dark, ominous tones with accents of neon',
    colorScheme: {
      primary: '#2c3e50',
      secondary: '#8e44ad',
      accent: '#27ae60'
    }
  },
  {
    id: 'futuristic',
    name: 'Futuristic',
    description: 'Sleek, chrome-like finishes with glowing elements',
    colorScheme: {
      primary: '#34495e',
      secondary: '#3498db',
      accent: '#1abc9c'
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Retro styling with faded colors and classic design',
    colorScheme: {
      primary: '#d35400',
      secondary: '#f39c12',
      accent: '#95a5a6'
    }
  },
  {
    id: 'magical',
    name: 'Magical',
    description: 'Mystical appearance with ethereal color combinations',
    colorScheme: {
      primary: '#8e44ad',
      secondary: '#3498db',
      accent: '#f1c40f'
    }
  },
  {
    id: 'stealth',
    name: 'Stealth',
    description: 'Dark, tactical appearance with minimal reflective surfaces',
    colorScheme: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
      accent: '#c0392b'
    }
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless design with balanced color palette',
    colorScheme: {
      primary: '#2980b9',
      secondary: '#e74c3c',
      accent: '#f1c40f'
    }
  }
]; 