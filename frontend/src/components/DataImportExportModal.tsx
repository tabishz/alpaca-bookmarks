import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileJson, FileText, ArrowRightLeft } from 'lucide-react';
import api from '../api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const DataImportExportModal: React.FC<Props> = ({ isOpen, onClose, onImportSuccess }) => {
  // HTML Import/Export State
  const [isHtmlExporting, setIsHtmlExporting] = useState(false);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);

  // JSON Data Takeout State
  const [isJsonExporting, setIsJsonExporting] = useState(false);
  const [isJsonImporting, setIsJsonImporting] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleHtmlImportClick = () => {
    htmlFileInputRef.current?.click();
  };

  const handleHtmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Import "${file.name}"?`)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/system/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Import successful!');
      onImportSuccess();
    } catch {
      alert('Import failed');
    } finally {
      e.target.value = '';
    }
  };

  const handleHtmlExport = async () => {
    setIsHtmlExporting(true);
    try {
      const response = await api.get('/system/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bookmarks.html');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Export failed');
    } finally {
      setIsHtmlExporting(false);
    }
  };

  const handleJsonExport = async () => {
    setIsJsonExporting(true);
    try {
      const response = await api.get('/user/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'alpaca-takeout.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    } finally {
      setIsJsonExporting(false);
    }
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing data will add new bookmarks, tags, todos, and boards. Existing items will not be deleted. Continue?')) {
      e.target.value = '';
      return;
    }

    setIsJsonImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/user/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Data imported successfully! Please refresh the page to see changes.');
      window.location.reload();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please ensure the file is a valid Alpaca JSON takeout.');
    } finally {
      setIsJsonImporting(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={24} className="text-primary" />
            <h2 className="text-2xl font-bold text-text">Data Import / Export</h2>
          </div>
          <button onClick={onClose} className="text-text hover:opacity-70">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto pr-2 space-y-6">
          {/* Bookmarks Section */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-400 uppercase tracking-wider">
              Bookmarks
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Import or export bookmarks in standard HTML format (Netscape Bookmark File Format)
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleHtmlImportClick}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-700/30 hover:bg-gray-700/50 p-3 rounded-lg transition-colors border border-gray-600/30 text-sm font-medium"
              >
                <FileText size={18} className="text-orange-400" />
                Import HTML
              </button>
              <input
                type="file"
                ref={htmlFileInputRef}
                onChange={handleHtmlFileChange}
                accept=".html"
                className="hidden"
              />
              <button
                onClick={handleHtmlExport}
                disabled={isHtmlExporting}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-700/30 hover:bg-gray-700/50 p-3 rounded-lg transition-colors border border-gray-600/30 text-sm font-medium"
              >
                <Download size={18} className="text-blue-400" />
                {isHtmlExporting ? 'Exporting...' : 'Export HTML'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-600/30"></div>

          {/* Data Takeout Section */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-400 uppercase tracking-wider">
              Data Takeout
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Full account backup including bookmarks, tags, todos, and kanban boards (JSON format)
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => jsonFileInputRef.current?.click()}
                disabled={isJsonImporting}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-700/30 hover:bg-gray-700/50 p-3 rounded-lg transition-colors border border-gray-600/30 text-sm font-medium"
              >
                <FileJson size={18} className="text-yellow-400" />
                {isJsonImporting ? 'Importing...' : 'Import JSON'}
              </button>
              <input
                type="file"
                ref={jsonFileInputRef}
                onChange={handleJsonImport}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={handleJsonExport}
                disabled={isJsonExporting}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-700/30 hover:bg-gray-700/50 p-3 rounded-lg transition-colors border border-gray-600/30 text-sm font-medium"
              >
                <Upload size={18} className="text-green-400" />
                {isJsonExporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
