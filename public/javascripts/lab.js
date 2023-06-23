
function exportToExcel02() {
    var table = document.querySelector('table');
    var rows = table.querySelectorAll('tr');

    var data = [];
    var headerData = [];
    var columnWidths = [];

    // 取得表格標題資料及設定欄位寬度
    var thCells = table.querySelectorAll('th');
    thCells.forEach(function(th) {
        headerData.push({
            v: th.innerText,
            t: 's',
            s: {
                wrapText: true, // 啟用自動換行
                alignment: {
                    wrapText: true,
                    vertical: 'top'
                }
            }
        });

        var columnWidth = Math.ceil((th.offsetWidth / 10) * 1.5) * 1.5; // 設定欄位寬度
        columnWidths.push(columnWidth);
    });

    data.push(headerData);

    rows.forEach(function(row) {
        var rowData = [];
        var cells = row.querySelectorAll('td');

        cells.forEach(function(cell, columnIndex) {
            var formattedCellValue = cell.innerText.replace(/<br>/g, '\n');

            rowData.push({
                v: formattedCellValue,
                t: 's',
                s: {
                    wrapText: true // 啟用自動換行
                }
            });

            var columnWidth = Math.ceil((cell.offsetWidth / 10) * 1.5) * 1.5; // 設定欄位寬度
            if (columnWidths[columnIndex]) {
                columnWidths[columnIndex] = Math.max(columnWidth, columnWidths[columnIndex]);
            } else {
                columnWidths[columnIndex] = columnWidth;
            }
        });

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


function exportToExcel01() {
    var table = document.querySelector('table');
    var rows = table.querySelectorAll('tr');

    var data = [];
    var headerData = [];

    // 取得表格標題資料
    var thCells = table.querySelectorAll('th');
    thCells.forEach(function(th) {
        headerData.push({
        v: th.innerText,
        t: 's',
        s: { wrapText: true } // 啟用自動換行
        });
    });

    data.push(headerData);

    rows.forEach(function(row) {
        var rowData = [];
        var cells = row.querySelectorAll('td');

        cells.forEach(function(cell) {
        var formattedCellValue = cell.innerText.replace(/<br>/g, '\n');
        
        rowData.push({
            v: formattedCellValue,
            t: 's',
            s: { wrapText: true } // 啟用自動換行
        });
        });

        data.push(rowData);
    });

    var worksheet = XLSX.utils.aoa_to_sheet(data);

    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet 1');
    var wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'orders.xlsx');
    }