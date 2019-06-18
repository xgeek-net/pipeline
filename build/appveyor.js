const fs = require('fs');
const path = require('path');

if(process.argv.length == 2) {
  console.error('argv error.');
  process.exit(1);
}
// console.log(process.argv[2]);
var clientDecode = Buffer.from(process.argv[2],'base64');
const filePath = path.join(__dirname, '../src/config/client.js');
var mochaDecode = Buffer.from(process.argv[3],'base64');
const tokenFilePath = path.join(__dirname, '../test/token.js');
// console.log(filePath);
fs.writeFile(filePath, clientDecode, function(err) {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  console.log('Build client.js Done!');
  fs.writeFile(filePath, clientDecode, function(err) {
    if(err) {
      console.error(err);
      process.exit(1);
    }
    console.log('Build test/token.js Done!');
    process.exit(0);
  });
  
});
