/**
 * A utility function to escape a string for CSV format.
 * It handles commas, quotes, and newlines.
 * @param value The string to escape.
 * @returns The escaped string, ready for CSV.
 */
function escapeCsvValue(value: any): string {
    const stringValue = String(value ?? ""); // Ensure value is a string
    // If the value contains a comma, a quote, or a newline, wrap it in double quotes.
    if (/[",\n]/.test(stringValue)) {
        // Also, double up any existing double quotes inside the string.
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

/**
 * Parses a CSV file and converts it to an array of objects.
 * This is the no-library equivalent of `importFromExcel`.
 *
 * @param file The CSV file selected by the user.
 * @param onFileLoad A callback function that receives the parsed data.
 */
export const importFromCsv = (file: File, onFileLoad: (data: any[]) => void) => {
    if (!file || !file.type.includes("csv")) {
        alert("Please select a valid CSV file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        if (!event.target?.result) {
            alert("Error reading file.");
            return;
        }

        const text = event.target.result as string;
        const lines = text.trim().split(/\r?\n/);

        if (lines.length < 2) {
            onFileLoad([]); // Handle empty or header-only files
            return;
        }

        const headers = lines[0]?.split(",");
        if (!headers || headers.length === 0) return;
        const jsonData: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i]?.split(",")!;
            const rowData: Record<string, string> = {};
            for (let j = 0; j < headers.length; j++) {
                rowData[headers[j]!] = values[j] ?? "";
            }
            jsonData.push(rowData);
        }

        onFileLoad(jsonData);
    };

    reader.onerror = () => {
        alert("Error reading file.");
    };

    reader.readAsText(file);
};

/**
 * Converts an array of objects to a CSV string and triggers a download.
 * This is the no-library equivalent of `exportToExcel`.
 *
 * @param data The array of objects to export.
 * @param fileName The desired name of the downloaded file (without extension).
 */
export function exportToCsv(data: any[], fileName: string) {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(","), // Header row
    ];

    // Data rows
    data.forEach(item => {
        const values = headers.map(header => escapeCsvValue(item[header]));
        csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${fileName}.csv`);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Creates and downloads a CSV file with only a header row.
 * This is the no-library equivalent of `downloadTemplate`.
 *
 * @param options An object containing required fields, template name, etc.
 */
export function downloadCsvTemplate({ requiredFields, templateName }: { requiredFields: string[], templateName: string }) {
    if (requiredFields.length === 0) {
        alert("No fields provided for the template.");
        return;
    }

    const headerString = requiredFields.map(escapeCsvValue).join(",");
    const blob = new Blob([headerString], { type: 'text/csv;charset=utf-8;' });

    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${templateName}.csv`);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
