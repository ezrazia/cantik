/**
 * Komponen yang meng-inject Google Fonts dan animasi global via tag <style>.
 * Memuat font Archivo dan JetBrains Mono.
 *
 * @returns {React.ReactElement} Tag <style> dengan CSS global.
 */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      .capi, .capi * { font-family: 'Archivo', system-ui, sans-serif; box-sizing: border-box; }
      .mono { font-family: 'JetBrains Mono', 'Courier New', monospace !important; }
      .capi ::-webkit-scrollbar { width: 4px; height: 4px; }
      .capi ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      .capi ::-webkit-scrollbar-track { background: transparent; }
      .fade { animation: fadeUp .2s ease both; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      .pulse { animation: pulse 2s ease-in-out infinite; }
      @keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:0.45; } }
    `}</style>
  );
}

export default GlobalStyles;
