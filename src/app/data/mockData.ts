export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: 'residential' | 'commercial';
  status: 'active' | 'inactive';
  totalJobs: number;
  totalRevenue: number;
  createdAt: string;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  type: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'upgrade';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours?: number;
  cost: number;
  description: string;
  address: string;
}

export interface Estimate {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  items: EstimateItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: string;
  validUntil: string;
}

export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ScheduleEvent {
  id: string;
  jobId: string;
  title: string;
  start: Date;
  end: Date;
  type: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'upgrade';
  customerName: string;
  address: string;
}

export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Johnson Residence',
    email: 'mark.johnson@email.com',
    phone: '(555) 123-4567',
    address: '123 Oak Street, Springfield, IL 62701',
    type: 'residential',
    status: 'active',
    totalJobs: 8,
    totalRevenue: 12500,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Springfield Mall',
    email: 'facilities@springfieldmall.com',
    phone: '(555) 234-5678',
    address: '456 Commerce Drive, Springfield, IL 62702',
    type: 'commercial',
    status: 'active',
    totalJobs: 15,
    totalRevenue: 45000,
    createdAt: '2023-06-20',
  },
  {
    id: '3',
    name: 'Sarah Williams',
    email: 'sarah.w@email.com',
    phone: '(555) 345-6789',
    address: '789 Maple Avenue, Springfield, IL 62703',
    type: 'residential',
    status: 'active',
    totalJobs: 3,
    totalRevenue: 4200,
    createdAt: '2025-03-10',
  },
  {
    id: '4',
    name: 'Downtown Office Complex',
    email: 'management@downtownoffice.com',
    phone: '(555) 456-7890',
    address: '321 Business Boulevard, Springfield, IL 62704',
    type: 'commercial',
    status: 'active',
    totalJobs: 22,
    totalRevenue: 68000,
    createdAt: '2023-02-01',
  },
  {
    id: '5',
    name: 'Robert Chen',
    email: 'rchen@email.com',
    phone: '(555) 567-8901',
    address: '654 Pine Road, Springfield, IL 62705',
    type: 'residential',
    status: 'active',
    totalJobs: 5,
    totalRevenue: 7800,
    createdAt: '2024-08-22',
  },
];

export const mockJobs: Job[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'Johnson Residence',
    title: 'Electrical Panel Upgrade',
    type: 'upgrade',
    status: 'scheduled',
    priority: 'high',
    scheduledDate: '2026-04-08T09:00:00',
    estimatedHours: 6,
    cost: 2800,
    description: 'Upgrade 100A panel to 200A service. Replace old breakers and add new circuits for kitchen renovation.',
    address: '123 Oak Street, Springfield, IL 62701',
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'Springfield Mall',
    title: 'Emergency Exit Lighting Repair',
    type: 'repair',
    status: 'in-progress',
    priority: 'urgent',
    scheduledDate: '2026-04-05T08:00:00',
    estimatedHours: 4,
    actualHours: 3,
    cost: 1200,
    description: 'Fix malfunctioning emergency exit lights in south wing. Code compliance issue.',
    address: '456 Commerce Drive, Springfield, IL 62702',
  },
  {
    id: '3',
    customerId: '3',
    customerName: 'Sarah Williams',
    title: 'Ceiling Fan Installation',
    type: 'installation',
    status: 'completed',
    priority: 'low',
    scheduledDate: '2026-03-28T10:00:00',
    completedDate: '2026-03-28T12:30:00',
    estimatedHours: 2,
    actualHours: 2.5,
    cost: 450,
    description: 'Install 3 ceiling fans in bedrooms. Customer providing fans.',
    address: '789 Maple Avenue, Springfield, IL 62703',
  },
  {
    id: '4',
    customerId: '4',
    customerName: 'Downtown Office Complex',
    title: 'Quarterly Electrical Inspection',
    type: 'inspection',
    status: 'scheduled',
    priority: 'medium',
    scheduledDate: '2026-04-10T13:00:00',
    estimatedHours: 8,
    cost: 1800,
    description: 'Comprehensive electrical system inspection for all floors. Generate compliance report.',
    address: '321 Business Boulevard, Springfield, IL 62704',
  },
  {
    id: '5',
    customerId: '5',
    customerName: 'Robert Chen',
    title: 'Outlet and Switch Replacement',
    type: 'maintenance',
    status: 'completed',
    priority: 'low',
    scheduledDate: '2026-04-01T14:00:00',
    completedDate: '2026-04-01T16:00:00',
    estimatedHours: 3,
    actualHours: 2,
    cost: 680,
    description: 'Replace 15 outdated outlets and 8 light switches throughout home.',
    address: '654 Pine Road, Springfield, IL 62705',
  },
  {
    id: '6',
    customerId: '2',
    customerName: 'Springfield Mall',
    title: 'LED Lighting Conversion',
    type: 'upgrade',
    status: 'scheduled',
    priority: 'medium',
    scheduledDate: '2026-04-15T07:00:00',
    estimatedHours: 16,
    cost: 8500,
    description: 'Convert all parking lot lighting to LED. Energy efficiency upgrade project.',
    address: '456 Commerce Drive, Springfield, IL 62702',
  },
];

