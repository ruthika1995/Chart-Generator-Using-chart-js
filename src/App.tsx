import React, { useState, useRef, useEffect } from 'react';
import { Copy, Download, AlertCircle, CheckCircle, FileText, BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';

interface DataObject {
  [key: string]: string | number;
}

interface ParsedData {
  type: 'csv' | 'json';
  data: DataObject[];
}

interface ChartConfig {
  type: string;
  title: string;
  labels: string[];
  datasets: any[];
}

function App() {
  const [input, setInput] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [title, setTitle] = useState('My Chart');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const chartTypes = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'doughnut', label: 'Doughnut Chart', icon: PieChart },
    { value: 'radar', label: 'Radar Chart', icon: BarChart3 },
    { value: 'bubble', label: 'Bubble Chart', icon: BarChart3 },
    { value: 'scatter', label: 'Scatter Chart', icon: BarChart3 },
    { value: 'polarArea', label: 'Polar Area Chart', icon: PieChart },
  ];

  const parseInput = (text: string): ParsedData => {
    text = text.trim();
    
    // Try JSON first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return { type: 'json', data: parsed };
      }
    } catch (e) {
      // Continue to CSV parsing
    }

    // Parse as CSV - improved parsing
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row.');
    }

    // Better CSV parsing with quoted fields support
    const parseCSVLine = (line: string): string[] => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
    const rows = lines.slice(1).map(line => parseCSVLine(line).map(cell => cell.replace(/"/g, '').trim()));

    const data = rows.map(row => {
      const obj: DataObject = {};
      headers.forEach((header, index) => {
        const value = row[index] || '';
        // Try to convert to number if possible
        const numValue = Number(value);
        obj[header] = !isNaN(numValue) && value !== '' ? numValue : value;
      });
      return obj;
    });

    return { type: 'csv', data };
  };

  const generateColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.5) % 360; // Golden angle approximation
      colors.push({
        background: `hsla(${hue}, 70%, 60%, 0.6)`,
        border: `hsla(${hue}, 70%, 50%, 1)`,
      });
    }
    return colors;
  };

  const createChartConfig = (parsedData: ParsedData): ChartConfig => {
    const { data } = parsedData;
    if (!data || data.length === 0) {
      throw new Error('No data found.');
    }

    const keys = Object.keys(data[0]);
    
    if (keys.length < 2) {
      throw new Error('Data must have at least 2 columns (labels and values).');
    }

    const labelKey = keys[0];
    const numericKeys = keys.slice(1).filter(key => 
      data.some(row => typeof row[key] === 'number' || (!isNaN(Number(row[key])) && row[key] !== ''))
    );

    if (numericKeys.length === 0) {
      throw new Error('No numeric columns found. At least one column must contain numeric values.');
    }

    const labels = data.map(row => String(row[labelKey] || ''));
    const colors = generateColors(numericKeys.length);
    
    const datasets = numericKeys.map((key, index) => ({
      label: key,
      data: data.map(row => {
        const value = row[key];
        return typeof value === 'number' ? value : Number(value) || 0;
      }),
      backgroundColor: colors[index].background,
      borderColor: colors[index].border,
      borderWidth: 2,
      tension: chartType === 'line' ? 0.4 : undefined,
    }));

    return {
      type: chartType,
      title,
      labels,
      datasets,
    };
  };

  const generateHtmlSnippet = (config: ChartConfig): string => {
    const dataString = JSON.stringify(config, null, 2);
    
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${config.title}</title>
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0; 
        padding: 20px; 
        background: #f8fafc; 
      }
      .container { 
        max-width: 900px; 
        margin: 0 auto; 
        background: white; 
        border-radius: 12px; 
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
        overflow: hidden;
      }
      .header {
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
      }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .chart-container { padding: 24px; }
      .download-btn {
        display: inline-block;
        margin-top: 16px;
        padding: 8px 16px;
        background: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 14px;
        transition: background 0.2s;
        cursor: pointer;
        border: none;
      }
      .download-btn:hover { background: #2563eb; }
      #chart { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${config.title}</h1>
      </div>
      <div class="chart-container">
        <canvas id="chart"></canvas>
        <div style="text-align: center;">
          <button id="download" class="download-btn">Download PNG</button>
        </div>
      </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>

    <script>
      // Wait for Chart.js to load
      document.addEventListener('DOMContentLoaded', function() {
        // Chart configuration
        const config = ${dataString};
        
        // Initialize chart
        const ctx = document.getElementById('chart');
        if (!ctx) {
          console.error('Chart canvas not found');
          return;
        }

        const chart = new Chart(ctx, {
          type: config.type,
          data: {
            labels: config.labels,
            datasets: config.datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  usePointStyle: true,
                  padding: 20
                }
              },
              title: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
                borderWidth: 1,
                cornerRadius: 6,
                displayColors: true
              }
            },
            scales: config.type === 'pie' || config.type === 'doughnut' || config.type === 'radar' || config.type === 'polarArea' ? {} : {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(0,0,0,0.05)'
                },
                ticks: {
                  color: '#6b7280'
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#6b7280'
                }
              }
            }
          }
        });

        // Download functionality
        const downloadBtn = document.getElementById('download');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            try {
              const link = document.createElement('a');
              link.download = 'chart.png';
              link.href = chart.toBase64Image('image/png', 1.0);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (error) {
              console.error('Download failed:', error);
              alert('Download failed. Please try again.');
            }
          });
        }
      });
    </script>
  </body>
