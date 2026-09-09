import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Settings, Sparkles, Image as ImageIcon, RotateCcw, ArrowLeftRight, Upload, Palette } from 'lucide-react';
import { PageBackgroundConfig, PageBackgroundType, DEFAULT_PAGE_BG } from '../hooks/usePageBackground';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pageName: string;
  currentConfig: PageBackgroundConfig;
  onSave: (newConfig: PageBackgroundConfig) => void;
}

const GRADIENT_PRESETS = [
  { name: 'Midnight Purple', color1: '#3b1d54', color2: '#0f0717' },
  { name: 'Dracula Glow', color1: '#44475a', color2: '#282a36' },
  { name: 'Andromeda Teal', color1: '#004d44', color2: '#10141b' },
  { name: 'Deep Cosmic', color1: '#1f2440', color2: '#0b0c14' },
  { name: 'Neon Cyber', color1: '#37155e', color2: '#120420' },
  { name: 'Ocean Abyss', color1: '#133b5c', color2: '#071524' },
  { name: 'Charcoal Mist', color1: '#383d47', color2: '#14161a' },
  { name: 'Crimson Dusk', color1: '#4a1525', color2: '#15040a' },
];

const WALLPAPER_PRESETS = [
  {
    name: 'Cosmic Nebula',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Moody Forest',
    url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Night Mountains',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Minimal Gradient',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
  },
];

