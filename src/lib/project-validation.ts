import { z } from 'zod';

export const createProjectSchema = z.object({
  project_name: z.string().min(1, 'Project name is required').max(200),
  typology: z.enum([
    'Office', 'Retail', 'Hospitality', 'Mixed Use',
    'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional',
  ]),
  project_stage: z.enum([
    'concept', 'schematic', 'design_development', 'tender', 'design_build_tender',
    'post_tender', 'gfc', 'execution', 'final', 'completed',
  ]),
  location_city: z.string().min(1, 'City is required').max(100),
  location_state: z.string().max(100).optional().default(''),
  project_year: z.number().int().min(1980).max(2100),
  built_up_area: z.number().min(0),
  carpet_area: z.number().min(0),
  saleable_area: z.number().min(0),
  leasable_area: z.number().min(0),
  source_project_id: z.string().uuid().nullable().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .omit({ source_project_id: true, location_state: true })
  .extend({ location_state: z.string().max(100).optional() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one project field is required');

