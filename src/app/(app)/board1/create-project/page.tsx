'use client';

import { useState, useCallback, useEffect, Suspense, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  createProject,
  upsertProjectInputs,
  updateProjectStatus,
  validateProjectInputs,
  getProjectById,
  getProjectInputs,
  getProjects,
  updateProject,
  isSessionExpiredError,
  refreshSession,
  type ValidationError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSkeleton } from '@/components/ui/loading-buffer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertTriangle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogIn,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import {
  COST_FIELDS,
  ENGINEERING_SERVICE_GROUPS,
  PROJECT_INPUT_FIELD_META,
  TOTAL_COST_FIELDS,
  getComputedFields,
  flattenExtendedFields,
  collectExtendedFields,
  type ProjectInputField,
  type ComputedFieldDef,
  type EngineeringServiceGroup,
} from '@/lib/project-input-config';
import { getRequiredValidationErrors } from '@/lib/validation-engine';
import {
  normalizeProjectFormErrorField,
  parseProjectFormApiError,
} from '@/lib/project-form-errors';
import { getProjectStageLabel, PROJECT_STAGES } from '@/lib/project-stages';
import type { Project, ProjectInputs, ProjectStage } from '@/types';

interface FormState {
  // Project identity
  project_name: string;
  typology: string;
  project_stage: string;
  location_city: string;
  location_state: string;
  project_year: number;
  // Area fields (moved from Project Identity to Architectural Parameters section)
  built_up_area: number | null;
  carpet_area: number | null;
  saleable_area: number | null;
  leasable_area: number | null;
  // All design parameter fields (existing columns + extended fields, all flat)
  [key: string]: unknown;
}

// Defaults for all known fields
const EXISTING_FIELD_DEFAULTS: Record<string, unknown> = {
  plant_room_area: null,
  leasable_plant_room_area: null,
  shaft_area: null,
  office_area: null,
  fb_area: null,
  gross_area: null,
  occupancy_density_office: null,
  occupancy_density_fb: null,
  total_tr: null,
  total_airflow_cfm: null,
  hvac_strategy: '',
  transformer_capacity_kva: null,
  tenant_power_kva: null,
  common_area_power_kva: null,
  lighting_load_w: null,
  dg_capacity_kva: null,
  dg_loading_factor: null,
  annual_energy_kwh: null,
  hvac_cost: null,
  electrical_cost: null,
  dg_cost: null,
  fire_fighting_cost: null,
  stp_cost: null,
  phe_cost: null,
  bms_cost: null,
  fapa_cost: null,
  cctv_cost: null,
  total_mep_cost: null,
  operating_hours: 3000,
};

const defaultForm: FormState = {
  project_name: '',
  typology: '',
  project_stage: '',
  location_city: '',
  location_state: '',
  project_year: new Date().getFullYear(),
  built_up_area: null,
  carpet_area: null,
  saleable_area: null,
  leasable_area: null,
  ...EXISTING_FIELD_DEFAULTS,
};

interface TypologyProfile {
  carpetPct: number;
  saleablePct: number;
  leasablePct: number;
  plantRoomPct: number;
  leasablePlantRoomPct: number;
  shaftAreaPct: number;
  occupancyDensityOffice: number;
  occupancyDensityRetail: number;
  occupancyDensityFb: number;
  lightingLoadW: number;
  lightingGainOffice: number;
  lightingGainRetail: number;
  lightingGainFb: number;
  equipmentGainOffice: number;
  equipmentGainRetail: number;
  equipmentGainFb: number;
  coolingLoadDensity: number;
  cfmSqft: number;
  transformerDensity: number;
  dgLoadingFactor: number;
  hvacCost: number;
  electricalCost: number;
  dgCost: number;
  fireFightingCost: number;
  stpCost: number;
  pheCost: number;
  bmsCost: number;
  fapaCost: number;
  cctvCost: number;
  totalMepCost: number;
  outdoorDbTemp: number;
  outdoorWbTemp: number;
  diversity: number;
}

const TYPOLOGY_PROFILES: Record<string, TypologyProfile> = {
  Office: {
    carpetPct: 0.65, saleablePct: 0.75, leasablePct: 0.70,
    plantRoomPct: 0.035, leasablePlantRoomPct: 0.015, shaftAreaPct: 0.015,
    occupancyDensityOffice: 100, occupancyDensityRetail: 0, occupancyDensityFb: 0,
    lightingLoadW: 1.2, lightingGainOffice: 1.0, lightingGainRetail: 0, lightingGainFb: 0,
    equipmentGainOffice: 1.5, equipmentGainRetail: 0, equipmentGainFb: 0,
    coolingLoadDensity: 400, cfmSqft: 1.8,
    transformerDensity: 5.5, dgLoadingFactor: 0.8,
    hvacCost: 850, electricalCost: 650, dgCost: 180,
    fireFightingCost: 250, stpCost: 120, pheCost: 150,
    bmsCost: 80, fapaCost: 120, cctvCost: 60, totalMepCost: 2460,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.8,
  },
  Retail: {
    carpetPct: 0.55, saleablePct: 0.60, leasablePct: 0.58,
    plantRoomPct: 0.04, leasablePlantRoomPct: 0.02, shaftAreaPct: 0.02,
    occupancyDensityOffice: 0, occupancyDensityRetail: 60, occupancyDensityFb: 40,
    lightingLoadW: 2.0, lightingGainOffice: 0, lightingGainRetail: 1.8, lightingGainFb: 1.5,
    equipmentGainOffice: 0, equipmentGainRetail: 2.0, equipmentGainFb: 2.5,
    coolingLoadDensity: 350, cfmSqft: 2.0,
    transformerDensity: 6.0, dgLoadingFactor: 0.85,
    hvacCost: 900, electricalCost: 700, dgCost: 200,
    fireFightingCost: 280, stpCost: 130, pheCost: 160,
    bmsCost: 85, fapaCost: 130, cctvCost: 70, totalMepCost: 2655,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.75,
  },
  'Mixed Use': {
    carpetPct: 0.60, saleablePct: 0.68, leasablePct: 0.65,
    plantRoomPct: 0.04, leasablePlantRoomPct: 0.018, shaftAreaPct: 0.018,
    occupancyDensityOffice: 100, occupancyDensityRetail: 60, occupancyDensityFb: 40,
    lightingLoadW: 1.5, lightingGainOffice: 1.0, lightingGainRetail: 1.5, lightingGainFb: 1.2,
    equipmentGainOffice: 1.5, equipmentGainRetail: 1.8, equipmentGainFb: 2.0,
    coolingLoadDensity: 380, cfmSqft: 1.9,
    transformerDensity: 5.8, dgLoadingFactor: 0.82,
    hvacCost: 880, electricalCost: 680, dgCost: 190,
    fireFightingCost: 260, stpCost: 125, pheCost: 155,
    bmsCost: 82, fapaCost: 125, cctvCost: 65, totalMepCost: 2562,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.78,
  },
  Residential: {
    carpetPct: 0.70, saleablePct: 0.80, leasablePct: 0.75,
    plantRoomPct: 0.03, leasablePlantRoomPct: 0.012, shaftAreaPct: 0.012,
    occupancyDensityOffice: 0, occupancyDensityRetail: 0, occupancyDensityFb: 0,
    lightingLoadW: 0.8, lightingGainOffice: 0, lightingGainRetail: 0, lightingGainFb: 0,
    equipmentGainOffice: 0.8, equipmentGainRetail: 0, equipmentGainFb: 0,
    coolingLoadDensity: 450, cfmSqft: 1.5,
    transformerDensity: 4.5, dgLoadingFactor: 0.7,
    hvacCost: 700, electricalCost: 550, dgCost: 150,
    fireFightingCost: 200, stpCost: 100, pheCost: 130,
    bmsCost: 60, fapaCost: 100, cctvCost: 50, totalMepCost: 2040,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.7,
  },
  Hospitality: {
    carpetPct: 0.55, saleablePct: 0.60, leasablePct: 0.58,
    plantRoomPct: 0.045, leasablePlantRoomPct: 0.025, shaftAreaPct: 0.02,
    occupancyDensityOffice: 0, occupancyDensityRetail: 0, occupancyDensityFb: 30,
    lightingLoadW: 1.8, lightingGainOffice: 0, lightingGainRetail: 0, lightingGainFb: 1.5,
    equipmentGainOffice: 0, equipmentGainRetail: 0, equipmentGainFb: 3.0,
    coolingLoadDensity: 320, cfmSqft: 2.2,
    transformerDensity: 6.5, dgLoadingFactor: 0.85,
    hvacCost: 950, electricalCost: 750, dgCost: 210,
    fireFightingCost: 300, stpCost: 140, pheCost: 170,
    bmsCost: 90, fapaCost: 140, cctvCost: 75, totalMepCost: 2825,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.75,
  },
  Healthcare: {
    carpetPct: 0.55, saleablePct: 0.60, leasablePct: 0.58,
    plantRoomPct: 0.05, leasablePlantRoomPct: 0.03, shaftAreaPct: 0.025,
    occupancyDensityOffice: 80, occupancyDensityRetail: 0, occupancyDensityFb: 0,
    lightingLoadW: 2.2, lightingGainOffice: 1.2, lightingGainRetail: 0, lightingGainFb: 0,
    equipmentGainOffice: 2.0, equipmentGainRetail: 0, equipmentGainFb: 0,
    coolingLoadDensity: 280, cfmSqft: 2.5,
    transformerDensity: 7.0, dgLoadingFactor: 0.9,
    hvacCost: 1100, electricalCost: 850, dgCost: 250,
    fireFightingCost: 320, stpCost: 150, pheCost: 180,
    bmsCost: 100, fapaCost: 150, cctvCost: 80, totalMepCost: 3180,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.85,
  },
  Industrial: {
    carpetPct: 0.75, saleablePct: 0.85, leasablePct: 0.80,
    plantRoomPct: 0.025, leasablePlantRoomPct: 0.01, shaftAreaPct: 0.01,
    occupancyDensityOffice: 120, occupancyDensityRetail: 0, occupancyDensityFb: 0,
    lightingLoadW: 1.0, lightingGainOffice: 0.8, lightingGainRetail: 0, lightingGainFb: 0,
    equipmentGainOffice: 1.0, equipmentGainRetail: 0, equipmentGainFb: 0,
    coolingLoadDensity: 500, cfmSqft: 1.5,
    transformerDensity: 8.0, dgLoadingFactor: 0.75,
    hvacCost: 600, electricalCost: 500, dgCost: 140,
    fireFightingCost: 180, stpCost: 90, pheCost: 120,
    bmsCost: 50, fapaCost: 90, cctvCost: 45, totalMepCost: 1815,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.7,
  },
  'Data Centre': {
    carpetPct: 0.50, saleablePct: 0.55, leasablePct: 0.52,
    plantRoomPct: 0.06, leasablePlantRoomPct: 0.04, shaftAreaPct: 0.025,
    occupancyDensityOffice: 150, occupancyDensityRetail: 0, occupancyDensityFb: 0,
    lightingLoadW: 0.6, lightingGainOffice: 0.5, lightingGainRetail: 0, lightingGainFb: 0,
    equipmentGainOffice: 5.0, equipmentGainRetail: 0, equipmentGainFb: 0,
    coolingLoadDensity: 200, cfmSqft: 3.0,
    transformerDensity: 10.0, dgLoadingFactor: 0.95,
    hvacCost: 1500, electricalCost: 1200, dgCost: 350,
    fireFightingCost: 400, stpCost: 100, pheCost: 150,
    bmsCost: 120, fapaCost: 180, cctvCost: 100, totalMepCost: 4100,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.9,
  },
  Institutional: {
    carpetPct: 0.65, saleablePct: 0.72, leasablePct: 0.68,
    plantRoomPct: 0.035, leasablePlantRoomPct: 0.015, shaftAreaPct: 0.015,
    occupancyDensityOffice: 80, occupancyDensityRetail: 0, occupancyDensityFb: 0,
    lightingLoadW: 1.0, lightingGainOffice: 0.8, lightingGainRetail: 0, lightingGainFb: 0,
    equipmentGainOffice: 1.2, equipmentGainRetail: 0, equipmentGainFb: 0,
    coolingLoadDensity: 420, cfmSqft: 1.7,
    transformerDensity: 5.0, dgLoadingFactor: 0.75,
    hvacCost: 750, electricalCost: 600, dgCost: 160,
    fireFightingCost: 220, stpCost: 110, pheCost: 140,
    bmsCost: 70, fapaCost: 110, cctvCost: 55, totalMepCost: 2215,
    outdoorDbTemp: 36, outdoorWbTemp: 28, diversity: 0.75,
  },
};

