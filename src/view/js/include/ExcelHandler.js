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
  fileName = fileName || 'Pipeline.xlsx';
  function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }
  const wb = XLSX.utils.book_new();
  for(let sheetName in data) {
    const ws = XLSX.utils.aoa_to_sheet(data[sheetName]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  // const ws = XLSX.utils.aoa_to_sheet(data['Reference']);
  // XLSX.utils.book_append_sheet(wb, ws, 'Reference');

  const fileContent = XLSX.write(wb, {bookType:'xlsx', bookSST:true, type: 'binary'});
  let link = document.createElement("A");
  const blob = new Blob([s2ab(fileContent)],{type:""})
  link.href = window.URL.createObjectURL(blob);
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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