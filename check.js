const vm = require('vm');
const fs = require('fs');
try {
    new vm.Script(fs.readFileSync('app.js', 'utf8'), { filename: 'app.js' });
    console.log("Syntax OK");
} catch (e) {
    console.log(e.stack);
}
