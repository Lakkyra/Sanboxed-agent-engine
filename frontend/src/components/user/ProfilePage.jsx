
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorMessage } from '../shared/ErrorMessage';
import api from '../../services/api';

export const ProfilePage = () => {
    const { user } = useAuth();
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        fetchUserMedia();
    }, []);

    const fetchUserMedia = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/users/media');
            setMedia(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch media:', err);
            setError('Failed to load your media library.');
        } finally {
            setLoading(false);
        }
    };

    const isPdf = (url) => {
        return url?.toLowerCase().endsWith('.pdf');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10 animate-fade-in">
            {/* Profile Header */}
            <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8 md:mb-10 border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 md:gap-8 relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-primary/20 transform group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">{user?.name}</h1>
                        <p className="text-slate-300 text-lg mb-1">{user?.email}</p>
                        <p className="text-sm text-slate-500 font-medium">Member since {formatDate(user?.created_at || new Date())}</p>
                    </div>
                </div>
            </div>

            {/* Media Gallery Section */}
            <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">My Media Library</span>
                    <span className="text-xs md:text-sm font-bold text-primary-300 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-lg">{media.length} items</span>
                </h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <ErrorMessage message={error} />
            ) : media.length === 0 ? (
                <div className="glass-panel p-10 md:p-16 text-center rounded-3xl border border-white/5 bg-white/5">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500 border border-white/10">
                        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">No media yet</h3>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm md:text-base">Upload images or files in your chats to build your library.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {media.map((item, index) => (
                        <div
                            key={index}
                            className="group relative bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer aspect-square"
                            onClick={() => setSelectedImage(item)}
                        >
                            {isPdf(item.cloudinary_url) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500 bg-white/5">
                                    <svg className="w-16 h-16 mb-3 text-red-500/80 group-hover:text-red-500 transition-colors drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.363 2c4.155 0 2.637 6 2.637 6s6-1.65 6 2.457v11.543h-16v-20h7.363zm.826-2h-10.189v24h20v-14.369l-9.811-9.631z" fillRule="evenodd" clipRule="evenodd" opacity="0.4" />
                                        <path d="M19.029 13H5V3h9v9h5.029z" fillOpacity="0.8" />
                                    </svg>
                                    <p className="text-xs text-center font-medium truncate w-full px-2 text-slate-300">{item.original_name}</p>
                                </div>
                            ) : (
                                <img
                                    src={item.cloudinary_url}
                                    alt={item.original_name || 'User content'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                />
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <span className="text-white font-medium bg-white/10 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    View
                                </span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                                <p className="text-white text-xs font-medium truncate mb-0.5">{item.original_name}</p>
                                <p className="text-slate-400 text-[10px]">{formatDate(item.timestamp)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <button
                        className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors z-50"
                        onClick={() => setSelectedImage(null)}
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {isPdf(selectedImage.cloudinary_url) ? (
                        <div className="w-full h-[85vh] max-w-5xl bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
                            <iframe
                                src={selectedImage.cloudinary_url}
                                className="w-full h-full"
                                title="PDF Viewer"
                            />
                        </div>
                    ) : (
                        <img
                            src={selectedImage.cloudinary_url}
                            alt={selectedImage.original_name}
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl border border-white/5"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                        <a
                            href={selectedImage.cloudinary_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pointer-events-auto inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl backdrop-blur-md transition-all text-sm font-medium border border-white/10 hover:border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {isPdf(selectedImage.cloudinary_url) ? 'Download PDF' : 'Open Original'}
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
