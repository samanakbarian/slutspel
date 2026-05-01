const fs = require('fs');
const child_process = require('child_process');
try {
    child_process.execSync('node app.js', { stdio: 'pipe' });
} catch (e) {
    fs.writeFileSync('err.log', e.stderr);
}
