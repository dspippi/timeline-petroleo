const fs = require('fs');
const path = require('path');

const replacements = [
  // Backgrounds
  { search: /bg-\[#f5f3ee\] dark:bg-\[#050a10\]/g, replace: "bg-app" },
  { search: /bg-\[#f5f3ee\] dark:bg-\[#071018\]/g, replace: "bg-app" },
  { search: /bg-\[#f5f3ee\] dark:bg-\[#0a1119\]/g, replace: "bg-app" },
  { search: /bg-white dark:bg-\[#050a10\]/g, replace: "bg-surface" },
  { search: /bg-white dark:bg-\[#071018\]/g, replace: "bg-surface" },
  { search: /bg-white dark:bg-\[#0c131a\]/g, replace: "bg-surface" },
  { search: /bg-white dark:bg-\[#1a232e\]/g, replace: "bg-surface" },
  { search: /bg-gray-50 dark:bg-\[#1a232e\]/g, replace: "bg-surface-alt" },
  { search: /bg-\[#f5f3ee\]/g, replace: "bg-app" }, 
  
  // Surface Hovers/Alts
  { search: /bg-gray-100 dark:bg-\[#151c24\]/g, replace: "bg-surface-alt" },
  { search: /bg-gray-200 dark:bg-\[#1d2a36\]/g, replace: "bg-surface-alt" },
  { search: /bg-gray-100 dark:bg-\[#1a232e\]/g, replace: "bg-surface-alt" },
  { search: /hover:bg-black\/\[0\.06\] dark:hover:bg-\[rgba\(183,255,0,0\.09\)\]/g, replace: "hover:bg-surface-hover" },
  { search: /hover:bg-black\/10 dark:hover:bg-\[rgba\(183,255,0,0\.09\)\]/g, replace: "hover:bg-surface-hover" },
  { search: /hover:bg-gray-50\/80 dark:hover:bg-\[#0d1823\]/g, replace: "hover:bg-surface-hover" },
  { search: /bg-black\/\[0\.06\] dark:bg-\[rgba\(183,255,0,0\.09\)\]/g, replace: "bg-surface-hover" },
  { search: /bg-black\/10 dark:bg-\[rgba\(183,255,0,0\.09\)\]/g, replace: "bg-surface-hover" },
  { search: /bg-gray-50\/80 dark:bg-\[#0d1823\]/g, replace: "bg-surface-hover" },

  // Texts
  { search: /text-gray-900 dark:text-\[#f2f7f4\]/g, replace: "text-content-primary" },
  { search: /text-gray-800 dark:text-\[#f2f7f4\]/g, replace: "text-content-primary" },
  { search: /text-gray-700 dark:text-\[#f2f7f4\]/g, replace: "text-content-primary" },
  { search: /text-gray-600 dark:text-\[#dce8e1\]/g, replace: "text-content-secondary" },
  { search: /text-gray-500 dark:text-\[#dce8e1\]/g, replace: "text-content-secondary" },
  { search: /text-gray-400 dark:text-\[#8896a8\]/g, replace: "text-content-tertiary" },
  { search: /text-gray-500 dark:text-\[#8896a8\]/g, replace: "text-content-tertiary" },
  { search: /text-gray-600 dark:text-\[#8896a8\]/g, replace: "text-content-tertiary" },
  { search: /text-gray-300 dark:text-\[#526173\]/g, replace: "text-content-muted" },
  { search: /text-gray-400 dark:text-\[#526173\]/g, replace: "text-content-muted" },
  { search: /text-gray-200 dark:text-\[#526173\]/g, replace: "text-content-muted" },
  { search: /text-gray-700 dark:text-\[#a0afc0\]/g, replace: "text-content-tertiary" },
  { search: /hover:text-gray-700 dark:hover:text-\[#f2f7f4\]/g, replace: "hover:text-content-primary" },
  { search: /hover:text-gray-700 dark:hover:text-\[#b7ff00\]/g, replace: "hover:text-brand" },

  // Borders
  { search: /border-black\/\[0\.07\] dark:border-\[#1d2a36\]/g, replace: "border-line-default" },
  { search: /border-black\/\[0\.06\] dark:border-\[#1d2a36\]/g, replace: "border-line-default" },
  { search: /border-black\/\[0\.04\] dark:border-\[#1d2a36\]/g, replace: "border-line-default" },
  { search: /border-black\/\[0\.05\] dark:border-\[#1d2a36\]/g, replace: "border-line-default" },
  { search: /border-black\/\[0\.08\] dark:border-\[#1d2a36\]/g, replace: "border-line-default" },
  { search: /bg-black\/\[0\.07\] dark:bg-\[#1d2a36\]/g, replace: "bg-line-default" },
  { search: /bg-black\/\[0\.05\] dark:bg-\[#1d2a36\]/g, replace: "bg-line-default" },
  { search: /bg-gray-200 dark:bg-\[#1d2a36\]/g, replace: "bg-line-default" },
  { search: /border-black\/10 dark:border-\[#2a3948\]/g, replace: "border-line-strong" },
  { search: /border-black\/10 dark:border-white\/10/g, replace: "border-line-strong" },
  { search: /border-black\/5 dark:border-white\/5/g, replace: "border-line-subtle" },
  { search: /border-gray-200 dark:border-\[#b7ff00\]\/30/g, replace: "border-brand/30" },
  
  // Accents
  { search: /text-amber-500 dark:text-\[#b7ff00\]/g, replace: "text-brand" },
  { search: /text-amber-600 dark:text-\[#b7ff00\]/g, replace: "text-brand" },
  { search: /text-amber-700 dark:text-\[#b7ff00\]/g, replace: "text-brand" },
  { search: /text-amber-700 dark:text-\[#d8ff66\]/g, replace: "text-brand-hover" },
  { search: /hover:text-amber-800 dark:hover:text-\[#d8ff66\]/g, replace: "hover:text-brand-hover" },
  { search: /hover:text-amber-800 dark:hover:text-\[#caff33\]/g, replace: "hover:text-brand-hover" },
  { search: /bg-amber-100 dark:bg-\[rgba\(183,255,0,0\.12\)\]/g, replace: "bg-brand-bg" },
  { search: /bg-amber-50 dark:bg-\[#0f1710\]/g, replace: "bg-brand-bg" },
  { search: /border-l-amber-400 dark:border-l-\[#b7ff00\]/g, replace: "border-l-brand" },
  { search: /accent-amber-500 dark:accent-\[#b7ff00\]/g, replace: "accent-brand" },
  { search: /bg-gray-400\/50 dark:bg-\[#b7ff00\]\/45/g, replace: "bg-brand/45" },

  // Shadows
  { search: /dark:shadow-\[0_0_10px_rgba\(242,247,244,0\.12\)\]/g, replace: "dark:shadow-text-glow" },
  { search: /dark:drop-shadow-\[0_0_10px_rgba\(242,247,244,0\.12\)\]/g, replace: "dark:drop-shadow-text-glow" },
  { search: /dark:shadow-\[0_1px_0_rgba\(183,255,0,0\.08\)\]/g, replace: "dark:shadow-brand-glow" },
  { search: /dark:shadow-\[0_0_12px_rgba\(183,255,0,0\.28\)\]/g, replace: "dark:shadow-brand-glow" },
  { search: /dark:shadow-\[0_0_14px_rgba\(183,255,0,0\.14\)\]/g, replace: "dark:shadow-brand-glow" },
  { search: /dark:shadow-\[0_0_12px_rgba\(183,255,0,0\.16\)\]/g, replace: "dark:shadow-brand-glow" },
  { search: /dark:shadow-\[0_16px_44px_rgba\(0,0,0,0\.55\),0_0_22px_rgba\(183,255,0,0\.08\)\]/g, replace: "dark:shadow-panel" }
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk(path.join(__dirname, 'app')), ...walk(path.join(__dirname, 'components'))];

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(({search, replace}) => {
    content = content.replace(search, replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
  }
});

console.log(`Updated ${changedFiles} files.`);
