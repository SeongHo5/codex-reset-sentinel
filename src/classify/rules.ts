export const RELEVANCE_PATTERNS = [
  /\bcodex\b/i,
  /gpt[- ]?5\.5/i,
  /usage limits?/i,
  /rate limits?/i,
  /\bquota\b/i,
  /\breset\b/i,
  /\bweekly\b/i,
  /5[- ]?hour/i,
  /\/fast/i,
];

export const ACTION_PATTERNS = {
  RESET_CANCELLED: [
    /won['’]?t reset/i,
    /will not reset/i,
    /not resetting/i,
    /reset (?:is )?cancel(?:led|ed)/i,
    /no reset today/i,
  ],
  RESET_DELAYED: [
    /reset (?:will happen )?later/i,
    /reset .*delay(?:ed)?/i,
    /postpon(?:ed|ing).*reset/i,
    /reset .*tomorrow/i,
  ],
  RESET_DONE: [
    /limits? (?:have been |were |are )reset/i,
    /usage limits? reset(?:ted)?(?:[.!?]|$)/i,
    /reset (?:is )?complete/i,
    /allowed .*reset .*rate limits?/i,
    /reset .*rate limits? across all plans/i,
  ],
  RESET_PLANNED: [
    /(?:i will|we will|will) reset/i,
    /reset (?:the )?rate limits?/i,
    /reset usage limits?/i,
    /rate limits? reset incoming/i,
    /reset incoming/i,
    /reset .*in (?:a few|the next few) hours/i,
    /reset .*this evening/i,
    /reset .*today/i,
    /quota refresh (?:planned|tonight|today)/i,
  ],
  LIMIT_POLICY_CHANGED: [
    /weekly limits?.*(?:adjust|chang|increas|decreas)/i,
    /rate limits?.*(?:adjust|chang|increas|decreas)/i,
    /usage limits?.*(?:adjust|chang|increas|decreas)/i,
    /quota policy/i,
    /limit policy/i,
  ],
} as const;
