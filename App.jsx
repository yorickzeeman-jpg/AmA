*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; width: 100%; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #f4f5f7;
  color: #1a2332;
  font-size: 14px;
  line-height: 1.5;
}
button { font-family: inherit; cursor: pointer; }
input, select, textarea { font-family: inherit; outline: none; }
input:focus, select:focus, textarea:focus {
  border-color: #1a3d2b !important;
  box-shadow: 0 0 0 3px rgba(26,61,43,0.12);
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
@keyframes fadeIn  { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:translateY(0); } }
@keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
@keyframes scaleIn { from { opacity:0; transform:scale(.96); }        to { opacity:1; transform:scale(1); } }
