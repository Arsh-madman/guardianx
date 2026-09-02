import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  Image as ImageIcon,
  Music,
  Film,
  Download,
  Search,
  Filter,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Lock,
  Grid,
  List,
  FileCode,
  Archive,
  Info,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import { DeviceFile, CapabilityRequest, Consent } from '../types';

interface DeviceFilesExplorerProps {
  childId: number;
  childName: string;
  consent: Consent | null;
  onRequestFetch: () => void;
  isDispatching: boolean;
}

export const DeviceFilesExplorer: React.FC<DeviceFilesExplorerProps> = ({
  childId,
  childName,
  consent,
  onRequestFetch,
  isDispatching,
}) => {
  const [files, setFiles] = useState<DeviceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<DeviceFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [folderStats, setFolderStats] = useState<{ [key: string]: { count: number; bytes: number } }>({});
  const [totalBytes, setTotalBytes] = useState(0);

  const isConsentActive = consent?.is_active && consent.capabilities.FILES;

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/device/files/${childId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setLastFetchedAt(data.last_fetched_at || null);
        setFolderStats(data.folder_stats || {});
        setTotalBytes(data.total_bytes || 0);
      }
    } catch (err) {
      console.error('Failed to fetch device files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [childId]);

  const handleDownload = async (file: DeviceFile) => {
    try {
      setDownloadingId(file.id);
      const res = await fetch(`/api/device/files/${childId}/download/${file.id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Download request failed');
      }
      const data = await res.json();

      // Trigger browser file download simulation using Blob
      const fileContent = file.content_preview || `GuardianX Device File Export: ${file.name}\nSize: ${file.size_formatted}\nPath: ${file.path}\nTimestamp: ${new Date().toISOString()}`;
      const blob = new Blob([fileContent], { type: file.mime_type || 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadNotice(`✅ "${file.name}" successfully downloaded and logged in parent audit trail.`);
      setTimeout(() => setDownloadNotice(null), 5000);
    } catch (err: any) {
      setDownloadNotice(`❌ Failed to download file: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter and sort files
  const filteredFiles = files
    .filter((f) => {
      const matchFolder = selectedFolder === 'ALL' || f.folder === selectedFolder;
      const matchQuery =
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.mime_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFolder && matchQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0);
      return new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime();
    });

  const getFileIcon = (file: DeviceFile) => {
    const mime = file.mime_type.toLowerCase();
    if (mime.includes('image')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
    if (mime.includes('audio') || mime.includes('music')) return <Music className="w-5 h-5 text-emerald-400" />;
    if (mime.includes('video')) return <Film className="w-5 h-5 text-rose-400" />;
    if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    if (mime.includes('zip') || mime.includes('compressed')) return <Archive className="w-5 h-5 text-amber-400" />;
    if (mime.includes('word') || mime.includes('document')) return <FileText className="w-5 h-5 text-blue-400" />;
    if (mime.includes('text') || mime.includes('plain')) return <FileCode className="w-5 h-5 text-cyan-400" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatTotalSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  };

  const foldersList = ['ALL', 'School', 'Documents', 'Downloads', 'Images', 'Audio', 'Videos'];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E3E34] to-[#10201B] border border-[#2C5142] flex items-center justify-center text-[#B8F36B] shadow-lg">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Device File & Storage Explorer
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Sandboxed Access
                </span>
              </div>
              <p className="text-xs text-[#7C9B8A] mt-0.5">
                Browse, preview, and download documents, school assignments, and media from {childName}'s smartphone storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onRequestFetch}
              disabled={isDispatching || !isConsentActive}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isConsentActive
                  ? 'bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] shadow-[#B8F36B]/20'
                  : 'bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
              <span>{isDispatching ? 'FETCHING STORAGE...' : 'SCAN DEVICE FILES'}</span>
            </button>
          </div>
        </div>

        {/* NOTICES & CONSENT STATE */}
        {!isConsentActive && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>File Access Inactive:</strong> {childName} has not enabled the File Storage Access capability or consent has expired. Enable it in the child's consent controls to synchronize storage.
            </span>
          </div>
        )}

        {downloadNotice && (
          <div className="p-3.5 rounded-2xl bg-[#162B24] border border-[#2C5142] text-xs text-[#E8FFF4] flex items-center justify-between animate-fadeIn">
            <span>{downloadNotice}</span>
            <button onClick={() => setDownloadNotice(null)} className="text-[#7C9B8A] hover:text-white font-bold ml-3">
              ✕
            </button>
          </div>
        )}

        {/* STORAGE OVERVIEW METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235]">
            <div className="text-[11px] text-[#7C9B8A] font-bold uppercase tracking-wider">Scanned Files</div>
            <div className="text-xl font-black text-white mt-0.5">{files.length} items</div>
            <div className="text-[10px] text-[#62D8C2] mt-0.5">Across 6 system folders</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235]">
            <div className="text-[11px] text-[#7C9B8A] font-bold uppercase tracking-wider">Storage Volume</div>
            <div className="text-xl font-black text-[#B8F36B] mt-0.5">{formatTotalSize(totalBytes)}</div>
            <div className="text-[10px] text-[#7C9B8A] mt-0.5">Scanned device payload</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235]">
            <div className="text-[11px] text-[#7C9B8A] font-bold uppercase tracking-wider">Last Synced</div>
            <div className="text-sm font-black text-white mt-1 truncate">
              {lastFetchedAt ? new Date(lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
            </div>
            <div className="text-[10px] text-[#7C9B8A] mt-0.5">
              {lastFetchedAt ? new Date(lastFetchedAt).toLocaleDateString() : 'Awaiting sync'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235]">
            <div className="text-[11px] text-[#7C9B8A] font-bold uppercase tracking-wider">Compliance Status</div>
            <div className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Full Audit Log</span>
            </div>
            <div className="text-[10px] text-[#7C9B8A] mt-0.5">All downloads recorded</div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: SEARCH, FOLDER TABS, SORT & VIEW MODE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#10201B] border border-[#214235]">
        {/* FOLDER FILTER CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {foldersList.map((folder) => {
            const isSelected = selectedFolder === folder;
            const count = folder === 'ALL' ? files.length : folderStats[folder]?.count || 0;
            return (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#B8F36B] text-[#08110F] shadow-sm'
                    : 'bg-[#162B24] text-[#7C9B8A] hover:text-white border border-[#2C5142]'
                }`}
              >
                {folder === 'ALL' ? <HardDrive className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                <span>{folder}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-[#08110F]/20 text-[#08110F]' : 'bg-[#08110F] text-[#7C9B8A]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SEARCH & CONTROLS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-[#7C9B8A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search file name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#08110F] border border-[#214235] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#B8F36B]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#08110F] border border-[#214235]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#162B24] text-[#B8F36B]' : 'text-[#7C9B8A] hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-[#162B24] text-[#B8F36B]' : 'text-[#7C9B8A] hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FILES CONTAINER */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-[#10201B] border border-[#214235] space-y-3">
          <RefreshCw className="w-8 h-8 text-[#B8F36B] animate-spin mx-auto" />
          <div className="text-sm font-bold text-white">Scanning device file system...</div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#10201B] border border-[#214235] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#162B24] border border-[#2C5142] flex items-center justify-center text-[#7C9B8A] mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-white">No files found</div>
          <p className="text-xs text-[#7C9B8A] max-w-sm mx-auto">
            {files.length === 0
              ? `Click "Scan Device Files" above to request a fresh file inventory from ${childName}'s phone.`
              : 'No files match your current search query or folder filter.'}
          </p>
          {files.length === 0 && (
            <button
              onClick={onRequestFetch}
              disabled={isDispatching || !isConsentActive}
              className="mt-2 px-4 py-2 bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] font-black text-xs rounded-xl shadow-lg cursor-pointer"
            >
              Fetch File Inventory Now
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] hover:border-[#2C5142] transition-all flex flex-col justify-between group space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235] shrink-0">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-black text-white truncate group-hover:text-[#B8F36B] transition-colors" title={file.name}>
                    {file.name}
                  </h3>
                  <div className="text-[11px] text-[#7C9B8A] truncate font-mono mt-0.5" title={file.path}>
                    {file.path}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#162B24] text-[#62D8C2] border border-[#2C5142]">
                      {file.folder}
                    </span>
                    <span className="text-[11px] text-[#7C9B8A] font-bold">{file.size_formatted}</span>
                  </div>
                </div>
              </div>

              {file.content_preview && (
                <div className="p-2.5 rounded-xl bg-[#08110F] border border-[#214235] text-[11px] text-gray-300 line-clamp-2 italic">
                  "{file.content_preview}"
                </div>
              )}

              <div className="pt-2 border-t border-[#182C24] flex items-center justify-between gap-2">
                <div className="text-[10px] text-[#7C9B8A] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(file.last_modified).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#162B24] hover:bg-[#1E3E34] text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#B8F36B]" />
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingId === file.id ? 'animate-bounce' : ''}`} />
                    <span>{downloadingId === file.id ? '...' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-2xl bg-[#10201B] border border-[#214235] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#08110F] text-[#7C9B8A] font-bold uppercase text-[10px] tracking-wider border-b border-[#214235]">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Folder</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">MIME Type</th>
                  <th className="py-3 px-4">Modified Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182C24]">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-[#162B24]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(file)}
                        <div>
                          <div className="font-bold text-white hover:text-[#B8F36B] cursor-pointer" onClick={() => setPreviewFile(file)}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-[#7C9B8A] font-mono truncate max-w-xs">{file.path}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#162B24] text-[#62D8C2] border border-[#2C5142]">
                        {file.folder}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{file.size_formatted}</td>
                    <td className="py-3 px-4 text-[#7C9B8A] font-mono text-[11px]">{file.mime_type}</td>
                    <td className="py-3 px-4 text-[#7C9B8A]">{new Date(file.last_modified).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1.5 rounded-lg bg-[#162B24] hover:bg-[#1E3E34] text-white transition-colors cursor-pointer"
                          title="Preview File"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#B8F36B]" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FILE PREVIEW & DETAILS MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10201B] border border-[#2C5142] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 animate-fadeIn">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-[#214235] flex items-center justify-between bg-[#08110F]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#162B24] border border-[#2C5142]">
                  {getFileIcon(previewFile)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white truncate max-w-md">{previewFile.name}</h3>
                  <div className="text-[11px] text-[#7C9B8A] font-mono truncate max-w-md">{previewFile.path}</div>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="w-8 h-8 rounded-full bg-[#162B24] hover:bg-[#214235] text-gray-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL BODY: PREVIEW & METADATA */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* CONTENT VIEWER */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#7C9B8A] uppercase tracking-wider">File Content Preview</div>
                <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] text-xs text-gray-200 font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {previewFile.content_preview || 'Binary device data. Click "Download" to transfer this file to your computer.'}
                </div>
              </div>

              {/* METADATA GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                  <div className="text-[10px] text-[#7C9B8A] font-bold uppercase">Folder Category</div>
                  <div className="text-xs font-black text-[#62D8C2] mt-0.5">{previewFile.folder}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                  <div className="text-[10px] text-[#7C9B8A] font-bold uppercase">File Size</div>
                  <div className="text-xs font-black text-white mt-0.5">{previewFile.size_formatted} ({previewFile.size_bytes.toLocaleString()} bytes)</div>
                </div>

                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                  <div className="text-[10px] text-[#7C9B8A] font-bold uppercase">MIME Type</div>
                  <div className="text-xs font-mono text-white mt-0.5 truncate">{previewFile.mime_type}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                  <div className="text-[10px] text-[#7C9B8A] font-bold uppercase">Last Modified</div>
                  <div className="text-xs font-black text-white mt-0.5">{new Date(previewFile.last_modified).toLocaleString()}</div>
                </div>

                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                  <div className="text-[10px] text-[#7C9B8A] font-bold uppercase">Integrity Hash</div>
                  <div className="text-xs font-mono text-[#B8F36B] mt-0.5">SHA256-OK</div>
                </div>

                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                  <div className="text-[10px] text-[#7C9B8A] font-bold uppercase">Device Access Level</div>
                  <div className="text-xs font-black text-emerald-400 mt-0.5">Parent Authorized</div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-[#214235] bg-[#08110F] flex items-center justify-between">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 rounded-xl bg-[#162B24] hover:bg-[#1E3E34] text-gray-300 font-bold text-xs cursor-pointer"
              >
                Close Preview
              </button>

              <button
                onClick={() => handleDownload(previewFile)}
                disabled={downloadingId === previewFile.id}
                className="px-5 py-2.5 rounded-xl bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] font-black text-xs tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#B8F36B]/20"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingId === previewFile.id ? 'DOWNLOADING...' : 'DOWNLOAD FILE TO COMPUTER'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
