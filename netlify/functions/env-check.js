export const handler = async () => {
  const out = {
    hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
    tokenPrefix: process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.slice(0,4) : null,
    node: process.version,
    netlify: !!process.env.NETLIFY,
    url: process.env.URL || null,
    deployPrime: process.env.DEPLOY_PRIME_URL || null
  };
  return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify(out) };
};