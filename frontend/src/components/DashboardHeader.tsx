import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Search, LogOut, Tags, Settings, ArrowRightLeft, Sliders, Shield, X, Heart, Info, ListTodo, Kanban } from 'lucide-react';
import { User } from '../api/types';

interface DashboardHeaderProps {
  bookmarksCount: number;
  totalCount: number;
  search: string;
  setSearch: (val: string) => void;
  selectedTag: string;
  setSelectedTag: (val: string) => void;
  setTagSearch: (val: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (val: 'grid' | 'list') => void;

  // Tag Menu
  isTagMenuOpen: boolean;
  setIsTagMenuOpen: (val: boolean) => void;
  tagSearch: string;
  visibleTags: string[];
  highlightedTagIndex: number;
  highlightedTagRef: React.RefObject<HTMLButtonElement | null>;
  setTagInputFocus: (element: HTMLInputElement) => void;
  handleTagInputKeyDown: (e: React.KeyboardEvent) => void;
  handleTagSelect: (tag: string) => void;

  // Settings Menu
  isSettingsMenuOpen: boolean;
  setIsSettingsMenuOpen: (val: boolean) => void;
  setIsInfoModalOpen: (val: boolean) => void;
  setIsConfigModalOpen: (val: boolean) => void;
  setIsDataImportExportModalOpen: (val: boolean) => void;
  setSettingsStartView: (val: 'settings' | 'tags') => void;
  logout: () => void;
  user: User | null;

  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  bookmarksCount,
  totalCount,
  search,
  setSearch,
  selectedTag,
  setSelectedTag,
  setTagSearch,
  viewMode,
  setViewMode,
  isTagMenuOpen,
  setIsTagMenuOpen,
  tagSearch,
  visibleTags,
  highlightedTagIndex,
  highlightedTagRef,
  setTagInputFocus,
  handleTagInputKeyDown,
  handleTagSelect,
  isSettingsMenuOpen,
  setIsSettingsMenuOpen,
  setIsInfoModalOpen,
  setIsConfigModalOpen,
  setIsDataImportExportModalOpen,
  setSettingsStartView,
  logout,
  user,
  searchInputRef
}) => {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" onClick={e => e.stopPropagation()}>
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <img src="/alpaca-bookmarks.png" alt="Alpaca Bookmarks" className="inline-block h-8 w-8 mr-2" />
            Alpaca Bookmarks
          </h1>
          <p className="text-gray-400 text-sm">
            Showing {bookmarksCount} results out of {totalCount}
            {selectedTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTag('');
                  setTagSearch('');
                }}
                className="mr-2 rounded-full p-0.5 hover:bg-white/20 active:bg-white/30 transition-colors"
                title="Clear tag filter"
              >
                <X size={20} />
              </button>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
              <Search className="text-gray-500" size={18} />
              <img src="/alpaca-bookmarks.png" alt="Alpaca Icon" className="ml-2 h-5 w-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              className="w-full rounded-md bg-surface py-2 pl-16 pr-4 text-text focus:outline-none focus:ring-2 focus:ring-primary md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  searchInputRef.current?.blur();
                }
              }}
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3">
            <Link to="/favorites" className="flex items-center gap-2 p-2 text-sm font-medium focus:outline-none rounded-md border border-transparent bg-surface text-gray-400 hover:text-white">
              <Heart size={20} />
              <span className="hidden md:inline">Favorites</span>
            </Link>

            <Link to="/todos" className="flex items-center gap-2 p-2 text-sm font-medium focus:outline-none rounded-md border border-transparent bg-surface text-gray-400 hover:text-white">
              <ListTodo size={20} />
              <span className="hidden md:inline">Todo List</span>
            </Link>

            <Link to="/kanban" className="flex items-center gap-2 p-2 text-sm font-medium focus:outline-none rounded-md border border-transparent bg-surface text-gray-400 hover:text-white">
              <Kanban size={20} />
              <span className="hidden md:inline">Kanban</span>
            </Link>

            <div className="relative">
              <div
                className={`flex items-center rounded-md border transition-colors ${selectedTag
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-transparent bg-surface text-gray-400 hover:text-white'
                  }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTagMenuOpen(!isTagMenuOpen);
                    setIsSettingsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 text-sm font-medium focus:outline-none"
                >
                  <Tags size={20} />
                  <span className="hidden md:inline">{selectedTag || 'All Tags'}</span>
                </button>

                {selectedTag && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening menu when clicked
                      setSelectedTag('');  // Clear the tag
                      setTagSearch('');    // Reset tag search
                    }}
                    className="mr-2 rounded-full p-1 hover:bg-white/20 active:bg-white/30 transition-colors"
                    title="Clear tag filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isTagMenuOpen && (
                <div className="absolute left-0 right-0 mx-auto top-full z-20 mt-2 max-h-80 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="border-b border-gray-700 p-2">
                    <input
                      ref={setTagInputFocus}
                      type="text"
                      placeholder="Find tag..."
                      className="w-full rounded bg-background px-2 py-1 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                    />
                  </div>

                  {/* UNTAGGED OPTION (conditional) */}
                  {!tagSearch && (
                    <button
                      ref={highlightedTagIndex === 0 ? highlightedTagRef : null}
                      onClick={() => handleTagSelect('Untagged')}
                      className={`block w-full text-left px-4 py-2 italic border-b border-gray-700 transition-colors ${highlightedTagIndex === 0 ? 'bg-primary text-white' : 'text-yellow-400 hover:bg-gray-700'}`}
                    >
                      Without Tags
                    </button>
                  )}

                  {/* TAGS LIST */}
                  <div className="overflow-y-auto max-h-60">
                    {visibleTags.length > 0 ? (
                      visibleTags.map((tag, index) => {
                        const itemIndex = !tagSearch ? index + 1 : index;
                        return (
                          <button
                            key={tag}
                            ref={highlightedTagIndex === itemIndex ? highlightedTagRef : null}
                            onClick={() => handleTagSelect(tag)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedTag === tag ? 'bg-primary/20 text-primary' : 'text-text'} ${highlightedTagIndex === itemIndex ? 'bg-primary text-white' : 'hover:bg-primary hover:text-white'}`}
                          >
                            #{tag}
                          </button>
                        );
                      })
                    ) : (
                      tagSearch && <div className="p-3 text-center text-sm text-gray-500">No matching tags</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 rounded-md bg-surface p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}><List size={20} /></button>
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsInfoModalOpen(true); }}
                className="p-2 rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <Info size={24} />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsSettingsMenuOpen(!isSettingsMenuOpen); setIsTagMenuOpen(false); }}
                className={`p-2 rounded-md transition-colors ${isSettingsMenuOpen ? 'bg-surface text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Settings size={20} />
              </button>
              {isSettingsMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-600 bg-surface shadow-xl">
                  <button onClick={() => { setSettingsStartView('settings'); setIsConfigModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><Sliders size={16} /> Preferences</button>
                  <button onClick={() => { setIsDataImportExportModalOpen(true); setIsSettingsMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"><ArrowRightLeft size={16} /> Data Import / Export</button>
                  <button
                    onClick={() => {
                      setSettingsStartView('tags');
                      setIsConfigModalOpen(true);
                      setIsSettingsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-muted hover:bg-primary hover:text-white"
                  >
                    <Tags size={16} /> Organize Tags
                  </button>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <Shield size={16} /> Admin Console
                    </Link>
                  )}
                  <div className="my-1 border-t border-gray-700"></div>
                  <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:bg-red-400/10"><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
  );
};
