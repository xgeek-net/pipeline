/**
 * Utils class 
 */
const electron = require('electron');
const moment = require('moment');
const path = require('path');

const utils = {

  getAppWinBounds : function() {
    const display = electron.screen.getPrimaryDisplay();
    return {
      width: display.size.width * 0.75, 
      height: display.size.height * 0.85, 
      x : display.size.width * 0.125, 
      y : display.size.height * 0.075,
      icon : path.join(__dirname, '../../build/icons/256x256.png')
    };
  },

  getPopWinBounds : function() {
    const display = electron.screen.getPrimaryDisplay();
    return {
      width: display.size.width * 0.5, 
      height: display.size.height * 0.75, 
      x : display.size.width * 0.25, 
      y : display.size.height * 0.125,
      icon : path.join(__dirname, '../../build/icons/256x256.png')
    };
  },

  /**
   * Get local storage path, returns test folder in mocha test
   */
  getUserDataPath : function() {
    if(process.env.NODE_ENV === 'test') return path.join(__dirname, '../../test/cache');
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    return userDataPath;
  },

  isBlank : function(obj) {
    if(typeof obj === 'undefined' || obj === null) {
        return true;
    }
    if(typeof obj === 'string' && (obj === "undefined" || obj === "null" || obj === '') ) {
        return true;
    }
    return false;
  },

  isNotBlank : function(obj) {
    if(typeof obj === 'undefined' || obj === null) {
      return false;
    }
    if(typeof obj === 'string' && (obj === "undefined" || obj === "null" || obj === '') ) {
        return false;
    }
    return true;
  },

  isNumber : function(num) {
    var reg = new RegExp('^[0-9]+$');
    return reg.test(num);
  },

  /**
   * Sort number
   * @param {Array} numbers 
   * @param {Boolean} desc Default is ASC
   * @return {Array} numbers
   */
  sort : function(numbers, desc) {
    if(desc == true) {
      numbers.sort(function(a, b){return b-a});
    } else {
      numbers.sort(function(a, b){return a-b});
    }
    return numbers;
  },

  /**
   * Sort pullrequest by number
   */
  sortPR : function(prs, desc) {
    if(desc == true) {
      prs.sort(function(a, b){return b.number-a.number});
    } else {
      prs.sort(function(a, b){return a.number-b.number});
    }
    return prs;
  },

  /**
   * Sort pullrequest by number
   */
  sortCommit : function(commits, desc) {
    if(desc == true) {
      commits.sort(function(a, b){
        if(b.commit_date == a.commit_date) return 0;
        if(moment(b.commit_date).isAfter(moment(a.commit_date))) {
          return 1;
        } else {
          return -1;
        }
      });
    } else {
      commits.sort(function(a, b){
        if(a.commit_date == b.commit_date) return 0;
        if(moment(a.commit_date).isAfter(moment(b.commit_date))) {
          return 1;
        } else {
          return -1;
        }
      });
    }
    return commits;
  },

  /**
   * Get duration text between two times
   * @return {String} duration text
   */
  getDuration : function(startTime, endTime) {
    const diff = moment(startTime).diff(endTime);
    const duration = moment.duration(diff);
    let durTxt = ''; 
    /*if(duration.asDays() > 0) {
      durTxt += (duration.asDays() > 1) ? duration.asDays() + ' Days' : duration.asDays() + ' Day';
    }*/
    if(duration.hours() > 0) {
      durTxt += duration.hours() + ' h ';
    }
    if(duration.minutes() > 0) {
      durTxt += duration.minutes() + ' m ';
    }
    if(duration.seconds() > 0) {
      durTxt += duration.seconds() + ' s';
    }
    return durTxt;
  },

  /**
   * Get file name without extension
   */
  getFileName : function(filename) {
    filename = filename.replace(/(.*)\.(.*?)$/, "$1");
    return filename;
  },

  popItems : function(obj, keys) {
    let res = {};
    for(let key of keys) {
      if(obj.hasOwnProperty(key)) res[key] = obj[key];
    }
    return res;
  },
  
  serialize : function(err) {
    if(err instanceof Error)  return err.toString();
    return err;
  }
}

module.exports = utils;