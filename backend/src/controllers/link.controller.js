const { getLinkPreview: fetchLinkPreview } = require('link-preview-js');

const previewCache = new Map();

exports.getLinkPreview = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    if (previewCache.has(url)) {
      const cached = previewCache.get(url);
      if (Date.now() - cached.timestamp < 3600000) {
        return res.json({ success: true, data: cached.data });
      }
    }

    const options = {
      imagesPropertyType: 'any',
      headers: {
        'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      },
      timeout: 5000 
    };

    const data = await fetchLinkPreview(url, options);
    previewCache.set(url, { data, timestamp: Date.now() });
    
    if (previewCache.size > 1000) {
      const firstKey = previewCache.keys().next().value;
      previewCache.delete(firstKey);
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Link preview error:', error.message);
    return res.json({ success: true, data: null });
  }
};
