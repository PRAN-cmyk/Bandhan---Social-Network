import React, { useMemo, useState } from 'react';
import {
  Plus,
  MessageSquare,
  MapPin,
  Search,
  X,
  Heart,
  ArrowUpDown,
  Loader2,
  Bookmark,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MarketplaceItem } from '../types';
import { SmartImage } from './SmartImage';
import { uploadMediaToCloudinary } from '../utils/cloudinary';

type SortOrder = 'newest' | 'price-asc' | 'price-desc';

export const MarketplaceView: React.FC = () => {
  const {
    marketplace,
    addMarketplaceItem,
    openChatWith,
    sendMessage,
    viewUserProfile,
    language,
    t,
    showToast,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('bandhan_saved_marketplace');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // New listing form state
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<
    'electronics' | 'vehicles' | 'furniture' | 'apparel' | 'hobbies'
  >('electronics');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const categories = [
    { id: 'all', labelEn: 'All Items', labelBn: 'সব সামগ্রী' },
    { id: 'saved', labelEn: `Saved (${savedIds.length})`, labelBn: `সেভড (${savedIds.length})` },
    { id: 'electronics', labelEn: 'Electronics', labelBn: 'ইলেকট্রনিক্স' },
    { id: 'vehicles', labelEn: 'Vehicles', labelBn: 'যানবাহন' },
    { id: 'furniture', labelEn: 'Furniture', labelBn: 'আসবাবপত্র' },
    { id: 'apparel', labelEn: 'Apparel', labelBn: 'পোশাক ও ফ্যাশন' },
    { id: 'hobbies', labelEn: 'Hobbies', labelBn: 'ক্যামেরা ও শখ' },
  ];

  const toggleSaveItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('bandhan_saved_marketplace', JSON.stringify(next));
      } catch {}
      showToast(
        exists
          ? language === 'bn'
            ? 'পণ্যটি পছন্দের তালিকা থেকে সরানো হয়েছে'
            : 'Removed from saved items'
          : language === 'bn'
          ? 'পণ্যটি সংরক্ষণ করা হয়েছে!'
          : 'Saved to your wishlist!',
      );
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = marketplace.filter((item) => {
      if (categoryFilter === 'saved') {
        if (!savedIds.includes(item.id)) return false;
      } else if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.titleBn && item.titleBn.toLowerCase().includes(q)) ||
        (item.location || '').toLowerCase().includes(q)
      );
    });

    if (sortOrder === 'price-asc') {
      return [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    }
    if (sortOrder === 'price-desc') {
      return [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    return list;
  }, [marketplace, categoryFilter, savedIds, searchTerm, sortOrder]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPct(10);
    try {
      const uploaded = await uploadMediaToCloudinary(file, {
        onProgress: (pct) => setUploadPct(pct),
      });
      const mediaUrl = uploaded.secureUrl || uploaded.url;
      if (mediaUrl) {
        setImagePreview(mediaUrl);
      } else {
        showToast(language === 'bn' ? 'ছবি আপলোড ব্যর্থ হয়েছে' : 'Image upload failed');
      }
    } catch {
      showToast(language === 'bn' ? 'ছবি আপলোড করা যায়নি' : 'Could not upload photo');
    } finally {
      setUploadPct(null);
    }
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price || !imagePreview) {
      showToast(
        language === 'bn'
          ? 'দয়া করে শিরোনাম, মূল্য এবং ছবি প্রদান করুন'
          : 'Please provide title, price, and image',
      );
      return;
    }

    addMarketplaceItem({
      title: title.trim(),
      price: Number(price),
      currency: '৳',
      location: location.trim() || 'Dhaka, Bangladesh',
      category,
      imageUrl: imagePreview,
      description: description.trim() || 'Well-maintained item.',
    });

    setTitle('');
    setPrice('');
    setLocation('');
    setDescription('');
    setImagePreview(null);
    setIsSellModalOpen(false);
  };

  const handleContactSeller = (item: MarketplaceItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    openChatWith(item.seller);
    sendMessage(
      item.seller.id,
      language === 'bn'
        ? `হ্যালো! আপনার "${item.titleBn || item.title}" (মূল্য: ${item.currency}${item.price.toLocaleString()}) কি এখনও বিক্রির জন্য উপলব্ধ আছে?`
        : `Hi! Is your listing "${item.title}" (${item.currency}${item.price.toLocaleString()}) still available?`,
    );
    showToast(
      language === 'bn' ? 'মেসেঞ্জারে বিক্রেতাকে বার্তা পাঠানো হয়েছে!' : 'Inquiry sent in Messenger!',
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 space-y-5">
      {/* Top Banner & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{t.marketplace}</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold">
              {language === 'bn' ? 'কেনাবেচা' : 'Buy & Sell'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'bn'
              ? 'আপনার এলাকায় নিরাপদে কেনাবেচা করুন এবং মেসেঞ্জারে সরাসরি কথা বলুন'
              : 'Buy and sell safely in your community and message sellers directly'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={language === 'bn' ? 'মার্কেটপ্লেসে খুঁজুন...' : 'Search Marketplace...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="pl-7 pr-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full border-0 focus:outline-none cursor-pointer"
              aria-label={language === 'bn' ? 'সাজান' : 'Sort items'}
            >
              <option value="newest">{language === 'bn' ? 'নতুন পণ্য' : 'Newest'}</option>
              <option value="price-asc">{language === 'bn' ? 'কম দাম আগে' : 'Price: Low to High'}</option>
              <option value="price-desc">{language === 'bn' ? 'বেশি দাম আগে' : 'Price: High to Low'}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsSellModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.sellItem}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryFilter(c.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === c.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {c.id === 'saved' && <Bookmark className="w-3.5 h-3.5" />}
            <span>{language === 'bn' ? c.labelBn : c.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const isSaved = savedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                <SmartImage
                  src={item.imageUrl}
                  alt={item.title}
                  fallbackType="media"
                  fallbackLabel={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-xs font-bold rounded-lg">
                  {item.currency} {item.price.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={(e) => toggleSaveItem(item.id, e)}
                  className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                    isSaved
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                  title={isSaved ? (language === 'bn' ? 'সেভ সরান' : 'Unsave') : language === 'bn' ? 'সেভ করুন' : 'Save'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                    {language === 'bn' ? item.titleBn || item.title : item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {language === 'bn' ? item.locationBn || item.location : item.location}
                    </span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <SmartImage
                      src={item.seller.avatar}
                      alt={item.seller.name}
                      fallbackType="avatar"
                      fallbackLabel={item.seller.name}
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {language === 'bn' ? item.seller.nameBn || item.seller.name : item.seller.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleContactSeller(item, e)}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{t.messageSeller}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {categoryFilter === 'saved'
              ? language === 'bn'
                ? 'এখনো কোনো পণ্য সংরক্ষণ করা হয়নি'
                : 'No saved items yet'
              : language === 'bn'
              ? 'কোনো পণ্য পাওয়া যায়নি'
              : 'No items match your query.'}
          </p>
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 sm:grid-cols-2 max-h-[90dvh]"
          >
            <div className="relative aspect-square sm:aspect-auto bg-slate-950 flex items-center justify-center">
              <SmartImage
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                fallbackType="media"
                fallbackLabel={selectedItem.title}
                className="w-full h-full object-cover max-h-72 sm:max-h-full"
              />
            </div>

            <div className="p-5 flex flex-col justify-between overflow-y-auto gap-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                      {selectedItem.category}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                      {language === 'bn'
                        ? selectedItem.titleBn || selectedItem.title
                        : selectedItem.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {selectedItem.currency} {selectedItem.price.toLocaleString()}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? selectedItem.locationBn || selectedItem.location
                      : selectedItem.location}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedItem.description ||
                    (language === 'bn'
                      ? 'ভালো অবস্থায় থাকা মানসম্মত পণ্য।'
                      : 'Well-maintained item available for local pickup.')}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    viewUserProfile(selectedItem.seller);
                    setSelectedItem(null);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                >
                  <SmartImage
                    src={selectedItem.seller.avatar}
                    alt={selectedItem.seller.name}
                    fallbackType="avatar"
                    fallbackLabel={selectedItem.seller.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {language === 'bn'
                        ? selectedItem.seller.nameBn || selectedItem.seller.name
                        : selectedItem.seller.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {language === 'bn' ? 'বিক্রেতার প্রোফাইল দেখুন' : 'View seller profile'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={(e) => toggleSaveItem(selectedItem.id, e)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    savedIds.includes(selectedItem.id)
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${savedIds.includes(selectedItem.id) ? 'fill-current' : ''}`}
                  />
                  <span>{savedIds.includes(selectedItem.id) ? (language === 'bn' ? 'সেভড' : 'Saved') : language === 'bn' ? 'সেভ' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleContactSeller(selectedItem, e);
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t.messageSeller}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {isSellModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92dvh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                {t.sellItem}
              </h3>
              <button
                type="button"
                onClick={() => setIsSellModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.itemTitle}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sony Wireless Noise Cancelling Headphones"
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.itemPrice} (৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.itemLocation}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Banani, Dhaka"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.categories}
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | 'electronics'
                        | 'vehicles'
                        | 'furniture'
                        | 'apparel'
                        | 'hobbies',
                    )
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="electronics">{t.electronics}</option>
                  <option value="vehicles">{t.vehicles}</option>
                  <option value="furniture">{t.furniture}</option>
                  <option value="apparel">
                    {language === 'bn' ? 'পোশাক ও ফ্যাশন' : 'Apparel & Fashion'}
                  </option>
                  <option value="hobbies">{t.hobbies}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'পণ্যের বিবরণ' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'পণ্যের অবস্থা, ব্যবহারকাল ও বিস্তারিত লিখুন...'
                      : 'Describe condition, usage, and pickup details...'
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Photo'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
                />
                {uploadPct !== null && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {language === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...'} {uploadPct}%
                    </span>
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <SmartImage
                      src={imagePreview}
                      alt="Preview"
                      fallbackType="media"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploadPct !== null}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {language === 'bn' ? 'বিজ্ঞাপন দিন' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