function generateAutoFillData(form: FormState): Record<string, unknown> {
  const bua = form.built_up_area ?? 0;
  if (bua <= 0) return {};

  const profile = TYPOLOGY_PROFILES[form.typology] ?? TYPOLOGY_PROFILES.Office;
  const carpetArea = Math.round(bua * profile.carpetPct);
  const saleableArea = Math.round(bua * profile.saleablePct);
  const leasableArea = Math.round(bua * profile.leasablePct);
  const plantRoomArea = Math.round(bua * profile.plantRoomPct);
  const leasablePlantRoom = Math.round(bua * profile.leasablePlantRoomPct);
  const shaftArea = Math.round(bua * profile.shaftAreaPct);
  const officeArea = Math.round(bua * 0.7);
  const fbArea = Math.round(bua * 0.1);
  const grossArea = Math.round(bua * 1.05);

  const totalTr = Math.round(bua / profile.coolingLoadDensity);
  const totalAirflowCfm = Math.round(bua * profile.cfmSqft);
  const transformerCapacity = Math.round(bua * profile.transformerDensity);
  const tenantPower = Math.round(transformerCapacity * 0.65);
  const commonAreaPower = Math.round(transformerCapacity * 0.35);
  const dgCapacity = Math.round(transformerCapacity * 0.6);

  const chillerTonnageWater = Math.round(totalTr * 0.7);
  const chillerTonnageAir = totalTr - chillerTonnageWater;
  const chwPrimaryFlowGpm = Math.round(totalTr * 3);
  const chwPrimaryPowerKw = Math.round(chwPrimaryFlowGpm * 0.05);
  const chwSecondaryFlowGpm = Math.round(chwPrimaryFlowGpm * 0.8);
  const chwSecondaryPowerKw = Math.round(chwSecondaryFlowGpm * 0.04);
  const condenserFlowGpm = Math.round(chwPrimaryFlowGpm * 1.2);
  const condenserPowerKw = Math.round(condenserFlowGpm * 0.035);

  const dehumidifiedCfm = Math.round(totalAirflowCfm * 0.3);
  const freshAirflow = Math.round(totalAirflowCfm * 0.25);
  const ahuFanKw = Math.round(totalAirflowCfm * 0.0015);
  const tfahuFanKw = Math.round(freshAirflow * 0.002);

  const commonAreaPowerVa = Math.round(commonAreaPower * 1000 / carpetArea * 100) / 100;
  const tenantPowerVa = Math.round(tenantPower * 1000 / carpetArea * 100) / 100;
  const totalConnectedLoad = Math.round(transformerCapacity * 0.9);
  const totalDemandLoad = Math.round(totalConnectedLoad * profile.diversity);

  const stpKld = Math.round(bua * 0.00005);
  const ugtRawWater = Math.round(stpKld * 1.2);
  const ugtTreatedWater = Math.round(stpKld * 0.8);
  const ugtDomesticWater = Math.round(stpKld * 0.6);
  const ugtFlushingWater = Math.round(stpKld * 0.4);
  const ohtDomesticWater = Math.round(stpKld * 0.3);
  const ohtFlushingWater = Math.round(stpKld * 0.2);

  const ffUndergroundTank = Math.round(bua * 0.00002);
  const ffOverheadTank = Math.round(ffUndergroundTank * 0.5);

  const occupancyHvac = bua / (profile.occupancyDensityOffice || 100);
  const occupancyPhe = bua / (profile.occupancyDensityOffice || 100);

  return {
    built_up_area: bua,
    carpet_area: carpetArea,
    saleable_area: saleableArea,
    leasable_area: leasableArea,
    plant_room_area: plantRoomArea,
    leasable_plant_room_area: leasablePlantRoom,
    shaft_area: shaftArea,
    office_area: officeArea,
    fb_area: fbArea,
    gross_area: grossArea,
    occupancy_density_office: profile.occupancyDensityOffice || null,
    occupancy_density_fb: profile.occupancyDensityFb || null,
    occupancy_hvac_bua: Math.round(profile.occupancyDensityOffice || 100),
    occupancy_phe_bua: Math.round(profile.occupancyDensityOffice || 100),
    total_tr: totalTr,
    total_airflow_cfm: totalAirflowCfm,
    hvac_strategy: 'Central Plant',
    lighting_load_w: profile.lightingLoadW,
    transformer_capacity_kva: transformerCapacity,
    tenant_power_kva: tenantPower,
    common_area_power_kva: commonAreaPower,
    dg_capacity_kva: dgCapacity,
    dg_loading_factor: profile.dgLoadingFactor,
    annual_energy_kwh: Math.round(bua * 150),
    operating_hours: 3000,
    office_false_ceiling: 0.3,
    corridor_false_ceiling: 0.25,
    building_heights: Math.round(bua / 5000 * 3),
    floor_to_floor_height: 3.8,
    chiller_plant_room_location: 'Basement',
    central_ac_plant_room_area: Math.round(bua * 0.02),
    central_ac_plant_location: 'Basement Level 1',
    standard_followed: 'NBC 2016',
    retail_area: Math.round(bua * 0.1),
    total_ac_tonnage: totalTr,
    diversity: profile.diversity,
    type_of_chiller_select: 'Water Cooled',
    chiller_tonnage_water: chillerTonnageWater,
    chiller_tonnage_air: chillerTonnageAir,
    chw_pumping_type: 'Secondary Variable',
    chw_primary_flow_gpm: chwPrimaryFlowGpm,
    chw_primary_power_kw: chwPrimaryPowerKw,
    chw_secondary_flow_gpm: chwSecondaryFlowGpm,
    chw_secondary_power_kw: chwSecondaryPowerKw,
    condenser_pumping_type: 'Variable',
    condenser_flow_gpm: condenserFlowGpm,
    condenser_power_kw: condenserPowerKw,
    ct_condenser_water_in: 37,
    ct_condenser_water_out: 32,
    ct_wet_bulb: 28,
    ct_fan_type: 'Axial',
    ct_fan_motor_rating_kw: Math.round(condenserFlowGpm * 0.01),
    cpo: 'Yes',
    cpm: 'Yes',
    total_dehumidified_airflow: dehumidifiedCfm,
    chw_supply_temp: 6.5,
    chw_return_temp: 13.5,
    ahu_fan_type: 'Plug Fan with VFD',
    ahu_filtration: 'G4 + F7',
    ahu_fan_kw: ahuFanKw,
    ahu_scope_select: 'Developer',
    total_fresh_airflow: freshAirflow,
    tfahu_chw_supply_temp: 8,
    tfahu_chw_return_temp: 14,
    tfahu_fan_type: 'Plug Fan with VFD',
    tfahu_filtration: 'G4 + F7 + HEPA',
    tfahu_fan_kw: tfahuFanKw,
    fresh_air_precooling: 'HRW',
    passive_desiccant_wheel: 'No',
    pct_extra_fresh_air: 20,
    tfahu_scope: 'Developer',
    server_cooling_source: 'Chilled Water',
    server_cooling_mode: 'express riser',
    server_cooling_scope: 'Tenant',
    server_load: Math.round(bua * 0.001),
    toilet_exhaust: 'Yes',
    toilet_exhaust_acph: 10,
    kitchen_exhaust: 'Yes',
    kitchen_exhaust_acph: 15,
    owc_exhaust: 'Yes',
    owc_exhaust_acph: 8,
    stp_exhaust_acph: 10,
    basement_ventilation: 'Yes',
    staircase_pressurization: 'Yes',
    lift_well_pressurization: 'Yes',
    lift_lobby_pressurization: 'Yes',
    smoke_extraction_tenant: 'Yes',
    power_supply_sources: '2',
    common_area_power_kw: commonAreaPower,
    common_area_power_density_kw: Math.round(commonAreaPower / bua * 10000) / 10000,
    common_area_power_density_kva: commonAreaPowerVa,
    tenant_area_power_kw: tenantPower,
    tenant_area_power_density_kw: Math.round(tenantPower / bua * 10000) / 10000,
    tenant_area_power_density_kva: tenantPowerVa,
    total_connected_load_kw: totalConnectedLoad,
    total_demand_load_kw: totalDemandLoad,
    carpet_area_electrical: carpetArea,
    transformer_capacity_kw: Math.round(transformerCapacity * 0.8),
    transformer_loading_pct_val: 75,
    transformer_diversity_pct: 80,
    transformer_config: 'N+1',
    transformer_type: 'Cast resin',
    transformer_location: 'Basement Level 1',
    dg_capacity_kw: dgCapacity,
    dg_loading_factor_pct: profile.dgLoadingFactor * 100,
    dg_diversity_pct: 80,
    dg_config: 'N+1',
    dg_type: 'Silent',
    dg_location: 'Basement Level 1 / Terrace',
    ev_charging_provision: 'Yes',
    ev_car_spaces: Math.round(bua / 5000),
    ev_bike_spaces: Math.round(bua / 2000),
    water_distribution_type: 'Hydropneumatic',
    total_occupants_water: Math.round(occupancyPhe),
    ugt_raw_water_kl: ugtRawWater,
    ugt_treated_water_kl: ugtTreatedWater,
    ugt_domestic_water_kl: ugtDomesticWater,
    ugt_flushing_water_kl: ugtFlushingWater,
    ugt_cooling_tower_makeup_kl: Math.round(totalTr * 0.5),
    ugt_irrigation_kl: Math.round(bua * 0.00001),
    ugt_condensate_kl: Math.round(totalTr * 0.2),
    oht_domestic_water_kl: ohtDomesticWater,
    oht_flushing_water_kl: ohtFlushingWater,
    oht_cooling_tower_makeup_kl: Math.round(totalTr * 0.3),
    stp_kld: stpKld,
    stp_type: 'MBR',
    stp_location: 'Basement Level 1',
    water_meters: 'Municipal',
    bms_water_meters: 'Yes',
    drainage_system: 'Double Stack',
    kitchen_waste_stack: 'Yes',
    rainwater_tank_capacity_m3: Math.round(bua * 0.00002),
    rainwater_tank_location: 'Basement',
    recharge_capacity_m3: Math.round(bua * 0.00001),
    centralised_garbage_room: 'Yes',
    garbage_room_location: 'Basement Level 1',
    owc_capacity: Math.round(bua * 0.0001),
    owc_location: 'Basement Level 1',
    ff_underground_tank_kl: ffUndergroundTank,
    ff_intermediate_tank_kl: Math.round(ffUndergroundTank * 0.3),
    ff_overhead_tank_kl: ffOverheadTank,
    ff_drencher: 'Yes',
    ff_express_riser: 'Yes',
    ff_dry_riser: 'Yes',
    ff_wet_riser: 'Yes',
    ff_sprinkler_riser: 'Yes',
    ff_ev_protection: 'Yes',
    ff_pumps_system: 'Dual + Jockey',
    express_risers: 'Yes',
    intermediate_tank: 'Yes',
    drencher_podium: 'Yes',
    drencher_typical: 'Yes',
    fapa_system: 'Addressable',
    fapa_addressable: 'UL/FM',
    fapa_cables_type: 'FR',
    fapa_technology: 'Analog Addressable',
    fapa_cables: 'FR',
    cctv_type: 'IP Based',
    security_access_control: 'Yes',
    glazing_u_value: 2.5,
    vlt: 40,
    glazing_shgc: 0.25,
    glazing_height: 1.5,
    spandrel_height: 0.8,
    wall_u_value: 0.4,
    spandrel_u_value: 0.3,
    roof_u_value: 0.25,
    wwr: 40,
    punched_windows: 'Yes',
    facade_power_controller: 'No',
    hvac_cost: profile.hvacCost,
    electrical_cost: profile.electricalCost,
    dg_cost: profile.dgCost,
    fire_fighting_cost: profile.fireFightingCost,
    stp_cost: profile.stpCost,
    phe_cost: profile.pheCost,
    bms_cost: profile.bmsCost,
    fapa_cost: profile.fapaCost,
    cctv_cost: profile.cctvCost,
    total_mep_cost: profile.totalMepCost,
    outdoor_db_temp: profile.outdoorDbTemp,
    outdoor_db_temp_source: 'ASHRAE 2022',
    outdoor_wb_temp: profile.outdoorWbTemp,
    outdoor_wb_temp_source: 'ASHRAE 2022',
    design_temperature_office: 24,
    iaq_fresh_air: 'ASHRAE 62.1',
    occupancy_lobby: 50,
    occupancy_thermal_setpoint_office: 24,
    occupancy_thermal_setpoint_retail: 24,
    occupancy_thermal_setpoint_fb: 22,
    occupancy_thermal_setpoint_lobby: 25,
    lighting_gain_office: profile.lightingGainOffice,
    lighting_gain_retail: profile.lightingGainRetail,
    lighting_gain_fb: profile.lightingGainFb,
    equipment_gain_office: profile.equipmentGainOffice,
    equipment_gain_retail: profile.equipmentGainRetail,
    equipment_gain_fb: profile.equipmentGainFb,
    equipment_thermal_load: profile.equipmentGainOffice,
    diversity_considered: profile.diversity,
    type_of_chiller: 'Centrifugal',
    chiller_configuration: `${chillerTonnageWater}TR x ${Math.ceil(chillerTonnageWater / 300)} nos + ${chillerTonnageAir}TR x ${Math.ceil(chillerTonnageAir / 200)} nos`,
    chiller_parameters: 'Primary-Secondary with VFD',
    refrigerant_used: 'R-134a / R-410A',
    critical_room_hvac: 'DX Split for UPS/Server Rooms',
    ahu_scope: 'Developer',
    cfm_sqft: profile.cfmSqft,
    ahu_filtration_strategy: 'G4 + F7 + F9',
    hvac_filtration_strategy: 'G4 + F7 + HEPA for TFahu',
    primary_pump: 'with VFD',
    secondary_pump: 'with VFD',
    condenser_pump: 'VFD',
    cooling_towers_config: 'Induced Draft Counter Flow',
    cooling_tower_height: 3.5,
    pantry_exhaust: '15 ACPH',
    ventilation_electrical_room: 'Exhaust Fan 10 ACPH',
    smoke_extraction_tenants: 'Dedicated Smoke Extract AHU',
    ventilation_electrical_room_typ: 'Exhaust Fan 10 ACPH',
    hvac_package_cost_lumpsum: Math.round(bua * profile.hvacCost),
    electrical_package_cost_lumpsum: Math.round(bua * profile.electricalCost),
    cctv_package_cost_lumpsum: Math.round(bua * profile.cctvCost),
    owc_cost_rs_sqft: 50,
    phe_package_cost_lumpsum: Math.round(bua * (profile.stpCost + profile.pheCost)),
    ff_package_cost_lumpsum: Math.round(bua * profile.fireFightingCost),
    fapa_package_cost_lumpsum: Math.round(bua * profile.fapaCost),
    occupancy_density_retail: profile.occupancyDensityRetail || null,
  };
}

