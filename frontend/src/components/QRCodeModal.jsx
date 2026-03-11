import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useServerInfo } from '../hooks/useServerInfo';

/**
 * QRCodeModal component displays a QR code containing server connection details
 * for mobile app setup. The QR code auto-refreshes every 30 seconds to keep
 * the timestamp current.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 */
export function QRCodeModal({ isOpen, onClose }) {
    const { serverInfo, loading, error, refresh } = useServerInfo();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-refresh every 30 seconds when modal is open
    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(refresh, 30000);
            return () => clearInterval(interval);
        }
    }, [isOpen, refresh]);

    // Don't render if modal is not open or not mounted yet (for SSR safety)
    if (!isOpen || !mounted) {
        return null;
    }

    // Generate QR code data with API configuration
    const qrData = serverInfo ? JSON.stringify({
        apiUrl: `http://${serverInfo.ipAddress}:${serverInfo.port}`,
        wsUrl: `ws://${serverInfo.ipAddress}:${serverInfo.port}/ws`,
        deviceName: 'Agent Malas Server',
        timestamp: serverInfo.timestamp
    }) : null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden transform transition-all border border-slate-100/50"
                onClick={(e) => e.stopPropagation()}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(59, 130, 246, 0.1)'
                }}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                            Connect Mobile App
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition-colors flex-shrink-0"
                        aria-label="Close modal"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center">
                    {loading && (
                        <div className="flex flex-col items-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                            <p className="mt-4 text-slate-500 font-medium text-sm animate-pulse">Establishing connection...</p>
                        </div>
                    )}

                    {error && (
                        <div className="w-full bg-red-50/80 border border-red-100 rounded-2xl p-4 mb-2">
                            <div className="flex items-start">
                                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <p className="text-red-800 text-sm font-medium">Connection Error</p>
                                    <p className="text-red-600 text-xs mt-1">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={refresh}
                                className="mt-4 w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium text-sm rounded-xl transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !error && qrData && (
                        <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                            {/* QR Code Container */}
                            <div className="relative group mb-5">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[28px] blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                                <div className="relative bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <QRCodeSVG
                                        value={qrData}
                                        size={180}
                                        level="Q"
                                        includeMargin={false}
                                        className="rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Server Information */}
                            <div className="bg-slate-50 rounded-xl py-2 px-4 mb-6 border border-slate-100 w-full text-center shadow-inner">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Host Server</p>
                                <p className="text-slate-700 font-semibold font-mono text-sm leading-tight">
                                    {serverInfo.ipAddress}:{serverInfo.port}
                                </p>
                            </div>

                            {/* Instructions */}
                            <div className="w-full space-y-3.5 mb-2">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold mr-3 mt-0.5 shadow-sm">1</div>
                                    <p className="text-[13px] text-slate-600 leading-snug pt-0.5">Open <span className="font-semibold text-slate-800">Agent Malas Mobile</span> app</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold mr-3 mt-0.5 shadow-sm">2</div>
                                    <p className="text-[13px] text-slate-600 leading-snug pt-0.5">Scan this QR code from the connection screen</p>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold mr-3 mt-0.5 shadow-sm">3</div>
                                    <p className="text-[13px] text-slate-600 leading-snug pt-0.5">Start approving and managing tasks seamlessly!</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100/80 flex flex-col gap-3">
                    {!loading && !error && (
                        <p className="text-[11px] text-slate-400 text-center font-medium flex justify-center items-center">
                            <span className="relative flex h-2 w-2 mr-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Refreshes automatically every 30s
                        </p>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] ring-1 ring-white/20"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
