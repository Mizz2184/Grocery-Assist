export interface Store {
  id: string;
  name: string;
  logo: string;
  color: string;
  website: string;
}

export const stores: Store[] = [
  {
    id: 'maxipali',
    name: 'Maxi Pali',
    logo: '/maxipali-logo.png', // Placeholder
    color: '#0071CE',
    website: 'https://www.maxipali.co.cr/',
  }
];
