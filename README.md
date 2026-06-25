This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## KPI Formula Catalog (Grüne Project Intelligence Platform)

| KPI Code | Display Name | Category | Formula | Unit |
|---|---|---|---|---|
| PLANT_ROOM_PCT | Plant Room % | Space Planning | Plant Room Area ÷ BUA | % |
| LEASABLE_PLANT_ROOM_PCT | Leasable Plant Room % | Space Planning | Leasable Plant Room Area ÷ BUA | % |
| SHAFT_AREA_PCT | Shaft Area % | Space Planning | Shaft Area ÷ BUA | % |
| POPULATION | Population | HVAC | (Office Area ÷ Office Density) + (F&B Area ÷ F&B Density) | Persons |
| COOLING_LOAD_DENSITY | Cooling Load Density | HVAC | Carpet Area ÷ Total TR | sqft/TR |
| CFM_SQFT | CFM/sqft | HVAC | Total Airflow ÷ Carpet Area | CFM/sqft |
| **KW_PER_TR** | **kW/TR** | **HVAC** | **Annual Energy ÷ (Total TR × Operating Hours)** | **kW/TR** |
| HVAC_RS_SQFT | HVAC Rs/sqft | Cost | HVAC Cost ÷ BUA | Rs/sqft |
| TOTAL_VA_SQFT_CARPET | Total VA/sqft (Carpet) | Electrical | (Tenant + Common Area Power × 1000) ÷ Carpet Area | VA/sqft |
| TOTAL_VA_SQFT_SALEABLE | Total VA/sqft (Saleable) | Electrical | Total Power ÷ Saleable Area | VA/sqft |
| TOTAL_VA_SQFT_BUA | Total VA/sqft (BUA) | Electrical | Total Connected Load ÷ BUA | VA/sqft |
| TRANSFORMER_DENSITY | Transformer Density | Electrical | (Transformer Capacity × 1000) ÷ BUA | VA/sqft |
| **LIGHTING_W_SQFT** | **Lighting W/sqft** | **Electrical** | **Lighting Load ÷ Carpet Area** | **W/sqft** |
| DG_LOAD_DENSITY | DG Load Density | DG | DG Capacity ÷ BUA | kVA/sqft |
| DG_CAPACITY_DENSITY | DG Capacity Density | DG | (DG Capacity × Loading Factor) ÷ BUA | kVA/sqft |
| EPI | EPI | Sustainability | Annual Energy ÷ Gross Area | kWh/sqft/yr |
| TOTAL_MEP_RS_SQFT | Total MEP Rs/sqft | Commercial | Total MEP Cost ÷ BUA | Rs/sqft |
| ELECTRICAL_RS_SQFT | Electrical Rs/sqft | Cost | Electrical Cost ÷ BUA | Rs/sqft |
| DG_RS_SQFT | DG Rs/sqft | Cost | DG Cost ÷ BUA | Rs/sqft |
| FF_RS_SQFT | Fire Fighting Rs/sqft | Cost | Fire Fighting Cost ÷ BUA | Rs/sqft |
| STP_RS_SQFT | STP Rs/sqft | Cost | STP Cost ÷ BUA | Rs/sqft |
| PHE_RS_SQFT | PHE Rs/sqft | Cost | PHE Cost ÷ BUA | Rs/sqft |
| BMS_RS_SQFT | BMS Rs/sqft | Cost | BMS Cost ÷ BUA | Rs/sqft |
| FAPA_RS_SQFT | FAPA Rs/sqft | Cost | FAPA Cost ÷ BUA | Rs/sqft |
| CCTV_RS_SQFT | CCTV Rs/sqft | Cost | CCTV Cost ÷ BUA | Rs/sqft |

**Note on operating hours for kW/TR:** Default assumption is 3000 hrs/yr for Indian commercial office buildings. This should be configurable per project in the extended_fields JSONB.
