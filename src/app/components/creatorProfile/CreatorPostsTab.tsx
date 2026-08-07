import ContentDisclaimer from '../compliance/ContentDisclaimer';
import VerifiedBadge from '../VerifiedBadge';
import { Badge } from '../ui/badge';
import type { MockCreator } from '../../data/creators';
import type { DisplayPost } from '../../hooks/useCreatorProfileData';

interface CreatorPostsTabProps {
  creator: MockCreator;
  posts: DisplayPost[];
}

// Shared Posts tab — identical content/markup between the Investment and Videos creator
// profile pages before this extraction (posts aren't investment- or video-specific, they're
// just "this creator's post feed").
export default function CreatorPostsTab({ creator, posts }: CreatorPostsTabProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h3 className="text-xl font-bold mb-2">No posts yet</h3>
        <p className="text-neutral-500 text-sm max-w-xs">
          {creator.name} hasn't shared any posts yet. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {posts.map((post) => (
        <div key={post.id} className="p-4 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">{creator.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">{creator.name}</span>
                {creator.verified && <VerifiedBadge size={16} />}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{creator.handle}</span><span>·</span><span>{post.time}</span>
              </div>
            </div>
            <Badge variant="outline" className="border-transparent px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 font-medium flex-shrink-0">
              {post.tag}
            </Badge>
          </div>
          <p className="text-sm text-neutral-800 leading-relaxed mb-3">{post.content}</p>
          <div className="flex items-center gap-6 text-xs text-neutral-500">
            <button className="flex items-center gap-1.5 hover:text-brand transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              {post.likes.toLocaleString()}
            </button>
            <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {post.comments}
            </button>
            <button className="flex items-center gap-1.5 hover:text-green-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {post.reposts.toLocaleString()}
            </button>
            <button className="flex items-center gap-1.5 hover:text-neutral-700 transition-colors ml-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          </div>
          <ContentDisclaimer />
        </div>
      ))}
    </div>
  );
}
