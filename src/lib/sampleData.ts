import type { AccountMap, Person, Relationship } from "../types";
import { newId, normalizeAccount } from "./persistence";

function person(p: Partial<Person> & { name: string; jobTitle: string }): Person {
  return {
    id: newId(),
    reportsToId: null,
    buyingRoles: [],
    sentiment: "neutral",
    influence: 3,
    tags: [],
    x: null,
    y: null,
    updatedAt: new Date().toISOString(),
    ...p,
  } as Person;
}

/** A fictional account used to demo the tool. No real prospect data. */
export function createSampleAccount(): AccountMap {
  const teamYou = { id: newId("team"), name: "You (AE)", role: "Account Executive" };
  const teamSE = { id: newId("team"), name: "Jordan Reyes", role: "Sales Engineer" };

  const ceo = person({
    name: "Dana Whitfield",
    jobTitle: "Chief Executive Officer",
    seniority: "c_level",
    sentiment: "neutral",
    influence: 5,
    tags: ["exec sponsor target"],
  });
  const cfo = person({
    name: "Marcus Lin",
    jobTitle: "Chief Financial Officer",
    reportsToId: ceo.id,
    seniority: "c_level",
    buyingRoles: ["economic_buyer"],
    sentiment: "detractor",
    influence: 5,
    relationshipStrength: 0,
    priorities: "Cost discipline, margin expansion this fiscal year.",
    tags: ["budget owner"],
  });
  const cio = person({
    name: "Priya Raman",
    jobTitle: "Chief Information Officer",
    reportsToId: ceo.id,
    seniority: "c_level",
    buyingRoles: ["influencer"],
    sentiment: "coach",
    influence: 4,
    relationshipStrength: 2,
    relationshipOwnerId: teamYou.id,
    priorities: "Consolidate vendors, reduce integration risk.",
  });
  const vpEng = person({
    name: "Sam Okafor",
    jobTitle: "VP, Platform Engineering",
    reportsToId: cio.id,
    seniority: "vp",
    buyingRoles: ["champion"],
    sentiment: "champion",
    influence: 4,
    relationshipStrength: 3,
    relationshipOwnerId: teamYou.id,
    priorities: "Ship the new data platform; reduce on-call load.",
    nextStep: "Co-build the business case for Marcus.",
    tags: ["our champion"],
  });
  const architect = person({
    name: "Lena Fischer",
    jobTitle: "Principal Architect",
    reportsToId: vpEng.id,
    seniority: "ic",
    buyingRoles: ["technical_champion", "influencer"],
    sentiment: "coach",
    influence: 4,
    relationshipStrength: 2,
    relationshipOwnerId: teamSE.id,
    priorities: "Clean migration path and platform fit.",
  });
  const dirData = person({
    name: "Tom Bridger",
    jobTitle: "Director, Data Engineering",
    reportsToId: vpEng.id,
    seniority: "director",
    buyingRoles: ["influencer"],
    sentiment: "coach",
    influence: 2,
    relationshipStrength: 2,
  });
  const proc = person({
    name: "Helen Cho",
    jobTitle: "Director, Procurement",
    reportsToId: cfo.id,
    seniority: "director",
    buyingRoles: ["procurement"],
    sentiment: "neutral",
    influence: 3,
    relationshipStrength: 0,
  });
  const secLead = person({
    name: "Raj Patel",
    jobTitle: "Head of Information Security",
    reportsToId: cio.id,
    seniority: "director",
    buyingRoles: ["security", "blocker"],
    sentiment: "detractor",
    influence: 4,
    relationshipStrength: 1,
    priorities: "Won't approve net-new data egress without review.",
    tags: ["risk"],
  });
  const endUser = person({
    name: "Aisha Bello",
    jobTitle: "Staff Data Engineer",
    reportsToId: dirData.id,
    seniority: "ic",
    buyingRoles: ["end_user"],
    sentiment: "coach",
    influence: 2,
    relationshipStrength: 2,
  });

  const people = [ceo, cfo, cio, vpEng, architect, dirData, proc, secLead, endUser];

  const relationships: Relationship[] = [
    { id: newId("rel"), fromId: vpEng.id, toId: cfo.id, type: "influences", strength: 2, note: "Champion → Economic Buyer" },
    { id: newId("rel"), fromId: architect.id, toId: vpEng.id, type: "influences", strength: 3 },
    { id: newId("rel"), fromId: secLead.id, toId: cio.id, type: "influences", strength: 2 },
    { id: newId("rel"), fromId: secLead.id, toId: vpEng.id, type: "tension_with", strength: 2 },
    { id: newId("rel"), fromId: dirData.id, toId: architect.id, type: "allies_with", strength: 2 },
  ];

  return normalizeAccount({
    id: newId("acct"),
    accountName: "Northwind Logistics (sample)",
    opportunity: { name: "Data Platform Expansion", stage: "Validation", value: 480000, closeDate: "" },
    meddpicc: {
      economicBuyerId: cfo.id,
      championId: vpEng.id,
      identifiedPain: "Fragmented data tooling slows launches; on-call burnout.",
      competition: "Incumbent + in-house build",
    },
    people,
    relationships,
    team: [teamYou, teamSE],
    updatedAt: new Date().toISOString(),
  });
}
