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
  
  // Replace the hex
  content = content.replace(/#8E9B61/ig, '#4dbf73');
  
  // Replace RGB strings used in shadow/border rgba calls
  content = content.replace(/142, 155, 97/g, '77, 191, 115');
  content = content.replace(/142,155,97/g, '77,191,115');
  
  // Mapbox specific gradient overrides
  if (file.includes('MapboxReality')) {
    content = content.replace(/#E4EAD3/ig, '#b6e6c8');
    content = content.replace(/#A4B494/ig, '#75d195');
    content = content.replace(/#4F5D2F/ig, '#2d7a48');
  }
  
  fs.writeFileSync(file, content);
});

console.log("Colors updated successfully.");
