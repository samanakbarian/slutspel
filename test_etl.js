const { importFile } = require('./etl');
const match = importFile('./excel_data/Oskarshamn_Bjorkloven_20261903.xlsx');
console.log('Match ID:', match.id);
console.log('Result:', match.result);
console.log('Bjorkloven Skaters:', match.bjorkloven.skaters.length);
console.log('Bjorkloven Goalies:', match.bjorkloven.goalies.length);
console.log('Bjorkloven Goals:', match.bjorkloven.skaters.reduce((s, x) => s + x.goals, 0));
console.log('Oskarshamn Goals:', match.opponentTeam.skaters.reduce((s, x) => s + x.goals, 0));
console.log('First Bjorkloven Skater:', match.bjorkloven.skaters[0]);
