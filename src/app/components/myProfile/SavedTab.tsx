import { useNavigate } from 'react-router';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSavedContent, type SavedContentItem } from '../../contexts/SavedContentContext';

// Fully self-contained via useSavedContent() — no props needed.
export default function SavedTab() {
  const navigate = useNavigate();
  const { savedItems, removeSavedContent } = useSavedContent();

  const handleOpenSavedItem = (item: SavedContentItem) => {
    if (item.surface === 'video') navigate(`/watch/${item.rawId}`);
    else if (item.surface === 'creators-reels') navigate(`/creators?openReel=${item.rawId}`);
    else navigate('/main/reels');
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-5">Saved <span className="text-neutral-400 font-normal text-sm ml-1">({savedItems.length})</span></h2>
      {savedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookmarkIcon sx={{ fontSize: 40, color: '#d1d5db' }} className="mb-3" />
          <p className="text-sm font-medium text-neutral-700 mb-1">No saved Reels yet.</p>
          <p className="text-xs text-neutral-500">Tap the bookmark icon on a Reel to save it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {savedItems.map((item) => (
            <div key={item.contentId} className="group">
              <div
                className="relative aspect-video rounded-xl overflow-hidden mb-2.5 cursor-pointer"
                style={{ background: item.thumbnail }}
                onClick={() => handleOpenSavedItem(item)}
              >
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => handleOpenSavedItem(item)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors" title="Open">
                    <PlayArrowIcon sx={{ fontSize: 18, color: 'white' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSavedContent(item.contentId); }}
                    className="p-2 bg-white/20 hover:bg-red-500/80 rounded-full transition-colors"
                    title="Remove from Saved"
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18, color: 'white' }} />
                  </button>
                </div>
              </div>
              <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-snug">{item.title}</h3>
              <p className="text-xs text-neutral-400">{item.creatorName}{item.meta ? ` · ${item.meta}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