export const mockEstimates: Estimate[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'Johnson Residence',
    title: 'Electrical Panel Upgrade',
    description: 'Complete electrical panel upgrade with new service entrance',
    items: [
      {
        id: '1',
        description: '200A Electrical Panel',
        quantity: 1,
        unitPrice: 850,
        total: 850,
      },
      {
        id: '2',
        description: 'Circuit Breakers (20A)',
        quantity: 8,
        unitPrice: 45,
        total: 360,
      },
      {
        id: '3',
        description: 'Labor - Panel Installation',
        quantity: 6,
        unitPrice: 125,
        total: 750,
      },
      {
        id: '4',
        description: 'Permit and Inspection',
        quantity: 1,
        unitPrice: 350,
        total: 350,
      },
    ],
    subtotal: 2310,
    tax: 184.80,
    total: 2494.80,
    status: 'approved',
    createdAt: '2026-03-20',
    validUntil: '2026-05-20',
  },
  {
    id: '2',
    customerId: '3',
    customerName: 'Sarah Williams',
    title: 'Home Office Electrical Setup',
    description: 'Add dedicated circuits for home office equipment',
    items: [
      {
        id: '1',
        description: 'Dedicated 20A Circuit Installation',
        quantity: 2,
        unitPrice: 450,
        total: 900,
      },
      {
        id: '2',
        description: 'Surge Protected Outlets',
        quantity: 6,
        unitPrice: 75,
        total: 450,
      },
      {
        id: '3',
        description: 'Cable Management System',
        quantity: 1,
        unitPrice: 200,
        total: 200,
      },
    ],
    subtotal: 1550,
    tax: 124,
    total: 1674,
    status: 'sent',
    createdAt: '2026-04-01',
    validUntil: '2026-05-01',
  },
  {
    id: '3',
    customerId: '4',
    customerName: 'Downtown Office Complex',
    title: 'Conference Room Electrical Upgrade',
    description: 'Modernize electrical for AV equipment and lighting',
    items: [
      {
        id: '1',
        description: 'Floor Power Outlets',
        quantity: 8,
        unitPrice: 180,
        total: 1440,
      },
      {
        id: '2',
        description: 'Smart Dimmer Switches',
        quantity: 6,
        unitPrice: 95,
        total: 570,
      },
      {
        id: '3',
        description: 'Electrical Rewiring',
        quantity: 12,
        unitPrice: 150,
        total: 1800,
      },
      {
        id: '4',
        description: 'Labor',
        quantity: 16,
        unitPrice: 125,
        total: 2000,
      },
    ],
    subtotal: 5810,
    tax: 464.80,
    total: 6274.80,
    status: 'draft',
    createdAt: '2026-04-03',
    validUntil: '2026-06-03',
  },
];

export const mockScheduleEvents: ScheduleEvent[] = mockJobs
  .filter(job => job.status !== 'completed' && job.status !== 'cancelled')
  .map(job => ({
    id: job.id,
    jobId: job.id,
    title: job.title,
    start: new Date(job.scheduledDate),
    end: new Date(new Date(job.scheduledDate).getTime() + job.estimatedHours * 60 * 60 * 1000),
    type: job.type,
    customerName: job.customerName,
    address: job.address,
  }));
