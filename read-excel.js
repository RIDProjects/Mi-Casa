const XLSX = require('xlsx');

// Read each Excel file
const files = [
  'E:/Finanzas/Deudas.xlsx',
  'E:/Finanzas/Inventario y Compra.xlsx',
  'E:/Finanzas/Calculadora de Fondo de Emergencia.xlsx'
];

files.forEach(file => {
  console.log('\n========================================');
  console.log('FILE:', file);
  console.log('========================================');
  
  try {
    const workbook = XLSX.readFile(file);
    console.log('Sheets:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log('\n--- Sheet:', sheetName, '---');
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Print first 20 rows to understand structure
      data.slice(0, 25).forEach((row, idx) => {
        console.log(`Row ${idx}:`, row);
      });
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
});