export const PageBackgroundModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pageName,
  currentConfig,
  onSave,
}) => {
  const [type, setType] = useState<PageBackgroundType>('none');
  const [gradientColor1, setGradientColor1] = useState('#3b1d54');
  const [gradientColor2, setGradientColor2] = useState('#0f0717');
  const [imageUrl, setImageUrl] = useState('');
  const [imageBrightness, setImageBrightness] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType(currentConfig.type || 'none');
      setGradientColor1(currentConfig.gradientColor1 || '#3b1d54');
      setGradientColor2(currentConfig.gradientColor2 || '#0f0717');
      setImageUrl(currentConfig.imageUrl || '');
      setImageBrightness(currentConfig.imageBrightness ?? 0);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSwapGradientColors = () => {
    const temp = gradientColor1;
    setGradientColor1(gradientColor2);
    setGradientColor2(temp);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setImageUrl(event.target?.result as string);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        setIsUploading(false);
        alert('Failed to load image');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type,
      gradientColor1,
      gradientColor2,
      imageUrl,
      imageBrightness,
    });
    onClose();
  };

  const handleResetToDefault = () => {
    setType('none');
    setGradientColor1(DEFAULT_PAGE_BG.gradientColor1);
    setGradientColor2(DEFAULT_PAGE_BG.gradientColor2);
    setImageUrl('');
    setImageBrightness(0);
  };

  const brightnessMultiplier = Math.max(0, Math.min(2, 1 + imageBrightness / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-gray-700/50 max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Page Background Config</h2>
              <p className="text-xs text-gray-400">Settings specific to {pageName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text hover:opacity-70 p-1">
            <X size={22} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSave} className="overflow-y-auto pr-1 space-y-5 flex-1">
          {/* Background Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Background Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('none')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === 'none'
                    ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary'
                    : 'border-gray-700/60 hover:border-gray-500 text-gray-300'
                }`}
              >
                <Palette size={20} />
                <span>Theme Default</span>
              </button>

              <button
                type="button"
                onClick={() => setType('gradient')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === 'gradient'
                    ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary'
                    : 'border-gray-700/60 hover:border-gray-500 text-gray-300'
                }`}
              >
                <Sparkles size={20} />
                <span>Radial Gradient</span>
              </button>

              <button
                type="button"
                onClick={() => setType('image')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === 'image'
                    ? 'border-primary bg-primary/20 text-primary ring-1 ring-primary'
                    : 'border-gray-700/60 hover:border-gray-500 text-gray-300'
                }`}
              >
                <ImageIcon size={20} />
                <span>Background Image</span>
              </button>
            </div>
          </div>

          {/* --- RADIAL GRADIENT CONTROLS --- */}
          {type === 'gradient' && (
            <div className="space-y-4 rounded-lg bg-black/20 p-4 border border-gray-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Select Colors (Center & Outer)
                </span>
                <button
                  type="button"
                  onClick={handleSwapGradientColors}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  title="Swap inner and outer colors"
                >
                  <ArrowLeftRight size={13} />
                  Swap Colors
                </button>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-4">
                {/* Color 1: Center */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Center Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientColor1}
                      onChange={(e) => setGradientColor1(e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded border border-gray-600 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={gradientColor1}
                      onChange={(e) => setGradientColor1(e.target.value)}
                      className="flex-1 rounded bg-background border border-gray-600 px-2.5 py-1.5 font-mono text-xs text-text uppercase focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Color 2: Outer */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Outer / Edge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientColor2}
                      onChange={(e) => setGradientColor2(e.target.value)}
                      className="h-9 w-10 cursor-pointer rounded border border-gray-600 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={gradientColor2}
                      onChange={(e) => setGradientColor2(e.target.value)}
                      className="flex-1 rounded bg-background border border-gray-600 px-2.5 py-1.5 font-mono text-xs text-text uppercase focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient Preview with Translucent Tile simulation */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Live Preview</label>
                <div
                  className="h-28 w-full rounded-lg border border-gray-700 relative overflow-hidden flex items-center justify-center p-3 shadow-inner"
                  style={{
                    background: `radial-gradient(circle at center, ${gradientColor1} 0%, ${gradientColor2} 100%)`,
                  }}
                >
                  <div className="bookmark-tile rounded-lg p-3 shadow-md border border-gray-600/30 flex items-center gap-3">
                    <div className="h-6 w-6 rounded bg-primary/40 flex items-center justify-center text-primary text-xs font-bold">
                      ★
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text">Translucent Bookmark Tile</div>
                      <div className="text-[10px] text-gray-400">Shows through based on tile opacity</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Preset Palettes</label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENT_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setGradientColor1(p.color1);
                        setGradientColor2(p.color2);
                      }}
                      className="group relative flex flex-col items-center rounded-lg border border-gray-700/60 p-1.5 text-center hover:border-primary transition-all overflow-hidden"
                    >
                      <div
                        className="h-6 w-full rounded shadow-inner mb-1"
                        style={{
                          background: `radial-gradient(circle at center, ${p.color1} 0%, ${p.color2} 100%)`,
                        }}
                      />
                      <span className="text-[10px] text-gray-300 truncate w-full group-hover:text-white">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- BACKGROUND IMAGE CONTROLS --- */}
          {type === 'image' && (
            <div className="space-y-4 rounded-lg bg-black/20 p-4 border border-gray-700/60">
              {/* URL or Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                  Image Source
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Enter image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 rounded bg-background border border-gray-600 px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 rounded bg-gray-700/70 hover:bg-gray-700 px-3 py-2 text-xs font-semibold text-text transition-colors"
                    title="Upload image from computer"
                  >
                    <Upload size={14} />
                    <span>{isUploading ? 'Loading...' : 'Upload'}</span>
                  </button>
                </div>
              </div>

              {/* Lighten and Darken Slider */}
              <div className="bg-surface/50 p-3 rounded-lg border border-gray-700/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-gray-200">
                      Background Brightness
                    </label>
                    <span className="text-[11px] text-gray-400">Lighten or darken the background image</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {imageBrightness < 0 && `Darken (${Math.abs(imageBrightness)}%)`}
                      {imageBrightness === 0 && 'Normal (0%)'}
                      {imageBrightness > 0 && `Lighten (+${imageBrightness}%)`}
                    </span>
                    {imageBrightness !== 0 && (
                      <button
                        type="button"
                        onClick={() => setImageBrightness(0)}
                        className="text-gray-400 hover:text-white"
                        title="Reset to normal brightness"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative pt-1">
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={imageBrightness}
                    onChange={(e) => setImageBrightness(parseInt(e.target.value))}
                    className="w-full h-2 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>◄ Darker (-100%)</span>
                    <span className="cursor-pointer hover:text-primary" onClick={() => setImageBrightness(0)}>
                      Normal (0%)
                    </span>
                    <span>Lighter (+100%) ►</span>
                  </div>
                </div>
              </div>

              {/* Image Live Preview */}
              {imageUrl && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Live Preview</label>
                  <div className="relative h-28 w-full rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center p-3 shadow-inner bg-black">
                    <div
                      className="absolute inset-0 transition-all duration-200"
                      style={{
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: `brightness(${brightnessMultiplier})`,
                      }}
                    />
                    <div className="bookmark-tile relative z-10 rounded-lg p-3 shadow-md border border-gray-600/30 flex items-center gap-3">
                      <div className="h-6 w-6 rounded bg-primary/40 flex items-center justify-center text-primary text-xs font-bold">
                        ★
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text">Translucent Bookmark Tile</div>
                        <div className="text-[10px] text-gray-400">Preview with brightness applied</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Curated Presets */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Wallpaper Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  {WALLPAPER_PRESETS.map((w) => (
                    <button
                      key={w.name}
                      type="button"
                      onClick={() => setImageUrl(w.url)}
                      className={`group relative flex flex-col items-center rounded-lg border p-1 text-center transition-all overflow-hidden ${
                        imageUrl === w.url
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-gray-700/60 hover:border-gray-500'
                      }`}
                    >
                      <img
                        src={w.url}
                        alt={w.name}
                        className="h-10 w-full object-cover rounded mb-1"
                        loading="lazy"
                      />
                      <span className="text-[10px] text-gray-300 truncate w-full group-hover:text-white">
                        {w.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Theme Default Info */}
          {type === 'none' && (
            <div className="rounded-lg bg-black/20 p-4 border border-gray-700/50 text-center space-y-2">
              <Palette className="mx-auto text-gray-400" size={32} />
              <p className="text-sm text-text font-medium">Standard Theme Background</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                This page uses the global application theme background. Choose Radial Gradient or Background Image above to customize this specific page.
              </p>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-gray-700/50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset to Default</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-600 px-4 py-2 text-xs font-bold text-text hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90 transition-all"
              >
                <Save size={14} />
                <span>Save Background</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
