export type CreatorProfileTab = 'investment' | 'videos' | 'posts' | 'about';

const TABS: CreatorProfileTab[] = ['investment', 'videos', 'posts', 'about'];

interface CreatorProfileTabsProps {
  activeTab: CreatorProfileTab;
  onSelectTab: (tab: CreatorProfileTab) => void;
}

// Shared tab bar for both Creator Profile pages. onSelectTab is owned by each page (not this
// component) because the two "cross-page" tabs behave differently depending on which page is
// currently mounted — e.g. clicking "Videos" while on the Investment page must navigate to
// /profile/:id/videos, but clicking it while already on that page is a same-page no-op. Keeping
// that routing decision at the page level avoids baking route knowledge into a shared component.
export default function CreatorProfileTabs({ activeTab, onSelectTab }: CreatorProfileTabsProps) {
  return (
    <div className="border-b border-neutral-200 mb-6 sm:mb-8">
      <div className="flex gap-4 sm:gap-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onSelectTab(tab)}
            className={`pb-4 px-1 font-medium text-sm border-b-2 capitalize transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
