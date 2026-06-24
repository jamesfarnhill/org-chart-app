import type { BuyingRole, Influence, RelationshipType, Sentiment } from "../types";

export const CARD_WIDTH = 220;
export const CARD_HEIGHT = 104;
export const CANVAS_PADDING = 140;
export const MIN_CANVAS_WIDTH = 2400;
export const MIN_CANVAS_HEIGHT = 1600;
export const ROW_GAP = 48;
export const LEVEL_GAP = 110;

export interface SentimentMeta {
  label: string;
  color: string;
  soft: string;
  text: string;
}

export const SENTIMENT_META: Record<Sentiment, SentimentMeta> = {
  champion: { label: "Champion", color: "#15803d", soft: "#dcfce7", text: "#14532d" },
  coach: { label: "Coach", color: "#4d7c0f", soft: "#ecfccb", text: "#3f6212" },
  neutral: { label: "Neutral", color: "#64748b", soft: "#f1f5f9", text: "#334155" },
  detractor: { label: "Detractor", color: "#dc2626", soft: "#fee2e2", text: "#991b1b" },
};

export const SENTIMENT_ORDER: Sentiment[] = ["champion", "coach", "neutral", "detractor"];

export interface RoleMeta {
  label: string;
  short: string;
  description: string;
}

export const ROLE_META: Record<BuyingRole, RoleMeta> = {
  economic_buyer: { label: "Economic Buyer", short: "EB", description: "Controls budget, final yes" },
  champion: { label: "Deal Champion", short: "DC", description: "Sells for us internally, has power + access" },
  technical_champion: { label: "Technical Champion", short: "TC", description: "Advocates for us on technical fit / IT" },
  influencer: { label: "Influencer", short: "IN", description: "Shapes opinion, not a decider" },
  end_user: { label: "End User", short: "EU", description: "Lives with the product day-to-day" },
  procurement: { label: "Procurement", short: "PR", description: "Commercial / pricing gatekeeper" },
  legal: { label: "Legal", short: "LG", description: "Reviews contracts / terms" },
  security: { label: "Security", short: "SC", description: "Reviews security / compliance" },
  blocker: { label: "Blocker", short: "BL", description: "Actively works against us" },
};

export const ROLE_ORDER: BuyingRole[] = [
  "economic_buyer",
  "champion",
  "technical_champion",
  "influencer",
  "end_user",
  "procurement",
  "legal",
  "security",
  "blocker",
];

export const INFLUENCE_LABEL: Record<Influence, string> = {
  1: "Peripheral",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Kingmaker",
};

export interface EdgeMeta {
  label: string;
  color: string;
  dashed: boolean;
  directional: boolean;
}

export const EDGE_META: Record<RelationshipType, EdgeMeta> = {
  dotted_line: { label: "Dotted-line report", color: "#94a3b8", dashed: true, directional: true },
  influences: { label: "Influences", color: "#7c3aed", dashed: false, directional: true },
  allies_with: { label: "Allied with", color: "#0d9488", dashed: false, directional: false },
  tension_with: { label: "Tension with", color: "#dc2626", dashed: true, directional: false },
};
