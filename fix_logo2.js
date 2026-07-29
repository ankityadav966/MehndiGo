const fs = require('fs');

const files = [
    'mobile/src/screens/Customer/HomeScreen.js',
    'mobile/src/screens/Customer/CategoriesScreen.js'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\.\.\/\.\.\/assets\/images\/icon\.png/g, '../../../assets/images/icon.png');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed icon.png path in ${file}`);
});
