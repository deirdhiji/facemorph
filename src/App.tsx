/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  RefreshCw, 
  AlertCircle,
  X,
  ArrowRight,
  Shirt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageUploadProps {
  image: string | null;
  setImage: (img: string | null) => void;
  label: string;
  id: string;
  icon: React.ReactNode;
  placeholder: string;
}

const ImageUpload = ({ image, setImage, label, id, icon, placeholder }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [setImage]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [setImage]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display font-bold uppercase tracking-wider text-zinc-400">{label}</h2>
        {image && (
          <button 
            onClick={() => setImage(null)}
            className="text-xs font-medium text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <X size={14} /> Remove
          </button>
        )}
      </div>
      
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onPaste={onPaste}
        tabIndex={0}
        onClick={() => !image && fileInputRef.current?.click()}
        className={`relative aspect-square rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-4 outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2
          ${image ? 'border-zinc-200 bg-white' : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400 hover:bg-zinc-200/50'}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
        
        {image ? (
          <img src={image} className="w-full h-full object-cover" alt={label} />
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-400">
              {icon}
            </div>
            <div className="text-center px-4">
              <p className="font-medium text-zinc-900">{placeholder}</p>
              <p className="text-sm text-zinc-500">Click, drag, or paste image</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default function App() {
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!faceImage || !prompt) return;

    setIsGenerating(true);
    setError(null);
    setResultImage(null);

    try {
      const response = await fetch('/api/morph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceImage,
          clothingImage,
          prompt,
          model: 'google/gemini-2.0-flash-001'
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMessage = 'Failed to generate';
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          errorMessage = await response.text();
        }
        throw new Error(errorMessage);
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }

      const data = await response.json();
      
      // Logika penanganan respons OpenRouter
      // Jika model mengembalikan teks (seperti Gemini Flash di OpenRouter), kita tampilkan sebagai error/info
      // karena aplikasi ini didesain untuk output gambar.
      const content = data.choices?.[0]?.message?.content;
      
      if (typeof content === 'string' && content.startsWith('data:image')) {
        setResultImage(content);
      } else if (content) {
        // Jika model mengembalikan teks, kita beri tahu user
        setError("Model OpenRouter mengembalikan teks, bukan gambar. Pastikan Anda menggunakan model yang mendukung output gambar atau gunakan API Gemini langsung untuk fitur morphing.");
        console.log("Response text:", content);
      } else {
        throw new Error("Tidak ada respons yang valid dari OpenRouter.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memproses permintaan. Periksa API Key OpenRouter Anda di Netlify.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `face-morph-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-display font-bold tracking-tighter text-zinc-900"
          >
            FACE<span className="text-zinc-400">MORPH</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-xl text-zinc-500 max-w-md"
          >
            Transform your face and style into anything you can imagine using Gemini AI.
          </motion.p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="hidden lg:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          System Active: Gemini 2.5 Flash
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ImageUpload 
              id="face"
              image={faceImage}
              setImage={setFaceImage}
              label="01. Face Image"
              icon={<Upload size={24} />}
              placeholder="Upload face"
            />
            
            <ImageUpload 
              id="clothing"
              image={clothingImage}
              setImage={setClothingImage}
              label="02. Clothing (Optional)"
              icon={<Shirt size={24} />}
              placeholder="Upload clothing"
            />
          </div>

          <section className="space-y-4">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-zinc-400">03. Describe Transformation</h2>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'A cyberpunk warrior with neon lights', 'A Renaissance oil painting', 'A futuristic astronaut on Mars'"
                className="w-full h-32 p-6 bg-white rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none text-lg"
              />
              <div className="absolute bottom-4 right-4 text-xs font-mono text-zinc-400">
                {prompt.length} chars
              </div>
            </div>
          </section>

          <button
            onClick={generateImage}
            disabled={!faceImage || !prompt || isGenerating}
            className="brutal-btn w-full flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Morph
              </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-7">
          <div className="sticky top-12 space-y-4">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-zinc-400">04. Result</h2>
            
            <div className="relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] rounded-3xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center group">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="relative w-24 h-24">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-zinc-200 border-t-zinc-900 rounded-full"
                      />
                      <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border-4 border-zinc-200 border-b-zinc-400 rounded-full"
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-display font-bold text-xl">Morphing in progress</p>
                      <p className="text-zinc-500">Gemini is reimagining your face...</p>
                    </div>
                  </motion.div>
                ) : resultImage ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full relative"
                  >
                    <img src={resultImage} className="w-full h-full object-cover" alt="Generated morph" />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button 
                        onClick={downloadImage}
                        className="bg-white text-zinc-900 p-4 rounded-full hover:scale-110 transition-transform shadow-xl flex items-center gap-2 font-bold"
                      >
                        <Download size={20} />
                        Download
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div key="placeholder" className="text-center space-y-4 px-12">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-300">
                      <ImageIcon size={32} />
                    </div>
                    <div className="space-y-2">
                      <p className="font-display font-bold text-2xl text-zinc-400">Ready for Morph</p>
                      <p className="text-zinc-400 max-w-xs mx-auto">Upload images and enter a prompt to see the magic happen.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {resultImage && !isGenerating && (
              <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                      <img src={faceImage!} className="w-full h-full object-cover" alt="Source Face" />
                    </div>
                    {clothingImage && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                        <img src={clothingImage} className="w-full h-full object-cover" alt="Source Clothing" />
                      </div>
                    )}
                  </div>
                  <ArrowRight size={20} className="text-zinc-300" />
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-100">
                    <img src={resultImage} className="w-full h-full object-cover" alt="Result" />
                  </div>
                </div>
                <button 
                  onClick={downloadImage}
                  className="text-sm font-bold flex items-center gap-2 hover:text-zinc-500 transition-colors"
                >
                  <Download size={18} />
                  Save Image
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-400 text-sm font-mono">
        <p>© 2026 FACEMORPH AI • POWERED BY GEMINI</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-zinc-900 transition-colors">PRIVACY</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">TERMS</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">API</a>
        </div>
      </footer>
    </div>
  );
}
