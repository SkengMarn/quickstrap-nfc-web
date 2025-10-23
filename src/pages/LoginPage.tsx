import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react'
import { supabase } from '../services/supabase'
import TextType from '../components/ui/TextType'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = [
    {
      label: 'Top Feature',
      title: 'Real-Time Wristband Sync',
      description: 'QuickStraps automatically syncs all verified wristbands and check-ins across devices — even when offline. Once connection is restored, every scan updates instantly, keeping your team perfectly in sync.'
    },
    {
      label: 'Smart Security',
      title: 'Fraud Detection & Prevention',
      description: 'Advanced AI-powered fraud detection monitors suspicious patterns in real-time. Automatically flags duplicate scans, blocked wristbands, and unauthorized entry attempts before they become problems.'
    },
    {
      label: 'Instant Insights',
      title: 'Live Analytics Dashboard',
      description: 'Track check-ins, capacity, and gate performance in real-time. Get instant alerts when capacity thresholds are reached and monitor your entire event from one powerful command center.'
    },
    {
      label: 'Zero Hassle',
      title: 'Bulk Upload & Management',
      description: 'Upload thousands of wristbands and tickets via CSV in seconds. Support for Eventbrite, Quicket, and all major ticketing platforms with automatic field mapping and validation.'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 5000) // Change every 5 seconds

    return () => clearInterval(interval)
  }, [])
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // SECURITY FIX: Add rate limiting for login attempts
      const { rateLimiter, rateLimitConfigs } = await import('../utils/rateLimiter');
      const clientIP = 'client_' + (window.location.hostname || 'unknown');
      
      if (!rateLimiter.isAllowed(clientIP, rateLimitConfigs.login)) {
        const timeUntilUnblocked = rateLimiter.getTimeUntilUnblocked(clientIP);
        const minutes = Math.ceil(timeUntilUnblocked / (60 * 1000));
        throw new Error(`Too many login attempts. Please try again in ${minutes} minutes.`);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Record failed attempt for rate limiting
        rateLimiter.isAllowed(clientIP, rateLimitConfigs.login);
        throw error;
      }

      // Login successful - reset rate limit and redirect will be handled by the auth state change
      rateLimiter.reset(clientIP);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sign in with Google')
    }
  }

  const handleAppleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sign in with Apple')
    }
  }

  // Partners list with typing effect
  const partnerTexts = [
    'Malembe - Premium Event Management Solutions & Services',
    'Quicket Uganda - Leading Event Ticketing Platform in East Africa',
    'Intellectual Co - Innovative Technology Solutions for Modern Businesses',
    'Laughing Marabostck Comedy Club - Home of the Finest Stand-Up Comedy in the Region',
    'Dim The Lights - Professional Lighting & Sound Engineering Services',
    'Vibez Nzuri - Curating Exceptional Musical Experiences & Entertainment',
    'BlackRoots Academy of Soul - Preserving and Promoting African Cultural Heritage',
    'Ganda Vibes - Celebrating Ugandan Music, Arts, and Cultural Expression'
  ]

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-[440px]">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-12">
            <div className="w-9 h-9 bg-black rounded-md flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">QuickStraps</span>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h1 className="text-[32px] font-bold text-gray-900 mb-3 leading-tight">Welcome Back!</h1>
            <p className="text-[15px] text-gray-600 leading-relaxed">
              Sign in to manage your events, track check-ins, and keep your wristband system running seamlessly.
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-gray-900 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-[18px] w-[18px] text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-gray-900 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-[13px] font-medium text-teal-700 hover:text-teal-800"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-[15px] font-semibold text-white bg-[#0d5f5f] hover:bg-[#0a4d4d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-[13px]">
                <span className="px-3 bg-white text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg text-[15px] font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all"
              >
                <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={handleAppleLogin}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg text-[15px] font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all"
              >
                <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-[14px] text-gray-600 pt-2">
              Don't have an Account?{' '}
              <Link to="/signup" className="font-semibold text-teal-700 hover:text-teal-800">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Panel - Marketing Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0d5f5f] via-[#0a5252] to-[#084545] text-white p-16 flex-col justify-between">
        <div className="flex-1 flex flex-col justify-center max-w-[520px] mx-auto">
          <h2 className="text-[42px] font-bold leading-[1.15] mb-10 tracking-tight">
            Revolutionize Event Check-ins with Smart Wristband Verification
          </h2>
          
          {/* Feature Highlight - Rotating */}
          <div className="mb-6 min-h-[180px]">
            <div className="mb-4 transition-all duration-500 ease-in-out">
              <span className="text-[13px] font-semibold text-teal-300 tracking-wide uppercase">
                {features[currentFeature].label}
              </span>
              <span className="text-white/40 mx-2">—</span>
              <span className="text-[15px] font-semibold text-white">
                {features[currentFeature].title}
              </span>
            </div>
            <p className="text-[17px] leading-[1.6] font-normal text-white/90 transition-all duration-500 ease-in-out">
              {features[currentFeature].description}
            </p>
            
            {/* Feature Indicators */}
            <div className="flex gap-2 mt-6">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentFeature 
                      ? 'w-8 bg-teal-300' 
                      : 'w-1 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`View feature ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Partner Logos */}
        <div className="mt-16">
          <div className="flex items-center gap-4 mb-6">
            <p className="text-[11px] font-bold text-white/60 tracking-[0.1em] uppercase whitespace-nowrap">
              JOIN 1K+ EVENT TEAMS
            </p>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>
          <div className="w-full overflow-x-auto whitespace-nowrap pb-2">
            <div className="inline-flex gap-3">
              <TextType 
                text={partnerTexts}
                typingSpeed={50}
                pauseDuration={2000}
                as="div"
                className="inline-flex gap-3"
                textColors={['#ffffff']}
                onSentenceComplete={(text, index) => {
                  const element = document.getElementById(`partner-${index}`);
                  if (element) {
                    element.classList.add('bg-white/10');
                    element.classList.remove('bg-white/5');
                  }
                }}
              >
                {partnerTexts.map((partner, index) => (
                  <div
                    key={index}
                    id={`partner-${index}`}
                    className="bg-white/5 backdrop-blur-sm rounded-md py-2.5 px-4 text-center text-[13px] font-medium border border-white/5 hover:bg-white/10 transition-all inline-block"
                  >
                    {partner}
                  </div>
                ))}
              </TextType>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
