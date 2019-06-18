const path = require('path');
const fs = require('fs');
const utils = require('./Utils');

class Storage {
  constructor(opts) {
    const userDataPath = utils.getUserDataPath();
    // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
    this.path = path.join(userDataPath, opts.configName + '.json');
    this.data = parseDataFile(this.path, opts.defaults);
    this.keymap = convertArrayToMap(this.data);
  }
  
  getAll(opt) {
    opt = opt || {};
    if(opt.cache === false) {
      this.data = parseDataFile(this.path);
      this.keymap = convertArrayToMap(this.data);
    }
    return this.data;
  }

  setAll(data) {
    this.data = data;
    this.keymap = convertArrayToMap(this.data);
    fs.writeFileSync(this.path, JSON.stringify(data));
  }

  get(key) {
    if(Array.isArray(this.data)) {
      return this.keymap[key];
    }
    return this.data[key];
  }
  
  // ...and this will set it
  set(key, val) {
    this.data[key] = val;
    // Wait, I thought using the node.js' synchronous APIs was bad form?
    // We're not writing a server so there's not nearly the same IO demand on the process
    // Also if we used an async API and our app was quit before the asynchronous write had a chance to complete,
    // we might lose that data. Note that in a real app, we would try/catch this.
    fs.writeFileSync(this.path, JSON.stringify(this.data));
  }
}

function parseDataFile(filePath, defaults) {
  // We'll try/catch it in case the file doesn't exist yet, which will be the case on the first application run.
  // `fs.readFileSync` will return a JSON string which we then parse into a Javascript object
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch(error) {
    // if there was some kind of error, return the passed in defaults instead.
    return defaults;
  }
}

function convertArrayToMap(data) {
  if(!Array.isArray(data)) return data;
  let keymap = {};
  for(let row of data) {
    if(!row.id) continue;
    keymap[row.id] = row;
  }
  return keymap;
}

// expose the class
module.exports = Storage;