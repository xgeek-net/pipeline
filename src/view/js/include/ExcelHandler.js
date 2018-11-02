/*******************************************************************************
 * Handle Metadata export and import
 * @author Xiaoan Lin<admin@xgeek.net>
 ******************************************************************************/
var ExcelHandler = function(options){
  if (XLSX.read == undefined) {
    // initialize XLSX
    make_xlsx_lib(XLSX);
  }
  this.SUPPORT_TYPES = [
    'application/vnd.ms-excel', 
    'application/msexcel',
    'application/x-msexcel',
    'application/x-ms-excel',
    'application/x-excel',
    'application/x-dos_ms_excel',
    'application/xls',
    'application/x-xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
}
// Import metadata excel
ExcelHandler.prototype.read = function(file, callback) {
  return this.xlsxReader(file, callback);
}


// Export data to excel
ExcelHandler.prototype.write = function(data, fileName) {
  const self = this;
  fileName = fileName || 'Pipeline';
  XlsxPopulate
  .fromBlankAsync()
  .then(function(workbook) {
    // Create sheets
    workbook.sheet(0).name('Metadata');
    workbook.addSheet('Reference');
    for(let sheetName in data) {
      const sheet = workbook.sheet(sheetName);
      let columnCount = 0;
      let lineCount = 0;
      for(let l = 0; l < data[sheetName].length; l++) {
        let line = data[sheetName][l];
        let styles = {
          'border' : {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          },
          'wrapText' : true};
        if(l == 0) {
          lineCount = data[sheetName].length;
          columnCount = line.length;
        }
        for(let c = 0; c < line.length; c++) {
          // l0-c0 to A1, l0-c1 to B1
          let val = line[c];
          let cellNo = String.fromCharCode(65 + c) + (l + 1);
          sheet.cell(cellNo).value(val).style(styles);
          if(l == 0) {
            let fillStyle = (c < 3) ? {'fill' : '4285f4'} : {'fill' : 'a5a5a5'};
            sheet.cell(cellNo).style(fillStyle);
          } else {
            if(c == 4 && val.length > 0) {
              sheet.cell(cellNo).value(moment(val).format('YYYY/MM/DD HH:mm'))
            }
          }
        }
      }
      // Rejust cell width to fit data
      for(let c = 0; c < columnCount; c++) {
        let cellChar = String.fromCharCode(65 + c);
        // A1:A20
        const maxLength = sheet.range(cellChar + '1:' + cellChar + lineCount)
        .reduce(function(max, cell) {
          const value = cell.value();
          if (value === undefined) return max;
          // set length to 2x if has japanese string
          const vLen = self.getBytes(value.toString());
          return Math.max(max, vLen);
        }, 0);
        sheet.column(cellChar).width(maxLength + 5);
      }
    }
    return workbook.outputAsync();
  })
  .then(function(blob) {
    let link = document.createElement('A');
    //const blob = new Blob([s2ab(fileContent)],{type:""})
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName + '.xlsx';;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
}

// Read and convert xlsx to json 
ExcelHandler.prototype.xlsxReader = function(_file, callback) {
  const self = this;
  const file = _file;
  const reader = new FileReader();

  reader.onload = function(e) {
    try{
      const data = e.target.result;
      // データが多いとString.fromCharCode()でMaximum call stack size exceededエラーとなるので、
      // 別途関数で処理をする。
      const arr = self.handleCodePoints(new Uint8Array(data));
      if (typeof callback == 'function') {
        const xlsx = self.xlsxFile(file, XLSX.read(btoa(arr), {type: 'base64'}));
        const lines = xlsx.toJson();
        return callback(null, lines);
      }
    } catch(error) {
      return callback(error);
    }
  };
  reader.onerror = function (error) {
    return callback(error);
  };
  reader.readAsArrayBuffer(file);
}

ExcelHandler.prototype.xlsxFile = function(_file, _workbook) {
  const file = _file;
  const workbook = _workbook;

  return {
    getFile: function () {
      return file;
    },
    getWorkbook: function () {
      return workbook;
    },
    toJson: function () {
      // Only read first sheet
      var sheetName = workbook.SheetNames[0];
      const result = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
      return result;
    }
  };
}

ExcelHandler.prototype.handleCodePoints = function(array) {
  const CHUNK_SIZE = 0x8000; // arbitrary number here, not too small, not too big
  let index = 0;
  let length = array.length;
  let result = '';
  let slice;
  while (index < length) {
    slice = array.slice(index, Math.min(index + CHUNK_SIZE, length)); // `Math.min` is not really necessary here I think
    result += String.fromCharCode.apply(null, slice);
    index += CHUNK_SIZE;
  }
  return result;
}
// 'abcde' → 5, 'あいうえお' → 10
ExcelHandler.prototype.getBytes = function(txt) {
  var length = 0;
  for (var i = 0; i < txt.length; i++) {
    var c = txt.charCodeAt(i);
    if ((c >= 0x0 && c < 0x81) || (c === 0xf8f0) || (c >= 0xff61 && c < 0xffa0) || (c >= 0xf8f1 && c < 0xf8f4)) {
      length += 1;
    } else {
      length += 2;
    }
  }
  return length;
}