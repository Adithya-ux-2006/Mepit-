import type { Project, ProjectInputs } from '@/types';

export function runFormulaEngine(
  kpiCode: string,
  inputs: ProjectInputs & {
    built_up_area: number;
    carpet_area: number;
    saleable_area: number;
  }
): { value: number | null; reason?: string } {
  const {
    built_up_area: bua,
    carpet_area,
    saleable_area,
    plant_room_area,
    leasable_plant_room_area,
    shaft_area,
    office_area,
    fb_area,
    gross_area,
    occupancy_density_office,
    occupancy_density_fb,
    total_tr,
    total_airflow_cfm,
    transformer_capacity_kva,
    tenant_power_kva,
    common_area_power_kva,
    lighting_load_w,
    dg_capacity_kva,
    dg_loading_factor,
    annual_energy_kwh: annual_energy_kwh_col,
    hvac_cost,
    electrical_cost,
    dg_cost,
    fire_fighting_cost,
    stp_cost,
    phe_cost,
    bms_cost,
    fapa_cost,
    cctv_cost,
    total_mep_cost,
    operating_hours: operating_hours_col,
    extended_fields,
  } = inputs;

  // Energy fields: read from extended_fields if flat column is null
  const ext = (extended_fields ?? {}) as Record<string, unknown>;
  const annual_energy_kwh = annual_energy_kwh_col ?? (ext.annual_energy_kwh as number | null | undefined) ?? null;
  const operating_hours = operating_hours_col ?? (ext.operating_hours as number | null | undefined) ?? null;

  const safeDiv = (num: number | null, den: number | null): number | null => {
    if (num == null || den == null || den === 0) return null;
    return num / den;
  };

  const safeMul = (a: number | null, b: number | null): number | null => {
    if (a == null || b == null) return null;
    return a * b;
  };

  switch (kpiCode) {
    case 'PLANT_ROOM_PCT':
      return { value: safeMul(safeDiv(plant_room_area, bua), 100) };

    case 'LEASABLE_PLANT_ROOM_PCT':
      return { value: safeMul(safeDiv(leasable_plant_room_area, bua), 100) };

    case 'SHAFT_AREA_PCT':
      return { value: safeMul(safeDiv(shaft_area, bua), 100) };

    case 'POPULATION': {
      const officePop = safeDiv(office_area, occupancy_density_office);
      const fbPop = safeDiv(fb_area, occupancy_density_fb);
      if (officePop == null && fbPop == null) return { value: null };
      return { value: (officePop ?? 0) + (fbPop ?? 0) };
    }

    case 'COOLING_LOAD_DENSITY':
      return { value: safeDiv(carpet_area, total_tr) };

    case 'CFM_SQFT':
      return { value: safeDiv(total_airflow_cfm, carpet_area) };

    case 'KW_PER_TR': {
      const annualKwh = annual_energy_kwh;
      const tr = total_tr;
      const hrs = operating_hours ?? 3000;
      if (annualKwh == null || tr == null || tr === 0 || hrs === 0)
        return { value: null };
      return { value: annualKwh / (tr * hrs) };
    }

    case 'HVAC_RS_SQFT':
      return { value: hvac_cost ?? null };

    case 'TOTAL_VA_SQFT_CARPET': {
      const totalPower = safeMul(
        (tenant_power_kva ?? 0) + (common_area_power_kva ?? 0),
        1000
      );
      return { value: safeDiv(totalPower, carpet_area) };
    }

    case 'TOTAL_VA_SQFT_SALEABLE': {
      const totalPower = safeMul(
        (tenant_power_kva ?? 0) + (common_area_power_kva ?? 0),
        1000
      );
      return { value: safeDiv(totalPower, saleable_area) };
    }

    case 'TOTAL_VA_SQFT_BUA': {
      const totalPower = safeMul(
        (tenant_power_kva ?? 0) + (common_area_power_kva ?? 0),
        1000
      );
      return { value: safeDiv(totalPower, bua) };
    }

    case 'TRANSFORMER_DENSITY':
      return { value: safeDiv(safeMul(transformer_capacity_kva, 1000), bua) };

    case 'LIGHTING_W_SQFT':
      return { value: safeDiv(lighting_load_w, carpet_area) };

    case 'DG_LOAD_DENSITY':
      return { value: safeDiv(dg_capacity_kva, bua) };

    case 'DG_CAPACITY_DENSITY': {
      const actualLoad = safeMul(dg_capacity_kva, dg_loading_factor);
      return { value: safeDiv(actualLoad, bua) };
    }

    case 'EPI':
      return { value: safeDiv(annual_energy_kwh, gross_area) };

    case 'TOTAL_MEP_RS_SQFT':
      return { value: total_mep_cost ?? null };

    case 'ELECTRICAL_RS_SQFT':
      return { value: electrical_cost ?? null };

    case 'DG_RS_SQFT':
      return { value: dg_cost ?? null };

    case 'FF_RS_SQFT':
      return { value: fire_fighting_cost ?? null };

    case 'STP_RS_SQFT':
      return { value: stp_cost ?? null };

    case 'PHE_RS_SQFT':
      return { value: phe_cost ?? null };

    case 'BMS_RS_SQFT':
      return { value: bms_cost ?? null };

    case 'FAPA_RS_SQFT':
      return { value: fapa_cost ?? null };

    case 'CCTV_RS_SQFT':
      return { value: cctv_cost ?? null };

    default:
      return { value: null, reason: `Unknown KPI code: ${kpiCode}` };
  }
}

export function calculateSimilarity(
  target: {
    typology: string;
    built_up_area: number;
    location_city: string;
    location_state: string;
    project_year: number;
    hvac_strategy?: string;
  },
  candidate: Project,
  candidateInputs?: ProjectInputs | null
): number {
  let score = 0;

  // Typology match (35 points)
  if (candidate.typology === target.typology) {
    score += 35;
  }

  // BUA proximity (20 points)
  if (candidate.built_up_area > 0 && target.built_up_area > 0) {
    const ratio =
      Math.abs(candidate.built_up_area - target.built_up_area) /
      target.built_up_area;
    if (ratio <= 0.1) score += 20;
    else if (ratio <= 0.25) score += 12;
    else if (ratio <= 0.5) score += 6;
  }

  // Location match (15 points)
  if (
    candidate.location_city?.toLowerCase() ===
    target.location_city?.toLowerCase()
  ) {
    score += 15;
  } else if (
    candidate.location_state?.toLowerCase() ===
    target.location_state?.toLowerCase()
  ) {
    score += 8;
  }

  // Year weighting (15 points) — exponential decay favors recent projects
  const yearDiff = Math.abs(
    (candidate.project_year ?? 0) - target.project_year
  );
  const yearScore = Math.round(15 * Math.exp(-0.15 * yearDiff));
  score += yearScore;

  // HVAC strategy match (15 points)
  if (
    target.hvac_strategy &&
    candidateInputs?.hvac_strategy &&
    candidateInputs.hvac_strategy === target.hvac_strategy
  ) {
    score += 15;
  }

  return score;
}
