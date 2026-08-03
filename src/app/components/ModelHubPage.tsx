import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LockIcon from '@mui/icons-material/Lock';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useOnboarding } from '../contexts/OnboardingContext';
import AppHeader from './AppHeader';
import { type Model, MOCK_MODELS } from '../data/models';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useAuth } from '../contexts/AuthContext';
import { getModels, createModel } from '../../lib/services/models.service';
import { BUCKETS, buildOwnerPath, uploadToBucket } from '../../lib/storage';
import type { ModelWithCreator, ModelCategory, ModelDifficulty, ModelFileType } from '../../types/database';

function normalizeDbModel(m: ModelWithCreator, index: number): Model {
  const initial = (m.creator?.full_name?.[0] ?? '?').toUpperCase();
  return {
    id: index,
    db_id: m.id,
    title: m.title,
    creator: m.creator?.full_name ?? 'Unknown',
    creator_id: m.creator?.username ?? '',
    creatorAvatar: initial,
    difficulty: m.difficulty,
    fileType: m.file_type,
    category: m.category,
    description: m.description ?? '',
    learnings: m.learnings ?? [],
    downloads: m.download_count,
    remixes: m.remix_count,
    access: m.access_level,
  };
}

export default function ModelHubPage() {
  const navigate = useNavigate();
  const { data: onboardingData } = useOnboarding();
  const { addToWatchlist, removeBySource, isSaved } = useWatchlist();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtitle, setToastSubtitle] = useState('');
  const [filters, setFilters] = useState({
    difficulty: 'All',
    fileType: 'All',
    category: 'All',
    access: 'All',
  });

  const isExpert = onboardingData.level === 'confident';
  const { profile } = useAuth();

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState<ModelCategory | ''>('');
  const [uploadDifficulty, setUploadDifficulty] = useState<ModelDifficulty | ''>('');
  const [uploadFileType, setUploadFileType] = useState<ModelFileType | ''>('');
  const [uploadLearnings, setUploadLearnings] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('');
    setUploadDifficulty('');
    setUploadFileType('');
    setUploadLearnings('');
    setUploadFile(null);
    setUploadError(null);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    resetUploadForm();
  };

  const MODEL_MAX_BYTES = 25 * 1024 * 1024; // 25MB, matches the existing "max 25MB" copy

  const handleModelFileSelected = (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > MODEL_MAX_BYTES) {
      setUploadError('File is too large — max 25MB.');
      return;
    }
    setUploadError(null);
    setUploadFile(file);
  };

  const handlePublishModel = async () => {
    if (!profile?.id || !uploadTitle.trim() || !uploadCategory || !uploadDifficulty || !uploadFileType || !uploadFile) return;

    setUploadSubmitting(true);
    setUploadError(null);

    const ext = uploadFile.name.split('.').pop() || 'bin';
    const fileUpload = await uploadToBucket(BUCKETS.models, buildOwnerPath(profile.id, ext), uploadFile);
    if (fileUpload.error || !fileUpload.data) {
      setUploadError(fileUpload.error ?? 'Failed to upload file. Please try again.');
      setUploadSubmitting(false);
      return;
    }

    const learnings = uploadLearnings.split('\n').map(l => l.trim()).filter(Boolean);

    const { data: newModel, error } = await createModel({
      creator_id: profile.id,
      title: uploadTitle.trim(),
      description: uploadDescription.trim() || null,
      category: uploadCategory,
      difficulty: uploadDifficulty,
      file_type: uploadFileType,
      learnings,
      storage_path: fileUpload.data.path,
      access_level: 'Free Preview',
    });

    setUploadSubmitting(false);

    if (error || !newModel) {
      setUploadError(error ?? 'Failed to publish. Please try again.');
      return;
    }

    setDbModels(prev => [normalizeDbModel({
      ...newModel,
      creator: { id: profile.id, username: profile.username, full_name: profile.full_name, avatar_url: profile.avatar_url },
    }, 0), ...(prev ?? [])]);
    handleCloseUploadModal();
    triggerToast('Model published!');
  };

  // Supabase-backed model data. null = not yet resolved (use mock fallback).
  const [dbModels, setDbModels] = useState<Model[] | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);

    getModels({ limit: 50 }).then(({ data, error }) => {
      if (cancelled) return;
      setModelsLoading(false);
      if (error || !data) {
        setDbModels(null); // signal: use mock fallback (error / no Supabase config)
        return;
      }
      setDbModels(data.map(normalizeDbModel)); // real result, possibly a real empty array
    });

    return () => { cancelled = true; };
  }, []);

  const triggerToast = (message: string, subtitle = '') => {
    setToastMessage(message);
    setToastSubtitle(subtitle);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const filteredModels = useMemo(() => {
    const models = dbModels !== null ? dbModels : MOCK_MODELS;
    return models.filter(model => {
      const matchesSearch = model.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           model.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = filters.difficulty === 'All' || model.difficulty === filters.difficulty;
      const matchesFileType = filters.fileType === 'All' || model.fileType === filters.fileType;
      const matchesCategory = filters.category === 'All' || model.category === filters.category;
      const matchesAccess = filters.access === 'All' || model.access === filters.access;

      return matchesSearch && matchesDifficulty && matchesFileType && matchesCategory && matchesAccess;
    });
  }, [dbModels, searchQuery, filters]);

  const handleSave = (model: Model) => {
    if (!isSaved('model', model.db_id)) {
      addToWatchlist({
        ticker: model.title,
        name: model.title,
        assetType: 'Strategy',
        source_type: 'model',
        source_content_id: model.db_id,
        source: `Saved from model: ${model.title}`,
      });
      triggerToast('Saved to Watchlist', 'Build your thesis in the Watchlist tab');
    } else {
      removeBySource('model', model.db_id);
      triggerToast('Removed from Watchlist');
    }
  };

  const handleDownload = (model: Model) => {
    if (model.access === 'Expert Only' && !isExpert) return;
    triggerToast(`✓ Downloading: ${model.title}`, 'Your download will start shortly');
  };

  const handlePreview = (model: Model) => {
    setSelectedModel(model);
    setShowPreviewModal(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700';
      case 'Intermediate': return 'bg-blue-100 text-blue-700';
      case 'Advanced': return 'bg-purple-100 text-purple-700';
      case 'Expert': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'Excel': return '📊';
      case 'Google Sheet': return '📈';
      case 'Python': return '🐍';
      case 'Notebook': return '📓';
      case 'PDF': return '📄';
      default: return '📁';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Build smarter investing logic</h1>
            <p className="text-xl text-gray-600 mb-8">
              Explore Excel models, quant templates, and community-built finance tools.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
                className="px-8 py-3 bg-black text-white font-medium rounded-full hover:bg-black/80 transition-colors"
              >
                Explore Models
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-8 py-3 bg-mint text-black font-medium rounded-full hover:bg-mint-hover transition-colors flex items-center gap-2"
              >
                <UploadIcon sx={{ fontSize: 20 }} />
                Upload Model
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 bg-gray-50 rounded-xl p-6">
            <div className="mb-4">
              <div className="relative">
                <SearchIcon sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: 'var(--icon-muted)' }} />
                <input
                  type="text"
                  placeholder="Search models by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                >
                  <option>All</option>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">File Type</label>
                <select
                  value={filters.fileType}
                  onChange={(e) => setFilters(prev => ({ ...prev, fileType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                >
                  <option>All</option>
                  <option>Excel</option>
                  <option>Google Sheet</option>
                  <option>Python</option>
                  <option>Notebook</option>
                  <option>PDF</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                >
                  <option>All</option>
                  <option>Valuation</option>
                  <option>Portfolio</option>
                  <option>Quant Strategy</option>
                  <option>Market Dashboard</option>
                  <option>Beginner Template</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Access</label>
                <select
                  value={filters.access}
                  onChange={(e) => setFilters(prev => ({ ...prev, access: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                >
                  <option>All</option>
                  <option>Free Preview</option>
                  <option>Pro</option>
                  <option>Expert Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Showing {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
            </p>
          </div>

          {/* Loading Skeleton */}
          {modelsLoading && dbModels === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="border border-gray-200 rounded-xl p-6 animate-pulse">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : filteredModels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredModels.map((model) => {
                const isLocked = model.access === 'Expert Only' && !isExpert;
                const isModelSaved = isSaved('model', model.db_id);

                return (
                  <div
                    key={model.id}
                    className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                        {model.creatorAvatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 line-clamp-2">{model.title}</h3>
                        <p className="text-sm text-gray-600">{model.creator}</p>
                      </div>
                      <button
                        onClick={() => handleSave(model)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        title={isModelSaved ? "Saved to Watchlist" : "Save to Watchlist"}
                      >
                        {isModelSaved ? (
                          <BookmarkIcon sx={{ fontSize: 20, color: 'var(--brand)' }} />
                        ) : (
                          <BookmarkBorderIcon sx={{ fontSize: 20 }} />
                        )}
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(model.difficulty)}`}>
                        {model.difficulty}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <span>{getFileTypeIcon(model.fileType)}</span>
                        {model.fileType}
                      </span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {model.category}
                      </span>
                      {isLocked && (
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <LockIcon sx={{ fontSize: 12 }} />
                          Expert Only
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">{model.description}</p>

                    {/* What You'll Learn */}
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-700 mb-2">What you'll learn:</p>
                      <ul className="space-y-1">
                        {model.learnings.slice(0, 3).map((learning, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                            <span className="text-brand mt-0.5">•</span>
                            <span>{learning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
                      <span>{model.downloads.toLocaleString()} downloads</span>
                      <span>•</span>
                      <span>{model.remixes} remixes</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(model)}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                        Preview
                      </button>
                      <button
                        onClick={() => isLocked ? navigate('/') : handleDownload(model)}
                        className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          isLocked
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                            : 'bg-black text-white hover:bg-black/80'
                        }`}
                      >
                        {isLocked ? (
                          <>
                            <LockIcon sx={{ fontSize: 16 }} />
                            Upgrade to Access
                          </>
                        ) : (
                          <>
                            <FileDownloadIcon sx={{ fontSize: 16 }} />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <SearchIcon sx={{ fontSize: 40, color: 'var(--icon-muted)' }} />
              </div>
              <h3 className="text-xl font-bold mb-2">No models found</h3>
              <p className="text-gray-600 max-w-sm mb-6">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ difficulty: 'All', fileType: 'All', category: 'All', access: 'All' });
                }}
                className="px-6 py-3 bg-black text-white rounded-full hover:bg-black/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCloseUploadModal}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Share Your Model</h2>
                <p className="text-sm text-gray-600">Help the community learn with your finance models</p>
              </div>
              <button
                onClick={handleCloseUploadModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {!isExpert ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <LockIcon sx={{ fontSize: 40, color: '#d97706' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Expert Feature</h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Model uploads are available for Expert members. Upgrade your account to share your models with the community.
                  </p>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-6 py-3 bg-black text-white rounded-full hover:bg-black/90 transition-colors"
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Model Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g., Advanced Portfolio Optimizer"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value as ModelCategory)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                      >
                        <option value="">Select category</option>
                        <option>Valuation</option>
                        <option>Portfolio</option>
                        <option>Quant Strategy</option>
                        <option>Market Dashboard</option>
                        <option>Beginner Template</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
                      <select
                        value={uploadDifficulty}
                        onChange={(e) => setUploadDifficulty(e.target.value as ModelDifficulty)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                      >
                        <option value="">Select difficulty</option>
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                        <option>Expert</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">File Type</label>
                    <select
                      value={uploadFileType}
                      onChange={(e) => setUploadFileType(e.target.value as ModelFileType)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                    >
                      <option value="">Select file type</option>
                      <option>Excel</option>
                      <option>Google Sheet</option>
                      <option>Python</option>
                      <option>Notebook</option>
                      <option>PDF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                    <textarea
                      rows={3}
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Describe what your model does and who it's for..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">What users will learn (one per line)</label>
                    <textarea
                      rows={3}
                      value={uploadLearnings}
                      onChange={(e) => setUploadLearnings(e.target.value)}
                      placeholder="e.g., Build valuation models&#10;Calculate intrinsic value&#10;Compare to market price"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Upload File</label>
                    <input
                      type="file"
                      id="model-file-input"
                      accept=".xlsx,.xls,.csv,.py,.ipynb,.pdf"
                      className="hidden"
                      onChange={(e) => handleModelFileSelected(e.target.files?.[0])}
                    />
                    <label
                      htmlFor="model-file-input"
                      className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <UploadIcon sx={{ fontSize: 48, color: 'var(--icon-muted)' }} />
                      <p className="text-sm text-gray-600 mt-2">
                        {uploadFile ? `Selected: ${uploadFile.name}` : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Excel, CSV, Python, PDF (max 25MB)</p>
                    </label>
                    {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}
                  </div>

                  <button
                    onClick={handlePublishModel}
                    disabled={!uploadTitle.trim() || !uploadCategory || !uploadDifficulty || !uploadFileType || !uploadFile || uploadSubmitting}
                    className="w-full py-4 bg-black text-white font-bold rounded-full hover:bg-black/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {uploadSubmitting ? 'Publishing…' : 'Publish Model'}
                  </button>

                  <p className="text-xs text-center text-gray-500">
                    By publishing, you agree to share this model under the Gazua Community License.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedModel && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedModel.title}</h2>
                <p className="text-sm text-gray-600">by {selectedModel.creator}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Badges */}
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedModel.difficulty)}`}>
                  {selectedModel.difficulty}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1">
                  <span>{getFileTypeIcon(selectedModel.fileType)}</span>
                  {selectedModel.fileType}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {selectedModel.category}
                </span>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-bold mb-2">About this model</h3>
                <p className="text-gray-700">{selectedModel.description}</p>
              </div>

              {/* What You'll Learn */}
              <div className="mb-6">
                <h3 className="font-bold mb-3">What you'll learn</h3>
                <ul className="space-y-2">
                  {selectedModel.learnings.map((learning, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircleIcon sx={{ fontSize: 20, color: 'var(--brand)', marginTop: '2px' }} />
                      <span className="text-gray-700">{learning}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preview Placeholder */}
              <div className="mb-6 bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">{getFileTypeIcon(selectedModel.fileType)}</div>
                <h3 className="font-bold mb-2">Model Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Download the model to view the complete file and start using it in your workflow.
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span>{selectedModel.downloads.toLocaleString()} downloads</span>
                  <span>•</span>
                  <span>{selectedModel.remixes} remixes</span>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={() => {
                  if (selectedModel.access === 'Expert Only' && !isExpert) {
                    navigate('/');
                  } else {
                    handleDownload(selectedModel);
                    setShowPreviewModal(false);
                  }
                }}
                className={`w-full py-4 rounded-full font-bold transition-colors flex items-center justify-center gap-2 ${
                  selectedModel.access === 'Expert Only' && !isExpert
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    : 'bg-black text-white hover:bg-black/80'
                }`}
              >
                {selectedModel.access === 'Expert Only' && !isExpert ? (
                  <>
                    <LockIcon sx={{ fontSize: 20 }} />
                    Upgrade Plan to Download
                  </>
                ) : (
                  <>
                    <FileDownloadIcon sx={{ fontSize: 20 }} />
                    Download {selectedModel.title}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-slide-up pointer-events-none">
          <div>
            <p className="font-bold">{toastMessage}</p>
            {toastSubtitle && <p className="text-sm opacity-90">{toastSubtitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
