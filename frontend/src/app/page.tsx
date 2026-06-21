import Link from 'next/link';
import { Compass, Sparkles, Shield, MapPin, Calendar, Heart, CloudSun, CreditCard } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <Compass className="h-6 w-6 text-white animate-spin-slow" />
          </div>
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            TRAO AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white transition px-4 py-2"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/25"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col justify-center items-center text-center z-10 py-16 lg:py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide mb-6 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Generation Travel Intelligence</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6 animate-fade-in">
          Unleash Your Next Adventure with <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">AI Travel Planner</span>
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl leading-relaxed mb-10 animate-fade-in">
          Generate structured day-by-day itineraries, estimate budget breakdowns, explore recommended hotels, and receive packing suggestions cross-referenced with destination climates.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 animate-fade-in">
          <Link 
            href="/register" 
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold px-8 py-4 rounded-xl transition shadow-xl shadow-indigo-500/30 text-base"
          >
            Start Planning Free
          </Link>
          <Link 
            href="/login" 
            className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl transition text-base backdrop-blur-sm"
          >
            View Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl text-left">
          <div className="p-6 rounded-2xl glass-card hover:border-blue-500/30 transition duration-300">
            <div className="p-3 bg-blue-500/10 rounded-xl w-fit text-blue-400 mb-5">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Smart Itineraries</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Get personalized day-by-day itineraries customized around your distinct travel style, hobbies, and duration constraints.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-indigo-500/30 transition duration-300">
            <div className="p-3 bg-indigo-500/10 rounded-xl w-fit text-indigo-400 mb-5">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cost ledger</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Receive smart cost breakdowns across food, activities, transportation, and hotels. Plan responsibly with realistic calculations.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-purple-500/30 transition duration-300">
            <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-400 mb-5">
              <CloudSun className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Climate Packing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cross-reference local weather forecasts with activities to generate a checklist of essentials, clothes, and gear.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-pink-500/30 transition duration-300">
            <div className="p-3 bg-pink-500/10 rounded-xl w-fit text-pink-400 mb-5">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Data Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Strict authentication boundaries protect and isolate user itineraries securely. Rest assured, your vault is strictly private.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            <span>&copy; {new Date().getFullYear()} Trao AI Travel. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300 transition">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition">Terms of Service</a>
            <a href="#" className="hover:text-slate-300 transition">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
