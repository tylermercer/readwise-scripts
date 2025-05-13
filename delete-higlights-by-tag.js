
require('dotenv').config();
const API_TOKEN = process.env.READWISE_API_TOKEN;
const TAG =  process.argv[2];

if (!API_TOKEN) {
  console.error('Error: READWISE_API_TOKEN is not set in .env file');
  process.exit(1);
}


if (!TAG) {
  console.error('Usage: node delete-higlights-by-tag.js <tag>');
  process.exit(1);
}

async function fetchTaggedHighlights(tag) {
  const response = await fetch(`https://readwise.io/api/v2/highlights/?tagName=${tag}&page_size=1000`, {
    headers: {
      'Authorization': `Token ${API_TOKEN}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch highlights: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function deleteHighlight(id) {
  const response = await fetch(`https://readwise.io/api/v2/highlights/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 'unknown';
    console.warn(`Rate limit hit while deleting highlight ${id}.`);
    console.warn(`Retry-After: ${retryAfter}`);
    return { rateLimited: true };
  }

  if (!response.ok) {
    console.error(`Failed to delete highlight ${id}: ${response.statusText}`);
  } else {
    console.log(`Deleted highlight ${id}`);
  }

  return { rateLimited: false };
}

(async () => {
  try {
    const highlights = await fetchTaggedHighlights(TAG);
    console.log(`Found ${highlights.length} highlights with tag "${TAG}"`);

    for (const highlight of highlights) {
      const { rateLimited } = await deleteHighlight(highlight.id);
      if (rateLimited) {
        console.warn('Stopping further deletions due to rate limiting.');
        break;
      }
    }

    console.log('All tagged highlights deleted.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();