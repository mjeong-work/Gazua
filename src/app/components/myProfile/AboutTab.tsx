import { useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { Card } from '../ui/card';

const INIT_EXPERIENCE = [
  { role: 'Portfolio Manager', org: 'Major Investment Firm', years: '2012 – 2020' },
  { role: 'Independent Educator', org: 'Gazua Platform', years: '2020 – Present' },
  { role: 'Certified Financial Planner', org: 'CFP Board', years: 'Certified 2011' },
];

interface AboutTabProps {
  bioText: string;
  onEditProfile: () => void;
  videosCount: number;
  postsCount: number;
}

export default function AboutTab({ bioText, onEditProfile, videosCount, postsCount }: AboutTabProps) {
  const [experience, setExperience] = useState(INIT_EXPERIENCE);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [editExperience, setEditExperience] = useState(INIT_EXPERIENCE);
  const [focusAreas, setFocusAreas] = useState(['Long-term Value', 'Growth Stocks', 'ETFs', 'Crypto', 'Beginner Education', 'Portfolio Strategy']);
  const [isEditingFocusAreas, setIsEditingFocusAreas] = useState(false);
  const [newFocusArea, setNewFocusArea] = useState('');

  const handleStartEditExperience = () => {
    setEditExperience(experience.map(e => ({ ...e })));
    setIsEditingExperience(true);
  };

  const handleSaveExperience = () => {
    setExperience(editExperience);
    setIsEditingExperience(false);
  };

  const handleAddFocusArea = () => {
    const trimmed = newFocusArea.trim();
    if (trimmed && !focusAreas.includes(trimmed)) {
      setFocusAreas(prev => [...prev, trimmed]);
      setNewFocusArea('');
    }
  };

  const handleRemoveFocusArea = (tag: string) => {
    setFocusAreas(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="sm:col-span-2 space-y-5">
        {/* Bio — editing lives in the Edit Profile modal (single source of truth
            for profile.bio) rather than a second inline editor here. */}
        <Card className="p-5 gap-0 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">About</h2>
            <button
              onClick={onEditProfile}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors"
            >
              <EditIcon sx={{ fontSize: 13 }} />Edit
            </button>
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">
            {bioText || <span className="text-neutral-400 italic">Tell people about yourself</span>}
          </p>
        </Card>

        {/* Experience */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Experience</h3>
            {isEditingExperience ? (
              <div className="flex items-center gap-2">
                <button onClick={handleSaveExperience} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">Save</button>
                <button onClick={() => setIsEditingExperience(false)} className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={handleStartEditExperience} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                <EditIcon sx={{ fontSize: 13 }} />Edit
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(isEditingExperience ? editExperience : experience).map((item, i) => (
              <div key={i} className={`${isEditingExperience ? 'grid grid-cols-3 gap-2' : 'flex items-start justify-between'}`}>
                {isEditingExperience ? (
                  <>
                    <input value={item.role} onChange={e => { const ex = [...editExperience]; ex[i] = { ...ex[i], role: e.target.value }; setEditExperience(ex); }} className="text-sm border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-black" placeholder="Role" />
                    <input value={item.org} onChange={e => { const ex = [...editExperience]; ex[i] = { ...ex[i], org: e.target.value }; setEditExperience(ex); }} className="text-sm border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-black" placeholder="Organization" />
                    <input value={item.years} onChange={e => { const ex = [...editExperience]; ex[i] = { ...ex[i], years: e.target.value }; setEditExperience(ex); }} className="text-sm border border-neutral-200 rounded px-2 py-1 focus:outline-none focus:border-black" placeholder="Years" />
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium">{item.role}</p>
                      <p className="text-xs text-neutral-500">{item.org}</p>
                    </div>
                    <span className="text-xs text-neutral-400 whitespace-nowrap">{item.years}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Disclaimer:</strong> Content is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Focus Areas */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Focus Areas</h3>
            <button onClick={() => setIsEditingFocusAreas(prev => !prev)} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
              {isEditingFocusAreas ? <><CheckIcon sx={{ fontSize: 13 }} />Done</> : <><EditIcon sx={{ fontSize: 13 }} />Edit</>}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {focusAreas.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">
                {tag}
                {isEditingFocusAreas && (
                  <button onClick={() => handleRemoveFocusArea(tag)} className="text-neutral-400 hover:text-red-500 transition-colors ml-0.5">
                    <CloseIcon sx={{ fontSize: 11 }} />
                  </button>
                )}
              </span>
            ))}
          </div>
          {isEditingFocusAreas && (
            <div className="flex items-center gap-2 mt-3">
              <input
                value={newFocusArea}
                onChange={e => setNewFocusArea(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFocusArea(); }}
                placeholder="Add area..."
                className="flex-1 text-xs border border-neutral-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-black"
              />
              <button onClick={handleAddFocusArea} className="icon-tap-target p-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">
                <AddIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-3">
          <h3 className="text-base font-semibold">By the numbers</h3>
          {[
            { label: 'Followers', value: '127K' },
            { label: 'Videos published', value: String(videosCount) },
            { label: 'Posts published', value: String(postsCount) },
            { label: 'Joined', value: 'Jan 2020' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{stat.label}</span>
              <span className="font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
