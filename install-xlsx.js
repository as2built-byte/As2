// Script pour installer xlsx manuellement si nécessaire
const fs = require('fs');
const path = require('path');

// Créer un fichier xlsx.min.js dans le répertoire public
const xlsxCode = `
// xlsx library - version simplifiée pour l'export Excel
var XLSX = {
    utils: {
        json_to_sheet: function(data) {
            const ws = {};
            const range = {s: {c:0, r:0}, e: {c:0, r:0}};
            for(let R = 0; R < data.length; ++R) {
                for(let C = 0; C < Object.keys(data[R]).length; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({c:C, r:R});
                    ws[cellAddress] = {v: data[R][Object.keys(data[R])[C]]};
                    if(range.e.c < C) range.e.c = C;
                }
                range.e.r = R;
            }
            ws['!ref'] = XLSX.utils.encode_range(range);
            return ws;
        },
        book_new: function() {
            return {SheetNames: [], Sheets: {}};
        },
        book_append_sheet: function(wb, ws, name) {
            if(!wb.SheetNames) wb.SheetNames = [];
            if(!wb.Sheets) wb.Sheets = {};
            wb.SheetNames.push(name);
            wb.Sheets[name] = ws;
        },
        encode_cell: function(cell) {
            return XLSX.utils.encode_col(cell.c) + (cell.r + 1);
        },
        encode_col: function(col) {
            let s = '';
            for(++col; col; col = Math.floor((col - 1) / 26)) {
                s = String.fromCharCode(((col - 1) % 26) + 65) + s;
            }
            return s;
        },
        encode_range: function(range) {
            return XLSX.utils.encode_cell(range.s) + ':' + XLSX.utils.encode_cell(range.e);
        }
    },
    writeFile: function(wb, filename) {
        // Créer un simple CSV pour le fallback
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], {type: 'text/csv'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    },
    sheet_to_csv: function(ws) {
        const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : {s: {c:0, r:0}, e: {c:0, r:0}};
        let csv = '';
        for(let R = range.s.r; R <= range.e.r; ++R) {
            const row = [];
            for(let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({c:C, r:R});
                const cell = ws[cellAddress];
                row.push(cell ? cell.v : '');
            }
            csv += row.join(',') + '\\n';
        }
        return csv;
    },
    decode_range: function(range) {
        const parts = range.split(':');
        return {
            s: XLSX.utils.decode_cell(parts[0]),
            e: XLSX.utils.decode_cell(parts[1] || parts[0])
        };
    },
    decode_cell: function(cell) {
        const col = XLSX.utils.decode_col(cell.replace(/[0-9]/g, ''));
        const row = parseInt(cell.replace(/[^0-9]/g, ''), 10) - 1;
        return {c: col, r: row};
    },
    decode_col: function(col) {
        let result = 0;
        for(let i = 0; i < col.length; ++i) {
            result = result * 26 + (col.charCodeAt(i) - 64);
        }
        return result - 1;
    }
};

// Exporter globalement
if(typeof window !== 'undefined') {
    window.XLSX = XLSX;
} else if(typeof global !== 'undefined') {
    global.XLSX = XLSX;
}
`;

const publicDir = path.join(__dirname, 'public');
const xlsxPath = path.join(publicDir, 'xlsx.min.js');

try {
    fs.writeFileSync(xlsxPath, xlsxCode);
    console.log('Fichier xlsx.min.js créé avec succès dans public/');
} catch (error) {
    console.error('Erreur lors de la création du fichier xlsx.min.js:', error);
}
