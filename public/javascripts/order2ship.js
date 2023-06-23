// download mhb template
const downloadButton = document.getElementById('dl_template');
downloadButton.addEventListener('click', function() {
    const fileUrl = './MHB.xlsm';
    const currentDate = new Date();
    const formattedDate = currentDate.getFullYear() + ('0' + (currentDate.getMonth() + 1)).slice(-2) + ('0' + currentDate.getDate()).slice(-2);
    const fileName = 'MHB_' + formattedDate + '.xlsm';

    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.click();
});

// download 7-11mhb data

function exportToExcel() {
    // var table = document.querySelector('table');
    var table = document.querySelector('#mhb'); // 選取具有 id="mhb" 的表格
    var rows = table.querySelectorAll('tr');

    var data = [];
    var headerData = [];
    var columnWidths = [];
    var eraseLeft=2

    // 取得表格標題資料及設定欄位寬度
    var thCells = table.querySelectorAll('th');
    thCells.forEach(function(th, index) {
        if (index < thCells.length - eraseLeft) { // 刪除最右側的兩個欄位
          headerData.push({
            v: th.innerText,
            t: 's',
            s: {
              wrapText: true,
              alignment: {
                wrapText: true,
                vertical: 'top'
              }
            }
          });
    
          var columnWidth = Math.ceil((th.offsetWidth / 10) * 1.5) * 1;
          columnWidths.push(columnWidth);
        }
      });

    data.push(headerData);

    rows.forEach(function(row) {
        var rowData = [];
        var cells = row.querySelectorAll('td');
      
        // 刪除最右側的兩個欄位
        for (var i = 0; i < cells.length - eraseLeft; i++) {
          var cell = cells[i];
          var columnIndex = i;
      
          var formattedCellValue = cell.innerText.replace(/<br>/g, '\n');
      
          rowData.push({
            v: formattedCellValue,
            t: 's',
            s: {
              wrapText: true, // 啟用自動換行
              alignment: {
                wrapText: true,
                vertical: 'top'
              }
            }
          });
      
        //   var columnWidth = Math.ceil((cell.offsetWidth / 10) * 1.5) * 1.5; // 設定欄位寬度
        //   if (columnWidths[columnIndex]) {
        //     columnWidths[columnIndex] = Math.max(columnWidth, columnWidths[columnIndex]);
        //   } else {
        //     columnWidths[columnIndex] = columnWidth;
        //   }
        }
      
        data.push(rowData);
      });
      

    var worksheet = XLSX.utils.aoa_to_sheet(data);

    // 設定欄位寬度
    var range = XLSX.utils.decode_range(worksheet['!ref']);
    for (var col = range.s.c; col <= range.e.c; col++) {
        var columnWidth = Math.max(columnWidths[col], 10); // 最小寬度為10
        worksheet['!cols'] = worksheet['!cols'] || [];
        worksheet['!cols'][col] = { wch: columnWidth };
    }

    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet 1');
    var wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'orders.xlsx');
}


function GoShipping(orderID,fulfillments_id){
    var shippingNo=document.getElementById(orderID+"_txt").value;
    var xhr=new XMLHttpRequest();
    xhr.open('post','/orders/updateShippingStatus');
    xhr.setRequestHeader('Content-type','application/json');
    var rawData = {
        "orderID": orderID,
        "shippingNo": shippingNo,
        "fulfillments_id": parseInt(fulfillments_id)
      };
    var raw=JSON.stringify(rawData);
    console.log("raw:",raw);
    xhr.send(raw);
    xhr.onload=function(){
        var data=JSON.parse(xhr.responseText);
        console.log(data.message);
    }
    
}