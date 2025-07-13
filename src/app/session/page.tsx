'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new session
    router.push('/session/new');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to new session...</p>
      </div>
    </div>
  );
}