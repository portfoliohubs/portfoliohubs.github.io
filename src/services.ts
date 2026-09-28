export type ServiceStatus = 'available' | 'coming-soon';
export type ServiceId = 'cv' | 'website' | 'dsd' | 'motion';

export interface ServiceDefinition {
  id: ServiceId;
  route: string;
  title: string;
  description: string;
  status: ServiceStatus;
  authScope: string;
  requiresPromo?: boolean;
}

export const SERVICES: readonly ServiceDefinition[] = [
  {
    id: 'cv',
    route: '/cv',
    title: 'Dental CV Builder',
    description: 'Create and download an ATS-compliant, multi-format dental CV for free.',
    status: 'available',
    authScope: 'cv',
    requiresPromo: false,
  },
  {
    id: 'website',
    route: '/website',
    title: 'Doctor Website Builder',
    description: 'Create a stunning personal clinical portfolio matching international dental website standards.',
    status: 'available',
    authScope: 'website',
    requiresPromo: true,
  },
  {
    id: 'dsd',
    route: '/dsd',
    title: 'DSD Studio (Smile Design)',
    description: 'Professional browser-based Digital Smile Design canvas with golden ratio, landmarks & teeth library.',
    status: 'available',
    authScope: 'dsd',
    requiresPromo: true,
  },
  {
    id: 'motion',
    route: '/motiongraphic',
    title: 'Motion Graphic Studio',
    description: 'Transform dental cases into high-converting before/after animated video reels (1080x1920).',
    status: 'available',
    authScope: 'motion',
    requiresPromo: true,
  },
];

export function getServiceById(id: ServiceId): ServiceDefinition | undefined {
  return SERVICES.find((service) => service.id === id);
}
