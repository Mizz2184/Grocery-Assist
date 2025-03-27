export interface StoreInfo {
  id: string;
  name: string;
  logo: string;
  color: string;
  website: string;
}

export const stores: StoreInfo[] = [
  {
    id: 'maxipali',
    name: 'MaxiPali',
    logo: '/maxipali-logo.png', // Placeholder
    color: '#0071CE',
    website: 'https://www.maxipali.co.cr/',
  },
  {
    id: 'masxmenos',
    name: 'Mas x Menos',
    logo: '/masxmenos-logo.png', // Placeholder
    color: '#E3000F',
    website: 'https://www.masxmenos.cr/',
  }
];