function buildFormFromProject(
  project: Project,
  inputs: ProjectInputs | null,
  resetStage = false,
): FormState {
  const formData: FormState = {
    ...defaultForm,
    project_name: project.project_name,
    typology: project.typology,
    project_stage: resetStage ? '' : project.project_stage,
    location_city: project.location_city,
    location_state: project.location_state,
    project_year: project.project_year,
    built_up_area: project.built_up_area,
    carpet_area: project.carpet_area,
    saleable_area: project.saleable_area,
    leasable_area: project.leasable_area,
  };

  const inputValues = (inputs ?? {}) as unknown as Record<string, unknown>;
  for (const [field, fallback] of Object.entries(EXISTING_FIELD_DEFAULTS)) {
    formData[field] = inputValues[field] ?? fallback;
  }

  if (inputs?.extended_fields) {
    flattenExtendedFields(inputs.extended_fields, formData);
  }

  return formData;
}

type EntryMode = 'new' | 'existing';
const typologies = [
  'Office', 'Retail', 'Hospitality', 'Mixed Use',
  'Residential', 'Healthcare', 'Industrial', 'Data Centre', 'Institutional',
];

const AUTOSAVE_INTERVAL_MS = 120_000;
const SESSION_REFRESH_INTERVAL_MS = 45 * 60_000;
const LOCAL_DRAFT_VERSION = 1;

interface FormStep {
  key: string;
  title: string;
  group?: EngineeringServiceGroup;
}

const FORM_STEPS: FormStep[] = [
  { key: 'identity', title: 'Project details' },
  ...ENGINEERING_SERVICE_GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    group,
  })),
  { key: 'total', title: 'Cost summary' },
];

interface StoredFormDraft {
  version: number;
  savedAt: string;
  entryMode: EntryMode;
  selectedSourceId: string;
  sourceProjectId: string | null;
  existingProjectId: string | null;
  form: FormState;
}

const computedNumberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

const projectFieldLabels: Record<string, string> = {
  project_name: 'Project Name',
  typology: 'Typology',
  project_stage: 'Project Stage',
  location_city: 'City',
  project_year: 'Project Year',
  built_up_area: 'Built Up Area',
  carpet_area: 'Carpet Area',
  saleable_area: 'Saleable Area',
  leasable_area: 'Leasable Area',
};

function buildProjectFieldErrors(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.project_name.trim()) errors.project_name = 'Project Name is required.';
  if (!form.typology) errors.typology = 'Typology is required.';
  if (!form.project_stage) errors.project_stage = 'Project Stage is required.';
  if (!form.location_city.trim()) errors.location_city = 'City is required.';
  if (!Number.isInteger(form.project_year) || form.project_year < 1980 || form.project_year > 2100) {
    errors.project_year = 'Project Year must be between 1980 and 2100.';
  }
  return errors;
}

function buildSubmitValidationData(data: FormState): Record<string, unknown> {
  const result: Record<string, unknown> = {
    project_name: data.project_name,
    typology: data.typology,
    built_up_area: data.built_up_area,
    carpet_area: data.carpet_area,
    saleable_area: data.saleable_area,
    leasable_area: data.leasable_area,
  };
  // Add all design parameter fields
  for (const key of Object.keys(data)) {
    if (!['project_name', 'typology', 'project_stage', 'location_city', 'location_state', 'project_year',
      'built_up_area', 'carpet_area', 'saleable_area', 'leasable_area'].includes(key)) {
      result[key] = data[key];
    }
  }
  return result;
}

interface KpiMissingGroup {
  category: string;
  stepKey: string;
  fields: { field: string; label: string; kpi: string }[];
}

function buildKpiMissingWarnings(form: FormState): KpiMissingGroup[] {
  const val = (f: string) => form[f] as number | null;
  const missing = (f: string) => val(f) == null || val(f) === 0;

  const groups: KpiMissingGroup[] = [];

  // Location — affects benchmarks and similarity matching
  const locationFields: { field: string; label: string; kpi: string }[] = [];
  if (!form.location_city.trim()) locationFields.push({ field: 'location_city', label: 'City', kpi: 'location benchmarks & similarity' });
  if (!form.location_state.trim()) locationFields.push({ field: 'location_state', label: 'State', kpi: 'location benchmarks & similarity' });
  if (locationFields.length) groups.push({ category: 'Location', stepKey: 'identity', fields: locationFields });

  // HVAC
  const hvacFields: { field: string; label: string; kpi: string }[] = [];
  if (missing('total_tr')) hvacFields.push({ field: 'total_tr', label: 'Total TR', kpi: 'COOLING_LOAD_DENSITY, KW_PER_TR' });
  if (missing('total_airflow_cfm')) hvacFields.push({ field: 'total_airflow_cfm', label: 'Total Airflow (CFM)', kpi: 'CFM_SQFT' });
  if (missing('lighting_load_w')) hvacFields.push({ field: 'lighting_load_w', label: 'Lighting Load (W/sqft)', kpi: 'LIGHTING_W_SQFT' });
  if (missing('annual_energy_kwh')) hvacFields.push({ field: 'annual_energy_kwh', label: 'Annual Energy Consumption (kWh)', kpi: 'KW_PER_TR, EPI' });
  if (missing('transformer_capacity_kva')) hvacFields.push({ field: 'transformer_capacity_kva', label: 'Transformer Capacity (kVA)', kpi: 'TRANSFORMER_DENSITY' });
  if (missing('dg_capacity_kva')) hvacFields.push({ field: 'dg_capacity_kva', label: 'DG Capacity (kVA)', kpi: 'DG_LOAD_DENSITY, DG_CAPACITY_DENSITY' });
  if (hvacFields.length) groups.push({ category: 'HVAC & Electrical', stepKey: 'electrical-dg', fields: hvacFields });

  // Cost
  const costFields: { field: string; label: string; kpi: string }[] = [];
  if (missing('hvac_cost')) costFields.push({ field: 'hvac_cost', label: 'HVAC Cost', kpi: 'HVAC_RS_SQFT' });
  if (missing('electrical_cost')) costFields.push({ field: 'electrical_cost', label: 'Electrical Cost', kpi: 'ELECTRICAL_RS_SQFT' });
  if (missing('dg_cost')) costFields.push({ field: 'dg_cost', label: 'DG Cost', kpi: 'DG_RS_SQFT' });
  if (missing('fire_fighting_cost')) costFields.push({ field: 'fire_fighting_cost', label: 'Fire Protection Cost', kpi: 'FF_RS_SQFT' });
  if (missing('stp_cost')) costFields.push({ field: 'stp_cost', label: 'STP Cost', kpi: 'STP_RS_SQFT' });
  if (missing('phe_cost')) costFields.push({ field: 'phe_cost', label: 'PHE Cost', kpi: 'PHE_RS_SQFT' });
  if (missing('bms_cost')) costFields.push({ field: 'bms_cost', label: 'BMS Cost', kpi: 'BMS_RS_SQFT' });
  if (missing('fapa_cost')) costFields.push({ field: 'fapa_cost', label: 'FAPA Cost', kpi: 'FAPA_RS_SQFT' });
  if (missing('cctv_cost')) costFields.push({ field: 'cctv_cost', label: 'CCTV Cost', kpi: 'CCTV_RS_SQFT' });
  if (missing('total_mep_cost')) costFields.push({ field: 'total_mep_cost', label: 'Total MEP Cost', kpi: 'TOTAL_MEP_RS_SQFT' });
  if (costFields.length) groups.push({ category: 'Cost Packages', stepKey: 'total', fields: costFields });

  return groups;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

function NumField({
  label,
  unit,
  value,
  onChange,
  placeholder,
  min,
  max,
  error,
  decimals,
  readOnly,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  error?: string;
  decimals?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label} {unit ? <span className="text-[10px]">({unit})</span> : null}
        {readOnly && <span className="text-[10px] text-blue-500 ml-1">(computed)</span>}
      </Label>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          if (readOnly) return;
          const rawValue = e.target.value;
          if (rawValue === '') {
            onChange(null);
            return;
          }
          if (min != null && rawValue.startsWith('-')) return;
          if (decimals != null) {
            const [, decimalPart = ''] = rawValue.split('.');
            if (decimalPart.length > decimals) return;
          }
          const nextValue = Number(rawValue);
          if (Number.isNaN(nextValue)) return;
          if (min != null && nextValue < min) return;
          if (max != null && nextValue > max) return;
          onChange(nextValue);
        }}
        placeholder={readOnly ? '—' : placeholder}
        min={min}
        max={max}
        step={decimals != null ? `0.${'0'.repeat(Math.max(decimals - 1, 0))}1` : undefined}
        className={`h-8 text-sm ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''} ${readOnly ? 'bg-muted/50 cursor-not-allowed' : ''}`}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : 0}
      />
      <FieldError error={error} />
    </div>
  );
}

