export type Expert = {
  id: string;
  name: string;
  avatarUrl: string;
  domains: string[];
  countries: string[];
  topics: string[];
  solvedCases: number;
};

export const experts: Expert[] = [
  {
    id: "sophie-lambert",
    name: "Sophie Lambert",
    avatarUrl: "/avatar/lion-256.png",
    domains: ["Payroll"],
    countries: ["BE"],
    topics: ["Bonus"],
    solvedCases: 42,
  },
  {
    id: "marc-durand",
    name: "Marc Durand",
    avatarUrl: "/avatar/deer-256.png",
    domains: ["Payroll"],
    countries: ["FR"],
    topics: ["Termination"],
    solvedCases: 37,
  },
  {
    id: "eline-peeters",
    name: "Eline Peeters",
    avatarUrl: "/avatar/chinchilla-256.png",
    domains: ["Time"],
    countries: ["BE"],
    topics: ["Overtime"],
    solvedCases: 29,
  },
  {
    id: "knowledge-support",
    name: "Knowledge Support Team",
    avatarUrl: "/avatar/cloud-256.png",
    domains: [],
    countries: [],
    topics: [],
    solvedCases: 0,
  },
];
