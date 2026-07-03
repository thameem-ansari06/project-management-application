import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Trash2, 
  Search, 
  FileText, 
  Plus, 
  Download, 
  ExternalLink, 
  File, 
  Info, 
  Calendar, 
  User, 
  Loader2,
  CheckCircle,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';

export default function NotionDocs() {
  const {
    selectedWorkspace,
    documents,
    setDocuments,
    selectedDoc,
    setSelectedDoc,
    handleCreateDoc,
    handleSaveDocContent,
    handleDeleteDoc,
    fetchDocuments,
    currentUserRole
  } = useOutletContext();

  const fileInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Editor state for notes
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved
  
  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync editor with selected doc
  useEffect(() => {
    if (selectedDoc) {
      setEditorTitle(selectedDoc.title || '');
      setEditorContent(selectedDoc.content || '');
      setSaveStatus('idle');
      setShowDeleteConfirm(false);
    }
  }, [selectedDoc]);

  // If no workspace selected
  if (!selectedWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-zinc-50/20 dark:bg-[#16181d] rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 animate-bounce">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No Workspace Selected</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
          Please select a workspace from the switcher in the header to view or upload documents.
        </p>
      </div>
    );
  }

  // Format bytes to readable file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get icons based on document/file type
  const getFileIcon = (doc) => {
    if (!doc.file_url) return <FileText className="w-5 h-5 text-indigo-400 shrink-0" />;
    const ext = (doc.file_name || '').split('.').pop().toLowerCase();
    
    if (['pdf'].includes(ext)) {
      return <span className="text-xl shrink-0">📕</span>;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <span className="text-xl shrink-0">📘</span>;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <span className="text-xl shrink-0">🟢</span>;
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return <span className="text-xl shrink-0">📙</span>;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
      return <span className="text-xl shrink-0">📦</span>;
    }
    if (['html', 'css', 'js', 'json', 'py', 'go'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-amber-400 shrink-0" />;
    }
    return <File className="w-5 h-5 text-zinc-400 shrink-0" />;
  };

  // Check if file is image for preview
  const isImageFile = (doc) => {
    if (!doc.file_url) return false;
    const ext = (doc.file_name || '').split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  };

  // File Upload Logic
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`http://127.0.0.1:8000/api/documents/upload?workspace_id=${selectedWorkspace.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchDocuments(selectedWorkspace.id);
      setSelectedDoc(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset
    }
  };

  // Save Text Note
  const handleSaveNote = async () => {
    if (!selectedDoc) return;
    setSaveStatus('saving');
    try {
      await handleSaveDocContent(editorTitle, editorContent);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
      console.error(err);
    }
  };

  // Filter documents by search query
  const filteredDocs = (documents || []).filter(doc => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (doc.title || '').toLowerCase().includes(query);
    const fileMatch = (doc.file_name || '').toLowerCase().includes(query);
    return titleMatch || fileMatch;
  });

  // User role is manager (admin/owner)
  const isManager = ['admin', 'owner'].includes(currentUserRole);

  const handleDeleteConfirm = async () => {
    if (!selectedDoc) return;
    try {
      await handleDeleteDoc(selectedDoc.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 select-none">
      {/* Header Info Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#1b1c1e] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            📂 Documents & Files Manager
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Store documents, notes, assets, and files for this workspace. Delete permissions are restricted to Managers.
          </p>
        </div>
        
        {/* Create/Upload actions */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleCreateDoc}
            className="bg-[#7b68ee] hover:bg-[#6c5ce7] text-white text-xs font-semibold px-4 h-9 gap-1.5 cursor-pointer rounded-lg"
          >
            <Plus className="w-4 h-4" /> New Note
          </Button>

          <Button 
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
            variant="outline"
            className="border-zinc-250 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold px-4 h-9 gap-1.5 cursor-pointer rounded-lg text-zinc-700 dark:text-zinc-350"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 rotate-180" /> Upload File
              </>
            )}
          </Button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      </div>

      {/* Main Panel grid */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        
        {/* Left Column - List of documents */}
        <div className="w-80 flex flex-col bg-white dark:bg-[#1b1c1e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          {/* Search bar */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <Input
                placeholder="Search files or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-250 placeholder-zinc-500"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => {
                const isSelected = selectedDoc && selectedDoc.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {getFileIcon(doc)}
                    
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-xs truncate block leading-tight">
                        {doc.title || doc.file_name || 'Untitled'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span>
                          {doc.file_url ? 'File' : 'Note'}
                        </span>
                        {doc.file_size && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(doc.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-zinc-500 italic text-xs">
                No documents found
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Editor / Detail preview */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1b1c1e] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          {selectedDoc ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Details */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-[#1b1c1e]">
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(selectedDoc)}
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {selectedDoc.file_name || selectedDoc.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Uploaded by: {selectedDoc.uploader?.name || 'User'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Updated: {new Date(selectedDoc.updated_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manager Actions (Delete) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Download option for files */}
                  {selectedDoc.file_url && (
                    <a 
                      href={selectedDoc.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-lg border border-zinc-250 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold px-3 h-8 gap-1.5 text-zinc-700 dark:text-zinc-350 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open File
                    </a>
                  )}

                  {/* Manager Only Delete button */}
                  {isManager && (
                    <div className="relative">
                      {!showDeleteConfirm ? (
                        <Button
                          onClick={() => setShowDeleteConfirm(true)}
                          variant="destructive"
                          className="h-8 text-xs font-semibold px-3 gap-1.5 rounded-lg shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-red-950/20 border border-red-900/60 p-1 rounded-lg">
                          <span className="text-[10px] text-red-500 font-bold px-1.5">Sure?</span>
                          <Button
                            onClick={handleDeleteConfirm}
                            variant="destructive"
                            size="sm"
                            className="h-6 text-[10px] font-bold px-2.5 rounded-md cursor-pointer"
                          >
                            Yes
                          </Button>
                          <Button
                            onClick={() => setShowDeleteConfirm(false)}
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] font-bold px-2.5 rounded-md bg-zinc-900 border-zinc-800 text-zinc-300"
                          >
                            No
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Editor/Viewer Panel */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/20 dark:bg-zinc-950/40">
                {selectedDoc.file_url ? (
                  /* Uploaded File details & preview */
                  <div className="max-w-2xl mx-auto space-y-6">
                    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-6 shadow-md rounded-xl">
                      <div className="flex flex-col items-center text-center pb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-3xl mb-3 shadow-inner">
                          {getFileIcon(selectedDoc)}
                        </div>
                        <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 break-all px-4">
                          {selectedDoc.file_name}
                        </h4>
                        <span className="text-xs text-zinc-500 mt-1 font-mono">
                          {formatFileSize(selectedDoc.file_size)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
                        <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
                          <Info className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>
                            <strong>File Format:</strong> {(selectedDoc.file_name || '').split('.').pop().toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
                          <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>
                            <strong>Uploaded at:</strong> {new Date(selectedDoc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-center">
                        <a 
                          href={selectedDoc.file_url} 
                          download={selectedDoc.file_name}
                          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg px-6 py-2.5 gap-2 shadow-lg shadow-blue-500/20 transition transform hover:scale-102 active:scale-98"
                        >
                          <Download className="w-4 h-4" /> Download Document
                        </a>
                      </div>
                    </Card>

                    {/* Image Preview */}
                    {isImageFile(selectedDoc) && (
                      <div className="flex flex-col items-center space-y-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Image Preview</span>
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 p-2 shadow-lg max-w-full flex justify-center">
                          <img 
                            src={selectedDoc.file_url} 
                            alt={selectedDoc.file_name} 
                            className="max-h-96 rounded-lg object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Text Note Editor */
                  <div className="max-w-3xl mx-auto flex flex-col h-full space-y-4">
                    {/* Editable Title */}
                    <input
                      type="text"
                      value={editorTitle}
                      onChange={(e) => {
                        setEditorTitle(e.target.value);
                        setSaveStatus('idle');
                      }}
                      className="w-full bg-transparent border-none outline-none font-bold text-xl sm:text-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-550 border-b border-zinc-200 dark:border-zinc-800 pb-2"
                      placeholder="Note Title"
                    />

                    {/* Note Content Textarea */}
                    <textarea
                      value={editorContent}
                      onChange={(e) => {
                        setEditorContent(e.target.value);
                        setSaveStatus('idle');
                      }}
                      className="w-full flex-grow bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-zinc-800 dark:text-zinc-350 min-h-[300px] placeholder-zinc-600"
                      placeholder="Start writing notes here..."
                    />

                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      {saveStatus === 'saved' && (
                        <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5 animate-in fade-in duration-205">
                          <CheckCircle className="w-4 h-4" /> Changes saved
                        </span>
                      )}
                      
                      <Button
                        onClick={handleSaveNote}
                        disabled={saveStatus === 'saving'}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 h-9 rounded-lg"
                      >
                        {saveStatus === 'saving' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty state selection prompt */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">No Document Selected</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                Choose a text note or uploaded file from the list, or create/upload a new one to begin editing or viewing details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
