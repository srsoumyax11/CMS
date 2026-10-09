import * as z from 'zod';

export const studentCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  registration_no: z.string().regex(/^\d{10}$/, 'CampusOne Registration Number must be exactly 10 digits'),
  roll_no: z.string().optional(),
  department_id: z.string().min(1, 'Department is required'),
  course_id: z.string().min(1, 'Course is required'),
  admission_year: z.coerce.number().int().min(2000).max(2100).default(2024),
  current_semester: z.coerce.number().int().min(1).max(10).default(1),
  section: z.string().optional().default('A'),
  year: z.coerce.number().int().min(1).max(5).default(1),
});

export const studentUpdateSchema = z.object({
  name: z.string().min(2, 'Name is required').optional(),
  registration_no: z.string().regex(/^\d{10}$/, 'CampusOne Registration Number must be exactly 10 digits').optional(),
  roll_no: z.string().optional(),
  department_id: z.string().optional(),
  course_id: z.string().optional(),
  admission_year: z.coerce.number().int().min(2000).max(2100).optional(),
  current_semester: z.coerce.number().int().min(1).max(10).optional(),
  section: z.string().optional(),
  year: z.coerce.number().int().min(1).max(5).optional(),
});

export const complaintCreateSchema = z.object({
  category: z.enum(['electrical', 'plumbing', 'wifi', 'cleanliness', 'furniture', 'security', 'other']),
  location_hostel: z.string().min(1, 'Hostel location is required'),
  location_room: z.string().optional().nullable(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const outpassCreateSchema = z.object({
  destination: z.string().min(2, 'Destination is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  departure_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid departure time',
  }),
  expected_return_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid return time',
  }),
}).refine((data) => {
  const dep = new Date(data.departure_time).getTime();
  const ret = new Date(data.expected_return_time).getTime();
  return ret > dep;
}, {
  message: 'Return time must be after departure time',
  path: ['expected_return_time'],
});

export type StudentCreateFormValues = z.infer<typeof studentCreateSchema>;
export type StudentUpdateFormValues = z.infer<typeof studentUpdateSchema>;
export type ComplaintCreateFormValues = z.infer<typeof complaintCreateSchema>;
export type OutpassCreateFormValues = z.infer<typeof outpassCreateSchema>;
