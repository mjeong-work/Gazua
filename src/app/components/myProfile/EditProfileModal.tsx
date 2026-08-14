import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../../lib/services/profiles.service';
import { Button } from '../ui/button';
import Overlay from './Overlay';

// Instagram-style bio length cap — kept as a constant so it's a one-line change if the product
// ever wants a different limit.
export const MAX_BIO_LENGTH = 150;

interface EditProfileModalProps {
  onClose: () => void;
}

// Self-contained (reads/writes profile.full_name/handle/bio itself via useAuth + updateProfile)
// so every caller — the profile header's "Edit Profile" button, the About tab's Edit link —
// just needs to flip a boolean, matching the CreatePostModal/UploadVideoModal convention.
export default function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { profile, refreshProfile } = useAuth();
  const displayName = profile?.full_name || '';
  const displayHandle = profile?.handle ? `@${profile.handle}` : profile?.username ? `@${profile.username}` : '';
  const bioText = profile?.bio?.trim() || '';

  const [editName, setEditName] = useState(displayName);
  const [editHandle, setEditHandle] = useState(displayHandle);
  const [editBio, setEditBio] = useState(bioText);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    setProfileSaveError(null);

    // Collapse embedded whitespace/newlines, not just leading/trailing — a name field is a
    // single-line input, but pasting from elsewhere (e.g. a CRLF-terminated source) can carry a
    // literal line break into the value that .trim() alone doesn't touch (found live on a seed
    // profile: "Alex  \r\n  Rodriguez").
    const { error } = await updateProfile(profile.id, {
      full_name: editName.replace(/\s+/g, ' ').trim(),
      handle: editHandle.trim().replace(/^@/, '') || null,
      bio: editBio.trim() || null,
    });

    setSavingProfile(false);

    if (error) {
      setProfileSaveError(error);
      return;
    }

    await refreshProfile();
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-md shadow-xl w-[min(480px,90vw)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button onClick={onClose} className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Display Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Handle</label>
            <input value={editHandle} onChange={e => setEditHandle(e.target.value)} className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-600">Bio</label>
              <span className={`text-xs ${editBio.length >= MAX_BIO_LENGTH ? 'text-red-500' : 'text-neutral-400'}`}>
                {editBio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              maxLength={MAX_BIO_LENGTH}
              placeholder="Tell people about yourself"
              rows={3}
              className="w-full px-3 py-2 border border-neutral-200 rounded-sm text-sm resize-none focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>
        {profileSaveError && <p className="text-sm text-red-500 mt-3">{profileSaveError}</p>}
        <div className="flex items-center gap-2 mt-6">
          <Button onClick={handleSaveProfile} disabled={savingProfile} variant="pill" size="pill" className="flex-1 disabled:opacity-50">
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button onClick={onClose} variant="pillOutline" size="pill" className="flex-1">Cancel</Button>
        </div>
      </div>
    </Overlay>
  );
}
