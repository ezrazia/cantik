import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, RotateCcw, Save, CheckCircle, Loader2 } from 'lucide-react';

const SignaturePad = ({ value, onChange, disabled, uploadUrl }) => {
  const sigCanvas = useRef(null);
  const containerRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 400, height: 200 });

  // Make canvas responsive to container width while maintaining 2:1 aspect ratio
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setCanvasDimensions({ width, height: width / 2 });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const clearSignature = () => {
    if (disabled || isUploading) return;
    sigCanvas.current.clear();
    setError(null);
  };

  const saveSignature = async () => {
    if (disabled || isUploading) return;
    
    if (sigCanvas.current.isEmpty()) {
      setError("Kanvas masih kosong. Silakan tanda tangan terlebih dahulu.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      // Get base64 representation of the canvas
      // We use getCanvas() instead of getTrimmedCanvas() because trim-canvas has bundling issues in Vite production build
      const base64Data = sigCanvas.current.getCanvas().toDataURL('image/png');

      // Upload to our backend API
      const response = await fetch(uploadUrl || '/api/upload/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Data })
      });

      if (!response.ok) {
        throw new Error("Gagal mengunggah tanda tangan.");
      }

      const data = await response.json();
      
      // data.url contains the Supabase Public URL
      if (data.url) {
        onChange(data.url);
      } else {
        throw new Error("URL tidak ditemukan dari server.");
      }
      
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsUploading(false);
    }
  };

  // If already signed, display the image instead of the canvas
  if (value && typeof value === 'string' && value.startsWith('http')) {
    return (
      <div className="relative border border-slate-200 bg-slate-50 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4">
        <img 
          src={value} 
          alt="Tanda Tangan" 
          className="max-w-full h-auto object-contain border border-dashed border-slate-300 rounded bg-white p-2" 
          style={{ maxHeight: '200px' }}
        />
        <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
          <CheckCircle size={14} />
          Tersimpan
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <RotateCcw size={14} />
            Hapus & Ulangi Tanda Tangan
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="relative border-2 border-dashed border-slate-300 bg-white rounded-xl overflow-hidden group hover:border-blue-400 transition-colors">
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-slate-400 font-medium text-xs pointer-events-none select-none opacity-50">
          <PenTool size={14} />
          <span>Area Tanda Tangan</span>
        </div>
        
        <SignatureCanvas 
          ref={sigCanvas}
          canvasProps={{
            width: canvasDimensions.width,
            height: canvasDimensions.height,
            className: `sigCanvas w-full cursor-crosshair ${disabled ? 'opacity-50 pointer-events-none' : ''}`
          }}
          backgroundColor="rgba(255,255,255,1)"
          penColor="#0f172a" // slate-900
        />
      </div>
      
      {error && (
        <p className="text-xs text-rose-500 font-medium">* {error}</p>
      )}

      {!disabled && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearSignature}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 disabled:opacity-50 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          
          <button
            type="button"
            onClick={saveSignature}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-lg text-xs font-bold transition-all border-0 shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Rekam & Simpan
          </button>
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
