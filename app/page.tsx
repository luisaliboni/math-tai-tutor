'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.push('/chat');
      } else {
        router.push('/login');
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-mathtai-beige">
      <div className="text-center">
        <div className="mb-6">
          <img src="/mathtai-logo.png" alt="Math TAi" className="h-32 w-auto mx-auto" />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-mathtai-chalkboard mx-auto mb-4"></div>
        <p className="text-mathtai-chalkboard font-medium">Loading...</p>
      </div>
    </div>
  );
}
