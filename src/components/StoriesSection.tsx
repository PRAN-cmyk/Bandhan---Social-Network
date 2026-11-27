import React, { useRef, useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Play, Clock, Music2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SmartVideo, pauseAllOtherMedia } from './SmartVideo';
import { SmartImage } from './SmartImage';

export const StoriesSection: React.FC = () => {
  const {
    currentUser,
    stories,
    activeStoryIndex,
    setActiveStoryIndex,
    setIsCreateStoryOpen,
    reactToStory,
    language,
    t,
  } = useApp();

  const [burstingReaction, setBurstingReaction] = useState<{ storyId: string; emoji: string } | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bandhan_viewed_stories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (activeStoryIndex === null) return;
    const active = stories[activeStoryIndex];
    if (!active) return;
    setViewedIds((prev) => {
      if (prev.includes(active.id)) return prev;
      const next = [...prev, active.id].slice(-60);
      try {
        localStorage.setItem('bandhan_viewed_stories', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [activeStoryIndex, stories]);

  const handleQuickReaction = (e: React.MouseEvent, storyId: string, emoji: string) => {
    e.stopPropagation();
    reactToStory(storyId, emoji);
    setBurstingReaction({ storyId, emoji });
    setTimeout(() => {
      setBurstingReaction(null);
    }, 950);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const getRemainingHours = (expiresAt?: number) => {
    if (!expiresAt) return 24;
    const diff = expiresAt - Date.now();
    return Math.max(1, Math.min(24, Math.ceil(diff / (1000 * 60 * 60))));
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative mb-4">
      {/* Scroll controls (hidden on very small screens to keep swipe unobstructed) */}
      <button
        type="button"
        onClick={() => scroll('left')}
        className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
        title="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => scroll('right')}
        className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform cursor-pointer"
        title="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Stories track */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-0.5"
      >
        {/* Card 1: Create Story */}
        <button
          type="button"
          onClick={() => setIsCreateStoryOpen(true)}
          className="relative shrink-0 w-26 sm:w-32 h-42 sm:h-52 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer group bg-white dark:bg-slate-800 flex flex-col transition-transform hover:scale-[1.02] text-center"
        >
          <div className="h-3/4 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
            <SmartImage
              src={currentUser.avatar}
              alt={currentUser.name}
              fallbackType="avatar"
              fallbackLabel={currentUser.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="relative h-1/4 w-full bg-white dark:bg-slate-800 flex items-center justify-center px-1">
            <div className="absolute -top-4 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 mt-2 truncate">
              {t.createStory}
            </span>
          </div>
        </button>

        {/* Stories from Friends — thumbnail previews only (video plays exclusively in StoryViewerModal) */}
        {stories.map((story, index) => {
          const isVideo =
            story.mediaType === 'video' ||
            Boolean(story.videoUrl) ||
            (story.mediaType !== 'image' &&
              Boolean(
                story.mediaUrl &&
                  (story.mediaUrl.startsWith('data:video') ||
                    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(story.mediaUrl)),
              ));
          const videoSrc = story.videoUrl || story.mediaUrl;
          const isViewed = viewedIds.includes(story.id);

          return (
            <div
              key={story.id}
              onClick={() => {
                pauseAllOtherMedia(null);
                setActiveStoryIndex(index);
              }}
              className="relative shrink-0 w-26 sm:w-32 h-42 sm:h-52 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 cursor-pointer group flex flex-col justify-between p-2 sm:p-2.5 transition-transform hover:scale-[1.02] bg-slate-900"
            >
              {/* Story backdrop (never autoPlays inside feed strip) */}
              {isVideo && videoSrc ? (
                <SmartVideo
                  src={videoSrc}
                  muted
                  playsInline
                  preload="metadata"
                  compact
                  language={language}
                  containerClassName="absolute inset-0 w-full h-full bg-slate-900 pointer-events-none"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : story.mediaUrl ? (
                <SmartImage
                  src={story.mediaUrl}
                  alt="Story"
                  fallbackType="media"
                  fallbackLabel={story.author.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    story.gradientBg || 'from-indigo-600 to-pink-500'
                  } flex items-center justify-center p-2 text-center`}
                >
                  <p className="text-white text-xs font-semibold line-clamp-3">
                    {story.text}
                  </p>
                </div>
              )}

              {/* Scrim overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80 pointer-events-none" />

              {/* Top row: Author Avatar (viewed/unviewed ring) & Video/Time Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full p-0.5 shadow-md ${
                    isViewed
                      ? 'bg-slate-500/80'
                      : 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400'
                  }`}
                >
                  <SmartImage
                    src={story.author.avatar}
                    alt={story.author.name}
                    fallbackType="avatar"
                    fallbackLabel={story.author.name}
                    className="w-full h-full rounded-full object-cover border-2 border-slate-950"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-0.5"
                    title={language === 'bn' ? 'স্টোরি ২৪ ঘন্টা পর্যন্ত থাকবে' : 'Story stays for 24 hours'}
                  >
                    <Clock className="w-2.5 h-2.5 text-sky-400" />
                    {getRemainingHours(story.expiresAt)}h
                  </span>
                  {isVideo && (
                    <div className="w-6 h-6 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow">
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Music badge if story has audio */}
              {story.audioTitle && (
                <div className="relative z-10 my-auto">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-cyan-200 border border-white/15 max-w-full shadow-sm">
                    <Music2 className="w-2.5 h-2.5 shrink-0 text-cyan-300" />
                    <span className="truncate">{story.audioTitle}</span>
                  </div>
                </div>
              )}

              {/* Floating Reaction Burst Animation */}
              {burstingReaction?.storyId === story.id && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-bounce">
                  <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white font-black text-sm flex items-center gap-1.5 shadow-xl border border-white/20 scale-125">
                    <span className="text-xl">{burstingReaction.emoji}</span>
                    <span className="text-rose-400 font-extrabold">+1</span>
                  </div>
                </div>
              )}

              {/* Author Name & Reaction Count */}
              <div className="relative z-10">
                {story.reactions && Object.values(story.reactions).reduce((a, b) => a + b, 0) > 0 && (
                  <div className="mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white shadow-xs">
                    {Object.entries(story.reactions)
                      .slice(0, 2)
                      .map(([emo, cnt]) =>
                        cnt > 0 ? (
                          <span key={emo} className="flex items-center gap-0.5">
                            <span>{emo}</span>
                            <span className="text-[9px] text-slate-200">{cnt}</span>
                          </span>
                        ) : null,
                      )}
                  </div>
                )}
                <p className="text-xs font-bold text-white drop-shadow-md truncate">
                  {language === 'bn' ? story.author.nameBn || story.author.name : story.author.name}
                </p>
              </div>

              {/* Quick Reaction Bar (Desktop Hover) */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="hidden sm:flex absolute inset-x-1 bottom-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/80 backdrop-blur-md rounded-xl p-1 items-center justify-around border border-white/15 shadow-lg"
              >
                {[
                  { emoji: '👍', title: 'Like' },
                  { emoji: '❤️', title: 'Love' },
                  { emoji: '😮', title: 'Wow' },
                  { emoji: '😆', title: 'Haha' },
                  { emoji: '😢', title: 'Sad' },
                ].map(({ emoji, title }) => (
                  <button
                    key={emoji}
                    type="button"
                    title={title}
                    onClick={(e) => handleQuickReaction(e, story.id, emoji)}
                    className="p-0.5 text-base hover:scale-125 transition-transform active:scale-95 cursor-pointer leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
