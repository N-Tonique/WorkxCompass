export const rankingConfig = {
  weights: {
    country: 20,
    domain: 20,
    topic: 30,
    temporalValidity: 10,
    trustedSource: 10,
    recency: 5,
  },

  bonuses: {
    countryDomainTopic: 15,
    clientTopic: 10,
  },

  penalties: {
    conflict: 15,
    uncertainty: 10,
  },
} as const;

export type RankingConfig = typeof rankingConfig;
