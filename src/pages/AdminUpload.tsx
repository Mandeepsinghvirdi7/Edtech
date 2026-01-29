import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/Components/layout/DashboardLayout';
import { Header } from '@/Components/layout/Header';
import { api } from '@/lib/api';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  FileUp,
  Loader2
} from 'lucide-react';

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message: string;
  progress: number;
}

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [branch, setBranch] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: '',
    progress: 0
  });
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBdeSelect = (bdeName: string) => {
    // This page doesn't show BDE performance, so we can do nothing
    // or show a notification.
    console.log(`BDE selected: ${bdeName}, but no action is configured on this page.`);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setUploadStatus({
        status: 'error',
        message: 'Invalid file type. Please upload .xlsx, .xls, or .csv files.',
        progress: 0
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadStatus({
        status: 'error',
        message: 'File too large. Maximum size is 10MB.',
        progress: 0
      });
      return;
    }

    setFile(selectedFile);
    setUploadStatus({ status: 'idle', message: '', progress: 0 });
  };

  const handleUpload = async () => {
    if (!file || !branch) {
      setUploadStatus({
        status: 'error',
        message: 'File and branch must be selected.',
        progress: 0
      });
      return;
    }

    setUploadStatus({ status: 'uploading', message: 'Uploading file...', progress: 50 });

    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('branch', branch);

    try {
      const response = await api.uploadExcel(formData);
      setUploadStatus({ status: 'processing', message: 'Processing data...', progress: 100 });

      // Simulate a short processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (response.success) {
        setUploadStatus({
          status: 'success',
          message: response.message || 'File uploaded and processed successfully!',
          progress: 100,
        });
      } else {
        setUploadStatus({
          status: 'error',
          message: response.error || 'An unknown error occurred during processing.',
          progress: 0,
        });
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus({
        status: 'error',
        message: error.message || 'An error occurred during upload.',
        progress: 0,
      });
    }
  };

  const resetUpload = () => {
    setFile(null);
    setBranch('');
    setUploadStatus({ status: 'idle', message: '', progress: 0 });
  };

  return (
    <DashboardLayout>
      <Header 
        title="Upload Data" 
        subtitle="Import sales data from Excel or CSV files" 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        liveRecords={[]}
        onBdeSelect={handleBdeSelect}
      />

      <div className="max-w-3xl mx-auto">
        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8"
        >
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      Drag and drop your file here
                    </p>
                    <p className="text-muted-foreground mt-1">
                      or click to browse
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4" />
                      .xlsx
                    </span>
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4" />
                      .xls
                    </span>
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-4 h-4" />
                      .csv
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Max file size: 10MB</p>
                </motion.div>
              ) : (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                    <FileUp className="w-8 h-8 text-success" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">{file.name}</p>
                    <p className="text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Branch Selection */}
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Choose a branch...</option>
                <option value="Hyderabad Branch">Hyderabad Branch</option>
                <option value="Mumbai Branch">Mumbai Branch</option>
              </select>
            </motion.div>
          )}

          {/* Status Messages */}
          <AnimatePresence>
            {uploadStatus.status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                  uploadStatus.status === 'error' 
                    ? 'bg-destructive/10 border border-destructive/20' 
                    : uploadStatus.status === 'success'
                    ? 'bg-success/10 border border-success/20'
                    : 'bg-primary/10 border border-primary/20'
                }`}
              >
                {uploadStatus.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                )}
                {uploadStatus.status === 'success' && (
                  <Check className="w-5 h-5 text-success mt-0.5" />
                )}
                {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    uploadStatus.status === 'error' ? 'text-destructive' :
                    uploadStatus.status === 'success' ? 'text-success' :
                    'text-primary'
                  }`}>
                    {uploadStatus.message}
                  </p>
                  {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadStatus.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            {file && uploadStatus.status !== 'uploading' && uploadStatus.status !== 'processing' && (
              <button onClick={resetUpload} className="btn-ghost flex items-center gap-2">
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
            {file && branch && uploadStatus.status !== 'success' && (
              <button
                onClick={handleUpload}
                disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload & Process
              </button>
            )}
            {uploadStatus.status === 'success' && (
              <button onClick={resetUpload} className="btn-primary flex items-center gap-2">
                Upload Another
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 mt-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">File Requirements</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-success mt-0.5" />
              <span>Required columns: Team Leader, BDE ID, BDE Name, Target, Admissions, Closed Points, Cancellation/Backout</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-success mt-0.5" />
              <span>Headers are automatically normalized (e.g., "teamleader" → "teamLeader")</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-success mt-0.5" />
              <span>Data is appended to existing records, never overwritten</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-4 h-4 text-success mt-0.5" />
              <span>Achievement percentage is automatically calculated</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}