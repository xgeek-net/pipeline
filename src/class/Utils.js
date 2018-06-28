/**
 * Utils class 
 */
const electron = require('electron');
const moment = require('moment');

const utils = {

  getAppWinBounds : function() {
    const display = electron.screen.getPrimaryDisplay();
    return {
      width: display.size.width * 0.75, 
      height: display.size.height * 0.85, 
      x : display.size.width * 0.125, 
      y : display.size.height * 0.075
    };
  },

  getPopWinBounds : function() {
    const display = electron.screen.getPrimaryDisplay();
    return {
      width: display.size.width * 0.5, 
      height: display.size.height * 0.75, 
      x : display.size.width * 0.25, 
      y : display.size.height * 0.125
    };
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
      res[key] = obj[key];
    }
    return res;
  } 
}

module.exports = utils;