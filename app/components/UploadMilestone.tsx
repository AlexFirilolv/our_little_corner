'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocket } from '@/contexts/LocketContext';
import { ArrowLeft, Calendar, Loader2, Upload, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import exifr from 'exifr';

export default function UploadMilestone() {
    const { currentLocket } = useLocket();
    const router = useRouter();

    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(Array.from(e.target.files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const processFiles = async (newFiles: File[]) => {
        const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        // Generate previews
        const newPreviews = await Promise.all(validFiles.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        }));

        setFiles(prev => [...prev, ...validFiles]);
        setPreviews(prev => [...prev, ...newPreviews]);

        // Extract Metadata from the first file if not already set
        if (validFiles.length > 0 && title === '') {
            try {
                const metadata = await exifr.parse(validFiles[0]);
                if (metadata) {
                    if (metadata.DateTimeOriginal) {
                        setDate(metadata.DateTimeOriginal.toISOString().split('T')[0]);
                    } else if (metadata.CreateDate) {
                        setDate(metadata.CreateDate.toISOString().split('T')[0]);
                    }
                    if (metadata.latitude && metadata.longitude) {
                        console.log("Coordinates:", metadata.latitude, metadata.longitude);
                        // Placeholder for when we have reverse geocoding
                    }
                }
            } catch (e) {
                console.log("EXIF error", e);
            }
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0 || !title || !currentLocket) return;

        setIsLoading(true);
        try {
            const { getCurrentUserToken } = await import('@/lib/firebase/auth');
            const token = await getCurrentUserToken();

            // 1. Create Memory Group (The "Album")
            const groupRes = await fetch('/api/memory-groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    locket_id: currentLocket.id,
                    title: title,
                    description: description,
                    is_milestone: true,
                    // We can add date_taken to group metadata if schema allows, otherwise rely on created_at or inferred from media
                })
            });

            if (!groupRes.ok) throw new Error('Failed to create album');
            const groupData = await groupRes.json();
            const group = groupData.data || groupData;

            // 2. Upload Each File
            // We do this sequentially to accept multiple presigned URLs safely (or parallelize if we manage state well)
            for (const file of files) {
                // A. Get Presigned URL
                const presignRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        fileType: file.type,
                        fileSize: file.size
                    })
                });
                const { uploadUrl, publicUrl, storageKey } = await presignRes.json();

                // B. Upload to GCS
                await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file
                });

                // C. Create Media Item
                await fetch('/api/media', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        locket_id: currentLocket.id,
                        memory_group_id: group.id,
                        filename: file.name,
                        original_name: file.name,
                        storage_key: storageKey,
                        storage_url: publicUrl,
                        file_type: file.type,
                        file_size: file.size,
                        title: file.name, // Or leave blank
                        date_taken: date // Apply album date to all, or parse individually if we wanted
                    })
                });
            }

            router.push('/journey'); // Redirect to Journey/Milestones
        } catch (error) {
            console.error('Milestone upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl min-h-screen">
            <button
                onClick={() => router.back()}
                className="mb-6 flex items-center text-muted-foreground hover:text-primary transition-colors"
            >
                <ArrowLeft size={20} className="mr-1" /> Back
            </button>

            <h1 className="font-heading text-2xl font-bold text-indigo-900 mb-6">New Milestone</h1>

            <div className="space-y-6">
                {/* File Drop Zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
            relative aspect-[3/2] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center bg-indigo-50/30
            ${isDragging ? 'border-primary bg-primary/5' : 'border-indigo-200 hover:border-primary/50'}
          `}
                >
                    {previews.length > 0 ? (
                        <div className="w-full h-full p-4 grid grid-cols-3 gap-2 overflow-y-auto">
                            {previews.map((src, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                                    <Image src={src} alt="Preview" fill className="object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center justify-center border-2 border-dashed border-indigo-200 rounded-lg aspect-square text-indigo-400">
                                <Upload size={24} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-16 h-16 rounded-full bg-indigo-100 mx-auto flex items-center justify-center mb-4 text-indigo-600">
                                <Upload size={32} />
                            </div>
                            <p className="font-medium text-truffle">Tap to select photos/videos</p>
                            <p className="text-sm text-muted-foreground mt-1">or drag and drop here</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Milestone Title (e.g., First Trip)"
                        className="w-full bg-transparent border-b border-indigo-200 py-3 text-xl font-heading font-bold text-truffle placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What made this moment special? (Optional)"
                        className="w-full bg-transparent border-b border-indigo-200 py-3 text-base text-truffle placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none h-24"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-indigo-100">
                            <Calendar size={18} className="text-indigo-400" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-transparent text-sm font-medium text-truffle focus:outline-none w-full"
                            />
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-indigo-100">
                            <MapPin size={18} className="text-indigo-400" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Location"
                                className="bg-transparent text-sm font-medium text-truffle focus:outline-none w-full placeholder:text-indigo-200"
                            />
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    onClick={handleUpload}
                    disabled={!title || files.length === 0 || isLoading}
                    className="w-full rounded-full h-14 text-lg font-bold shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Album...
                        </>
                    ) : (
                        'Create Milestone'
                    )}
                </Button>

            </div>
        </div>
    );
}
