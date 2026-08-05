import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import Overlay from './Overlay';

const TAGS = ['📈 Portfolio Update', '💡 Investing Insight', '🏦 Macro Watch', '📊 Earnings', '🎓 Beginner Tips'];

export interface ProfilePost {
  id: number;
  time: string;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
  tag: string;
  draft: boolean;
}

export const INIT_POSTS: ProfilePost[] = [
  { id: 1, time: '2h ago', content: "Just added to my NVDA position. AI infrastructure spending isn't slowing down — data center capex from the hyperscalers is still accelerating. This is a multi-year theme, not a trade.", likes: 1240, comments: 87, reposts: 203, tag: '📈 Portfolio Update', draft: false },
  { id: 2, time: '1d ago', content: "Reminder: volatility is not risk. Risk is permanent loss of capital. A 20% drawdown in a fundamentally strong company is an opportunity, not a reason to panic sell. Zoom out.", likes: 3421, comments: 142, reposts: 891, tag: '💡 Investing Insight', draft: false },
  { id: 3, time: 'Draft', content: "Fed held rates steady again. My read: we're in a higher-for-longer environment through at least Q3. Positioning accordingly — overweight value, underweight long-duration growth.", likes: 0, comments: 0, reposts: 0, tag: '🏦 Macro Watch', draft: true },
  { id: 4, time: '5d ago', content: "Q1 earnings recap: beat on revenue, missed on margins. Management guided conservatively for Q2 which I think is sandbagging. Holding my position. Full breakdown in my latest video.", likes: 987, comments: 63, reposts: 134, tag: '📊 Earnings', draft: false },
  { id: 5, time: 'Draft', content: "New to investing? The single best thing you can do this year: set up automatic contributions to a low-cost index fund and stop watching the daily price.", likes: 0, comments: 0, reposts: 0, tag: '🎓 Beginner Tips', draft: true },
];

interface PostsTabProps {
  posts: ProfilePost[];
  setPosts: React.Dispatch<React.SetStateAction<ProfilePost[]>>;
  displayName: string;
  displayHandle: string;
  initials: string;
}

// NOTE: posts here are local-only mock state (not the real Supabase-backed CreatePostModal
// flow used elsewhere in the app) — this tab was already scoped as out-of-bounds mock content
// management before this file split; unchanged by the split itself.
export default function PostsTab({ posts, setPosts, displayName, displayHandle, initials }: PostsTabProps) {
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [composerContent, setComposerContent] = useState('');
  const [composerTag, setComposerTag] = useState('📈 Portfolio Update');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);

  const handleOpenComposer = () => {
    setComposerContent('');
    setComposerTag('📈 Portfolio Update');
    setEditingPostId(null);
    setShowPostComposer(true);
  };

  const handleOpenEditPost = (post: ProfilePost) => {
    setComposerContent(post.content);
    setComposerTag(post.tag);
    setEditingPostId(post.id);
    setShowPostComposer(true);
  };

  const handleSavePost = () => {
    if (!composerContent.trim()) return;
    if (editingPostId) {
      setPosts(prev => prev.map(p => p.id === editingPostId ? { ...p, content: composerContent.trim(), tag: composerTag } : p));
    } else {
      setPosts(prev => [{
        id: Date.now(), time: 'Just now', content: composerContent.trim(),
        likes: 0, comments: 0, reposts: 0, tag: composerTag, draft: false,
      }, ...prev]);
    }
    setShowPostComposer(false);
    setEditingPostId(null);
    setComposerContent('');
  };

  const handlePublishDraft = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, draft: false, time: 'Just now' } : p));
  };

  const handleConfirmDeletePost = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setDeletePostId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold">Your Posts <span className="text-neutral-400 font-normal text-sm ml-1">({posts.filter(p => !p.draft).length} published · {posts.filter(p => p.draft).length} drafts)</span></h2>
        <button onClick={handleOpenComposer} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors">
          <AddIcon sx={{ fontSize: 16 }} />
          New Post
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.map((post) => (
          <div key={post.id} className={`bg-white border rounded-xl flex flex-col transition-colors ${post.draft ? 'border-dashed border-neutral-300 bg-neutral-50/50' : 'border-neutral-200 hover:border-neutral-300'}`}>
            {/* Delete confirmation */}
            {deletePostId === post.id ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                <p className="text-sm font-medium text-red-700 text-center">Delete this post?</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleConfirmDeletePost(post.id)} className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-full hover:bg-red-700 transition-colors">Delete</button>
                  <button onClick={() => setDeletePostId(null)} className="px-4 py-1.5 border border-neutral-300 text-xs font-medium rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{displayName}</span>
                      {!post.draft && <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <span>{displayHandle}</span><span>·</span>
                      <span className={post.draft ? 'text-amber-500 font-medium' : ''}>{post.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {post.draft && <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Draft</span>}
                    <span className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-full text-neutral-500">{post.tag}</span>
                  </div>
                </div>

                <p className="text-sm text-neutral-800 leading-relaxed flex-1 mb-3">{post.content}</p>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 mt-auto">
                  {post.draft ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePublishDraft(post.id)} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">Publish</button>
                      <button onClick={() => handleOpenEditPost(post)} className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">Edit</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        {post.likes.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {post.reposts.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEditPost(post)} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors" title="Edit">
                      <EditIcon sx={{ fontSize: 14, color: 'var(--icon-muted)' }} />
                    </button>
                    <button onClick={() => setDeletePostId(post.id)} className="icon-tap-target p-1.5 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                      <DeleteOutlineIcon sx={{ fontSize: 14, color: 'var(--icon-muted)' }} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Post Composer Modal ── */}
      {showPostComposer && (
        <Overlay onClose={() => { setShowPostComposer(false); setEditingPostId(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-[min(540px,90vw)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingPostId ? 'Edit Post' : 'New Post'}</h2>
              <button onClick={() => { setShowPostComposer(false); setEditingPostId(null); }} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-neutral-400">{displayHandle}</p>
              </div>
            </div>

            <textarea
              autoFocus
              value={composerContent}
              onChange={e => setComposerContent(e.target.value)}
              placeholder="What's on your mind? Share an investing insight..."
              rows={5}
              className="w-full text-sm text-neutral-800 border border-neutral-200 rounded-xl p-3 resize-none focus:outline-none focus:border-black transition-colors mb-4"
            />

            <div className="mb-4">
              <label className="block text-xs font-medium text-neutral-600 mb-2">Tag</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(t => (
                  <button
                    key={t}
                    onClick={() => setComposerTag(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${composerTag === t ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{composerContent.length} / 500</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowPostComposer(false); setEditingPostId(null); }} className="px-5 py-2 border border-neutral-200 text-sm font-medium rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
                <button onClick={handleSavePost} disabled={!composerContent.trim()} className="px-5 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {editingPostId ? 'Save' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
