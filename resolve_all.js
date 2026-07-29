const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('scratch')) {
                results = results.concat(walkDir(file));
            }
        } else { 
            if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.json') || file.endsWith('.env')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('E:/projects/MehndiGo');
let fixedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('<<<<<<< HEAD')) {
        // Replace with HEAD ($1)
        const newContent = content.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> [a-z0-9a-fA-F]+/g, '$1');
        if (newContent !== content) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Fixed conflict in ' + file + ' (kept HEAD)');
            fixedCount++;
        }
    }
});

console.log('Total files fixed: ' + fixedCount);