</html>`;
  };

  const handleGenerate = () => {
    setError('');
    setSuccess('');
    
    if (!input.trim()) {
      setError('Please provide data in CSV or JSON format.');
      return;
    }

    try {
      const parsedData = parseInput(input);
      const config = createChartConfig(parsedData);
      const html = generateHtmlSnippet(config);
      
      setGeneratedHtml(html);
      setSuccess('Chart HTML generated successfully!');
      setShowPreview(true);
      
      // Update preview iframe
      setTimeout(() => {
        if (previewRef.current) {
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          previewRef.current.src = url;
          
          // Clean up old URL
          previewRef.current.onload = () => {
            URL.revokeObjectURL(url);
          };
        }
      }, 100);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing your data.');
      setShowPreview(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedHtml) return;
    
    try {
      await navigator.clipboard.writeText(generatedHtml);
      setSuccess('HTML code copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = generatedHtml;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setSuccess('HTML code copied to clipboard!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (fallbackErr) {
        setError('Failed to copy to clipboard.');
      }
      document.body.removeChild(textArea);
    }
  };

  const exampleCSV = `month,sales,expenses
Jan,120,80
Feb,150,90
Mar,90,70
Apr,180,95`;

  const exampleJSON = `[
  {"month": "Jan", "sales": 120, "expenses": 80},
  {"month": "Feb", "sales": 150, "expenses": 90},
  {"month": "Mar", "sales": 90, "expenses": 70},
  {"month": "Apr", "sales": 180, "expenses": 95}
]`;

  const insertExample = (example: string) => {
    setInput(example);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Clear success message after some time
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ChartCraft
                  </h1>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Pro</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Professional Data Visualization Platform</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 font-medium">Powered by </p>
              {/* <img src="/image.png" alt="Logo" className="w-20 h-20" /> */}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Data to Chart Generator
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Transform your CSV or JSON data into beautiful, 
            interactive charts with Chart.js and get production-ready HTML code instantly.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Data Input
              </h2>
              
              {/* Example buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => insertExample(exampleCSV)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Example CSV
                </button>
                <button
                  onClick={() => insertExample(exampleJSON)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                >
                  Example JSON
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your CSV or JSON data here..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Chart Configuration */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {chartTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setChartType(value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          chartType === value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter chart title..."
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim()}
                >
                  Generate Chart HTML
                </button>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-green-800">{success}</p>
                </div>
              )}
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            {showPreview && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Chart Preview</h2>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy HTML
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    ref={previewRef}
                    className="w-full h-96 border-0"
                    title="Chart Preview"
                    sandbox="allow-scripts"
                  />
                </div>
              </div>
            )}

            {generatedHtml && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Generated HTML Code</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([generatedHtml], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'chart.html';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
                
                <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96 border border-gray-200">
                  <code className="text-gray-800">{generatedHtml}</code>
                </pre>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Use</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Prepare Your Data</p>
                    <p>Format your data as CSV (comma-separated) or JSON array. First column should be labels, remaining columns should contain numeric values.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Customize Your Chart</p>
                    <p>Select your preferred chart type and enter a meaningful title for your visualization.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Generate & Use</p>
                    <p>Click "Generate Chart HTML" to create your code. Copy the HTML and save it as a .html file, then open in any web browser.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;