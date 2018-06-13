/**
 * Utils class 
 */
const electron = require('electron');

class Utils {

  getPrimaryDisplay() {
    return electron.screen.getPrimaryDisplay();
  }
  
  getAppWinBounds() {
    const display = this.getPrimaryDisplay();
    return {
      width: display.size.width * 0.75, 
      height: display.size.height * 0.85, 
      x : display.size.width * 0.125, 
      y : display.size.height * 0.075
    };
  }

  getPopWinBounds() {
    const display = this.getPrimaryDisplay();
    return {
      width: display.size.width * 0.5, 
      height: display.size.height * 0.75, 
      x : display.size.width * 0.25, 
      y : display.size.height * 0.125
    };
  }

}

module.exports = Utils;