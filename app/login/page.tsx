'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/chat');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mathtai-beige">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border-4 border-mathtai-tan">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <img src="/mathtai-logo.png" alt="Math TAi" className="h-24 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-mathtai-chalkboard mb-2">Welcome to Math TAi</h1>
          <p className="text-gray-600">Your AI Teaching Assistant for MATH1228</p>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="flex-1 text-center py-3 bg-mathtai-green text-white rounded-t-lg font-medium shadow-sm">
            Sign In
          </div>
          <Link href="/signup" className="flex-1 text-center py-3 bg-mathtai-green/20 text-mathtai-chalkboard rounded-t-lg font-medium hover:bg-mathtai-green/30 transition">
            Sign Up
          </Link>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-mathtai-red/10 text-mathtai-red p-3 rounded-md text-sm border border-mathtai-red/20">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-mathtai-chalkboard mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-mathtai-green focus:border-mathtai-green text-gray-900"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-mathtai-chalkboard mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-mathtai-green focus:border-mathtai-green text-gray-900"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mathtai-green text-white py-3 px-4 rounded-lg hover:bg-mathtai-chalkboard focus:outline-none focus:ring-2 focus:ring-mathtai-chalkboard focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-lg shadow-md"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
