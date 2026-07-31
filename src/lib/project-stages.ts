import type { ProjectStage } from '@/types';

export const PROJECT_STAGES: readonly { value: ProjectStage; label: string }[] = [
  { value: 'concept', label: 'Concept Stage' },
  { value: 'schematic', label: 'Schematic Stage' },
  { value: 'design_development', label: 'Design Development (DD) Stage' },
  { value: 'tender', label: 'Tender Stage' },
  { value: 'design_build_tender', label: 'Design-Build Tender Stage' },
  { value: 'post_tender', label: 'Post-Tender Stage' },
  { value: 'gfc', label: 'GFC Stage' },
  { value: 'execution', label: 'Execution Stage' },
  { value: 'final', label: 'Final Stage' },
  { value: 'completed', label: 'Completed' },
];

export const PROJECT_STAGE_VALUES = PROJECT_STAGES.map((stage) => stage.value) as [
  ProjectStage,
  ...ProjectStage[],
];

export function getProjectStageLabel(stage: ProjectStage): string {
  return PROJECT_STAGES.find((option) => option.value === stage)?.label ?? stage;
}
