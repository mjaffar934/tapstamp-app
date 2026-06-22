export type PassTemplateId = 'classic' | 'midnight' | 'cream';

export interface PassTemplate {
  id: PassTemplateId;
  name: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
}

export const PASS_TEMPLATES: Record<PassTemplateId, PassTemplate> = {
  classic: {
    id: 'classic',
    name: 'Classic Dark',
    backgroundColor: 'rgb(26, 24, 20)',
    foregroundColor: 'rgb(201, 169, 110)',
    labelColor: 'rgb(138, 128, 112)',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    backgroundColor: 'rgb(12, 14, 20)',
    foregroundColor: 'rgb(180, 195, 220)',
    labelColor: 'rgb(100, 110, 130)',
  },
  cream: {
    id: 'cream',
    name: 'Cream',
    backgroundColor: 'rgb(250, 248, 245)',
    foregroundColor: 'rgb(26, 24, 20)',
    labelColor: 'rgb(138, 128, 112)',
  },
};

export function resolvePassTemplate(cafe: Record<string, unknown>): PassTemplate {
  const id = String(cafe.pass_template || 'classic') as PassTemplateId;
  return PASS_TEMPLATES[id] ?? PASS_TEMPLATES.classic;
}
