"use client";
import { useUIStore } from '@/lib/storeClient';

export default function Toast() {
  const toastMessage = useUIStore((state) => state.toastMessage);
  
  if (!toastMessage) return null;
  
  return (
    <div className="toast-notification" style={{
      position: 'fixed', bottom: '20px', right: '20px', 
      background: '#9e85a6', color: 'white', padding: '12px 24px',
      borderRadius: '8px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {toastMessage}
    </div>
  );
}
