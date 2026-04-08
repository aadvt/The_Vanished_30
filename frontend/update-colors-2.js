const fs = require('fs');

const files = [
  'app/globals.css',
  'components/dashboard/BottomDrawer.tsx',
  'components/dashboard/PropertyPanel.tsx',
  'components/dashboard/MetricStrip.tsx',
  'components/dashboard/HUD.tsx',
  'components/dashboard/MapboxReality.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace text/button hex
  content = content.replace(/#4dbf73/ig, '#0f4d23');
  
  // Replace RGB strings
  content = content.replace(/77,\s*191,\s*115/g, '15, 77, 35');
  
  if (file.includes('MapboxReality.tsx')) {
    // Revert the buildings back to the brighter green so they still glow nicely 
    content = content.replace(/100,\s*'#0f4d23'/i, "100, '#4dbf73'");
  }
  
  // Background solid white (remove cream #F9F9F7 to #ffffff)
  content = content.replace(/#F9F9F7/ig, '#ffffff');
  
  // Increase opacity of glass layers to look distinctly solid white 
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.6\)/g, 'rgba(255, 255, 255, 1)');
  content = content.replace(/bg-white\/40/g, 'bg-white/95');
  content = content.replace(/bg-white\/70/g, 'bg-white/95');
  
  fs.writeFileSync(file, content);
});

console.log("Darker green applied, UI backgrounds whitened.");