function ComputedResult({
  field,
  label,
  unit,
  value,
  calculatedValue,
  onChange,
}: {
  field: ProjectInputField;
  label: string;
  unit: string;
  value: number | null;
  calculatedValue: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div
      data-computed-field={field}
      className="border-l-2 border-emerald-600 bg-emerald-50/60 px-4 py-3"
    >
      <NumField
        label={label}
        unit={unit}
        value={value}
        onChange={onChange}
        placeholder={calculatedValue == null ? 'Waiting for inputs' : computedNumberFormatter.format(calculatedValue)}
        decimals={2}
      />
      <p className="mt-1 text-[11px] text-emerald-800">
        Calculated: {calculatedValue == null ? 'Waiting for inputs' : computedNumberFormatter.format(calculatedValue)}
        {calculatedValue != null && unit ? ` ${unit}` : ''}
      </p>
    </div>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm disabled:cursor-not-allowed disabled:bg-muted/50 ${error ? 'border-destructive' : 'border-input'}`}
      >
        <option value="">{placeholder ?? 'Select...'}</option>
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const label = typeof option === 'string' ? option : option.label;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
      <FieldError error={error} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-8 text-sm ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
      />
      <FieldError error={error} />
    </div>
  );
}

interface RepeatableEntry {
  [key: string]: string | number | null;
}

function RepeatableGroup({
  label,
  entries,
  onChange,
  columns,
}: {
  label: string;
  entries: RepeatableEntry[];
  onChange: (entries: RepeatableEntry[]) => void;
  columns: { key: string; label: string; type?: 'text' | 'number' }[];
}) {
  const addEntry = () => {
    const newEntry: RepeatableEntry = {};
    for (const col of columns) {
      newEntry[col.key] = col.type === 'number' ? null : '';
    }
    onChange([...entries, newEntry]);
  };
  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };
  const updateEntry = (index: number, key: string, value: string | number | null) => {
    const updated = entries.map((e, i) => (i === index ? { ...e, [key]: value } : e));
    onChange(updated);
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No entries added.</p>
      )}
      {entries.map((entry, idx) => (
        <div key={idx} className="flex flex-wrap items-end gap-2 rounded border border-input p-2">
          {columns.map((col) => (
            <div key={col.key} className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{col.label}</Label>
              <Input
                type={col.type === 'number' ? 'number' : 'text'}
                value={entry[col.key] == null ? '' : String(entry[col.key])}
                onChange={(e) => {
                  const v = e.target.value;
                  updateEntry(idx, col.key, col.type === 'number' ? (v === '' ? null : Number(v)) : v);
                }}
                className="h-7 w-28 text-xs"
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeEntry(idx)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="text-xs" onClick={addEntry}>
        + Add Entry
      </Button>
    </div>
  );
}

function CreateProjectForm() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const sourceIdFromQuery = searchParams.get('source');

  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [projectFieldErrors, setProjectFieldErrors] = useState<Record<string, string>>({});
  const [loadingProject, setLoadingProject] = useState(Boolean(editId || sourceIdFromQuery));
  const [existingProjectId, setExistingProjectId] = useState<string | null>(editId);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>(sourceIdFromQuery ? 'existing' : 'new');
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loadingExistingProjects, setLoadingExistingProjects] = useState(Boolean(sourceIdFromQuery));
  const [hasLoadedExistingProjects, setHasLoadedExistingProjects] = useState(false);
  const [loadingSourceProject, setLoadingSourceProject] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [sourceProjectId, setSourceProjectId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<Date | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [kpiWarnings, setKpiWarnings] = useState<KpiMissingGroup[]>([]);
  const [kpiWarningsConfirmed, setKpiWarningsConfirmed] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [showAutoFillConfirm, setShowAutoFillConfirm] = useState(false);
  const sourceQueryLoaded = useRef(false);
  const dirtyRef = useRef(false);
  const persistingRef = useRef(false);
  const existingProjectIdRef = useRef<string | null>(editId);
  const persistRef = useRef<((status: 'draft' | 'submitted', options?: { silent?: boolean }) => Promise<void>) | null>(null);
  const draftKey = useMemo(
    () => 'grune:project-form:' + (user?.id ?? 'anonymous') + ':' + (editId ?? sourceIdFromQuery ?? 'new'),
    [editId, sourceIdFromQuery, user?.id],
  );
  const latestDraftRef = useRef<StoredFormDraft | null>(null);

  useEffect(() => {
    latestDraftRef.current = {
      version: LOCAL_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      entryMode,
      selectedSourceId,
      sourceProjectId,
      existingProjectId,
      form,
    };
    existingProjectIdRef.current = existingProjectId;
  }, [entryMode, existingProjectId, form, selectedSourceId, sourceProjectId]);

  const update = useCallback(<K extends string>(field: K, value: unknown) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMessage('');
    setError('');
    setKpiWarnings([]);
    setKpiWarningsConfirmed(false);
  }, []);

  const handleAutoFill = useCallback(() => {
    if (!form.typology) {
      setImportMessage('Error: Please select a typology first before auto-filling.');
      return;
    }
    if (!form.built_up_area || form.built_up_area <= 0) {
      setImportMessage('Error: Please enter Built Up Area (BUA) first before auto-filling.');
      return;
    }
    setShowAutoFillConfirm(true);
  }, [form.typology, form.built_up_area]);

  const confirmAutoFill = useCallback(() => {
    const autoData = generateAutoFillData(form);
    const updatedFields: string[] = [];

    for (const [key, value] of Object.entries(autoData)) {
      if (value !== null && value !== undefined && value !== '') {
        setForm((prev) => ({ ...prev, [key]: value }));
        updatedFields.push(key);
      }
    }

    dirtyRef.current = true;
    setImportMessage(`Auto-filled ${updatedFields.length} fields based on ${form.typology} typology.`);
    setSaveMessage('');
    setError('');
    setKpiWarnings([]);
    setKpiWarningsConfirmed(false);
    setShowAutoFillConfirm(false);
  }, [form]);

  const resetMessages = useCallback(() => {
    setError('');
    setSaveMessage('');
    setValidationErrors([]);
    setProjectFieldErrors({});
    setShowValidation(false);
  }, []);

  const loadSourceProject = useCallback(async (projectId: string) => {
    setSelectedSourceId(projectId);
    setExistingProjectId(null);
    setRejectionReason(null);
    resetMessages();

    if (!projectId) {
      setSourceProjectId(null);
      setForm({ ...defaultForm });
      return;
    }

    setLoadingSourceProject(true);
    try {
      const [project, inputs] = await Promise.all([
        getProjectById(projectId),
        getProjectInputs(projectId),
      ]);
      if (!project) throw new Error('Project not found.');

      setSourceProjectId(project.source_project_id ?? project.id);
      setForm(buildFormFromProject(project, inputs, true));
      dirtyRef.current = true;
      setSaveMessage(
        `Copied ${getProjectStageLabel(project.project_stage)} values as a baseline. Select the new stage and update the details that changed.`,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the selected project.');
      setSourceProjectId(null);
      setForm({ ...defaultForm });
    } finally {
      setLoadingSourceProject(false);
    }
  }, [resetMessages]);

  const changeEntryMode = useCallback((mode: EntryMode) => {
    dirtyRef.current = true;
    setEntryMode(mode);
    if (mode === 'existing' && !hasLoadedExistingProjects) {
      setLoadingExistingProjects(true);
    }
    sourceQueryLoaded.current = true;
    setSelectedSourceId('');
    setSourceProjectId(null);
    setExistingProjectId(null);
    setRejectionReason(null);
    setForm({ ...defaultForm });
    resetMessages();
  }, [hasLoadedExistingProjects, resetMessages]);

  const costFields = COST_FIELDS.filter((field) => field !== 'total_mep_cost');
  const sumOfCosts = costFields.reduce((sum, field) => sum + (Number(form[field]) || 0), 0);

  const costWarning = useMemo(() => {
    const totalCost = Number(form.total_mep_cost) || 0;
    if (totalCost > 0 && sumOfCosts > 0 && Math.abs(totalCost - sumOfCosts) > 1) {
      return `Sum of package costs (${sumOfCosts.toFixed(2)} ₹/Sq.ft) does not match Total MEP Cost (${totalCost.toFixed(2)} ₹/Sq.ft)`;
    }
    return '';
  }, [form.total_mep_cost, sumOfCosts]);

  const fieldErrorMap = useMemo(() => {
    const next: Record<string, string> = { ...projectFieldErrors };
    for (const entry of validationErrors) {
      const field = normalizeProjectFormErrorField(entry.field);
      if (!next[field]) next[field] = entry.error_message;
    }
    return next;
  }, [projectFieldErrors, validationErrors]);

  // Compute derived fields for live display
  const computedFields = useMemo(() => getComputedFields(form), [form]);

  const runValidation = useCallback(async (data: FormState) => {
    const errors = (await validateProjectInputs(buildSubmitValidationData(data))).map((entry) => ({
      ...entry,
      field: normalizeProjectFormErrorField(entry.field),
    }));
    setValidationErrors(errors);
    setShowValidation(true);
    return errors;
  }, []);

  useEffect(() => {
    if (editId || !user || entryMode !== 'existing' || hasLoadedExistingProjects) return;

    getProjects()
      .then((projects) => {
        setAvailableProjects(projects);
        setHasLoadedExistingProjects(true);
      })
      .catch(() => setError('Unable to load existing projects.'))
      .finally(() => setLoadingExistingProjects(false));
  }, [editId, entryMode, hasLoadedExistingProjects, user]);

  useEffect(() => {
    if (editId || !sourceIdFromQuery || sourceQueryLoaded.current) return;
    sourceQueryLoaded.current = true;
    void loadSourceProject(sourceIdFromQuery).finally(() => setLoadingProject(false));
  }, [editId, loadSourceProject, sourceIdFromQuery]);

  useEffect(() => {
    if (!editId) return;

    Promise.all([getProjectById(editId), getProjectInputs(editId)])
      .then(([project, inputs]) => {
        if (!project) return;
        if (project.status !== 'draft' && project.status !== 'rejected') return;

        setForm(buildFormFromProject(project, inputs));
        setExistingProjectId(project.id);
        setRejectionReason(project.status === 'rejected' ? project.rejection_reason : null);
        dirtyRef.current = false;
      })
      .finally(() => setLoadingProject(false));
  }, [editId]);

  const writeLocalDraft = useCallback((announce = true) => {
    if (!dirtyRef.current || !latestDraftRef.current) return;
    try {
      const snapshot = {
        ...latestDraftRef.current,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftKey, JSON.stringify(snapshot));
      if (announce) setLastAutosavedAt(new Date(snapshot.savedAt));
    } catch {
      // Server draft saving remains available if browser storage is unavailable.
    }
  }, [draftKey]);

  const refreshActiveSession = useCallback(async () => {
    setRefreshingSession(true);
    try {
      const refreshed = await refreshSession();
      setSessionExpired(!refreshed);
      return refreshed;
    } catch {
      setSessionExpired(true);
      return false;
    } finally {
      setRefreshingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!user || loadingProject || draftReady) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const rawDraft = window.localStorage.getItem(draftKey);
        if (rawDraft) {
          const saved = JSON.parse(rawDraft) as Partial<StoredFormDraft>;
          if (saved.version === LOCAL_DRAFT_VERSION && saved.form && typeof saved.form === 'object') {
            setForm({ ...defaultForm, ...saved.form });
            setEntryMode(saved.entryMode === 'existing' ? 'existing' : 'new');
            setSelectedSourceId(typeof saved.selectedSourceId === 'string' ? saved.selectedSourceId : '');
            setSourceProjectId(typeof saved.sourceProjectId === 'string' ? saved.sourceProjectId : null);
            setExistingProjectId(typeof saved.existingProjectId === 'string' ? saved.existingProjectId : existingProjectId);
            setLastAutosavedAt(saved.savedAt ? new Date(saved.savedAt) : null);
            setDraftRecovered(true);
            dirtyRef.current = true;
          }
        }
      } catch {
        window.localStorage.removeItem(draftKey);
      } finally {
        setDraftReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [draftKey, draftReady, existingProjectId, loadingProject, user]);
  useEffect(() => {
    if (!draftReady || !dirtyRef.current) return;
    const timeout = window.setTimeout(() => writeLocalDraft(), 800);
    return () => window.clearTimeout(timeout);
  }, [draftReady, entryMode, form, selectedSourceId, sourceProjectId, writeLocalDraft]);

  useEffect(() => {
    if (!draftReady) return;
    const preserveDraft = () => writeLocalDraft(false);
    const preserveHiddenDraft = () => {
      if (document.visibilityState === 'hidden') preserveDraft();
    };
    window.addEventListener('beforeunload', preserveDraft);
    document.addEventListener('visibilitychange', preserveHiddenDraft);
    return () => {
      window.removeEventListener('beforeunload', preserveDraft);
      document.removeEventListener('visibilitychange', preserveHiddenDraft);
    };
  }, [draftReady, writeLocalDraft]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      void refreshActiveSession();
    }, SESSION_REFRESH_INTERVAL_MS);
    const refreshAfterLogin = () => {
      if (document.visibilityState === 'visible' && sessionExpired) {
        void refreshActiveSession();
      }
    };
    document.addEventListener('visibilitychange', refreshAfterLogin);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshAfterLogin);
    };
  }, [refreshActiveSession, sessionExpired, user]);

  const persist = async (
    status: 'draft' | 'submitted',
    options: { silent?: boolean } = {},
  ) => {
    const silent = options.silent === true;
    if (!user || persistingRef.current || (silent && !existingProjectIdRef.current)) return;

    persistingRef.current = true;
    if (!silent) {
      setError('');
      setSaveMessage('');
      setSubmitting(true);
    }

    try {
      if (entryMode === 'existing' && !sourceProjectId && !existingProjectId) {
        if (!silent) setError('Select an existing project before adding a stage.');
        return;
      }

      const currentProjectErrors = buildProjectFieldErrors(form);
      if (!silent) setProjectFieldErrors(currentProjectErrors);
      if (Object.keys(currentProjectErrors).length > 0) {
        if (!silent) {
          setShowValidation(true);
          setCurrentStep(0);
        }
        return;
      }

      if (status === 'submitted') {
        if (!kpiWarningsConfirmed) {
          const warnings = buildKpiMissingWarnings(form);
          if (warnings.length > 0) {
            if (!silent) {
              setKpiWarnings(warnings);
              setSubmitting(false);
            }
            return;
          }
        }

        const allValidationErrors = await runValidation(form);
        const blockingErrors = getRequiredValidationErrors(allValidationErrors);
        if (blockingErrors.length > 0) {
          const firstErrorStep = FORM_STEPS.findIndex((step) =>
            step.group?.fields.includes(blockingErrors[0].field as ProjectInputField)
            || step.group?.subGroups?.some((subGroup) =>
              subGroup.fields.includes(blockingErrors[0].field as ProjectInputField),
            ),
          );
          if (firstErrorStep >= 0) setCurrentStep(firstErrorStep);
        }
        if (allValidationErrors.length > 0) {
          setSubmitting(false);
          return;
        }
      }

      const projectData = {
        project_name: form.project_name,
        typology: form.typology,
        project_stage: form.project_stage as ProjectStage,
        location_city: form.location_city,
        location_state: form.location_state,
        project_year: form.project_year,
        built_up_area: form.built_up_area ?? 0,
        carpet_area: form.carpet_area ?? 0,
        saleable_area: form.saleable_area ?? 0,
        leasable_area: form.leasable_area ?? 0,
      };
      const wasNewProject = !existingProjectId;
      const project = existingProjectId
        ? await updateProject(existingProjectId, projectData)
        : await createProject({ ...projectData, source_project_id: sourceProjectId });

      setExistingProjectId(project.id);
      existingProjectIdRef.current = project.id;
      await upsertProjectInputs(project.id, {
        plant_room_area: (form.plant_room_area as number | null) ?? null,
        leasable_plant_room_area: (form.leasable_plant_room_area as number | null) ?? null,
        shaft_area: (form.shaft_area as number | null) ?? null,
        office_area: (form.office_area as number | null) ?? null,
        fb_area: (form.fb_area as number | null) ?? null,
        gross_area: (form.gross_area as number | null) ?? null,
        occupancy_density_office: (form.occupancy_density_office as number | null) ?? null,
        occupancy_density_fb: (form.occupancy_density_fb as number | null) ?? null,
        total_tr: (form.total_tr as number | null) ?? null,
        total_airflow_cfm: (form.total_airflow_cfm as number | null) ?? null,
        hvac_strategy: (form.hvac_strategy as string) || null,
        transformer_capacity_kva: (form.transformer_capacity_kva as number | null) ?? null,
        tenant_power_kva: (form.tenant_power_kva as number | null) ?? null,
        common_area_power_kva: (form.common_area_power_kva as number | null) ?? null,
        lighting_load_w: (form.lighting_load_w as number | null) ?? null,
        dg_capacity_kva: (form.dg_capacity_kva as number | null) ?? null,
        dg_loading_factor: (form.dg_loading_factor as number | null) ?? null,
        annual_energy_kwh: (form.annual_energy_kwh as number | null) ?? null,
        hvac_cost: (form.hvac_cost as number | null) ?? null,
        electrical_cost: (form.electrical_cost as number | null) ?? null,
        dg_cost: (form.dg_cost as number | null) ?? null,
        fire_fighting_cost: (form.fire_fighting_cost as number | null) ?? null,
        stp_cost: (form.stp_cost as number | null) ?? null,
        phe_cost: (form.phe_cost as number | null) ?? null,
        bms_cost: (form.bms_cost as number | null) ?? null,
        fapa_cost: (form.fapa_cost as number | null) ?? null,
        cctv_cost: (form.cctv_cost as number | null) ?? null,
        total_mep_cost: (form.total_mep_cost as number | null) ?? null,
        operating_hours: (form.operating_hours as number | null) ?? 3000,
        extended_fields: collectExtendedFields(form),
      });

      dirtyRef.current = false;
      window.localStorage.removeItem(draftKey);
      setLastAutosavedAt(new Date());
      setDraftRecovered(false);

      if (status === 'submitted') {
        await updateProjectStatus(project.id, 'submitted');
        router.push('/board2/repository');
        return;
      }

      if (wasNewProject) {
        router.replace('/board1/create-project?id=' + encodeURIComponent(project.id), { scroll: false });
      }
      setSaveMessage(silent
        ? 'Autosaved to the project draft.'
        : 'Draft saved. You can continue editing without losing the rest of the form.');
    } catch (err: unknown) {
      writeLocalDraft(false);
      if (isSessionExpiredError(err)) {
        setSessionExpired(true);
        if (!silent) setError('');
        return;
      }
      if (!silent) {
        const message = err instanceof Error ? err.message : 'Operation failed';
        const inputErrors = parseProjectFormApiError(message);
        if (inputErrors.length > 0) {
          setValidationErrors(inputErrors);
          setShowValidation(true);
          setError('Update the flagged fields below, then try submitting again.');
        } else {
          setError(message);
        }
      }
    } finally {
      persistingRef.current = false;
      if (!silent) setSubmitting(false);
    }
  };

  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    if (!draftReady) return;
    const interval = window.setInterval(() => {
      if (!dirtyRef.current) return;
      writeLocalDraft();
      if (existingProjectIdRef.current) {
        void persistRef.current?.('draft', { silent: true });
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [draftReady, writeLocalDraft]);
  const renderField = (field: ProjectInputField, computedMap?: Map<string, ComputedFieldDef>) => {
    const meta = PROJECT_INPUT_FIELD_META[field];
    if (!meta) return null;
    const errorMessage = fieldErrorMap[field];

    // Check if this is a computed field
    const computed = computedMap?.get(field);
    if (computed) {
      const calculatedValue = computed.compute(form);
      const storedValue = form[field];
      const value = typeof storedValue === 'number' ? storedValue : calculatedValue;
      return (
        <ComputedResult
          key={field}
          field={field}
          label={computed.label}
          unit={computed.unit}
          value={value}
          calculatedValue={calculatedValue}
          onChange={(nextValue) => update(field, nextValue)}
        />
      );
    }

    if (meta.kind === 'select') {
      return (
        <SelectField
          key={field}
          label={meta.label}
          value={(form[field] as string) ?? ''}
          onChange={(value) => update(field, value)}
          options={meta.options ?? []}
          placeholder="Select..."
          error={errorMessage}
        />
      );
    }

    if (meta.kind === 'text') {
      return (
        <TextField
          key={field}
          label={meta.label}
          value={(form[field] as string) ?? ''}
          onChange={(value) => update(field, value)}
          placeholder={meta.placeholder}
          error={errorMessage}
        />
      );
    }

    if (meta.kind === 'repeatable') {
      const entries = (Array.isArray(form[field]) ? form[field] : []) as RepeatableEntry[];
      const columnMap: Record<string, { key: string; label: string; type?: 'text' | 'number' }[]> = {
        additional_spaces: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'area', label: 'Area (sq. ft)', type: 'number' },
        ],
        chiller_units_water: [
          { key: 'nos', label: 'Nos', type: 'number' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'cop', label: 'COP', type: 'number' },
          { key: 'refrigerant', label: 'Refrigerant', type: 'text' },
          { key: 'working_standby', label: 'Working/Standby', type: 'text' },
        ],
        chiller_units_air: [
          { key: 'nos', label: 'Nos', type: 'number' },
          { key: 'type', label: 'Type', type: 'text' },
          { key: 'cop', label: 'COP', type: 'number' },
          { key: 'refrigerant', label: 'Refrigerant', type: 'text' },
          { key: 'working_standby', label: 'Working/Standby', type: 'text' },
        ],
        glazing_types: [
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'u_value', label: 'U Value', type: 'number' },
          { key: 'shgc', label: 'SHGC', type: 'number' },
          { key: 'vlt', label: 'VLT (%)', type: 'number' },
        ],
        custom_certifications: [
          { key: 'name', label: 'Certification Name', type: 'text' },
        ],
      };
      const columns = columnMap[field] ?? [];
      return (
        <RepeatableGroup
          key={field}
          label={meta.label}
          entries={entries}
          onChange={(newEntries) => update(field, newEntries)}
          columns={columns}
        />
      );
    }

    return (
      <NumField
        key={field}
        label={meta.label}
        unit={meta.unit ?? ''}
        value={(form[field] as number | null) ?? null}
        onChange={(value) => update(field, value)}
        placeholder={meta.placeholder}
        min={meta.min}
        max={meta.max}
        decimals={meta.decimals}
        error={errorMessage}
      />
    );
  };

  const renderEditableFields = (
    fields: readonly ProjectInputField[],
    computedMap: Map<string, ComputedFieldDef>,
  ) => fields
    .filter((field) => !computedMap.has(field))
    .map((field) => (
      <div key={field} data-field={field}>
        {renderField(field, computedMap)}
      </div>
    ));

  const renderCalculatedFields = (
    fields: readonly ProjectInputField[],
    computedMap: Map<string, ComputedFieldDef>,
  ) => {
    const calculated = fields.filter((field) => computedMap.has(field));
    if (calculated.length === 0) return null;
    return (
      <section className="mt-8 border-t border-border pt-6" aria-label="Calculated results">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-emerald-700" />
          <h3 className="text-sm font-semibold">Calculated results</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {calculated.map((field) => renderField(field, computedMap))}
        </div>
      </section>
    );
  };

  const renderGroupContent = (
    group: EngineeringServiceGroup,
    computedMap: Map<string, ComputedFieldDef>,
    areaFields: React.ReactNode = null,
  ) => {
    const allFields = [
      ...group.fields,
      ...(group.subGroups?.flatMap((subGroup) => [...subGroup.fields]) ?? []),
    ];
    return (
      <>
        {areaFields}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {renderEditableFields(group.fields, computedMap)}
        </div>
        {group.subGroups?.map((subGroup) => (
          <section key={subGroup.key} className="mt-8 border-t border-border pt-6">
            <h3 className="mb-4 text-sm font-semibold">{subGroup.title}</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {renderEditableFields(subGroup.fields, computedMap)}
            </div>
          </section>
        ))}
        {renderCalculatedFields(allFields, computedMap)}
      </>
    );
  };
  if (loadingProject) {
    return <PageSkeleton title="Loading project form" rows={10} />;
  }


  // Build computed fields map for quick lookup
  const computedMap = new Map(computedFields.map((c) => [c.field, c]));
  const identityLocked = entryMode === 'existing' && Boolean(selectedSourceId);
  const availableStageOptions = entryMode === 'existing' && sourceProjectId
    ? PROJECT_STAGES.filter((stage) => {
        const usedStages = new Set(
          availableProjects
            .filter((project) => (project.source_project_id ?? project.id) === sourceProjectId)
            .map((project) => project.project_stage),
        );
        return !usedStages.has(stage.value);
      })
    : PROJECT_STAGES;

  const correctionMap = new Map<string, { field: string; messages: string[] }>();
  const addCorrection = (fieldName: string, message: string) => {
    const field = normalizeProjectFormErrorField(fieldName);
    const existing = correctionMap.get(field);
    if (existing) {
      if (!existing.messages.includes(message)) existing.messages.push(message);
      return;
    }
    correctionMap.set(field, { field, messages: [message] });
  };

  for (const [field, message] of Object.entries(projectFieldErrors)) {
    addCorrection(field, message);
  }
  for (const entry of validationErrors) {
    addCorrection(entry.field, entry.error_message);
  }
  const correctionErrors = Array.from(correctionMap.values());

  const activeStep = FORM_STEPS[currentStep] ?? FORM_STEPS[0];
  const activeGroup = activeStep.group;
  const progress = Math.round(((currentStep + 1) / FORM_STEPS.length) * 100);
  const areaInputs = (
    <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
      <NumField
        label="Total Built Up Area"
        unit="sq. ft"
        value={form.built_up_area}
        onChange={(value) => update('built_up_area', value)}
        min={0}
        error={fieldErrorMap.built_up_area}
      />
      <NumField
        label="Carpet Area"
        unit="sq. ft"
        value={form.carpet_area}
        onChange={(value) => update('carpet_area', value)}
        min={0}
        error={fieldErrorMap.carpet_area}
      />
      <NumField
        label="Saleable Area"
        unit="sq. ft"
        value={form.saleable_area}
        onChange={(value) => update('saleable_area', value)}
        min={0}
        error={fieldErrorMap.saleable_area}
      />
      <NumField
        label="Leasable Area"
        unit="sq. ft"
        value={form.leasable_area}
        onChange={(value) => update('leasable_area', value)}
        min={0}
        error={fieldErrorMap.leasable_area}
      />
    </div>
  );
  const renderCorrectionControl = (field: string) => {
    const errorMessage = fieldErrorMap[field];
    const textFields: Record<string, { label: string; placeholder?: string }> = {
      project_name: { label: 'Project Name', placeholder: 'e.g. Green Tower Office' },
      location_city: { label: 'City', placeholder: 'Mumbai' },
      location_state: { label: 'State', placeholder: 'Maharashtra' },
    };
    if (textFields[field]) {
      return (
        <TextField
          label={textFields[field].label}
          value={(form[field] as string) ?? ''}
          onChange={(value) => update(field, value)}
          placeholder={textFields[field].placeholder}
          error={errorMessage}
        />
      );
    }
    if (field === 'typology') {
      return (
        <SelectField
          label="Typology"
          value={form.typology}
          onChange={(value) => update('typology', value)}
          options={typologies}
          error={errorMessage}
        />
      );
    }
    if (field === 'project_stage') {
      return (
        <SelectField
          label="Project Stage"
          value={form.project_stage}
          onChange={(value) => update('project_stage', value)}
          options={availableStageOptions}
          error={errorMessage}
        />
      );
    }
    if (field === 'project_year') {
      return (
        <NumField
          label="Project Year"
          unit=""
          value={form.project_year}
          onChange={(value) => update('project_year', value ?? new Date().getFullYear())}
          min={1980}
          max={2100}
          error={errorMessage}
        />
      );
    }

    const areaFields: Record<string, string> = {
      built_up_area: 'Total Built Up Area',
      carpet_area: 'Carpet Area',
      saleable_area: 'Saleable Area',
      leasable_area: 'Leasable Area',
    };
    if (areaFields[field]) {
      return (
        <NumField
          label={areaFields[field]}
          unit="sq. ft"
          value={(form[field] as number | null) ?? null}
          onChange={(value) => update(field, value)}
          min={0}
          error={errorMessage}
        />
      );
    }

    const inputMeta = PROJECT_INPUT_FIELD_META[field as ProjectInputField];
    if (inputMeta && inputMeta.kind !== 'computed') {
      return renderField(field as ProjectInputField, computedMap);
    }
    return null;
  };

  const goToStep = (index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, FORM_STEPS.length - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {existingProjectId ? 'Edit Project' : entryMode === 'existing' ? 'Add Project Stage' : 'New Project'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {existingProjectId
              ? 'Update project details and resubmit for review.'
              : entryMode === 'existing'
                ? 'Use an existing stage as a baseline, then update the values for the new stage.'
                : 'Enter details for an entirely new project.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAutoFill}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Auto-Fill Bot
          </Button>
          <div className="flex min-h-8 items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <Clock3 className="h-4 w-4" />
            {lastAutosavedAt
              ? 'Saved ' + lastAutosavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Autosave on'}
          </div>
        </div>
      </div>

      {draftRecovered && (
        <div className="border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Recovered your autosaved work from this browser.
        </div>
      )}

      {importMessage && (
        <div className={`border-l-2 px-4 py-3 text-sm ${importMessage.startsWith('Error') ? 'border-red-600 bg-red-50 text-red-800' : 'border-blue-600 bg-blue-50 text-blue-800'}`}>
          {importMessage}
        </div>
      )}

      {showAutoFillConfirm && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">
            Auto-fill will populate all engineering fields with realistic values for:
          </p>
          <ul className="text-xs text-blue-700 mb-3 space-y-1">
            <li>• Typology: <strong>{form.typology}</strong></li>
            <li>• Built Up Area: <strong>{form.built_up_area?.toLocaleString()} sq. ft</strong></li>
          </ul>
          <p className="text-xs text-blue-600 mb-3">
            This will overwrite any existing values in the engineering fields. Project details (name, city, etc.) will not be changed.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={confirmAutoFill}>
              Confirm Auto-Fill
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAutoFillConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {sessionExpired && (
        <div
          role="alert"
          className="flex flex-col gap-3 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-medium">Your session has expired.</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Your work is saved in this browser. Sign in again in a new tab, then return here to continue saving.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}
            >
              <LogIn className="h-4 w-4" />
              Sign in again
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={refreshingSession}
              onClick={() => void refreshActiveSession()}
            >
              <RefreshCw className={`h-4 w-4 ${refreshingSession ? 'animate-spin' : ''}`} />
              Check session
            </Button>
          </div>
        </div>
      )}

      {rejectionReason && (
        <div className="border-l-2 border-red-600 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">This project was previously rejected.</p>
          <p className="mt-1 text-xs text-red-600">Reason: {rejectionReason}</p>
        </div>
      )}

      <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
        {!editId && (
          <section className="space-y-4 border-b border-border pb-6">
            <div className="inline-flex rounded-md border border-input bg-muted/30 p-1">
              <Button
                type="button"
                size="sm"
                variant={entryMode === 'new' ? 'default' : 'ghost'}
                onClick={() => changeEntryMode('new')}
              >
                New Project
              </Button>
              <Button
                type="button"
                size="sm"
                variant={entryMode === 'existing' ? 'default' : 'ghost'}
                onClick={() => changeEntryMode('existing')}
              >
                Add Stage to Existing
              </Button>
            </div>

            {entryMode === 'existing' && (
              <SelectField
                label="Existing Project Stage *"
                value={selectedSourceId}
                onChange={loadSourceProject}
                options={availableProjects.map((project) => ({
                  value: project.id,
                  label: project.project_name + ' - ' + getProjectStageLabel(project.project_stage) + ' - ' + project.location_city,
                }))}
                placeholder={loadingExistingProjects ? 'Loading projects...' : 'Select a project stage to copy...'}
                disabled={loadingExistingProjects || loadingSourceProject}
              />
            )}
            {entryMode === 'existing' && availableStageOptions.length === 0 && sourceProjectId && (
              <p className="text-xs text-amber-700">All configured project stages already exist for this project.</p>
            )}
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Application progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: progress + '%' }} />
              </div>
            </div>
            <nav aria-label="Project form sections" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              {FORM_STEPS.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => goToStep(index)}
                  aria-current={index === currentStep ? 'step' : undefined}
                  className={'flex min-h-10 items-center gap-3 border-l-2 px-3 py-2 text-left text-sm transition-colors '
                    + (index === currentStep
                      ? 'border-primary bg-primary/5 font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
                >
                  <span className="w-5 text-xs tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">
            <Card className="rounded-md">
              <CardHeader className="border-b border-border">
                <p className="text-xs font-medium text-primary">Step {currentStep + 1} of {FORM_STEPS.length}</p>
                <CardTitle className="text-lg">{activeStep.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {activeStep.key === 'identity' && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Project Name *</Label>
                      <Input
                        value={form.project_name}
                        disabled={identityLocked}
                        onChange={(event) => update('project_name', event.target.value)}
                        placeholder="e.g. Green Tower Office"
                        className={'h-8 text-sm ' + (fieldErrorMap.project_name ? 'border-destructive focus-visible:ring-destructive/30' : '')}
                      />
                      <FieldError error={fieldErrorMap.project_name} />
                    </div>
                    <SelectField
                      label="Typology *"
                      value={form.typology}
                      onChange={(value) => update('typology', value)}
                      options={typologies}
                      error={fieldErrorMap.typology}
                      disabled={identityLocked}
                    />
                    <SelectField
                      label="Project Stage *"
                      value={form.project_stage}
                      onChange={(value) => update('project_stage', value)}
                      options={availableStageOptions}
                      placeholder="Select project stage..."
                      error={fieldErrorMap.project_stage}
                      disabled={entryMode === 'existing' && (loadingExistingProjects || !sourceProjectId || availableStageOptions.length === 0)}
                    />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">City *</Label>
                      <Input
                        value={form.location_city}
                        disabled={identityLocked}
                        onChange={(event) => update('location_city', event.target.value)}
                        placeholder="Mumbai"
                        className={'h-8 text-sm ' + (fieldErrorMap.location_city ? 'border-destructive focus-visible:ring-destructive/30' : '')}
                      />
                      <FieldError error={fieldErrorMap.location_city} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <Input
                        value={form.location_state}
                        disabled={identityLocked}
                        onChange={(event) => update('location_state', event.target.value)}
                        placeholder="Maharashtra"
                        className="h-8 text-sm"
                      />
                    </div>
                    <NumField
                      label="Project Year *"
                      unit=""
                      value={form.project_year}
                      onChange={(value) => update('project_year', value ?? new Date().getFullYear())}
                      min={1980}
                      error={fieldErrorMap.project_year}
                    />
                  </div>
                )}

                {activeGroup && renderGroupContent(
                  activeGroup,
                  computedMap,
                  activeGroup.key === 'area-building' ? areaInputs : null,
                )}

                {activeStep.key === 'total' && (
                  <>
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-3">Cost Summary (Rs/sq. ft BUA)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Discipline</th>
                              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Cost (₹/Sq. ft)</th>
                              <th className="text-right py-2 pl-4 text-xs font-medium text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { field: 'hvac_cost', label: 'HVAC' },
                              { field: 'electrical_cost', label: 'Electrical' },
                              { field: 'dg_cost', label: 'DG' },
                              { field: 'fire_fighting_cost', label: 'Fire Protection' },
                              { field: 'stp_cost', label: 'STP' },
                              { field: 'phe_cost', label: 'PHE' },
                              { field: 'bms_cost', label: 'BMS' },
                              { field: 'fapa_cost', label: 'FAPA' },
                              { field: 'cctv_cost', label: 'CCTV' },
                              { field: 'owc_cost_rs_sqft', label: 'OWC' },
                            ].map(({ field, label }) => {
                              const val = Number(form[field]) || 0;
                              return (
                                <tr key={field} className="border-b border-border/50">
                                  <td className="py-2 pr-4 text-xs">{label}</td>
                                  <td className="py-2 px-4 text-right font-medium text-xs">{val > 0 ? val.toFixed(2) : '—'}</td>
                                  <td className="py-2 pl-4 text-right text-xs">{val > 0 ? <span className="text-green-600">Filled</span> : <span className="text-muted-foreground">Empty</span>}</td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-border font-semibold">
                              <td className="py-2 pr-4 text-xs">Sum of Packages</td>
                              <td className="py-2 px-4 text-right text-xs">{sumOfCosts > 0 ? sumOfCosts.toFixed(2) : '—'}</td>
                              <td className="py-2 pl-4 text-right text-xs">{sumOfCosts > 0 ? <span className="text-green-600">Computed</span> : <span className="text-muted-foreground">—</span>}</td>
                            </tr>
                            <tr className="border-t border-border">
                              <td className="py-2 pr-4 text-xs">Total MEP Cost</td>
                              <td className="py-2 px-4 text-right text-xs">{(Number(form.total_mep_cost) || 0) > 0 ? Number(form.total_mep_cost).toFixed(2) : '—'}</td>
                              <td className="py-2 pl-4 text-right text-xs">{(Number(form.total_mep_cost) || 0) > 0 ? <span className="text-green-600">Filled</span> : <span className="text-muted-foreground">Empty</span>}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {renderEditableFields(TOTAL_COST_FIELDS, computedMap)}
                    </div>
                    {costWarning && (
                      <div className="mt-3 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                        {costWarning}
                      </div>
                    )}
                    {renderCalculatedFields(TOTAL_COST_FIELDS, computedMap)}
                  </>
                )}
              </CardContent>
            </Card>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {saveMessage && (
              <p className="mt-4 border-l-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {saveMessage}
              </p>
            )}

            {kpiWarnings.length > 0 && (
              <div className="mt-4 border border-amber-300 bg-amber-50 rounded-lg" role="alert">
                <div className="border-b border-amber-200 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Missing inputs will limit KPI results
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Fill in the fields below, then submit. KPIs that stay empty will show &ldquo;Not provided&rdquo;.
                  </p>
                </div>
                <div className="divide-y divide-amber-200">
                  {kpiWarnings.map((group) => (
                    <div key={group.category} className="px-4 py-3 space-y-3">
                      <p className="text-xs font-medium text-amber-800">{group.category}</p>
                      {group.fields.map((f) => {
                        const meta = PROJECT_INPUT_FIELD_META[f.field as ProjectInputField];
                        return (
                          <div key={f.field} className="flex items-center gap-3">
                            <label className="text-xs text-amber-700 w-44 shrink-0" htmlFor={`kpi-warn-${f.field}`}>
                              {f.label}
                              <span className="text-amber-500 ml-1 text-[10px]">{f.kpi}</span>
                            </label>
                            <Input
                              id={`kpi-warn-${f.field}`}
                              type="number"
                              className="h-8 w-40 text-sm border-amber-300 bg-white"
                              value={((form[f.field] as number | null) ?? '') as string | number}
                              placeholder={meta?.placeholder ?? 'e.g. 100'}
                              min={meta?.min}
                              step={meta?.decimals != null ? `0.${'0'.repeat(Math.max(meta.decimals - 1, 0))}1` : undefined}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') { update(f.field, null); return; }
                                const n = Number(raw);
                                if (!Number.isNaN(n)) update(f.field, n);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-amber-200 px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { setKpiWarnings([]); setKpiWarningsConfirmed(true); void persist('submitted'); }}
                  >
                    Submit with these values
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => { setKpiWarnings([]); setKpiWarningsConfirmed(true); void persist('submitted'); }}
                  >
                    Submit anyway (leave empty)
                  </Button>
                </div>
              </div>
            )}

            {showValidation && correctionErrors.length > 0 && (
              <section className="mt-6 border-t border-border pt-6" aria-labelledby="correction-panel-title">
                <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3">
                  <h2 id="correction-panel-title" className="text-sm font-semibold text-destructive">
                    Update flagged fields
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Correct the values here, then submit again. Your other form entries will stay unchanged.
                  </p>
                </div>
                <div className="divide-y divide-border border-b border-border">
                  {correctionErrors.map(({ field, messages }) => {
                    const control = renderCorrectionControl(field);
                    const label = projectFieldLabels[field]
                      ?? PROJECT_INPUT_FIELD_META[field as ProjectInputField]?.label
                      ?? field.replaceAll('_', ' ');
                    return (
                      <div
                        key={field}
                        data-validation-correction={field}
                        className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-start"
                      >
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <ul className="mt-1 space-y-1">
                            {messages.map((message) => (
                              <li key={message} className="text-xs text-destructive">{message}</li>
                            ))}
                          </ul>
                        </div>
                        {control ? <div>{control}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
              <Button
                type="button"
                variant="ghost"
                disabled={currentStep === 0}
                onClick={() => goToStep(currentStep - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => void persist('draft')}>
                  <Save className="h-4 w-4" />
                  {submitting ? 'Saving...' : 'Save draft'}
                </Button>
                {currentStep < FORM_STEPS.length - 1 ? (
                  <Button type="button" onClick={() => goToStep(currentStep + 1)}>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" disabled={submitting} onClick={() => void persist('submitted')}>
                    {submitting ? 'Submitting...' : entryMode === 'existing' && !existingProjectId ? 'Validate & add stage' : 'Validate & submit'}
                  </Button>
                )}
              </div>
            </div>
          </main>
        </div>
      </form>
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Preparing project form" rows={10} />}>
      <CreateProjectForm />
    </Suspense>
  );
}
