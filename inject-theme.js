const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ejs')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Only affect full HTML pages that have a <head>
            if (content.includes('</head>')) {

                // 1. Inject global theme.css
                if (!content.includes('theme.css')) {
                    const cssLink = '\n    <link rel="stylesheet" href="/css/theme.css">';
                    content = content.replace('</head>', `${cssLink}\n</head>`);
                    modified = true;
                }

                // 2. Inject global theme.js
                if (!content.includes('theme.js')) {
                    const jsLink = '\n    <script src="/js/theme.js"></script>';
                    content = content.replace('</head>', `${jsLink}\n</head>`);
                    modified = true;
                }

                // 3. Inject Google Fonts
                if (!content.includes('fonts.googleapis.com')) {
                    const fontLink = '\n    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">';
                    content = content.replace('</head>', `${fontLink}\n</head>`);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

processDir(viewsDir);
console.log('Theme injection complete.');
