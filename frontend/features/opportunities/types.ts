import type { Opportunity } from "@/lib/types";

export type { Opportunity } from "@/lib/types";

/** Card view model — adds the derived `closed` and `closingSoon` flags. */
export interface OpportunityCardView extends Opportunity {
  closed: boolean;
  closingSoon: boolean;
}

/** Create payload — mirrors the backend `OpportunityIn` schema. */
export interface CreateOpportunityInput {
  category: string;
  title: string;
  description: string;
  title_ar?: string | null;
  title_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  location: string;
  mode: string;
  duration: string;
  funding: string;
  price?: string;
  deadline: string | null;
  apply_url: string;
  organization?: string | number | null;
  organization_website?: string;
  is_active: boolean;
  status?: string;
  age: string;
  certificate: boolean;
  fields: string[];
}

/** Update payload — partial, mirrors the backend `OpportunityUpdateIn` schema. */
export type UpdateOpportunityInput = Partial<CreateOpportunityInput>;
