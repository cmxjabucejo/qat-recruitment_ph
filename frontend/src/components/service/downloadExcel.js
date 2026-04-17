import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const downloadExcel = (data, fileName = 'data.xlsx') => {
  // Convert JSON data to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  // Generate a buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Create a Blob from the buffer
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

  // Trigger a download
  saveAs(blob, fileName);
};

export default downloadExcel;
