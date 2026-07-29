const fs = require('fs');

const files = [
    'mobile/src/screens/Customer/HomeScreen.js',
    'mobile/src/screens/Customer/CategoriesScreen.js'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/logo\.jpg/g, 'icon.png');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed logo.jpg in ${file}`);
});
