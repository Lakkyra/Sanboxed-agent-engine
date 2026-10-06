import { useState, useRef } from 'react';

export const ImageUpload = ({ images, onImagesChange }) => {
    const fileInputRef = useRef(null);
    const [previews, setPreviews] = useState([]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    };

    const handleFiles = (files) => {
        console.log('ImageUpload handleFiles:', files);
        const allowedFiles = files.filter(file =>
            file.type.startsWith('image/') || file.type === 'application/pdf'
        );

        if (allowedFiles.length === 0) return;

        // Create previews
        const newPreviews = allowedFiles.map(file => ({
            file,
            url: URL.createObjectURL(file),
            name: file.name,
            isPdf: file.type === 'application/pdf'
        }));

        setPreviews([...previews, ...newPreviews]);
        onImagesChange([...images, ...allowedFiles]);
    };

    const removeImage = (index) => {
        const newPreviews = previews.filter((_, i) => i !== index);
        const newImages = images.filter((_, i) => i !== index);

        // Revoke URL to free memory
        URL.revokeObjectURL(previews[index].url);

        setPreviews(newPreviews);
        onImagesChange(newImages);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="space-y-2">
            {/* Upload Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Upload files"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add Files</span>
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Image/PDF Previews */}
            {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                            {preview.isPdf ? (
                                <div className="w-20 h-20 flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-gray-200 p-1">
                                    <span className="text-xs text-center break-all overflow-hidden max-h-full">
                                        {preview.name}
                                    </span>
                                </div>
                            ) : (
                                <img
                                    src={preview.url}
                                    alt={preview.name}
                                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove file"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Drag & Drop Area (optional, shown when no files) */}
            {previews.length === 0 && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500 hover:border-primary-400 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Drag & drop files here or click to browse
                </div>
            )}
        </div>
    );
};
