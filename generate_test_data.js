const XLSX = require('xlsx');

// ===== Match 1: Björklöven vs Oskarshamn =====
const bjorkSkaters = [
  ['Gustaf Kangas', 16, 'CE', 4, 1, 2, 0, 0, 0, 2, 0, 3, '12:50', 1, 9, 2, 81],
  ['Erik Lundberg', 19, 'LW', 1, 2, 1, 1, 1, 2, 5, 1, 2, '18:30', 3, 0, 0, 0],
  ['Marcus Nilsson', 22, 'RW', 1, 1, 1, 0, 0, 0, 4, 0, 1, '17:45', 2, 0, 0, 0],
  ['Johan Svensson', 91, 'CE', 1, 0, 2, 0, 2, 2, 3, 0, 1, '19:10', 0, 7, 4, 63.6],
  ['Adam Pettersson', 7, 'LW', 2, 1, 0, 0, 0, 4, 3, 0, 0, '15:20', 4, 0, 0, 0],
  ['Viktor Lööf', 44, 'RW', 2, 0, 1, 0, 1, 0, 2, 0, -1, '14:50', 1, 0, 0, 0],
  ['Daniel Björk', 10, 'CE', 2, 0, 0, 0, 0, 2, 1, 0, -1, '13:40', 2, 5, 6, 45.5],
  ['Oskar Lindström', 28, 'LW', 3, 0, 0, 0, 1, 0, 1, 0, 0, '11:20', 1, 0, 0, 0],
  ['Filip Bergström', 33, 'RW', 3, 0, 0, 0, 0, 0, 1, 0, 0, '10:50', 0, 0, 0, 0],
  ['Anders Holm', 14, 'CE', 3, 0, 0, 0, 0, 0, 0, 0, -1, '10:30', 1, 3, 5, 37.5],
  ['Karl Johansson', 55, 'LW', 4, 0, 0, 0, 0, 0, 1, 0, 1, '8:20', 2, 0, 0, 0],
  ['Nils Eriksson', 8, 'RW', 4, 0, 0, 0, 0, 0, 0, 0, 1, '8:10', 0, 0, 0, 0],
  ['Lucas Andersson', 3, 'LD', 1, 0, 1, 0, 0, 0, 2, 0, 2, '20:40', 2, 0, 0, 0],
  ['Simon Karlsson', 5, 'RD', 1, 0, 0, 0, 1, 0, 1, 0, 2, '20:10', 3, 0, 0, 0],
  ['Oscar Nordin', 24, 'LD', 2, 0, 0, 0, 0, 2, 1, 0, -1, '18:30', 1, 0, 0, 0],
  ['Martin Olsson', 6, 'RD', 2, 0, 1, 0, 0, 0, 2, 0, -1, '18:20', 2, 0, 0, 0],
  ['Henrik Dahl', 77, 'LD', 3, 0, 0, 0, 0, 0, 0, 0, 0, '14:00', 1, 0, 0, 0],
  ['Tobias Söderström', 2, 'RD', 3, 0, 0, 0, 0, 2, 0, 0, 0, '13:50', 0, 0, 0, 0],
];
const bjorkGoalies = [
  ['Mattias Lindgren', 35, 'GK', 1, 2, 28, 0, 26, 92.9],
];
const oppSkaters = [
  ['Jonas Hall', 11, 'CE', 1, 1, 1, 0, 1, 2, 4, 0, -1, '19:00', 2, 6, 5, 54.5],
  ['Mikael Berg', 17, 'LW', 1, 1, 0, 0, 0, 0, 3, 0, -1, '17:30', 1, 0, 0, 0],
  ['Peter Nyström', 21, 'RW', 1, 0, 1, 0, 0, 0, 2, 0, -1, '17:00', 3, 0, 0, 0],
  ['David Kraft', 9, 'CE', 2, 0, 0, 0, 0, 0, 2, 0, 0, '15:30', 1, 4, 7, 36.4],
  ['Anton Ström', 15, 'LW', 2, 0, 0, 0, 1, 4, 1, 0, -1, '14:00', 2, 0, 0, 0],
  ['Robin Ek', 27, 'RW', 2, 0, 0, 0, 0, 0, 1, 0, 0, '13:50', 0, 0, 0, 0],
  ['Emil Larsson', 30, 'CE', 3, 0, 0, 0, 0, 0, 1, 0, -1, '11:00', 1, 2, 4, 33.3],
  ['Lars Hedman', 4, 'LD', 1, 0, 0, 0, 0, 0, 2, 0, -1, '19:30', 2, 0, 0, 0],
  ['Fredrik Sjöberg', 23, 'RD', 1, 0, 0, 0, 0, 2, 1, 0, -1, '19:00', 1, 0, 0, 0],
  ['Gustav Lind', 45, 'LD', 2, 0, 0, 0, 0, 0, 1, 0, 0, '16:40', 0, 0, 0, 0],
  ['Patrik Moberg', 12, 'RD', 2, 0, 0, 0, 1, 0, 2, 0, 0, '16:20', 3, 0, 0, 0],
];
const oppGoalies = [
  ['Alexander Grip', 1, 'GK', 1, 4, 30, 1, 26, 86.7],
];

function makeSheet(skaters, goalies) {
  const headers = ['Spelare','NR','POS','LINE','G','A','PPG','SW','PIM','SOG','PPSOG','+/-','TOI','Hits','FOW','FOL','FO%'];
  const gkHeaders = ['Spelare','NR','POS','LINE','GA','SOGA','SPGA','SVS','SVS%'];
  
  const rows = [];
  // Add goalies first
  goalies.forEach(g => {
    const obj = {};
    gkHeaders.forEach((h,i) => obj[h] = g[i]);
    rows.push(obj);
  });
  // Add skaters
  skaters.forEach(s => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = s[i]);
    rows.push(obj);
  });
  
  return XLSX.utils.json_to_sheet(rows);
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, makeSheet(bjorkSkaters, bjorkGoalies), 'Björklöven');
XLSX.utils.book_append_sheet(wb, makeSheet(oppSkaters, oppGoalies), 'Oskarshamn');
XLSX.writeFile(wb, 'test_data/Oskarshamn_Bjorkloven_20261903.xlsx');
console.log('Created test_data/Oskarshamn_Bjorkloven_20261903.xlsx');
