import { useMemo, useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { Card } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../../lib/services/profiles.service';
import { RISK_STYLE_LABELS, allocationTotal, allocationToJson, isAllocationValid, parseAllocation } from '../../utils/creator';
import type { AllocationSlice, Profile } from '../../../types/database';

type RiskStyle = NonNullable<Profile['creator_risk_style']>;
const RISK_STYLE_OPTIONS: RiskStyle[] = ['conservative', 'balanced', 'aggressive', 'speculative'];

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
  const { profile, refreshProfile } = useAuth();

  // ── Investing Style (creator_risk_style) ──────────────────────────
  // Deliberately separate from onboarding_risk_style (a viewer's own onboarding preference,
  // set elsewhere) — see 20260807000000_creator_risk_style.sql. Nullable, no default: "not yet
  // selected" is a real, expected state, so Clear is a first-class option here, not just Cancel.
  const [isEditingRiskStyle, setIsEditingRiskStyle] = useState(false);
  const [editRiskStyle, setEditRiskStyle] = useState<RiskStyle | null>(null);
  const [savingRiskStyle, setSavingRiskStyle] = useState(false);
  const [riskStyleError, setRiskStyleError] = useState<string | null>(null);

  const handleStartEditRiskStyle = () => {
    setEditRiskStyle(profile?.creator_risk_style ?? null);
    setRiskStyleError(null);
    setIsEditingRiskStyle(true);
  };

  const handleSaveRiskStyle = async () => {
    if (!profile?.id) return;
    setSavingRiskStyle(true);
    setRiskStyleError(null);
    const { error } = await updateProfile(profile.id, { creator_risk_style: editRiskStyle });
    setSavingRiskStyle(false);
    if (error) {
      setRiskStyleError(error);
      return;
    }
    await refreshProfile();
    setIsEditingRiskStyle(false);
  };

  // ── Portfolio Allocation ───────────────────────────────────────────
  // Slices must sum to exactly 100 (enforced client-side here to match the DB's
  // validate_portfolio_allocation() constraint — see
  // 20260805010000_portfolio_allocation_validation.sql) or the whole list can be cleared to
  // null ("not disclosed"). Never synthesizes a default breakdown for an empty starting state.
  const dbAllocation = useMemo(() => parseAllocation(profile?.portfolio_allocation), [profile]);
  const [isEditingAllocation, setIsEditingAllocation] = useState(false);
  const [editAllocation, setEditAllocation] = useState<AllocationSlice[]>([]);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const handleStartEditAllocation = () => {
    setEditAllocation(dbAllocation.length > 0 ? dbAllocation.map(s => ({ ...s })) : [{ name: '', value: 0 }]);
    setAllocationError(null);
    setIsEditingAllocation(true);
  };

  const handleAddAllocationRow = () => setEditAllocation(prev => [...prev, { name: '', value: 0 }]);
  const handleRemoveAllocationRow = (index: number) => setEditAllocation(prev => prev.filter((_, i) => i !== index));
  const handleAllocationFieldChange = (index: number, field: 'name' | 'value', value: string) => {
    setEditAllocation(prev => prev.map((s, i) => {
      if (i !== index) return s;
      return field === 'value' ? { ...s, value: Number(value) || 0 } : { ...s, name: value };
    }));
  };

  const allocationTotalValue = allocationTotal(editAllocation);
  const canSaveAllocation = editAllocation.length === 0 || isAllocationValid(editAllocation);

  const handleSaveAllocation = async () => {
    if (!profile?.id) return;
    if (!canSaveAllocation) {
      setAllocationError('Each slice needs a name and a positive percentage, and they must add up to exactly 100%.');
      return;
    }
    setSavingAllocation(true);
    setAllocationError(null);
    const payload = editAllocation.length === 0
      ? null
      : editAllocation.map(s => ({ name: s.name.trim(), value: s.value }));
    const { error } = await updateProfile(profile.id, { portfolio_allocation: allocationToJson(payload) });
    setSavingAllocation(false);
    if (error) {
      setAllocationError(error);
      return;
    }
    await refreshProfile();
    setIsEditingAllocation(false);
  };

  const [experience, setExperience] = useState(INIT_EXPERIENCE);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [editExperience, setEditExperience] = useState(INIT_EXPERIENCE);

  const handleStartEditExperience = () => {
    setEditExperience(experience.map(e => ({ ...e })));
    setIsEditingExperience(true);
  };

  const handleSaveExperience = () => {
    setExperience(editExperience);
    setIsEditingExperience(false);
  };

  // ── Focus Areas (profiles.tags) ─────────────────────────────────────
  // Backed by the same real column the public Creator Profile About tab reads
  // (CreatorAboutTab.tsx: dbProfile?.tags) — previously this editor only wrote to local
  // component state, so nothing a creator "saved" here ever actually reached their public
  // profile. Edit-buffer + explicit Save/Cancel to match Investing Style/Portfolio Allocation.
  const focusAreas = profile?.tags ?? [];
  const [isEditingFocusAreas, setIsEditingFocusAreas] = useState(false);
  const [editFocusAreas, setEditFocusAreas] = useState<string[]>([]);
  const [newFocusArea, setNewFocusArea] = useState('');
  const [savingFocusAreas, setSavingFocusAreas] = useState(false);
  const [focusAreasError, setFocusAreasError] = useState<string | null>(null);

  const handleStartEditFocusAreas = () => {
    setEditFocusAreas([...focusAreas]);
    setNewFocusArea('');
    setFocusAreasError(null);
    setIsEditingFocusAreas(true);
  };

  const handleAddFocusArea = () => {
    const trimmed = newFocusArea.trim();
    if (trimmed && !editFocusAreas.includes(trimmed)) {
      setEditFocusAreas(prev => [...prev, trimmed]);
      setNewFocusArea('');
    }
  };

  const handleRemoveFocusArea = (tag: string) => {
    setEditFocusAreas(prev => prev.filter(t => t !== tag));
  };

  const handleSaveFocusAreas = async () => {
    if (!profile?.id) return;
    setSavingFocusAreas(true);
    setFocusAreasError(null);
    const { error } = await updateProfile(profile.id, { tags: editFocusAreas });
    setSavingFocusAreas(false);
    if (error) {
      setFocusAreasError(error);
      return;
    }
    await refreshProfile();
    setIsEditingFocusAreas(false);
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

        {/* Experience — local-only preview: there's no profiles column for this yet, so
            edits here don't persist across sessions or reach the public profile. */}
        <div className="p-5 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold">Experience</h3>
            {isEditingExperience ? (
              <div className="flex items-center gap-2">
                <button onClick={handleSaveExperience} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-sm hover:bg-black/80 transition-colors">Save</button>
                <button onClick={() => setIsEditingExperience(false)} className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={handleStartEditExperience} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                <EditIcon sx={{ fontSize: 13 }} />Edit
              </button>
            )}
          </div>
          <p className="text-xs text-neutral-400 italic mb-3">Beta preview — not saved yet.</p>
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

        <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Disclaimer:</strong> Content is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Focus Areas */}
        <div className="p-5 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Focus Areas</h3>
            {isEditingFocusAreas ? (
              <div className="flex items-center gap-2">
                <button onClick={handleSaveFocusAreas} disabled={savingFocusAreas} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-sm hover:bg-black/80 transition-colors disabled:opacity-50">
                  {savingFocusAreas ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setIsEditingFocusAreas(false)} className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={handleStartEditFocusAreas} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                <EditIcon sx={{ fontSize: 13 }} />Edit
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(isEditingFocusAreas ? editFocusAreas : focusAreas).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-sm text-xs font-medium">
                {tag}
                {isEditingFocusAreas && (
                  <button onClick={() => handleRemoveFocusArea(tag)} className="text-neutral-400 hover:text-red-500 transition-colors ml-0.5">
                    <CloseIcon sx={{ fontSize: 11 }} />
                  </button>
                )}
              </span>
            ))}
            {!isEditingFocusAreas && focusAreas.length === 0 && (
              <p className="text-xs text-neutral-400 italic">Not shared yet.</p>
            )}
          </div>
          {isEditingFocusAreas && (
            <div className="flex items-center gap-2 mt-3">
              <input
                value={newFocusArea}
                onChange={e => setNewFocusArea(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFocusArea(); }}
                placeholder="Add area..."
                className="flex-1 text-xs border border-neutral-200 rounded-sm px-3 py-1.5 focus:outline-none focus:border-black"
              />
              <button onClick={handleAddFocusArea} className="icon-tap-target p-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">
                <AddIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          )}
          {focusAreasError && <p className="text-xs text-red-500 mt-2">{focusAreasError}</p>}
        </div>

        {/* Investing Style */}
        <div className="p-5 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Investing Style</h3>
            {isEditingRiskStyle ? (
              <div className="flex items-center gap-2">
                <button onClick={handleSaveRiskStyle} disabled={savingRiskStyle} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-sm hover:bg-black/80 transition-colors disabled:opacity-50">
                  {savingRiskStyle ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setIsEditingRiskStyle(false)} className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={handleStartEditRiskStyle} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                <EditIcon sx={{ fontSize: 13 }} />Edit
              </button>
            )}
          </div>
          {isEditingRiskStyle ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {RISK_STYLE_OPTIONS.map((style) => (
                  <button
                    key={style}
                    onClick={() => setEditRiskStyle(style)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      editRiskStyle === style ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {RISK_STYLE_LABELS[style]}
                  </button>
                ))}
              </div>
              {editRiskStyle !== null && (
                <button onClick={() => setEditRiskStyle(null)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">
                  Clear selection
                </button>
              )}
              {riskStyleError && <p className="text-xs text-red-500">{riskStyleError}</p>}
            </div>
          ) : profile?.creator_risk_style ? (
            <span className="inline-flex px-3 py-1 bg-neutral-100 text-neutral-700 rounded-sm text-xs font-medium">
              {RISK_STYLE_LABELS[profile.creator_risk_style]}
            </span>
          ) : (
            <p className="text-xs text-neutral-400 italic">Not shared yet.</p>
          )}
        </div>

        {/* Portfolio Allocation */}
        <div className="p-5 bg-white border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Portfolio Allocation</h3>
            {isEditingAllocation ? (
              <div className="flex items-center gap-2">
                <button onClick={handleSaveAllocation} disabled={savingAllocation || !canSaveAllocation} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-sm hover:bg-black/80 transition-colors disabled:opacity-40">
                  {savingAllocation ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setIsEditingAllocation(false)} className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={handleStartEditAllocation} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                <EditIcon sx={{ fontSize: 13 }} />Edit
              </button>
            )}
          </div>
          {isEditingAllocation ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {editAllocation.map((slice, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={slice.name}
                      onChange={e => handleAllocationFieldChange(i, 'name', e.target.value)}
                      placeholder="e.g. Stocks"
                      className="flex-1 min-w-0 text-xs border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                    />
                    <input
                      type="number"
                      min="0"
                      value={slice.value || ''}
                      onChange={e => handleAllocationFieldChange(i, 'value', e.target.value)}
                      placeholder="%"
                      className="w-16 text-xs border border-neutral-200 rounded px-2 py-1.5 focus:outline-none focus:border-black"
                    />
                    <button onClick={() => handleRemoveAllocationRow(i)} className="icon-tap-target p-1 text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleAddAllocationRow} className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black transition-colors">
                <AddIcon sx={{ fontSize: 14 }} />Add slice
              </button>
              {editAllocation.length > 0 && (
                <p className={`text-xs font-semibold ${allocationTotalValue === 100 ? 'text-brand' : 'text-red-500'}`}>
                  Total: {allocationTotalValue}%{allocationTotalValue !== 100 ? ' — must equal 100%' : ''}
                </p>
              )}
              {allocationError && <p className="text-xs text-red-500">{allocationError}</p>}
            </div>
          ) : dbAllocation.length > 0 ? (
            <div className="space-y-2">
              {dbAllocation.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{slice.name}</span>
                  <span className="font-semibold">{slice.value}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">Portfolio allocation not disclosed yet.</p>
          )}
        </div>

        {/* Stats */}
        <div className="p-5 bg-white border border-neutral-200 rounded-md space-y-3">
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
