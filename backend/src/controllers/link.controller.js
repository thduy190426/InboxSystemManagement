const { getLinkPreview: fetchLinkPreview } = require('link-preview-js');

// Optional: In-memory cache to prevent spamming APIs
const previewCache = new Map();

exports.getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    // Check cache first (cache for 1 hour)
    if (previewCache.has(url)) {
      const cached = previewCache.get(url);
      if (Date.now() - cached.timestamp < 3600000) {
        return res.json({ success: true, data: cached.data });
      }
    }

    // Configure specific user agents to prevent being blocked (e.g. by Twitter, Facebook)
    const options = {
      imagesPropertyType: 'any',
      headers: {
        'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      },
      timeout: 5000 // 5 seconds timeout
    };

    const data = await fetchLinkPreview(url, options);

    // Save to cache
    previewCache.set(url, { data, timestamp: Date.now() });
    
    // Maintain cache size to prevent memory leak
    if (previewCache.size > 1000) {
      const firstKey = previewCache.keys().next().value;
      previewCache.delete(firstKey);
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Link preview error:', error.message);
    // Return empty fallback instead of error so client handles gracefully
    return res.json({ success: true, data: null });
  }
};
