const fs = require('fs');
const data = fs.readFileSync('data.js', 'utf8');
const code = fs.readFileSync('app.js', 'utf8');

// evaluate data
eval(data);

// extract functions
const codeWithoutApp = code.replace(/export default App;|function App\(\) \{[\s\S]*/g, '');
eval(codeWithoutApp);

const hL = getLineProd(MATCHES[0].home.skaters);
const aL = getLineProd(MATCHES[0].away.skaters);

console.log("Match 1 hL:", hL.length, hL.map(l => l.line));
console.log("Match 1 aL:", aL.length, aL.map(l => l.line));

const agg = buildMatchFromTotals(); // wait, buildMatchFromTotals is inside App()
