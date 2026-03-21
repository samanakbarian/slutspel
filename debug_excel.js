const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, 'excel_data', 'Oskarshamn_Bjorkloven_20261903.xlsx');
const wb = XLSX.readFile(file);

console.log('Sheet names:', wb.SheetNames);

wb.SheetNames.forEach(sn => {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    console.log(`\n=== ${sn} (${rows.length} rows) ===`);
    if (rows.length > 0) {
        console.log('Columns:', Object.keys(rows[0]).join(', '));
    }
    rows.slice(0, 5).forEach((r, i) => {
        console.log(`  Row ${i + 1}:`, JSON.stringify(r).substring(0, 150));
    });
});

console.log('\n\n=== RAW HEADER:1 FORMAT ===');
wb.SheetNames.forEach(sn => {
    const ws = wb.Sheets[sn];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`\n--- ${sn} (${raw.length} raw rows) ---`);
    raw.slice(0, 15).forEach((r, i) => {
        if (r.some(c => c !== '')) {
            console.log(`  Row ${i}: [${r.map(c => String(c).substring(0, 15)).join(' | ')}]`);
        }
    });
});
