import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

// Endpoint: POST /api/upload/signature
router.post('/signature', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    // Check Supabase config
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Konfigurasi Supabase (SUPABASE_URL atau SUPABASE_KEY) belum disetel di server.' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract base64 data
    // Format is usually "data:image/png;base64,iVBORw0KGgo..."
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid base64 string' });
    }

    const imageType = matches[1]; // e.g. "image/png"
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `signature_${Date.now()}_${hash}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('signatures')
      .upload(filename, buffer, {
        contentType: imageType,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('signatures')
      .getPublicUrl(filename);

    res.json({
      success: true,
      url: publicUrlData.publicUrl
    });

  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server' });
  }
});

export default router;
