module.exports = async function handler(req, res) {
  const {default: handleListing} = await import('../listing-core.mjs');
  return handleListing(req, res);
};
