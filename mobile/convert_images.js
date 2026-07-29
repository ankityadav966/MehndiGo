const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDirs = [
  path.join(__dirname, 'src', 'assets', 'images'),
  path.join(__dirname, 'src', 'assets', 'images', 'categories'),
  path.join(__dirname, 'assets', 'images')
];

let convertedCount = 0;

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    
    if (file.toLowerCase().endsWith('.png')) {
      const buf = fs.readFileSync(fullPath);
      const isPng = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
      
      if (!isPng) {
        console.log(`Converting pseudo-PNG to True PNG: ${file}`);
        const tempPath = path.join(dir, 'temp_' + file);
        
        // Escape paths for PowerShell
        const safeFullPath = fullPath.replace(/'/g, "''");
        const safeTempPath = tempPath.replace(/'/g, "''");

        const psCommand = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${safeFullPath}'); $img.Save('${safeTempPath}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose()`;

        try {
          execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(fullPath);
            fs.renameSync(tempPath, fullPath);
            console.log(`✅ Converted ${file} -> Valid PNG`);
            convertedCount++;
          }
        } catch (err) {
          console.error(`❌ Failed to convert ${file}:`, err.message);
        }
      }
    }
  }
}

console.log(`\n🎉 Conversion complete! Total converted: ${convertedCount}`);
