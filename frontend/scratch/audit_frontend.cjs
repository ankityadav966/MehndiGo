const fs = require("fs");
const path = require("path");

const targetDir = path.join(__dirname, "../src");

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach((file) => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

const fileExtensions = [".js", ".jsx", ".css", ".html"];

walk(targetDir, (err, files) => {
  if (err) throw err;
  console.log(`Found ${files.length} files in frontend. Starting replacements...`);
  
  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    if (!fileExtensions.includes(ext)) {
      return;
    }

    let content = fs.readFileSync(file, "utf8");
    let original = content;

    // Replacements for incorrect brand names
    content = content.replace(/MehendiGo/g, "MehndiGo");
    content = content.replace(/Mehendigo/g, "MehndiGo");
    content = content.replace(/MehandiGo/g, "MehndiGo");
    content = content.replace(/Mehandigo/g, "MehndiGo");
    content = content.replace(/Mehndi Go/g, "MehndiGo");

    // Replacements for mehendi -> mehndi and mehandi -> mehndi
    content = content.replace(/mehandigo-api\.globalrns.com/g, "##API_DOMAIN_PLACEHOLDER##");
    
    // Perform standard replacements
    content = content.replace(/mehendi-artists/g, "mehndi-artists");
    content = content.replace(/book-mehendi-artist/g, "book-mehndi-artist");
    content = content.replace(/mehendi-artist/g, "mehndi-artist");
    content = content.replace(/mehendi/g, "mehndi");
    content = content.replace(/Mehendi/g, "Mehndi");
    content = content.replace(/mehandi/g, "mehndi");
    content = content.replace(/Mehandi/g, "Mehndi");
    
    // Restore domains
    content = content.replace(/##API_DOMAIN_PLACEHOLDER##/g, "mehandigo-api.globalrns.com");

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`Updated: ${path.relative(path.join(__dirname, ".."), file)}`);
    }
  });

  console.log("Frontend replacements complete!");
});
